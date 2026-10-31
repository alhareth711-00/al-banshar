const db = require('../db/database');
const { formatDate } = require('../utils/helpers');
const { roundMoney, safeNum } = require('../utils/mathPrecision');

function generateShiftCode() {
  const today = formatDate().replace(/-/g, '');
  const prefix = `SH-${today}-`;
  const lastShift = db.prepare(`
    SELECT shift_code FROM cash_shifts 
    WHERE shift_code LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastShift && lastShift.shift_code) {
    const parts = lastShift.shift_code.split('-');
    const seqStr = parts[parts.length - 1];
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

function getLiveCashDrawerBalance() {
  const row = db.prepare(`
    SELECT 
      COALESCE(SUM(jl.debit), 0) AS total_debit,
      COALESCE(SUM(jl.credit), 0) AS total_credit
    FROM journal_lines jl
    WHERE jl.account_code = '1101'
  `).get();
  return roundMoney((row?.total_debit || 0) - (row?.total_credit || 0));
}

const shiftModel = {
  getCurrentShift() {
    const shift = db.prepare(`
      SELECT 
        s.*,
        w.name AS worker_name_from_db
      FROM cash_shifts s
      LEFT JOIN workers w ON s.worker_id = w.id
      WHERE s.status = 'open'
      ORDER BY s.id DESC
      LIMIT 1
    `).get();

    const currentDrawerBalance = getLiveCashDrawerBalance();

    if (!shift) {
      return {
        has_active_shift: false,
        shift: null,
        current_drawer_balance: currentDrawerBalance,
      };
    }

    const cashierName = shift.cashier_name || shift.worker_name_from_db || 'كاشير المناوبة';

    // 1. Shift POS Invoices stats
    const invStats = db.prepare(`
      SELECT 
        COUNT(*) AS invoices_count,
        COUNT(DISTINCT vehicle_id) AS cars_served,
        COALESCE(SUM(net_total), 0) AS total_sales,
        COALESCE(SUM(paid_amount), 0) AS total_collected,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN paid_amount ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_method != 'cash' AND payment_method != 'credit' THEN paid_amount ELSE 0 END), 0) AS ewallet_sales,
        COALESCE(SUM(remaining_debt), 0) AS new_debts
      FROM invoices
      WHERE created_at >= ?
    `).get(shift.opened_at);

    // 2. Shift Cash Receipt Vouchers (RV)
    const rvStats = db.prepare(`
      SELECT 
        COUNT(*) AS count_rv,
        COALESCE(SUM(amount), 0) AS total_rv_cash
      FROM official_vouchers
      WHERE voucher_type = 'receipt' AND payment_method = 'cash' AND created_at >= ?
    `).get(shift.opened_at);

    // 3. Shift Cash Payment Vouchers (PV)
    const pvStats = db.prepare(`
      SELECT 
        COUNT(*) AS count_pv,
        COALESCE(SUM(amount), 0) AS total_pv_cash,
        COALESCE(SUM(CASE WHEN party_type = 'owner' THEN amount ELSE 0 END), 0) AS owner_drawings_cash,
        COALESCE(SUM(CASE WHEN party_type = 'expense' THEN amount ELSE 0 END), 0) AS expenses_cash,
        COALESCE(SUM(CASE WHEN party_type = 'supplier' THEN amount ELSE 0 END), 0) AS supplier_payments_cash,
        COALESCE(SUM(CASE WHEN party_type = 'worker' THEN amount ELSE 0 END), 0) AS worker_advances_cash
      FROM official_vouchers
      WHERE voucher_type = 'payment' AND payment_method = 'cash' AND created_at >= ?
    `).get(shift.opened_at);

    // 4. Shift Purchases paid from cash drawer
    const purStats = db.prepare(`
      SELECT 
        COUNT(*) AS count_purchases,
        COALESCE(SUM(paid_amount), 0) AS purchases_cash,
        COALESCE(SUM(CASE WHEN shipping_payer = 'cash_drawer' THEN shipping_cost ELSE 0 END), 0) AS shipping_cash
      FROM purchases
      WHERE payment_method = 'cash' AND paid_from_cash_drawer = 1 AND created_at >= ?
    `).get(shift.opened_at);

    const shiftCashInflow = roundMoney((invStats.cash_sales || 0) + (rvStats.total_rv_cash || 0));
    const shiftCashOutflow = roundMoney(
      (pvStats.total_pv_cash || 0) +
      (purStats.purchases_cash || 0) +
      (purStats.shipping_cash || 0)
    );

    const expectedCashInDrawer = roundMoney(shift.opening_cash + shiftCashInflow - shiftCashOutflow);

    return {
      has_active_shift: true,
      current_drawer_balance: currentDrawerBalance,
      shift: {
        ...shift,
        cashier_name: cashierName,
        metrics: {
          invoices_count: invStats.invoices_count || 0,
          cars_served: invStats.cars_served || 0,
          total_sales: invStats.total_sales || 0,
          cash_sales: invStats.cash_sales || 0,
          ewallet_sales: invStats.ewallet_sales || 0,
          new_debts: invStats.new_debts || 0,
          rv_cash: rvStats.total_rv_cash || 0,
          pv_cash: pvStats.total_pv_cash || 0,
          owner_drawings: pvStats.owner_drawings_cash || 0,
          expenses: pvStats.expenses_cash || 0,
          supplier_payments: pvStats.supplier_payments_cash || 0,
          worker_advances: pvStats.worker_advances_cash || 0,
          purchases_cash: purStats.purchases_cash || 0,
          shipping_cash: purStats.shipping_cash || 0,
          shift_inflow: shiftCashInflow,
          shift_outflow: shiftCashOutflow,
          opening_cash: shift.opening_cash,
          expected_cash: expectedCashInDrawer,
        },
      },
    };
  },

  openShift(data = {}) {
    // Check if open shift already exists
    const existing = db.prepare("SELECT id, shift_code FROM cash_shifts WHERE status = 'open' LIMIT 1").get();
    if (existing) {
      throw new Error(`توجد بالفعل وردية مفتوحة حالياً برقم (${existing.shift_code}). يجب إغلاقها أولاً قبل فتح وردية جديدة.`);
    }

    const shiftCode = generateShiftCode();
    const workerId = data.worker_id ? Number(data.worker_id) : null;
    let cashierName = (data.cashier_name || '').trim();

    if (!cashierName && workerId) {
      const w = db.prepare('SELECT name FROM workers WHERE id = ?').get(workerId);
      if (w) cashierName = w.name;
    }
    if (!cashierName) cashierName = 'كاشير المناوبة';

    let openingCash = data.opening_cash !== undefined ? safeNum(data.opening_cash, 0) : getLiveCashDrawerBalance();
    openingCash = roundMoney(openingCash);

    const notes = data.notes ? data.notes.trim() : null;

    const stmt = db.prepare(`
      INSERT INTO cash_shifts (
        shift_code, worker_id, cashier_name, opened_at,
        opening_cash, expected_cash, status, notes
      ) VALUES (
        @shift_code, @worker_id, @cashier_name, datetime('now', 'localtime'),
        @opening_cash, @opening_cash, 'open', @notes
      )
    `);

    const res = stmt.run({
      shift_code: shiftCode,
      worker_id: workerId,
      cashier_name: cashierName,
      opening_cash: openingCash,
      notes,
    });

    return this.getShiftById(res.lastInsertRowid);
  },

  closeShift(data = {}) {
    const execute = db.transaction(() => {
      const shiftId = data.shift_id ? Number(data.shift_id) : null;
      let shift = null;

      if (shiftId) {
        shift = db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(shiftId);
      } else {
        shift = db.prepare("SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1").get();
      }

      if (!shift) {
        throw new Error('لا توجد وردية مفتوحة لإغلاقها.');
      }
      if (shift.status === 'closed') {
        throw new Error(`الوردية (${shift.shift_code}) مغلقة مسبقاً.`);
      }

      // Compute live shift stats
      const currentShiftData = this.getCurrentShift();
      const metrics = currentShiftData.shift?.metrics || {};
      const expectedCash = metrics.expected_cash !== undefined ? metrics.expected_cash : shift.opening_cash;
      const actualCash = roundMoney(safeNum(data.actual_cash, expectedCash));
      const difference = roundMoney(actualCash - expectedCash);

      const handedOverTo = (data.handed_over_to || 'المناوب القادم').trim();
      const notes = data.notes ? data.notes.trim() : shift.notes;

      // 1. Update Shift Status
      db.prepare(`
        UPDATE cash_shifts
        SET 
          closed_at = datetime('now', 'localtime'),
          expected_cash = ?,
          actual_cash = ?,
          difference = ?,
          total_inflow = ?,
          total_outflow = ?,
          handed_over_to = ?,
          status = 'closed',
          notes = ?
        WHERE id = ?
      `).run(
        expectedCash,
        actualCash,
        difference,
        metrics.shift_inflow || 0,
        metrics.shift_outflow || 0,
        handedOverTo,
        notes,
        shift.id
      );

      // 2. Generate Automated Accounting Settlement Journal Entry if difference != 0
      let settlementJv = null;
      if (difference !== 0) {
        const absDiff = Math.abs(difference);
        const today = formatDate();
        const { createJournalEntry } = require('../utils/accountingEngine');

        if (difference < 0) {
          // Deficit (عجز عهدة الصندوق): Debit 6109 (تسوية عجز صندوق), Credit 1101 (الصندوق النقدي)
          settlementJv = createJournalEntry(db, {
            entry_date: today,
            ref_type: 'expense',
            ref_id: shift.id,
            ref_number: `ADJ-SHF-${shift.shift_code}`,
            description: `قيد تسوية عجز الصندوق النقدي لوردية (${shift.shift_code}) - الكاشير: ${shift.cashier_name || 'الكاشير'}`,
            lines: [
              {
                account_code: '6109',
                debit: absDiff,
                credit: 0,
                description: `عجز عهدة نقدية وردية (${shift.shift_code})`,
              },
              {
                account_code: '1101',
                debit: 0,
                credit: absDiff,
                description: `خصم وتسوية عجز الصندوق وردية (${shift.shift_code})`,
              },
            ],
          });
        } else {
          // Surplus (فائض نقدي في الصندوق): Debit 1101 (الصندوق النقدي), Credit 4201 (إيرادات نقدية متنوعة)
          settlementJv = createJournalEntry(db, {
            entry_date: today,
            ref_type: 'closing_entry',
            ref_id: shift.id,
            ref_number: `ADJ-SHF-${shift.shift_code}`,
            description: `قيد تسوية زيادة وفائض الصندوق النقدي لوردية (${shift.shift_code}) - الكاشير: ${shift.cashier_name || 'الكاشير'}`,
            lines: [
              {
                account_code: '1101',
                debit: absDiff,
                credit: 0,
                description: `توريد زيادة نقدية فعلية بالصندوق وردية (${shift.shift_code})`,
              },
              {
                account_code: '4201',
                debit: 0,
                credit: absDiff,
                description: `إيراد زيادة نقدية عهدة وردية (${shift.shift_code})`,
              },
            ],
          });
        }

        // Financial Audit Log
        try {
          db.prepare(`
            INSERT INTO financial_audit_logs (
              action, entity_type, entity_id, old_data, new_data, performed_by, created_at
            ) VALUES (?, 'cash_shift', ?, ?, ?, ?, datetime('now', 'localtime'))
          `).run(
            'SHIFT_CLOSED_SETTLEMENT',
            shift.id,
            JSON.stringify({ expected: expectedCash, actual: actualCash }),
            JSON.stringify({ difference, jv_number: settlementJv?.entry_number }),
            shift.cashier_name || 'cashier'
          );
        } catch (auditErr) {}
      }

      const closedShift = this.getShiftById(shift.id);
      return {
        ...closedShift,
        settlement_jv: settlementJv?.entry_number || null,
      };
    });

    return execute();
  },

  getShiftById(id) {
    const shift = db.prepare(`
      SELECT 
        s.*,
        w.name AS worker_name_from_db
      FROM cash_shifts s
      LEFT JOIN workers w ON s.worker_id = w.id
      WHERE s.id = ?
    `).get(id);

    if (!shift) return null;
    shift.cashier_name = shift.cashier_name || shift.worker_name_from_db || 'كاشير المناوبة';
    return shift;
  },

  getShiftHistory(filters = {}) {
    let query = `
      SELECT 
        s.*,
        w.name AS worker_name_from_db
      FROM cash_shifts s
      LEFT JOIN workers w ON s.worker_id = w.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }
    if (filters.date) {
      query += ' AND date(s.opened_at) = date(?)';
      params.push(filters.date);
    }

    query += ' ORDER BY s.id DESC LIMIT 50';
    const rows = db.prepare(query).all(...params);

    return rows.map((r) => ({
      ...r,
      cashier_name: r.cashier_name || r.worker_name_from_db || 'كاشير المناوبة',
    }));
  },

  getShiftSlip(id) {
    const shift = this.getShiftById(id);
    if (!shift) return null;

    // Get invoices within this shift
    const invoices = db.prepare(`
      SELECT 
        i.invoice_number,
        i.created_at,
        i.net_total,
        i.paid_amount,
        i.payment_method,
        cv.plate_number,
        cv.customer_name
      FROM invoices i
      JOIN customers_vehicles cv ON i.vehicle_id = cv.id
      WHERE i.created_at >= ? ${shift.closed_at ? 'AND i.created_at <= ?' : ''}
      ORDER BY i.id ASC
    `).all(...(shift.closed_at ? [shift.opened_at, shift.closed_at] : [shift.opened_at]));

    return {
      shift,
      invoices,
      invoices_count: invoices.length,
    };
  },
};

module.exports = shiftModel;
