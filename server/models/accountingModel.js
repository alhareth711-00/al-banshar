const db = require('../db/database');
const accountingEngine = require('../utils/accountingEngine');
const { roundMoney, safeNum } = require('../utils/mathPrecision');

const accountingModel = {
  // 1. Chart of Accounts & Tree Hierarchy
  getChartOfAccounts(options = {}) {
    const rows = db.prepare(`
      SELECT 
        coa.*,
        parent.name AS parent_name,
        COALESCE(SUM(jl.debit), 0) AS direct_debit,
        COALESCE(SUM(jl.credit), 0) AS direct_credit,
        COUNT(jl.id) AS tx_count
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts parent ON coa.parent_code = parent.code
      LEFT JOIN journal_lines jl ON coa.code = jl.account_code
      GROUP BY coa.code
      ORDER BY coa.code ASC
    `).all();

    const accountMap = new Map();
    for (const row of rows) {
      const normalDebit = row.normal_balance === 'debit';
      const directBalance = normalDebit 
        ? roundMoney(row.direct_debit - row.direct_credit) 
        : roundMoney(row.direct_credit - row.direct_debit);

      accountMap.set(row.code, {
        ...row,
        direct_debit: roundMoney(row.direct_debit),
        direct_credit: roundMoney(row.direct_credit),
        direct_balance: directBalance,
        rollup_debit: roundMoney(row.direct_debit),
        rollup_credit: roundMoney(row.direct_credit),
        rollup_balance: directBalance,
        children: [],
        children_count: 0,
        descendants_count: 0,
      });
    }

    const roots = [];
    for (const acc of accountMap.values()) {
      if (acc.parent_code && accountMap.has(acc.parent_code)) {
        const parent = accountMap.get(acc.parent_code);
        parent.children.push(acc);
        parent.children_count += 1;
      } else {
        roots.push(acc);
      }
    }

    function calculateRollups(node) {
      let subDebit = node.direct_debit;
      let subCredit = node.direct_credit;
      let subDescendants = node.children.length;

      for (const child of node.children) {
        calculateRollups(child);
        subDebit += child.rollup_debit;
        subCredit += child.rollup_credit;
        subDescendants += child.descendants_count;
      }

      node.rollup_debit = roundMoney(subDebit);
      node.rollup_credit = roundMoney(subCredit);
      node.rollup_balance = node.normal_balance === 'debit'
        ? roundMoney(subDebit - subCredit)
        : roundMoney(subCredit - subDebit);
      node.descendants_count = subDescendants;
      node.has_children = node.children.length > 0;
    }

    for (const root of roots) {
      calculateRollups(root);
    }

    if (options.tree) {
      return roots;
    }

    return Array.from(accountMap.values());
  },

  getAccountByCode(code) {
    const acc = db.prepare(`
      SELECT 
        coa.*,
        parent.name AS parent_name
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts parent ON coa.parent_code = parent.code
      WHERE coa.code = ?
    `).get(code);

    if (!acc) return null;

    acc.lines = db.prepare(`
      SELECT 
        jl.*,
        je.entry_number,
        je.entry_date,
        je.ref_type,
        je.ref_number,
        je.description AS entry_description,
        CASE
          WHEN jl.party_type = 'customer' THEN (SELECT customer_name FROM customers_vehicles WHERE id = jl.party_id LIMIT 1)
          WHEN jl.party_type = 'supplier' THEN (SELECT name FROM suppliers WHERE id = jl.party_id LIMIT 1)
          WHEN jl.party_type = 'worker' THEN (SELECT name FROM workers WHERE id = jl.party_id LIMIT 1)
          ELSE NULL
        END AS party_name
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE jl.account_code = ?
      ORDER BY je.entry_date DESC, jl.id DESC
      LIMIT 100
    `).all(code);

    return acc;
  },

  getNextAccountCode(parentCode) {
    if (!parentCode) {
      const maxRoot = db.prepare(`
        SELECT code FROM chart_of_accounts 
        WHERE parent_code IS NULL AND length(code) = 1 AND code GLOB '[0-9]'
        ORDER BY CAST(code AS INTEGER) DESC LIMIT 1
      `).get();
      return maxRoot ? String(parseInt(maxRoot.code, 10) + 1) : '1';
    }

    const parent = db.prepare('SELECT * FROM chart_of_accounts WHERE code = ?').get(parentCode);
    if (!parent) return `${parentCode}01`;

    const children = db.prepare(`
      SELECT code FROM chart_of_accounts WHERE parent_code = ?
    `).all(parentCode).map(c => c.code);

    if (children.length === 0) {
      if (parent.level === 1) return `${parentCode}1`;
      if (parent.level === 2) return `${parentCode}01`;
      return `${parentCode}01`;
    }

    const numericChildren = children
      .filter(c => c.startsWith(parentCode) && /^\d+$/.test(c))
      .map(c => ({
        code: c,
        num: BigInt(c),
        length: c.length
      }));

    if (numericChildren.length > 0) {
      const maxChild = numericChildren.reduce((max, curr) => curr.num > max.num ? curr : max, numericChildren[0]);
      const nextNum = maxChild.num + 1n;
      return String(nextNum).padStart(maxChild.length, '0');
    }

    return `${parentCode}${String(children.length + 1).padStart(2, '0')}`;
  },

  createAccount(data) {
    const code = String(data.code || '').trim();
    const name = String(data.name || '').trim();
    if (!code || !name) {
      throw new Error('رمز الحساب واسم الحساب مطلوبان');
    }

    const exists = db.prepare('SELECT code FROM chart_of_accounts WHERE code = ?').get(code);
    if (exists) {
      throw new Error(`رمز الحساب (${code}) مسجل مسبقاً، يرجى اختيار رمز آخر`);
    }

    let parent = null;
    const parentCode = data.parent_code ? String(data.parent_code).trim() : null;
    if (parentCode) {
      parent = db.prepare('SELECT * FROM chart_of_accounts WHERE code = ?').get(parentCode);
      if (!parent) {
        throw new Error('الحساب الأب المحدد غير موجود');
      }
    }

    const type = parent ? parent.type : (data.type || 'asset');
    const normal_balance = parent ? parent.normal_balance : (data.normal_balance || 'debit');
    const sub_type = data.sub_type || (parent ? parent.sub_type : 'other');
    const level = parent ? (parent.level + 1) : (data.level || 1);
    const description = data.description ? String(data.description).trim() : null;
    const openingBalance = safeNum(data.opening_balance);

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO chart_of_accounts (
          code, name, type, sub_type, normal_balance, parent_code, level, is_system, is_active, description
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, 0, 1, ?
        )
      `).run(code, name, type, sub_type, normal_balance, parentCode, level, description);

      if (openingBalance > 0) {
        const entryDate = data.opening_balance_date || new Date().toISOString().split('T')[0];
        const datePart = entryDate.replace(/-/g, '');
        const countToday = db.prepare(`
          SELECT COUNT(*) as c FROM journal_entries WHERE date(entry_date) = date(?)
        `).get(entryDate).c;
        const entryNumber = `JV-OB-${datePart}-${String(countToday + 1).padStart(3, '0')}`;
        const jvDesc = data.opening_balance_desc || `قيد رصيد افتتاحي تأسيسي للحساب: ${name} (${code})`;

        const jvResult = db.prepare(`
          INSERT INTO journal_entries (
            entry_number, entry_date, ref_type, ref_id, ref_number,
            description, total_debit, total_credit, is_balanced, created_at
          ) VALUES (
            ?, ?, 'opening_balance', NULL, ?,
            ?, ?, ?, 1, datetime('now', 'localtime')
          )
        `).run(entryNumber, entryDate, code, jvDesc, openingBalance, openingBalance);

        const jvId = jvResult.lastInsertRowid;

        if (normal_balance === 'debit') {
          db.prepare(`
            INSERT INTO journal_lines (journal_entry_id, account_code, debit, credit, description)
            VALUES (?, ?, ?, 0, ?)
          `).run(jvId, code, openingBalance, `رصيد مدين افتتاحي - ${name}`);

          db.prepare(`
            INSERT INTO journal_lines (journal_entry_id, account_code, debit, credit, description)
            VALUES (?, '3001', 0, ?, ?)
          `).run(jvId, openingBalance, `رأس المال المقابل لرصيد ${name} الافتتاحي`);
        } else {
          db.prepare(`
            INSERT INTO journal_lines (journal_entry_id, account_code, debit, credit, description)
            VALUES (?, '3001', ?, 0, ?)
          `).run(jvId, openingBalance, `تسوية رأس مال مقابل رصيد ${name} الافتتاحي`);

          db.prepare(`
            INSERT INTO journal_lines (journal_entry_id, account_code, debit, credit, description)
            VALUES (?, ?, 0, ?, ?)
          `).run(jvId, code, openingBalance, `رصيد دائن افتتاحي - ${name}`);
        }
      }
    });

    transaction();
    return this.getAccountByCode(code);
  },

  updateAccount(code, data) {
    const acc = db.prepare('SELECT * FROM chart_of_accounts WHERE code = ?').get(code);
    if (!acc) throw new Error('الحساب المالي غير موجود');

    const name = data.name ? String(data.name).trim() : acc.name;
    const description = data.description !== undefined ? (data.description ? String(data.description).trim() : null) : acc.description;
    const is_active = data.is_active !== undefined ? (data.is_active ? 1 : 0) : acc.is_active;
    const sub_type = data.sub_type ? String(data.sub_type).trim() : acc.sub_type;

    db.prepare(`
      UPDATE chart_of_accounts
      SET name = ?, description = ?, is_active = ?, sub_type = ?
      WHERE code = ?
    `).run(name, description, is_active, sub_type, code);

    return this.getAccountByCode(code);
  },

  deleteAccount(code) {
    const acc = db.prepare('SELECT * FROM chart_of_accounts WHERE code = ?').get(code);
    if (!acc) throw new Error('الحساب المالي غير موجود');

    if (acc.is_system === 1) {
      throw new Error('هذا الحساب أساسي في بنية النظام المحاسبي ولا يمكن حذفه للحفاظ على استقرار العمليات');
    }

    const childCount = db.prepare('SELECT COUNT(*) as c FROM chart_of_accounts WHERE parent_code = ?').get(code).c;
    if (childCount > 0) {
      throw new Error('لا يمكن حذف هذا الحساب لأنه يحتوي على حسابات فرعية تحته. يرجى حذف أو نقل الحسابات الفرعية أولاً');
    }

    const txCount = db.prepare('SELECT COUNT(*) as c FROM journal_lines WHERE account_code = ?').get(code).c;
    if (txCount > 0) {
      throw new Error(`لا يمكن حذف الحساب (${code}) لوجود (${txCount}) قيد مالي مسجل عليه في دفتر الأستاذ. يمكنك إلغاء تنشيط الحساب (تعطيله) بدلاً من حذفه`);
    }

    db.prepare('DELETE FROM chart_of_accounts WHERE code = ?').run(code);
    return { success: true, message: `تم حذف الحساب (${code}) بنجاح` };
  },

  getAccountLedger(code, filters = {}) {
    const acc = db.prepare(`
      SELECT 
        coa.*,
        parent.name AS parent_name
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts parent ON coa.parent_code = parent.code
      WHERE coa.code = ?
    `).get(code);

    if (!acc) return null;

    const fromDate = filters.from_date || null;
    const toDate = filters.to_date || null;
    const search = filters.search ? `%${filters.search.trim()}%` : null;

    let priorDebit = 0;
    let priorCredit = 0;
    if (fromDate) {
      const prior = db.prepare(`
        SELECT 
          COALESCE(SUM(jl.debit), 0) AS d,
          COALESCE(SUM(jl.credit), 0) AS c
        FROM journal_lines jl
        JOIN journal_entries je ON jl.journal_entry_id = je.id
        WHERE jl.account_code = ? AND date(je.entry_date) < date(?)
      `).get(code, fromDate);
      priorDebit = roundMoney(prior.d);
      priorCredit = roundMoney(prior.c);
    }

    const normalDebit = acc.normal_balance === 'debit';
    const openingBalance = normalDebit 
      ? roundMoney(priorDebit - priorCredit) 
      : roundMoney(priorCredit - priorDebit);

    let query = `
      SELECT 
        jl.id,
        jl.journal_entry_id,
        jl.account_code,
        jl.debit,
        jl.credit,
        jl.party_type,
        jl.party_id,
        jl.description AS line_description,
        je.entry_number,
        je.entry_date,
        je.ref_type,
        je.ref_id,
        je.ref_number,
        je.description AS entry_description,
        CASE
          WHEN jl.party_type = 'customer' THEN (SELECT customer_name FROM customers_vehicles WHERE id = jl.party_id LIMIT 1)
          WHEN jl.party_type = 'supplier' THEN (SELECT name FROM suppliers WHERE id = jl.party_id LIMIT 1)
          WHEN jl.party_type = 'worker' THEN (SELECT name FROM workers WHERE id = jl.party_id LIMIT 1)
          ELSE NULL
        END AS party_name
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE jl.account_code = ?
    `;
    const params = [code];

    if (fromDate) {
      query += ' AND date(je.entry_date) >= date(?)';
      params.push(fromDate);
    }
    if (toDate) {
      query += ' AND date(je.entry_date) <= date(?)';
      params.push(toDate);
    }
    if (search) {
      query += ' AND (je.entry_number LIKE ? OR je.description LIKE ? OR jl.description LIKE ? OR je.ref_number LIKE ?)';
      params.push(search, search, search, search);
    }

    query += ' ORDER BY je.entry_date ASC, je.id ASC, jl.id ASC';
    const rawLines = db.prepare(query).all(...params);

    let runningBalance = openingBalance;
    let periodDebit = 0;
    let periodCredit = 0;

    const lines = rawLines.map(line => {
      periodDebit += line.debit;
      periodCredit += line.credit;

      if (normalDebit) {
        runningBalance = roundMoney(runningBalance + line.debit - line.credit);
      } else {
        runningBalance = roundMoney(runningBalance + line.credit - line.debit);
      }

      return {
        ...line,
        running_balance: runningBalance,
      };
    });

    periodDebit = roundMoney(periodDebit);
    periodCredit = roundMoney(periodCredit);
    const periodNet = normalDebit ? roundMoney(periodDebit - periodCredit) : roundMoney(periodCredit - periodDebit);
    const closingBalance = roundMoney(openingBalance + periodNet);

    return {
      account: acc,
      summary: {
        prior_debit: priorDebit,
        prior_credit: priorCredit,
        opening_balance: openingBalance,
        period_debit: periodDebit,
        period_credit: periodCredit,
        period_net: periodNet,
        closing_balance: closingBalance,
        transactions_count: lines.length,
      },
      lines,
    };
  },

  getLiquidAccounts() {
    return db.prepare(`
      SELECT 
        coa.code, 
        coa.name, 
        coa.type, 
        coa.sub_type, 
        coa.level,
        COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) AS current_balance,
        (SELECT COUNT(*) FROM chart_of_accounts c WHERE c.parent_code = coa.code) AS children_count
      FROM chart_of_accounts coa
      LEFT JOIN journal_lines jl ON coa.code = jl.account_code
      WHERE coa.is_active = 1 
        AND (coa.code LIKE '11%' OR coa.sub_type IN ('cash_drawer', 'bank', 'e_wallet'))
        AND coa.level >= 3
      GROUP BY coa.code
      ORDER BY coa.code ASC
    `).all();
  },

  getExpenseAccounts() {
    return db.prepare(`
      SELECT 
        coa.code, 
        coa.name, 
        coa.sub_type, 
        coa.level
      FROM chart_of_accounts coa
      WHERE coa.is_active = 1 
        AND (coa.code LIKE '61%' OR coa.sub_type = 'operating_expense')
        AND coa.level >= 3
      ORDER BY coa.code ASC
    `).all();
  },

  // 2. Journal Entries
  getJournalEntries(filters = {}) {
    let query = 'SELECT * FROM journal_entries WHERE 1=1';
    const params = [];

    if (filters.date) {
      query += ' AND date(entry_date) = date(?)';
      params.push(filters.date);
    }
    if (filters.ref_type) {
      query += ' AND ref_type = ?';
      params.push(filters.ref_type);
    }
    if (filters.search) {
      query += ' AND (entry_number LIKE ? OR description LIKE ? OR ref_number LIKE ?)';
      const s = `%${filters.search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY entry_date DESC, id DESC LIMIT 100';
    const entries = db.prepare(query).all(...params);

    for (const entry of entries) {
      entry.lines_count = db.prepare('SELECT COUNT(*) as count FROM journal_lines WHERE journal_entry_id = ?').get(entry.id).count;
    }

    return entries;
  },

  getJournalEntryById(id) {
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
    if (!entry) return null;

    entry.lines = db.prepare(`
      SELECT 
        jl.*,
        coa.name AS account_name,
        coa.type AS account_type,
        coa.normal_balance
      FROM journal_lines jl
      JOIN chart_of_accounts coa ON jl.account_code = coa.code
      WHERE jl.journal_entry_id = ?
      ORDER BY jl.id ASC
    `).all(id);

    return entry;
  },

  createManualJournalEntry(data) {
    const execute = db.transaction(() => {
      return accountingEngine.createJournalEntry(db, data);
    });

    const result = execute();
    return this.getJournalEntryById(result.id);
  },

  // 3. Statement of Account
  getStatementOfAccount({ party_type, party_id, start_date, end_date, paper_bill_number }) {
    return accountingEngine.getStatementOfAccount(db, { party_type, party_id, start_date, end_date, paper_bill_number });
  },

  // 4. Financial Statements
  getTrialBalance(as_of_date) {
    return accountingEngine.getTrialBalance(db, as_of_date);
  },

  getIncomeStatement(filters) {
    return accountingEngine.getIncomeStatement(db, filters);
  },

  getBalanceSheet() {
    return accountingEngine.getRealtimeBalanceSheet(db);
  },

  getFinancialPulse() {
    return accountingEngine.getFinancialPulse(db);
  },

  getBayProfitability(filters) {
    return accountingEngine.getBayProfitability(db, filters);
  },

  checkInvoiceSafeguards(payload) {
    return accountingEngine.checkInvoiceSafeguards(db, payload);
  },

  // 5. Stock Movements
  getStockMovements(filters = {}) {
    let query = `
      SELECT 
        sm.*,
        inv.name AS product_name,
        inv.sku AS product_sku,
        inv.category AS product_category,
        inv.brand AS product_brand
      FROM stock_movements sm
      JOIN inventory inv ON sm.inventory_id = inv.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.inventory_id) {
      query += ' AND sm.inventory_id = ?';
      params.push(filters.inventory_id);
    }
    if (filters.movement_type) {
      query += ' AND sm.movement_type = ?';
      params.push(filters.movement_type);
    }
    if (filters.date) {
      query += ' AND date(sm.created_at) = date(?)';
      params.push(filters.date);
    }

    query += ' ORDER BY sm.id DESC LIMIT 100';
    return db.prepare(query).all(...params);
  },
};

module.exports = accountingModel;
