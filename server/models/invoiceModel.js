const db = require('../db/database');
const { generateInvoiceNumber, calculateRecommendedKm, addDaysToDate } = require('../utils/helpers');
const { roundMoney, safeNum, calcLineSubtotal, calcNetTotal } = require('../utils/mathPrecision');
const { postInvoice, checkInvoiceSafeguards } = require('../utils/accountingEngine');

const invoiceModel = {
  getById(id) {
    const invoice = db.prepare(`
      SELECT 
        inv.*,
        cv.plate_number,
        cv.plate_type,
        cv.car_make_model,
        cv.customer_name,
        cv.phone AS customer_phone,
        w.name AS worker_name,
        w.role AS worker_role,
        w.commission_rate AS worker_commission_rate
      FROM invoices inv
      JOIN customers_vehicles cv ON inv.vehicle_id = cv.id
      LEFT JOIN workers w ON inv.worker_id = w.id
      WHERE inv.id = ?
    `).get(id);

    if (!invoice) return null;

    invoice.items = db.prepare(`
      SELECT 
        ii.*,
        inv.name AS product_name,
        inv.brand AS product_brand,
        inv.category AS product_category,
        inv.viscosity AS product_viscosity,
        inv.pack_size AS product_pack_size
      FROM invoice_items ii
      LEFT JOIN inventory inv ON ii.inventory_id = inv.id
      WHERE ii.invoice_id = ?
    `).all(id);

    return invoice;
  },

  getAll(filters = {}) {
    let query = `
      SELECT 
        inv.*,
        cv.plate_number,
        cv.car_make_model,
        cv.customer_name,
        w.name AS worker_name
      FROM invoices inv
      JOIN customers_vehicles cv ON inv.vehicle_id = cv.id
      LEFT JOIN workers w ON inv.worker_id = w.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.date) {
      query += ' AND date(inv.created_at) = date(?)';
      params.push(filters.date);
    }

    if (filters.vehicle_id) {
      query += ' AND inv.vehicle_id = ?';
      params.push(filters.vehicle_id);
    }

    if (filters.payment_method) {
      query += ' AND inv.payment_method = ?';
      params.push(filters.payment_method);
    }

    query += ' ORDER BY inv.id DESC LIMIT 100';
    return db.prepare(query).all(...params);
  },

  create(data) {
    // Execute inside an atomic transaction
    const executeTransaction = db.transaction(() => {
      // 1. Verify vehicle exists
      const vehicle = db.prepare('SELECT * FROM customers_vehicles WHERE id = ?').get(data.vehicle_id);
      if (!vehicle) {
        throw new Error(`السيارة بالرقم المعرف ${data.vehicle_id} غير موجودة في النظام`);
      }

      // 2. Validate and calculate items (separating goods sales from services)
      const items = Array.isArray(data.items) ? data.items : [];
      let calculatedItemsTotal = 0;
      let calculatedServicesTotal = 0;

      for (const item of items) {
        const qty = Math.max(0.1, safeNum(item.qty, 1));
        const unitPrice = Math.max(0, safeNum(item.unit_price, 0));
        const laborFee = Math.max(0, safeNum(item.labor_fee, 0));
        const isService = item.item_type === 'service';
        const lineTotal = roundMoney(qty * unitPrice + laborFee);

        item._qty = qty;
        item._unitPrice = unitPrice;
        item._laborFee = laborFee;
        item._subtotal = lineTotal;

        if (isService) {
          calculatedServicesTotal = roundMoney(calculatedServicesTotal + lineTotal);
        } else {
          calculatedItemsTotal = roundMoney(calculatedItemsTotal + lineTotal);
        }
      }

      const itemsTotal = data.items_total !== undefined ? roundMoney(safeNum(data.items_total, 0)) : calculatedItemsTotal;
      const laborTotal = data.labor_total !== undefined ? roundMoney(safeNum(data.labor_total, 0)) : calculatedServicesTotal;
      // Scrap battery deduction is discontinued/zeroed unless historical
      const scrapDeduction = roundMoney(Math.max(0, safeNum(data.scrap_battery_deduction, 0)));
      const discount = roundMoney(Math.max(0, safeNum(data.discount, 0)));
      const netTotal = calcNetTotal(itemsTotal, laborTotal, scrapDeduction, discount);

      let paidAmount = data.paid_amount !== undefined && data.paid_amount !== null && data.paid_amount !== ''
        ? roundMoney(safeNum(data.paid_amount, 0))
        : (data.payment_method === 'credit' ? 0 : netTotal);

      // Remaining debt cannot be negative
      const remainingDebt = roundMoney(Math.max(0, netTotal - paidAmount));

      // Determine next odometer: default delta is 3,000 km
      const currentOdo = Math.max(0, safeNum(data.current_odometer, vehicle.last_odometer || 0));
      let nextOdo = safeNum(data.next_odometer, 0);
      if (!nextOdo || nextOdo <= currentOdo) {
        nextOdo = currentOdo + 3000;
      }

      // Determine next service date
      const nextServiceDate = data.next_service_date || addDaysToDate(new Date(), 60);

      // Generate invoice number
      const invoiceNumber = data.invoice_number || generateInvoiceNumber(db);

      // 3. Insert invoice header
      const insertInvoiceStmt = db.prepare(`
        INSERT INTO invoices (
          invoice_number, vehicle_id, worker_id, current_odometer,
          next_odometer, next_service_date, items_total, labor_total,
          scrap_battery_deduction, discount, net_total, payment_method,
          wallet_ref_number, paid_amount, remaining_debt, notes, created_at
        ) VALUES (
          @invoice_number, @vehicle_id, @worker_id, @current_odometer,
          @next_odometer, @next_service_date, @items_total, @labor_total,
          @scrap_battery_deduction, @discount, @net_total, @payment_method,
          @wallet_ref_number, @paid_amount, @remaining_debt, @notes,
          COALESCE(@created_at, datetime('now', 'localtime'))
        )
      `);

      const invoiceResult = insertInvoiceStmt.run({
        invoice_number: invoiceNumber,
        vehicle_id: data.vehicle_id,
        worker_id: data.worker_id || null,
        current_odometer: currentOdo,
        next_odometer: nextOdo,
        next_service_date: nextServiceDate,
        items_total: itemsTotal,
        labor_total: laborTotal,
        scrap_battery_deduction: scrapDeduction,
        discount: discount,
        net_total: netTotal,
        payment_method: data.payment_method || 'cash',
        wallet_ref_number: data.wallet_ref_number || null,
        paid_amount: paidAmount,
        remaining_debt: remainingDebt,
        notes: data.notes || null,
        created_at: data.created_at || null,
      });

      const invoiceId = invoiceResult.lastInsertRowid;

      // 4. Insert items and decrement inventory stock
      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, inventory_id, item_type, description,
          qty, unit_price, labor_fee, warranty_serial, subtotal
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const decrementStockStmt = db.prepare(`
        UPDATE inventory 
        SET stock_qty = stock_qty - ? 
        WHERE id = ?
      `);

      for (const item of items) {
        insertItemStmt.run(
          invoiceId,
          item.inventory_id || null,
          item.item_type || (item.inventory_id ? 'product' : 'service'),
          item.description || 'خدمة سريعة',
          item._qty,
          item._unitPrice,
          item._laborFee,
          item.warranty_serial || null,
          item._subtotal
        );

        if (item.inventory_id) {
          const invItem = db.prepare('SELECT item_type, category FROM inventory WHERE id = ?').get(item.inventory_id);
          if (invItem && invItem.item_type !== 'service' && invItem.category !== 'service') {
            decrementStockStmt.run(item._qty, item.inventory_id);
          }
        }
      }

      // 5. Update vehicle odometer and next due visit
      db.prepare(`
        UPDATE customers_vehicles SET
          last_odometer = ?,
          next_due_odometer = ?,
          next_due_date = ?,
          balance_due = balance_due + ?
        WHERE id = ?
      `).run(currentOdo, nextOdo, nextServiceDate, remainingDebt, data.vehicle_id);

      // 6. Central Automated Accounting Posting
      const invoiceDataForPosting = {
        id: invoiceId,
        invoice_number: invoiceNumber,
        vehicle_id: data.vehicle_id,
        plate_number: vehicle.plate_number,
        paid_amount: paidAmount,
        remaining_debt: remainingDebt,
        items_total: itemsTotal,
        labor_total: laborTotal,
        scrap_battery_deduction: scrapDeduction,
        discount: discount,
        net_total: netTotal,
        payment_method: data.payment_method || 'cash',
        created_at: data.created_at || null,
      };

      postInvoice(db, { invoice: invoiceDataForPosting, items });

      // 7. Safeguards Check & Financial Audit Logging (Upgrade 4)
      try {
        const safeguards = checkInvoiceSafeguards(db, {
          vehicle_id: data.vehicle_id,
          items,
          payment_method: data.payment_method || 'cash',
          paid_amount: paidAmount,
        });

        if (safeguards.has_warnings) {
          db.prepare(`
            INSERT INTO financial_audit_logs (
              action, entity_type, entity_id, old_data, new_data, performed_by, created_at
            ) VALUES (?, 'invoice', ?, ?, ?, 'cashier', datetime('now', 'localtime'))
          `).run(
            'INVOICE_SAFEGUARDS_WARNING',
            invoiceId,
            JSON.stringify(safeguards.credit_guard),
            JSON.stringify({ warnings: safeguards.warnings, below_cost: safeguards.below_cost_items })
          );
        }
      } catch (logErr) {
        console.warn('[Audit] Safeguards audit log warning:', logErr.message);
      }

      return invoiceId;
    });

    const newInvoiceId = executeTransaction();
    return this.getById(newInvoiceId);
  },
};

module.exports = invoiceModel;
