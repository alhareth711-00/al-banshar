const db = require('../db/database');
const { formatDate } = require('../utils/helpers');
const { roundMoney, safeNum } = require('../utils/mathPrecision');
const { postOfficialVoucher, createJournalEntry, getIncomeStatement } = require('../utils/accountingEngine');

function generateVoucherNumber(type = 'receipt') {
  const today = formatDate().replace(/-/g, '');
  const prefix = type === 'receipt' ? `RV-${today}-` : `PV-${today}-`;

  const lastVoucher = db.prepare(`
    SELECT voucher_number FROM official_vouchers 
    WHERE voucher_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastVoucher && lastVoucher.voucher_number) {
    const parts = lastVoucher.voucher_number.split('-');
    const seqStr = parts[parts.length - 1];
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  if (type === 'payment') {
    try {
      const lastSuppVoucher = db.prepare(`
        SELECT voucher_number FROM supplier_payment_vouchers 
        WHERE voucher_number LIKE ? 
        ORDER BY id DESC LIMIT 1
      `).get(`${prefix}%`);

      if (lastSuppVoucher && lastSuppVoucher.voucher_number) {
        const parts = lastSuppVoucher.voucher_number.split('-');
        const seqStr = parts[parts.length - 1];
        const parsed = parseInt(seqStr, 10);
        if (!isNaN(parsed) && parsed >= nextSeq) {
          nextSeq = parsed + 1;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

const voucherModel = {
  getAll(filters = {}) {
    let query = `
      SELECT 
        v.*,
        coa_cash.name AS cash_account_name,
        coa_offset.name AS offset_account_name
      FROM official_vouchers v
      LEFT JOIN chart_of_accounts coa_cash ON v.cash_account_code = coa_cash.code
      LEFT JOIN chart_of_accounts coa_offset ON v.offset_account_code = coa_offset.code
      WHERE 1=1
    `;
    const params = [];

    if (filters.voucher_type) {
      query += ' AND v.voucher_type = ?';
      params.push(filters.voucher_type);
    }

    if (filters.party_type) {
      query += ' AND v.party_type = ?';
      params.push(filters.party_type);
    }

    if (filters.date) {
      query += ' AND date(v.created_at) = date(?)';
      params.push(filters.date);
    }

    if (filters.search) {
      query += ' AND (v.voucher_number LIKE ? OR v.party_name LIKE ? OR v.paper_bill_number LIKE ? OR v.description LIKE ?)';
      const s = `%${filters.search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY v.id DESC LIMIT 200';
    return db.prepare(query).all(...params);
  },

  getById(id) {
    return db.prepare(`
      SELECT 
        v.*,
        coa_cash.name AS cash_account_name,
        coa_offset.name AS offset_account_name
      FROM official_vouchers v
      LEFT JOIN chart_of_accounts coa_cash ON v.cash_account_code = coa_cash.code
      LEFT JOIN chart_of_accounts coa_offset ON v.offset_account_code = coa_offset.code
      WHERE v.id = ? OR v.voucher_number = ?
    `).get(id, id);
  },

  create(data) {
    const execute = db.transaction(() => {
      const voucherType = data.voucher_type === 'payment' ? 'payment' : 'receipt';
      const amount = roundMoney(safeNum(data.amount, 0));
      if (amount <= 0) {
        throw new Error('مبلغ السند يجب أن يكون أكبر من الصفر');
      }

      const partyType = data.party_type || 'other';
      const partyId = data.party_id ? Number(data.party_id) : null;
      let partyName = (data.party_name || '').trim();
      const paymentMethod = data.payment_method || 'cash';
      const paperBillNumber = data.paper_bill_number ? data.paper_bill_number.trim() : null;

      // Map payment method to asset account code
      let cashAccountCode = '1101';
      if (paymentMethod === 'kuraimi' || paymentMethod === 'bank') cashAccountCode = '1102';
      else if (paymentMethod === 'jeeb') cashAccountCode = '1103';
      else if (paymentMethod === 'jawali') cashAccountCode = '1104';
      else if (paymentMethod === 'onecash') cashAccountCode = '1105';

      // Determine offset account code & adjust balance if customer/supplier/owner
      let offsetAccountCode = data.offset_account_code;
      let prevBalance = 0;
      let newBalance = 0;

      if (partyType === 'customer') {
        offsetAccountCode = '1201'; // Customer Receivables
        if (partyId) {
          const veh = db.prepare('SELECT customer_name, plate_number, balance_due FROM customers_vehicles WHERE id = ?').get(partyId);
          if (veh) {
            if (!partyName) partyName = `${veh.customer_name} (${veh.plate_number})`;
            prevBalance = Number(veh.balance_due) || 0;
            newBalance = Math.max(0, prevBalance - amount);
            db.prepare('UPDATE customers_vehicles SET balance_due = ? WHERE id = ?').run(newBalance, partyId);
          }
        }
      } else if (partyType === 'supplier') {
        offsetAccountCode = '2101'; // Supplier Payables
        if (partyId) {
          const supp = db.prepare('SELECT name, company_name, balance_due FROM suppliers WHERE id = ?').get(partyId);
          if (supp) {
            if (!partyName) partyName = supp.name;
            prevBalance = Number(supp.balance_due) || 0;
            newBalance = Math.max(0, prevBalance - amount);
            db.prepare('UPDATE suppliers SET balance_due = ? WHERE id = ?').run(newBalance, partyId);
          }
        }
      } else if (partyType === 'owner') {
        // Owner personal drawings: Debits Owner Equity 3101 (Not an operating expense)
        offsetAccountCode = '3101';
        if (!partyName) partyName = 'مالك المركز (مسحوبات شخصية)';
      } else if (partyType === 'worker') {
        offsetAccountCode = '1202'; // Worker advances
        if (partyId) {
          const worker = db.prepare('SELECT name FROM workers WHERE id = ?').get(partyId);
          if (worker && !partyName) partyName = worker.name;
        }
      } else if (partyType === 'expense') {
        offsetAccountCode = data.offset_account_code || '6109'; // Operating expense
      } else {
        offsetAccountCode = voucherType === 'receipt' ? '4201' : '6109';
      }

      if (!partyName) {
        partyName = voucherType === 'receipt' ? 'عميل عام' : 'مستفيد عام';
      }

      const voucherNumber = data.voucher_number || generateVoucherNumber(voucherType);
      const description = (data.description || (voucherType === 'receipt' ? 'سند قبض نقدية' : 'سند صرف نقدية')).trim();
      const notes = data.notes ? data.notes.trim() : null;
      const createdBy = data.created_by || 'أمين الصندوق';

      // 1. Insert Voucher Record
      const insertStmt = db.prepare(`
        INSERT INTO official_vouchers (
          voucher_number, voucher_type, party_type, party_id, party_name,
          amount, payment_method, cash_account_code, offset_account_code,
          paper_bill_number, description, notes, prev_balance, new_balance,
          created_by, created_at
        ) VALUES (
          @voucher_number, @voucher_type, @party_type, @party_id, @party_name,
          @amount, @payment_method, @cash_account_code, @offset_account_code,
          @paper_bill_number, @description, @notes, @prev_balance, @new_balance,
          @created_by, COALESCE(@created_at, datetime('now', 'localtime'))
        )
      `);

      const result = insertStmt.run({
        voucher_number: voucherNumber,
        voucher_type: voucherType,
        party_type: partyType,
        party_id: partyId,
        party_name: partyName,
        amount,
        payment_method: paymentMethod,
        cash_account_code: cashAccountCode,
        offset_account_code: offsetAccountCode,
        paper_bill_number: paperBillNumber,
        description,
        notes,
        prev_balance: prevBalance,
        new_balance: newBalance,
        created_by: createdBy,
        created_at: data.created_at || null,
      });

      const voucherId = result.lastInsertRowid;

      // 2. Insert into daily_transactions if cash to keep drawer balance aligned
      if (paymentMethod === 'cash') {
        if (voucherType === 'payment') {
          db.prepare(`
            INSERT INTO daily_transactions (
              tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
            ) VALUES (
              'expense', ?, ?, ?, 'cash', ?, datetime('now', 'localtime')
            )
          `).run(
            partyType === 'worker' ? partyId : null,
            partyType === 'customer' ? partyId : null,
            amount,
            `سند صرف (${voucherNumber}): ${partyName} - ${description} ${paperBillNumber ? `[دفتر:${paperBillNumber}]` : ''}`
          );
        } else {
          db.prepare(`
            INSERT INTO daily_transactions (
              tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
            ) VALUES (
              'debt_collection', NULL, ?, ?, 'cash', ?, datetime('now', 'localtime')
            )
          `).run(
            partyType === 'customer' ? partyId : null,
            amount,
            `سند قبض (${voucherNumber}): ${partyName} - ${description} ${paperBillNumber ? `[دفتر:${paperBillNumber}]` : ''}`
          );
        }
      }

      // 3. Post to Central Accounting General Ledger
      const voucherObj = {
        id: voucherId,
        voucher_number: voucherNumber,
        voucher_type: voucherType,
        party_type: partyType,
        party_id: partyId,
        party_name: partyName,
        amount,
        payment_method: paymentMethod,
        cash_account_code: cashAccountCode,
        offset_account_code: offsetAccountCode,
        paper_bill_number: paperBillNumber,
        description,
        notes,
        created_at: data.created_at || null,
      };

      postOfficialVoucher(db, voucherObj);

      return voucherId;
    });

    const newId = execute();
    return this.getById(newId);
  },

  getCashDrawerSummary() {
    // Current cash in drawer 1101
    const rowCash = db.prepare(`
      SELECT 
        SUM(jl.debit) AS total_inflow,
        SUM(jl.credit) AS total_outflow
      FROM journal_lines jl
      WHERE jl.account_code = '1101'
    `).get();

    const inflow = Number(rowCash?.total_inflow) || 0;
    const outflow = Number(rowCash?.total_outflow) || 0;
    const netCash = roundMoney(inflow - outflow);

    // Bank & E-wallet balances
    const rowKuraimi = db.prepare(`
      SELECT SUM(jl.debit) - SUM(jl.credit) AS balance
      FROM journal_lines jl
      WHERE jl.account_code = '1102'
    `).get();

    const rowJeeb = db.prepare(`
      SELECT SUM(jl.debit) - SUM(jl.credit) AS balance
      FROM journal_lines jl
      WHERE jl.account_code = '1103'
    `).get();

    // Today's total cash drawer inflows and outflows from journal
    const todayJournal = db.prepare(`
      SELECT 
        SUM(CASE WHEN jl.debit > 0 THEN jl.debit ELSE 0 END) AS cash_inflow_today,
        SUM(CASE WHEN jl.credit > 0 THEN jl.credit ELSE 0 END) AS cash_outflow_today
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE jl.account_code = '1101'
        AND date(je.entry_date) = date('now', 'localtime')
    `).get();

    // Today's official vouchers summary
    const todayVouchers = db.prepare(`
      SELECT 
        SUM(CASE WHEN voucher_type = 'receipt' THEN amount ELSE 0 END) AS vouchers_receipt_today,
        SUM(CASE WHEN voucher_type = 'payment' THEN amount ELSE 0 END) AS vouchers_payment_today,
        COUNT(CASE WHEN voucher_type = 'receipt' THEN 1 END) AS count_receipts_today,
        COUNT(CASE WHEN voucher_type = 'payment' THEN 1 END) AS count_payments_today
      FROM official_vouchers
      WHERE date(created_at) = date('now', 'localtime')
    `).get();

    return {
      cash_drawer: {
        code: '1101',
        name: 'الصندوق النقدي الرئيسي (الدرج)',
        current_balance: netCash,
        total_inflow: inflow,
        total_outflow: outflow,
      },
      bank_kuraimi: {
        code: '1102',
        name: 'حساب بنك الكريمي',
        current_balance: roundMoney(Number(rowKuraimi?.balance) || 0),
      },
      e_wallet_jeeb: {
        code: '1103',
        name: 'محفظة جيب الإلكترونية',
        current_balance: roundMoney(Number(rowJeeb?.balance) || 0),
      },
      today: {
        cash_inflow: Number(todayJournal?.cash_inflow_today) || 0,
        cash_outflow: Number(todayJournal?.cash_outflow_today) || 0,
        vouchers_receipt_today: Number(todayVouchers?.vouchers_receipt_today) || 0,
        vouchers_payment_today: Number(todayVouchers?.vouchers_payment_today) || 0,
        count_receipts_today: Number(todayVouchers?.count_receipts_today) || 0,
        count_payments_today: Number(todayVouchers?.count_payments_today) || 0,
      },
    };
  },

  getCustomerDebts() {
    return db.prepare(`
      SELECT 
        cv.id,
        cv.plate_number,
        cv.customer_name,
        cv.phone,
        cv.car_make_model,
        cv.customer_type,
        cv.corporate_name,
        cv.balance_due,
        (SELECT MAX(created_at) FROM invoices WHERE vehicle_id = cv.id) AS last_service_date,
        (SELECT COUNT(*) FROM invoices WHERE vehicle_id = cv.id AND remaining_debt > 0) AS unpaid_invoices_count
      FROM customers_vehicles cv
      WHERE cv.balance_due > 0
      ORDER BY cv.balance_due DESC
    `).all();
  },

  // =========================================================================
  // STAGE 5 PRO UPGRADES METHODS
  // =========================================================================

  // Upgrade 2: Save Cash Drawer Actual Count vs System Ledger Balance
  saveCashDrawerAudit(data) {
    const physicalBalance = roundMoney(safeNum(data.physical_balance, 0));

    // Get current live system drawer balance (Account 1101)
    const rowCash = db.prepare(`
      SELECT 
        SUM(jl.debit) AS total_inflow,
        SUM(jl.credit) AS total_outflow
      FROM journal_lines jl
      WHERE jl.account_code = '1101'
    `).get();

    const inflow = Number(rowCash?.total_inflow) || 0;
    const outflow = Number(rowCash?.total_outflow) || 0;
    const systemBalance = roundMoney(inflow - outflow);

    const variance = roundMoney(physicalBalance - systemBalance);
    const status = variance === 0 ? 'matched' : (variance < 0 ? 'shortage' : 'overage');
    const notes = data.notes ? data.notes.trim() : null;
    const createdBy = data.created_by || 'أمين الصندوق';

    const stmt = db.prepare(`
      INSERT INTO cash_drawer_audits (
        system_balance, physical_balance, variance, status, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const info = stmt.run(systemBalance, physicalBalance, variance, status, notes, createdBy);
    return this.getCashDrawerAuditById(info.lastInsertRowid);
  },

  getCashDrawerAuditById(id) {
    return db.prepare('SELECT * FROM cash_drawer_audits WHERE id = ?').get(id);
  },

  getCashDrawerAudits(limit = 30) {
    return db.prepare('SELECT * FROM cash_drawer_audits ORDER BY id DESC LIMIT ?').all(limit);
  },

  adjustCashDrawerVariance(auditId) {
    const audit = this.getCashDrawerAuditById(auditId);
    if (!audit) throw new Error('سجل الجرد والمطابقة غير موجود');
    if (audit.variance === 0) {
      return { adjusted: false, message: 'الرصيد مطابق تماماً، لا يوجد عجز أو زيادة لتسويتها' };
    }

    const variance = Number(audit.variance);
    const absVariance = Math.abs(variance);
    const execute = db.transaction(() => {
      let jv;
      if (variance < 0) {
        // Shortage (عجز صندوق): Debit Operating Expense 6109, Credit Cash 1101
        jv = createJournalEntry(db, {
          entry_date: formatDate(),
          ref_type: 'expense',
          ref_id: audit.id,
          ref_number: `ADJ-AUDIT-${audit.id}`,
          description: `قيد تسوية عجز الصندوق النقدي بموجب محضر المطابقة #${audit.id}`,
          lines: [
            {
              account_code: '6109',
              debit: absVariance,
              credit: 0,
              description: `تسوية عجز نقدي في الصندوق (محضر #${audit.id})`,
            },
            {
              account_code: '1101',
              debit: 0,
              credit: absVariance,
              description: `خصم عجز النقدية من الصندوق (محضر #${audit.id})`,
            },
          ],
        });
      } else {
        // Overage (زيادة نقدية): Debit Cash 1101, Credit Miscellaneous Revenue 4201
        jv = createJournalEntry(db, {
          entry_date: formatDate(),
          ref_type: 'closing_entry',
          ref_id: audit.id,
          ref_number: `ADJ-AUDIT-${audit.id}`,
          description: `قيد تسوية زيادة الصندوق النقدي بموجب محضر المطابقة #${audit.id}`,
          lines: [
            {
              account_code: '1101',
              debit: absVariance,
              credit: 0,
              description: `توريد زيادة نقدية فعلية بالصندوق (محضر #${audit.id})`,
            },
            {
              account_code: '4201',
              debit: 0,
              credit: absVariance,
              description: `قيد إيراد زيادة نقدية بالصندوق (محضر #${audit.id})`,
            },
          ],
        });
      }

      // Update notes in audit record
      db.prepare(`
        UPDATE cash_drawer_audits 
        SET notes = COALESCE(notes || ' | ', '') || 'تم ترحيل قيد التسوية المحاسبي ' || ?
        WHERE id = ?
      `).run(jv.entry_number, audit.id);

      return jv;
    });

    const jv = execute();
    return {
      adjusted: true,
      message: 'تم ترحيل قيد التسوية المحاسبي المزدوج وتحديث رصيد الصندوق بنجاح',
      journal_entry: jv,
      audit: this.getCashDrawerAuditById(auditId),
    };
  },

  // Upgrade 3: Owner Drawings vs Current Month Operating Profit
  getOwnerDrawingsAnalytics() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Total owner drawings this month
    const drawingsRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_drawings
      FROM official_vouchers
      WHERE voucher_type = 'payment'
        AND party_type = 'owner'
        AND strftime('%Y-%m', created_at) = ?
    `).get(currentMonth);

    const totalDrawings = Number(drawingsRow?.total_drawings) || 0;

    // 2. Net Operating Profit for this month
    const incomeStmt = getIncomeStatement(db, {
      start_date: `${currentMonth}-01`,
      end_date: `${currentMonth}-31`,
    });

    const netOperatingProfit = Number(incomeStmt?.net_operating_profit) || 0;

    // 3. Ratio & Status calculation
    let ratio = 0;
    let status = 'safe'; // 'safe', 'caution', 'danger', 'zero'

    if (totalDrawings === 0) {
      status = 'zero';
      ratio = 0;
    } else if (netOperatingProfit <= 0) {
      status = 'danger';
      ratio = 100;
    } else {
      ratio = roundMoney((totalDrawings / netOperatingProfit) * 100);
      if (ratio <= 70) {
        status = 'safe';
      } else if (ratio <= 100) {
        status = 'caution';
      } else {
        status = 'danger';
      }
    }

    const safeCapAmount = roundMoney(Math.max(0, netOperatingProfit * 0.7));

    return {
      current_month: currentMonth,
      net_operating_profit: netOperatingProfit,
      total_drawings: totalDrawings,
      ratio_percent: ratio,
      safe_cap_amount: safeCapAmount,
      status,
      working_capital_protected: status !== 'danger',
    };
  },

  // Upgrade 5: Cash Flow Analytics (Daily Inflows & Outflows for Account 1101)
  getCashFlowAnalytics(days = 7) {
    const numDays = Math.max(3, Math.min(90, parseInt(days, 10) || 7));
    const offsetStr = `-${numDays - 1} days`;

    const rows = db.prepare(`
      SELECT 
        date(je.entry_date) AS day_date,
        ROUND(SUM(CASE WHEN jl.debit > 0 THEN jl.debit ELSE 0 END), 2) AS inflow,
        ROUND(SUM(CASE WHEN jl.credit > 0 THEN jl.credit ELSE 0 END), 2) AS outflow,
        ROUND(SUM(CASE WHEN jl.debit > 0 THEN jl.debit ELSE 0 END) - SUM(CASE WHEN jl.credit > 0 THEN jl.credit ELSE 0 END), 2) AS net_cash
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE jl.account_code = '1101'
        AND date(je.entry_date) >= date('now', 'localtime', ?)
      GROUP BY date(je.entry_date)
      ORDER BY day_date ASC
    `).all(offsetStr);

    let totalInflow = 0;
    let totalOutflow = 0;
    let peakInflowDay = null;
    let maxInflow = -1;

    for (const r of rows) {
      totalInflow = roundMoney(totalInflow + r.inflow);
      totalOutflow = roundMoney(totalOutflow + r.outflow);
      if (r.inflow > maxInflow) {
        maxInflow = r.inflow;
        peakInflowDay = r.day_date;
      }
    }

    return {
      period_days: numDays,
      daily_timeline: rows,
      summary: {
        total_inflow: totalInflow,
        total_outflow: totalOutflow,
        net_cash_flow: roundMoney(totalInflow - totalOutflow),
        daily_average_inflow: roundMoney(totalInflow / (rows.length || 1)),
        peak_inflow_day: peakInflowDay,
        peak_inflow_amount: maxInflow > 0 ? maxInflow : 0,
      },
    };
  },
};

module.exports = voucherModel;
