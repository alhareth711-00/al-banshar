const db = require('../db/database');
const { roundMoney, safeNum } = require('../utils/mathPrecision');
const { formatDate } = require('../utils/helpers');
const { postSupplierPayment } = require('../utils/accountingEngine');

function generateVoucherNumber() {
  const today = formatDate().replace(/-/g, '');
  const prefix = `PV-${today}-`;
  
  const lastEntry = db.prepare(`
    SELECT voucher_number FROM supplier_payment_vouchers 
    WHERE voucher_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastEntry && lastEntry.voucher_number) {
    const parts = lastEntry.voucher_number.split('-');
    const seqStr = parts[parts.length - 1];
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  // Also check official_vouchers to avoid any collision
  try {
    const lastOfficial = db.prepare(`
      SELECT voucher_number FROM official_vouchers 
      WHERE voucher_number LIKE ? 
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    if (lastOfficial && lastOfficial.voucher_number) {
      const parts = lastOfficial.voucher_number.split('-');
      const seqStr = parts[parts.length - 1];
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed >= nextSeq) {
        nextSeq = parsed + 1;
      }
    }
  } catch (e) {
    // ignore
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

const supplierModel = {
  getAll() {
    return db.prepare(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) AS total_bills,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE supplier_id = s.id) AS total_purchased,
        (SELECT COUNT(*) FROM purchase_returns WHERE supplier_id = s.id) AS total_returns
      FROM suppliers s
      ORDER BY s.id DESC
    `).all();
  },

  getById(id) {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!supplier) return null;

    supplier.purchases = db.prepare(`
      SELECT * FROM purchases WHERE supplier_id = ? ORDER BY id DESC LIMIT 20
    `).all(id);

    supplier.returns = db.prepare(`
      SELECT * FROM purchase_returns WHERE supplier_id = ? ORDER BY id DESC LIMIT 20
    `).all(id);

    return supplier;
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO suppliers (
        name, phone, company_name, agency_brand, commercial_reg, credit_days, balance_due, notes
      ) VALUES (
        @name, @phone, @company_name, @agency_brand, @commercial_reg, @credit_days, @balance_due, @notes
      )
    `);

    const result = stmt.run({
      name: data.name.trim(),
      phone: data.phone ? data.phone.trim() : null,
      company_name: data.company_name ? data.company_name.trim() : null,
      agency_brand: data.agency_brand ? data.agency_brand.trim() : null,
      commercial_reg: data.commercial_reg ? data.commercial_reg.trim() : null,
      credit_days: Number(data.credit_days) || 30,
      balance_due: Number(data.balance_due) || 0,
      notes: data.notes || null,
    });

    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE suppliers SET
        name = @name,
        phone = @phone,
        company_name = @company_name,
        agency_brand = @agency_brand,
        commercial_reg = @commercial_reg,
        credit_days = @credit_days,
        balance_due = @balance_due,
        notes = @notes
      WHERE id = @id
    `);

    stmt.run({
      id,
      name: data.name ? data.name.trim() : existing.name,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      company_name: data.company_name !== undefined ? data.company_name : existing.company_name,
      agency_brand: data.agency_brand !== undefined ? data.agency_brand : existing.agency_brand,
      commercial_reg: data.commercial_reg !== undefined ? data.commercial_reg : existing.commercial_reg,
      credit_days: data.credit_days !== undefined ? Number(data.credit_days) : existing.credit_days,
      balance_due: data.balance_due !== undefined ? Number(data.balance_due) : existing.balance_due,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    });

    return this.getById(id);
  },

  paySupplierDebt(id, { amount, payment_method = 'cash', notes }) {
    const execute = db.transaction(() => {
      const supplier = this.getById(id);
      if (!supplier) {
        throw new Error('المورد غير موجود');
      }

      const payAmount = roundMoney(safeNum(amount, 0));
      if (payAmount <= 0) {
        throw new Error('مبلغ السداد يجب أن يكون أكبر من الصفر');
      }

      const voucherNumber = generateVoucherNumber();
      const prevBalance = Number(supplier.balance_due) || 0;
      const newBalance = Math.max(0, prevBalance - payAmount);

      // Deduct from supplier balance
      db.prepare(`
        UPDATE suppliers 
        SET balance_due = MAX(0, balance_due - ?) 
        WHERE id = ?
      `).run(payAmount, id);

      // Record outflow in daily transactions if cash
      if (payment_method === 'cash') {
        db.prepare(`
          INSERT INTO daily_transactions (
            tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
          ) VALUES (
            'expense', NULL, NULL, ?, 'cash', ?, datetime('now', 'localtime')
          )
        `).run(
          payAmount,
          `سداد دفعة حساب للمورد: ${supplier.name} (${voucherNumber}) ${notes ? `[${notes}]` : ''}`
        );
      }

      // Auto-post to Central Accounting General Ledger
      postSupplierPayment(db, {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        amount: payAmount,
        payment_method,
        notes: `${voucherNumber} - ${notes || 'سداد دفعة حساب مورد'}`,
      });

      // Record in dedicated payment vouchers archive table
      db.prepare(`
        INSERT INTO supplier_payment_vouchers (
          voucher_number, supplier_id, supplier_name, amount, payment_method,
          prev_balance, new_balance, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        voucherNumber,
        supplier.id,
        supplier.name,
        payAmount,
        payment_method,
        prevBalance,
        newBalance,
        notes || null
      );

      const voucher = {
        voucher_number: voucherNumber,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        company_name: supplier.company_name,
        phone: supplier.phone,
        amount: payAmount,
        payment_method,
        prev_balance: prevBalance,
        new_balance: newBalance,
        notes: notes || null,
        created_at: new Date().toLocaleString('ar-YE'),
      };

      return {
        supplier: this.getById(id),
        voucher,
      };
    });

    return execute();
  },

  getPaymentVouchers(filters = {}) {
    let query = `
      SELECT 
        spv.*,
        s.company_name AS supplier_company,
        s.phone AS supplier_phone,
        s.agency_brand AS supplier_brand
      FROM supplier_payment_vouchers spv
      LEFT JOIN suppliers s ON spv.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.supplier_id) {
      query += ' AND spv.supplier_id = ?';
      params.push(filters.supplier_id);
    }

    if (filters.date) {
      query += ' AND date(spv.created_at) = date(?)';
      params.push(filters.date);
    }

    if (filters.search) {
      query += ' AND (spv.voucher_number LIKE ? OR spv.supplier_name LIKE ? OR spv.notes LIKE ?)';
      const s = `%${filters.search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY spv.id DESC LIMIT 200';
    return db.prepare(query).all(...params);
  },

  getPaymentVoucherById(id) {
    return db.prepare(`
      SELECT 
        spv.*,
        s.company_name AS supplier_company,
        s.phone AS supplier_phone,
        s.agency_brand AS supplier_brand
      FROM supplier_payment_vouchers spv
      LEFT JOIN suppliers s ON spv.supplier_id = s.id
      WHERE spv.id = ? OR spv.voucher_number = ?
    `).get(id, id);
  },
};

module.exports = supplierModel;
