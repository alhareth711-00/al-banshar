const db = require('../db/database');
const { formatDate } = require('../utils/helpers');
const { roundMoney, safeNum, calcWAC } = require('../utils/mathPrecision');
const { postPurchase } = require('../utils/accountingEngine');

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

function generatePurchaseNumber() {
  const today = formatDate().replace(/-/g, '');
  const prefix = `PUR-${today}-`;
  
  const lastPurchase = db.prepare(`
    SELECT purchase_number FROM purchases 
    WHERE purchase_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastPurchase && lastPurchase.purchase_number) {
    const parts = lastPurchase.purchase_number.split('-');
    const seqStr = parts[parts.length - 1];
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

const purchaseModel = {
  getAll(filters = {}) {
    let query = `
      SELECT 
        p.*,
        s.phone AS supplier_phone,
        s.company_name AS supplier_company,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) AS items_count,
        (SELECT COUNT(*) FROM purchase_returns WHERE purchase_id = p.id) AS returns_count
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.date) {
      query += ' AND date(p.created_at) = date(?)';
      params.push(filters.date);
    }

    if (filters.supplier_id) {
      query += ' AND p.supplier_id = ?';
      params.push(filters.supplier_id);
    }

    if (filters.search) {
      query += ' AND (p.purchase_number LIKE ? OR p.supplier_name LIKE ? OR p.invoice_ref LIKE ?)';
      const s = `%${filters.search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY p.id DESC LIMIT 100';
    return db.prepare(query).all(...params);
  },

  getById(id) {
    const purchase = db.prepare(`
      SELECT 
        p.*,
        s.phone AS supplier_phone,
        s.company_name AS supplier_company,
        s.balance_due AS supplier_total_balance
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(id);

    if (!purchase) return null;

    purchase.items = db.prepare(`
      SELECT 
        pi.*,
        inv.name AS product_name,
        inv.sku AS product_sku,
        inv.brand AS product_brand,
        inv.category AS product_category,
        inv.viscosity AS product_viscosity,
        inv.pack_size AS product_pack_size,
        inv.carton_pack_qty AS default_carton_pack_qty
      FROM purchase_items pi
      JOIN inventory inv ON pi.inventory_id = inv.id
      WHERE pi.purchase_id = ?
    `).all(id);

    // Associated returns if any
    purchase.returns = db.prepare(`
      SELECT * FROM purchase_returns WHERE purchase_id = ? ORDER BY id DESC
    `).all(id);

    return purchase;
  },

  getOverduePayables() {
    return db.prepare(`
      SELECT 
        p.*,
        COALESCE(s.name, p.supplier_name) AS supplier_name,
        s.phone AS supplier_phone,
        s.company_name AS supplier_company,
        CAST(julianday(date(p.due_date)) - julianday(date('now', 'localtime')) AS INTEGER) AS days_until_due
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.remaining_debt > 0
      ORDER BY 
        CASE WHEN p.due_date IS NOT NULL AND date(p.due_date) < date('now', 'localtime') THEN 1 ELSE 2 END,
        p.due_date ASC,
        p.id DESC
    `).all();
  },

  create(data) {
    const execute = db.transaction(() => {
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        throw new Error('يجب أن تحتوي فاتورة المشتريات على صنف واحد على الأقل');
      }

      // Calculate items total with support for Carton Unpacking
      let calculatedTotal = 0;
      for (const item of items) {
        // If purchased by carton, unpack and compute total units and unit cost
        if (item.is_carton || (item.carton_qty && Number(item.carton_qty) > 0)) {
          const cartonQty = Math.max(1, safeNum(item.carton_qty, 1));
          const unitsPerCarton = Math.max(1, safeNum(item.units_per_carton || item.carton_pack_qty, 1));
          const cartonCost = safeNum(item.carton_cost, item.unit_cost * unitsPerCarton);

          item.qty = roundMoney(cartonQty * unitsPerCarton);
          item.unit_cost = roundMoney(cartonCost / unitsPerCarton);
          item._subtotal = roundMoney(cartonQty * cartonCost);
        } else {
          const qty = Number(item.qty);
          const unitCost = Number(item.unit_cost);
          if (isNaN(qty) || qty <= 0) {
            throw new Error('الكمية يجب أن تكون أكبر من الصفر');
          }
          if (isNaN(unitCost) || unitCost < 0) {
            throw new Error('سعر التكلفة يجب أن يكون رقماً صحيحاً');
          }
          item.qty = qty;
          item.unit_cost = unitCost;
          item._subtotal = roundMoney(qty * unitCost);
        }
        calculatedTotal = roundMoney(calculatedTotal + item._subtotal);
      }

      const shippingCost = roundMoney(Math.max(0, safeNum(data.shipping_cost, 0)));
      const shippingPayer = 'cash_drawer'; // Always paid cash directly from cash drawer, never charged to supplier

      // Distribute landed shipping cost across items proportionally to capitalize into inventory WAC
      for (const item of items) {
        const ratio = calculatedTotal > 0 ? (item._subtotal / calculatedTotal) : (1 / items.length);
        item.allocated_shipping = roundMoney(shippingCost * ratio);
        const perUnitShipping = item.qty > 0 ? (item.allocated_shipping / item.qty) : 0;
        item.effective_unit_cost = roundMoney(item.unit_cost + perUnitShipping);
      }

      const totalAmount = data.total_amount !== undefined ? roundMoney(Number(data.total_amount)) : calculatedTotal;
      const paymentMethod = data.payment_method || 'cash';
      
      let paidAmount = Number(data.paid_amount);
      if (isNaN(paidAmount)) {
        paidAmount = (paymentMethod === 'credit') ? 0 : totalAmount;
      }

      // Supplier debt is strictly for goods (shipping is paid separately from cash drawer to transporter)
      const remainingDebt = Math.max(0, totalAmount - paidAmount);

      const paidFromDrawer = (paymentMethod === 'cash' && data.paid_from_cash_drawer !== false) ? 1 : 0;
      const purchaseNumber = data.purchase_number || generatePurchaseNumber();

      // 1. Insert Purchase Header
      const insertPurchaseStmt = db.prepare(`
        INSERT INTO purchases (
          purchase_number, supplier_id, supplier_name, invoice_ref, paper_bill_number,
          due_date, shipping_cost, shipping_payer, total_amount, paid_amount, remaining_debt,
          payment_method, paid_from_cash_drawer, notes, created_at
        ) VALUES (
          @purchase_number, @supplier_id, @supplier_name, @invoice_ref, @paper_bill_number,
          @due_date, @shipping_cost, @shipping_payer, @total_amount, @paid_amount, @remaining_debt,
          @payment_method, @paid_from_cash_drawer, @notes,
          COALESCE(@created_at, datetime('now', 'localtime'))
        )
      `);

      const purchaseResult = insertPurchaseStmt.run({
        purchase_number: purchaseNumber,
        supplier_id: data.supplier_id || null,
        supplier_name: (data.supplier_name || 'مورد عام').trim(),
        invoice_ref: data.invoice_ref ? data.invoice_ref.trim() : null,
        paper_bill_number: data.paper_bill_number ? data.paper_bill_number.trim() : null,
        due_date: data.due_date || null,
        shipping_cost: shippingCost,
        shipping_payer: shippingPayer,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining_debt: remainingDebt,
        payment_method: paymentMethod,
        paid_from_cash_drawer: paidFromDrawer,
        notes: data.notes || null,
        created_at: data.created_at || null,
      });

      const purchaseId = purchaseResult.lastInsertRowid;

      // 2. Insert Items & Update Stock & Prices with Effective Landed Cost
      const insertItemStmt = db.prepare(`
        INSERT INTO purchase_items (
          purchase_id, inventory_id, qty, unit_cost, unit_sell, allocated_shipping, effective_unit_cost, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStockAndCostStmt = db.prepare(`
        UPDATE inventory SET
          stock_qty = stock_qty + ?,
          cost_price = ?,
          sell_price = CASE WHEN ? > 0 THEN ? ELSE sell_price END
        WHERE id = ?
      `);

      for (const item of items) {
        const inventoryId = item.inventory_id || item.product_id || item.item_id;
        if (!inventoryId) {
          throw new Error('يجب تحديد معرف الصنف في المخزون');
        }
        const unitSell = item.unit_sell ? Number(item.unit_sell) : (item.new_sell_price ? Number(item.new_sell_price) : 0);

        insertItemStmt.run(
          purchaseId,
          inventoryId,
          item.qty,
          item.unit_cost,
          unitSell > 0 ? unitSell : null,
          item.allocated_shipping,
          item.effective_unit_cost,
          item._subtotal
        );

        // Fetch current stock and cost to compute proper Weighted Average Cost (WAC) using landed cost
        const currentInv = db.prepare('SELECT stock_qty, cost_price FROM inventory WHERE id = ?').get(inventoryId);
        const currentQty = currentInv ? currentInv.stock_qty : 0;
        const currentCost = currentInv ? currentInv.cost_price : item.effective_unit_cost;
        const newWacCost = calcWAC(currentQty, currentCost, item.qty, item.effective_unit_cost);

        // Increase inventory stock atomically and update prices with calculated WAC
        updateStockAndCostStmt.run(
          item.qty,
          newWacCost,
          unitSell,
          unitSell,
          inventoryId
        );
      }

      // 3. Deduct from Cash Drawer if paid cash from drawer
      if (paidFromDrawer && paidAmount > 0) {
        db.prepare(`
          INSERT INTO daily_transactions (
            tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
          ) VALUES (
            'expense', NULL, NULL, ?, 'cash', ?, datetime('now', 'localtime')
          )
        `).run(
          paidAmount,
          `سداد فاتورة مشتريات بضاعة كاش من الدرج (${purchaseNumber}) - المورد: ${data.supplier_name || 'عام'}`
        );
      }

      // 3b. Deduct shipping cost from cash drawer if paid cash
      if (shippingCost > 0 && shippingPayer === 'cash_drawer') {
        db.prepare(`
          INSERT INTO daily_transactions (
            tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
          ) VALUES (
            'expense', NULL, NULL, ?, 'cash', ?, datetime('now', 'localtime')
          )
        `).run(
          shippingCost,
          `سداد أجور شحن ونقل بضاعة كاش من الدرج للفاتورة (${purchaseNumber}) - المورد: ${data.supplier_name || 'عام'}`
        );
      }

      // 4. Update Supplier balance_due if there is debt
      if (data.supplier_id && remainingDebt > 0) {
        db.prepare(`
          UPDATE suppliers 
          SET balance_due = balance_due + ? 
          WHERE id = ?
        `).run(remainingDebt, data.supplier_id);
      }

      // 5. Post to Central Accounting General Ledger
      const purchaseDataForPosting = {
        id: purchaseId,
        purchase_number: purchaseNumber,
        supplier_id: data.supplier_id || null,
        supplier_name: (data.supplier_name || 'مورد عام').trim(),
        shipping_cost: shippingCost,
        shipping_payer: shippingPayer,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining_debt: remainingDebt,
        payment_method: paymentMethod,
        created_at: data.created_at || null,
      };

      postPurchase(db, { purchase: purchaseDataForPosting, items });

      return purchaseId;
    });

    const newId = execute();
    const result = this.getById(newId);
    logAudit('CREATE_PURCHASE', 'purchase', newId, null, {
      purchase_number: result?.purchase_number,
      supplier_name: result?.supplier_name,
      total_amount: result?.total_amount,
      paid_amount: result?.paid_amount,
      remaining_debt: result?.remaining_debt,
      items_count: result?.items?.length,
    });
    return result;
  },

  getDueCalendar() {
    const payables = db.prepare(`
      SELECT 
        p.*,
        COALESCE(s.name, p.supplier_name) AS supplier_name,
        s.phone AS supplier_phone,
        s.company_name AS supplier_company,
        s.credit_days,
        CAST(julianday(date(p.due_date)) - julianday(date('now', 'localtime')) AS INTEGER) AS days_until_due
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.remaining_debt > 0 AND p.due_date IS NOT NULL
      ORDER BY p.due_date ASC
    `).all();

    const overdue = [];
    const dueSoon7d = [];
    const dueSoon30d = [];
    const dueLater = [];

    let totalOverdue = 0;
    let totalDue7d = 0;
    let totalDue30d = 0;

    for (const p of payables) {
      const days = p.days_until_due;
      const debt = Number(p.remaining_debt) || 0;
      if (days < 0) {
        p.status_bucket = 'overdue';
        overdue.push(p);
        totalOverdue += debt;
      } else if (days <= 7) {
        p.status_bucket = 'due_7d';
        dueSoon7d.push(p);
        totalDue7d += debt;
      } else if (days <= 30) {
        p.status_bucket = 'due_30d';
        dueSoon30d.push(p);
        totalDue30d += debt;
      } else {
        p.status_bucket = 'due_later';
        dueLater.push(p);
      }
    }

    return {
      summary: {
        overdue_count: overdue.length,
        overdue_amount: totalOverdue,
        due_7d_count: dueSoon7d.length,
        due_7d_amount: totalDue7d,
        due_30d_count: dueSoon30d.length,
        due_30d_amount: totalDue30d,
        total_outstanding: totalOverdue + totalDue7d + totalDue30d,
      },
      buckets: {
        overdue,
        due_soon_7d: dueSoon7d,
        due_soon_30d: dueSoon30d,
        due_later: dueLater,
      },
    };
  },
};

module.exports = purchaseModel;
