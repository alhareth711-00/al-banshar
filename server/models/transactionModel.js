const db = require('../db/database');
const { roundMoney, safeNum } = require('../utils/mathPrecision');
const { postExpense, postDebtCollection, postWorkerAdvance } = require('../utils/accountingEngine');

const transactionModel = {
  getAll(filters = {}) {
    let query = `
      SELECT 
        dt.*,
        w.name AS worker_name,
        cv.plate_number,
        cv.customer_name
      FROM daily_transactions dt
      LEFT JOIN workers w ON dt.worker_id = w.id
      LEFT JOIN customers_vehicles cv ON dt.vehicle_id = cv.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.date) {
      const targetDate = filters.date === 'today' ? new Date().toISOString().split('T')[0] : filters.date;
      query += ' AND date(dt.created_at) = date(?)';
      params.push(targetDate);
    }

    if (filters.tx_type) {
      query += ' AND dt.tx_type = ?';
      params.push(filters.tx_type);
    }

    if (filters.worker_id) {
      query += ' AND dt.worker_id = ?';
      params.push(filters.worker_id);
    }

    const limit = filters.limit ? Number(filters.limit) : (filters.date ? 500 : 100);
    query += ` ORDER BY dt.id DESC LIMIT ${limit}`;
    return db.prepare(query).all(...params);
  },

  getById(id) {
    return db.prepare(`
      SELECT 
        dt.*,
        w.name AS worker_name,
        cv.plate_number,
        cv.customer_name
      FROM daily_transactions dt
      LEFT JOIN workers w ON dt.worker_id = w.id
      LEFT JOIN customers_vehicles cv ON dt.vehicle_id = cv.id
      WHERE dt.id = ?
    `).get(id);
  },

  create(data) {
    const execute = db.transaction(() => {
      const amount = roundMoney(safeNum(data.amount, 0));
      if (amount <= 0) {
        throw new Error('المبلغ يجب أن يكون رقماً موجباً أكبر من الصفر');
      }

      const stmt = db.prepare(`
        INSERT INTO daily_transactions (
          tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
        ) VALUES (
          @tx_type, @worker_id, @vehicle_id, @amount, @payment_method, @description,
          COALESCE(@created_at, datetime('now', 'localtime'))
        )
      `);

      const result = stmt.run({
        tx_type: data.tx_type,
        worker_id: data.worker_id || null,
        vehicle_id: data.vehicle_id || null,
        amount,
        payment_method: data.payment_method || 'cash',
        description: data.description.trim(),
        created_at: data.created_at || null,
      });

      const txId = result.lastInsertRowid;

      // If debt collection, reduce customer vehicle balance_due and settle invoices FIFO
      if (data.tx_type === 'debt_collection' && data.vehicle_id) {
        db.prepare(`
          UPDATE customers_vehicles 
          SET balance_due = MAX(0, balance_due - ?) 
          WHERE id = ?
        `).run(amount, data.vehicle_id);

        const unpaidInvoices = db.prepare(`
          SELECT id, invoice_number, remaining_debt, paid_amount
          FROM invoices
          WHERE vehicle_id = ? AND remaining_debt > 0
          ORDER BY id ASC
        `).all(data.vehicle_id);

        let remainingToSettle = amount;
        for (const inv of unpaidInvoices) {
          if (remainingToSettle <= 0) break;
          const billDebt = Number(inv.remaining_debt) || 0;
          const settleAmt = Math.min(billDebt, remainingToSettle);
          db.prepare(`
            UPDATE invoices
            SET 
              paid_amount = paid_amount + ?,
              remaining_debt = MAX(0, remaining_debt - ?)
            WHERE id = ?
          `).run(settleAmt, settleAmt, inv.id);
          remainingToSettle = remainingToSettle - settleAmt;
        }
      }

      // Auto-post to Central Accounting General Ledger
      const txObj = {
        id: txId,
        tx_type: data.tx_type,
        worker_id: data.worker_id || null,
        vehicle_id: data.vehicle_id || null,
        amount,
        payment_method: data.payment_method || 'cash',
        description: data.description.trim(),
        created_at: data.created_at || null,
      };

      if (data.tx_type === 'expense') {
        postExpense(db, txObj);
      } else if (data.tx_type === 'debt_collection') {
        postDebtCollection(db, txObj);
      } else if (data.tx_type === 'worker_advance') {
        postWorkerAdvance(db, txObj);
      }

      return txId;
    });

    const id = execute();
    return this.getById(id);
  },
};

module.exports = transactionModel;
