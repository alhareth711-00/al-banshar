const db = require('../db/database');
const { roundMoney, safeNum } = require('../utils/mathPrecision');
const { formatDate } = require('../utils/helpers');
const { postSupplierPayment } = require('../utils/accountingEngine');

function logAudit(action, entity_type, entity_id, old_data, new_data, performed_by = 'system') {
  try {
    db.prepare(`
      INSERT INTO financial_audit_logs (
        action, entity_type, entity_id, old_data, new_data, performed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(
      action,
      entity_type,
      entity_id || null,
      old_data ? (typeof old_data === 'string' ? old_data : JSON.stringify(old_data)) : null,
      new_data ? (typeof new_data === 'string' ? new_data : JSON.stringify(new_data)) : null,
      performed_by
    );
  } catch (e) {
    console.warn('[AuditLog] Failed to log:', e.message);
  }
}

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
  getAll(filters = {}) {
    let query = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) AS total_bills,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE supplier_id = s.id) AS total_purchased,
        (SELECT COUNT(*) FROM purchase_returns WHERE supplier_id = s.id) AS total_returns
      FROM suppliers s
      WHERE 1=1
    `;
    const params = [];

    if (filters.is_active !== undefined && filters.is_active !== 'all') {
      query += ' AND s.is_active = ?';
      params.push(Number(filters.is_active));
    }

    if (filters.search) {
      query += ' AND (s.name LIKE ? OR s.company_name LIKE ? OR s.phone LIKE ? OR s.agency_brand LIKE ?)';
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY s.is_active DESC, s.id DESC';
    return db.prepare(query).all(...params);
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
        name, phone, company_name, agency_brand, commercial_reg, credit_days, balance_due, is_active, notes
      ) VALUES (
        @name, @phone, @company_name, @agency_brand, @commercial_reg, @credit_days, @balance_due, @is_active, @notes
      )
    `);

    const trimmedName = data.name.trim();
    const result = stmt.run({
      name: trimmedName,
      phone: data.phone ? data.phone.trim() : null,
      company_name: data.company_name ? data.company_name.trim() : null,
      agency_brand: data.agency_brand ? data.agency_brand.trim() : null,
      commercial_reg: data.commercial_reg ? data.commercial_reg.trim() : null,
      credit_days: Number(data.credit_days) || 30,
      balance_due: Number(data.balance_due) || 0,
      is_active: data.is_active !== undefined ? (Number(data.is_active) ? 1 : 0) : 1,
      notes: data.notes || null,
    });

    const newSupplier = this.getById(result.lastInsertRowid);
    logAudit('CREATE_SUPPLIER', 'supplier', result.lastInsertRowid, null, newSupplier);
    return newSupplier;
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
        is_active = @is_active,
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
      is_active: data.is_active !== undefined ? (Number(data.is_active) ? 1 : 0) : existing.is_active,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    });

    const updated = this.getById(id);
    logAudit('UPDATE_SUPPLIER', 'supplier', id, existing, updated);
    return updated;
  },

  toggleActive(id) {
    const supplier = this.getById(id);
    if (!supplier) return null;

    const newStatus = supplier.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE suppliers SET is_active = ? WHERE id = ?').run(newStatus, id);

    const updated = this.getById(id);
    logAudit(
      newStatus === 1 ? 'ACTIVATE_SUPPLIER' : 'DEACTIVATE_SUPPLIER',
      'supplier',
      id,
      { is_active: supplier.is_active },
      { is_active: newStatus }
    );
    return updated;
  },

  delete(id) {
    const execute = db.transaction(() => {
      const supplier = this.getById(id);
      if (!supplier) {
        throw new Error('المورد غير موجود');
      }

      // 1. Check if supplier has non-zero balance
      if (Number(supplier.balance_due) > 0) {
        throw new Error(`لا يمكن حذف المورد لوجود رصيد دين مستحق له بقيمة (${Number(supplier.balance_due).toLocaleString()} ر.ي). يرجى تصفية الحساب أولاً أو تعطيل المورد.`);
      }

      // 2. Check for linked purchase invoices
      const purchasesCount = db.prepare('SELECT COUNT(*) AS count FROM purchases WHERE supplier_id = ?').get(id)?.count || 0;
      if (purchasesCount > 0) {
        throw new Error(`لا يمكن حذف المورد نهائياً لوجود (${purchasesCount}) فواتير مشتريات وتوريد مخزني مرتبطة به محاسبياً. يمكنك تعطيل المورد بدلاً من حذفه.`);
      }

      // 3. Check for linked purchase returns
      const returnsCount = db.prepare('SELECT COUNT(*) AS count FROM purchase_returns WHERE supplier_id = ?').get(id)?.count || 0;
      if (returnsCount > 0) {
        throw new Error(`لا يمكن حذف المورد لوجود (${returnsCount}) سندات مرتجع مشتريات مرتبطة به.`);
      }

      // 4. Check for linked payment vouchers
      const vouchersCount = db.prepare('SELECT COUNT(*) AS count FROM supplier_payment_vouchers WHERE supplier_id = ?').get(id)?.count || 0;
      if (vouchersCount > 0) {
        throw new Error(`لا يمكن حذف المورد لوجود (${vouchersCount}) سندات صرف مسجلة باسمه.`);
      }

      // Perform clean hard delete
      db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
      logAudit('DELETE_SUPPLIER', 'supplier', id, supplier, null);

      return { success: true, message: 'تم حذف المورد بنجاح' };
    });

    return execute();
  },

  paySupplierDebt(id, { amount, payment_method = 'cash', notes, purchase_id }) {
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

      // 1. Deduct from supplier balance
      db.prepare(`
        UPDATE suppliers 
        SET balance_due = MAX(0, balance_due - ?) 
        WHERE id = ?
      `).run(payAmount, id);

      // 2. Cross-Module Data Integrity: Settle linked purchase bill(s) remaining_debt
      if (purchase_id) {
        const targetBill = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchase_id);
        if (targetBill) {
          const billDebt = Number(targetBill.remaining_debt) || 0;
          const reduction = Math.min(billDebt, payAmount);
          db.prepare(`
            UPDATE purchases 
            SET 
              paid_amount = paid_amount + ?,
              remaining_debt = MAX(0, remaining_debt - ?)
            WHERE id = ?
          `).run(reduction, reduction, purchase_id);
        }
      } else {
        // General debt payment: FIFO allocation to supplier's unpaid bills
        let unallocated = payAmount;
        const unpaidBills = db.prepare(`
          SELECT id, remaining_debt, paid_amount 
          FROM purchases 
          WHERE supplier_id = ? AND remaining_debt > 0 
          ORDER BY id ASC
        `).all(id);

        for (const bill of unpaidBills) {
          if (unallocated <= 0) break;
          const billDebt = Number(bill.remaining_debt) || 0;
          const settlePart = Math.min(billDebt, unallocated);
          db.prepare(`
            UPDATE purchases 
            SET 
              paid_amount = paid_amount + ?,
              remaining_debt = MAX(0, remaining_debt - ?)
            WHERE id = ?
          `).run(settlePart, settlePart, bill.id);
          unallocated = roundMoney(unallocated - settlePart);
        }
      }

      // 3. Record outflow in daily transactions if cash
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

      // 4. Auto-post to Central Accounting General Ledger (Double-Entry)
      postSupplierPayment(db, {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        amount: payAmount,
        payment_method,
        notes: `${voucherNumber} - ${notes || 'سداد دفعة حساب مورد'}`,
      });

      // 5. Record in dedicated payment vouchers archive table
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

      // 6. Record in official_vouchers table to unify with Shift Closings & Vault
      try {
        const cashAcc = payment_method === 'cash' ? '1101' : (payment_method === 'kuraimi' ? '1102' : '1103');
        db.prepare(`
          INSERT INTO official_vouchers (
            voucher_number, voucher_type, party_type, party_id, party_name,
            amount, payment_method, cash_account_code, offset_account_code,
            paper_bill_number, description, notes, prev_balance, new_balance,
            created_by, created_at
          ) VALUES (?, 'payment', 'supplier', ?, ?, ?, ?, ?, '2101', NULL, ?, ?, ?, ?, 'أمين الصندوق', datetime('now', 'localtime'))
        `).run(
          voucherNumber,
          supplier.id,
          supplier.name,
          payAmount,
          payment_method,
          cashAcc,
          `سداد دفعة حساب للمورد: ${supplier.name}`,
          notes || null,
          prevBalance,
          newBalance
        );
      } catch (err) {
        console.warn('[OfficialVouchers] Warning writing voucher:', err.message);
      }

      // 7. Write to Audit Log
      logAudit('PAY_SUPPLIER_DEBT', 'supplier_payment', voucherNumber, { prev_balance: prevBalance }, {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        amount: payAmount,
        payment_method,
        new_balance: newBalance,
      });

      const voucher = {
        voucher_number: voucherNumber,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        company_name: supplier.company_name,
        phone: supplier.phone,
        amount: payAmount,
        payment_method,
        prev_balance: prevBalance,
        previous_balance: prevBalance,
        new_balance: newBalance,
        remaining_balance: newBalance,
        notes: notes || null,
        date: new Date().toLocaleString('ar-YE'),
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
