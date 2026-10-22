const db = require('../db/database');
const { formatDate } = require('../utils/helpers');
const { roundMoney, safeNum } = require('../utils/mathPrecision');
const { postPurchaseReturn } = require('../utils/accountingEngine');

function generateReturnNumber() {
  const today = formatDate().replace(/-/g, '');
  const prefix = `PR-${today}-`;

  const lastReturn = db.prepare(`
    SELECT return_number FROM purchase_returns 
    WHERE return_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastReturn && lastReturn.return_number) {
    const parts = lastReturn.return_number.split('-');
    const seqStr = parts[parts.length - 1];
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

const purchaseReturnModel = {
  getAll(filters = {}) {
    let query = `
      SELECT 
        pr.*,
        s.phone AS supplier_phone,
        s.company_name AS supplier_company,
        p.purchase_number AS original_purchase_number,
        (SELECT COUNT(*) FROM purchase_return_items WHERE return_id = pr.id) AS items_count
      FROM purchase_returns pr
      LEFT JOIN suppliers s ON pr.supplier_id = s.id
      LEFT JOIN purchases p ON pr.purchase_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.date) {
      query += ' AND date(pr.created_at) = date(?)';
      params.push(filters.date);
    }

    if (filters.supplier_id) {
      query += ' AND pr.supplier_id = ?';
      params.push(filters.supplier_id);
    }

    if (filters.search) {
      query += ' AND (pr.return_number LIKE ? OR pr.supplier_name LIKE ? OR pr.reason LIKE ?)';
      const s = `%${filters.search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY pr.id DESC LIMIT 100';
    return db.prepare(query).all(...params);
  },

  getById(id) {
    const ret = db.prepare(`
      SELECT 
        pr.*,
        s.phone AS supplier_phone,
        s.company_name AS supplier_company,
        p.purchase_number AS original_purchase_number,
        p.invoice_ref AS original_invoice_ref
      FROM purchase_returns pr
      LEFT JOIN suppliers s ON pr.supplier_id = s.id
      LEFT JOIN purchases p ON pr.purchase_id = p.id
      WHERE pr.id = ?
    `).get(id);

    if (!ret) return null;

    ret.items = db.prepare(`
      SELECT 
        pri.*,
        inv.name AS product_name,
        inv.sku AS product_sku,
        inv.brand AS product_brand,
        inv.category AS product_category,
        inv.viscosity AS product_viscosity,
        inv.pack_size AS product_pack_size
      FROM purchase_return_items pri
      JOIN inventory inv ON pri.inventory_id = inv.id
      WHERE pri.return_id = ?
    `).all(id);

    return ret;
  },

  create(data) {
    const execute = db.transaction(() => {
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        throw new Error('يجب اختيار صنف واحد على الأقل لإجراء المرتجع');
      }

      // 1. Validate items and verify available stock
      let calculatedTotal = 0;
      for (const item of items) {
        item.inventory_id = item.inventory_id || item.product_id;
        const invId = item.inventory_id;
        const qty = Number(item.qty);
        const unitCost = Number(item.unit_cost);

        if (!invId) {
          throw new Error('معرف الصنف في المخزون مطلوب');
        }
        if (isNaN(qty) || qty <= 0) {
          throw new Error('كمية المرتجع يجب أن تكون أكبر من الصفر');
        }

        const inv = db.prepare('SELECT id, name, stock_qty, cost_price FROM inventory WHERE id = ?').get(invId);
        if (!inv) {
          throw new Error(`الصنف برقم المعرف ${invId} غير موجود`);
        }
        if (inv.stock_qty < qty) {
          throw new Error(`الكمية المتوفرة في المخزن للصنف "${inv.name}" هي (${inv.stock_qty})، ولا يمكن إرجاع (${qty})`);
        }

        item._unitCost = !isNaN(unitCost) && unitCost >= 0 ? unitCost : inv.cost_price;
        item._subtotal = roundMoney(qty * item._unitCost);
        calculatedTotal = roundMoney(calculatedTotal + item._subtotal);
      }

      let supplierName = data.supplier_name;
      if (!supplierName && data.supplier_id) {
        const supp = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(data.supplier_id);
        if (supp) supplierName = supp.name;
      }

      const totalAmount = data.total_amount !== undefined ? roundMoney(Number(data.total_amount)) : calculatedTotal;
      let refundMethod = data.refund_method || 'credit'; // 'credit' | 'cash' | 'kuraimi' | etc.
      if (refundMethod === 'supplier_balance') {
        refundMethod = 'credit';
      }

      let refundAmount = 0;
      let debtReduction = 0;

      if (refundMethod === 'credit') {
        debtReduction = totalAmount;
      } else {
        refundAmount = totalAmount;
      }

      // If user specified custom amounts
      if (data.refund_amount !== undefined && data.debt_reduction_amount !== undefined) {
        refundAmount = roundMoney(Number(data.refund_amount) || 0);
        debtReduction = roundMoney(Number(data.debt_reduction_amount) || 0);
      }

      const returnNumber = data.return_number || generateReturnNumber();
      const reason = data.reason ? data.reason.trim() : 'بضاعة تالفة أو غير مطابقة';

      // 2. Insert Return Header
      const insertHeader = db.prepare(`
        INSERT INTO purchase_returns (
          return_number, purchase_id, supplier_id, supplier_name,
          total_amount, refund_amount, debt_reduction_amount,
          refund_method, refund_to_cash_drawer, reason, notes, created_at
        ) VALUES (
          @return_number, @purchase_id, @supplier_id, @supplier_name,
          @total_amount, @refund_amount, @debt_reduction_amount,
          @refund_method, @refund_to_cash_drawer, @reason, @notes,
          COALESCE(@created_at, datetime('now', 'localtime'))
        )
      `);

      const headerResult = insertHeader.run({
        return_number: returnNumber,
        purchase_id: data.purchase_id || null,
        supplier_id: data.supplier_id || null,
        supplier_name: (supplierName || 'مورد عام').trim(),
        total_amount: totalAmount,
        refund_amount: refundAmount,
        debt_reduction_amount: debtReduction,
        refund_method: refundMethod,
        refund_to_cash_drawer: data.refund_to_cash_drawer !== false ? 1 : 0,
        reason,
        notes: data.notes || null,
        created_at: data.created_at || null,
      });

      const returnId = headerResult.lastInsertRowid;

      // 3. Insert Return Items & Decrement Inventory Stock
      const insertItemStmt = db.prepare(`
        INSERT INTO purchase_return_items (
          return_id, inventory_id, qty, unit_cost, subtotal
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const decrementStockStmt = db.prepare(`
        UPDATE inventory 
        SET stock_qty = stock_qty - ? 
        WHERE id = ?
      `);

      for (const item of items) {
        insertItemStmt.run(
          returnId,
          item.inventory_id,
          item.qty,
          item._unitCost,
          item._subtotal
        );

        decrementStockStmt.run(item.qty, item.inventory_id);
      }

      // 4. Update Supplier Balance if debt reduction
      if (data.supplier_id && debtReduction > 0) {
        db.prepare(`
          UPDATE suppliers 
          SET balance_due = MAX(0, balance_due - ?) 
          WHERE id = ?
        `).run(debtReduction, data.supplier_id);
      }

      // 5. Mark original purchase as having return if applicable
      if (data.purchase_id) {
        db.prepare('UPDATE purchases SET is_returned = 1 WHERE id = ?').run(data.purchase_id);
      }

      // 6. Record Cash Inflow into cash drawer if refund in cash
      if (refundMethod === 'cash' && refundAmount > 0 && data.refund_to_cash_drawer !== false) {
        db.prepare(`
          INSERT INTO daily_transactions (
            tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
          ) VALUES (
            'debt_collection', NULL, NULL, ?, 'cash', ?, datetime('now', 'localtime')
          )
        `).run(
          refundAmount,
          `استرداد نقدي لمرتجع مشتريات (${returnNumber}) من المورد: ${data.supplier_name || 'عام'}`
        );
      }

      // 7. Post Central Double-Entry Journal Entry
      const returnPayloadForPosting = {
        id: returnId,
        return_number: returnNumber,
        supplier_id: data.supplier_id || null,
        supplier_name: (supplierName || 'مورد عام').trim(),
        total_amount: totalAmount,
        refund_amount: refundAmount,
        debt_reduction_amount: debtReduction,
        refund_method: refundMethod,
        reason,
        created_at: data.created_at || null,
      };

      postPurchaseReturn(db, { purchaseReturn: returnPayloadForPosting, items });

      return returnId;
    });

    const newId = execute();
    return this.getById(newId);
  },
};

module.exports = purchaseReturnModel;
