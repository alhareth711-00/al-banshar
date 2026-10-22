const db = require('../db/database');
const accountingEngine = require('../utils/accountingEngine');
const { roundMoney, safeNum } = require('../utils/mathPrecision');

const accountingModel = {
  // 1. Chart of Accounts
  getChartOfAccounts() {
    return db.prepare(`
      SELECT 
        coa.*,
        COALESCE(SUM(jl.debit), 0) AS total_debit,
        COALESCE(SUM(jl.credit), 0) AS total_credit
      FROM chart_of_accounts coa
      LEFT JOIN journal_lines jl ON coa.code = jl.account_code
      GROUP BY coa.code
      ORDER BY coa.code ASC
    `).all();
  },

  getAccountByCode(code) {
    const acc = db.prepare('SELECT * FROM chart_of_accounts WHERE code = ?').get(code);
    if (!acc) return null;

    acc.lines = db.prepare(`
      SELECT 
        jl.*,
        je.entry_number,
        je.entry_date,
        je.ref_type,
        je.ref_number
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE jl.account_code = ?
      ORDER BY je.entry_date DESC, jl.id DESC
      LIMIT 100
    `).all(code);

    return acc;
  },

  createAccount(data) {
    const stmt = db.prepare(`
      INSERT INTO chart_of_accounts (code, name, type, sub_type, normal_balance, description)
      VALUES (@code, @name, @type, @sub_type, @normal_balance, @description)
    `);

    stmt.run({
      code: String(data.code).trim(),
      name: data.name.trim(),
      type: data.type,
      sub_type: data.sub_type || 'other',
      normal_balance: data.normal_balance || 'debit',
      description: data.description ? data.description.trim() : null,
    });

    return this.getAccountByCode(String(data.code).trim());
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
