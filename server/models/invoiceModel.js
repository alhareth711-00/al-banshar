const db = require('../db/database');
const { generateInvoiceNumber, calculateRecommendedKm, addDaysToDate, formatDate, validateSystemClock } = require('../utils/helpers');
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

    // Compute frozen historical line margins [MOD-CATALOG-RETRO]
    for (const item of invoice.items) {
      item.line_cost = roundMoney((item.qty || 1) * (item.cost_price || 0));
      item.line_gross_profit = roundMoney((item.subtotal || 0) - item.line_cost);
      item.line_margin_percent = item.line_cost > 0 ? roundMoney((item.line_gross_profit / item.line_cost) * 100) : 100;
    }

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
    // [MOD-CHRONO-GUARD]: Verify that system clock has not been rolled back (Executed before transaction so audit log persists)
    validateSystemClock(db, data.created_at);

    // Execute inside an atomic transaction
    const executeTransaction = db.transaction(() => {
      // 0. Idempotency guard: Return existing invoice if client_token was already processed
      if (data.client_token) {
        const existing = db.prepare('SELECT id FROM invoices WHERE client_token = ?').get(data.client_token);
        if (existing) {
          return existing.id;
        }
      }

      // 1. Verify vehicle exists
      let vehicle = db.prepare('SELECT * FROM customers_vehicles WHERE id = ?').get(data.vehicle_id);
      if (!vehicle) {
        throw new Error(`السيارة بالرقم المعرف ${data.vehicle_id} غير موجودة في النظام`);
      }

      // Check if walk-in customer provided their own details: (Name + Phone + Plate)
      const hasDirectCustomerInfo = Boolean(
        data.customer_name && data.customer_name.trim() !== '' && data.customer_name !== 'عميل نقدي' &&
        data.phone && data.phone.trim() !== '' && data.phone !== '000000000' &&
        data.plate_number && data.plate_number.trim() !== '' && data.plate_number !== '0000' && data.plate_number !== 'فاتورة سريعة'
      );

      // Auto-link/create dedicated customer record if direct customer details provided for walk-in
      if ((data.vehicle_id === 1 || vehicle.plate_number === 'فاتورة سريعة' || vehicle.customer_name === 'عميل عام (نقدي)') && hasDirectCustomerInfo) {
        const cleanPlate = data.plate_number.trim();
        let targetVehicle = db.prepare('SELECT * FROM customers_vehicles WHERE plate_number = ?').get(cleanPlate);
        if (!targetVehicle) {
          const insertRes = db.prepare(`
            INSERT INTO customers_vehicles (plate_number, customer_name, phone, car_make_model, credit_limit)
            VALUES (?, ?, ?, ?, ?)
          `).run(cleanPlate, data.customer_name.trim(), data.phone.trim(), data.car_make_model || 'سيارة عميل', 50000);
          targetVehicle = db.prepare('SELECT * FROM customers_vehicles WHERE id = ?').get(insertRes.lastInsertRowid);
        }
        vehicle = targetVehicle;
        data.vehicle_id = targetVehicle.id;
      }

      // 2. Validate and calculate items (separating goods sales from services)
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        throw new Error('يجب إدراج صنف أو خدمة واحدة على الأقل في الفاتورة');
      }

      let calculatedItemsTotal = 0;
      let calculatedServicesTotal = 0;

      for (const item of items) {
        const qty = safeNum(item.qty, 1);
        if (qty <= 0) {
          throw new Error(`الكمية المدخلة للصنف "${item.description || item.inventory_id || ''}" غير صالحة (${qty}). يجب أن تكون أكبر من الصفر.`);
        }
        const unitPrice = safeNum(item.unit_price, 0);
        if (unitPrice < 0) {
          throw new Error(`سعر الوحدة للصنف "${item.description || item.inventory_id || ''}" لا يمكن أن يكون سالباً.`);
        }
        const laborFee = Math.max(0, safeNum(item.labor_fee, 0));
        const isService = item.item_type === 'service';
        const lineTotal = roundMoney(qty * unitPrice + laborFee);

        let costPrice = safeNum(item.cost_price, 0);
        if (item.inventory_id) {
          const invItem = db.prepare('SELECT name, item_type, category, cost_price FROM inventory WHERE id = ?').get(item.inventory_id);
          if (invItem && invItem.item_type !== 'service' && invItem.category !== 'service') {
            costPrice = Math.max(costPrice, roundMoney(safeNum(invItem.cost_price, 0)));
            if (!item.description) item.description = invItem.name;
          }
        }
        item._costPrice = costPrice;

        // Guard: Disallow selling below cost without explicit confirmation
        if (!isService && costPrice > 0 && unitPrice < costPrice && data.confirm_below_cost !== true) {
          throw new Error(`تنبيه مالي: الصنف "${item.description || item.inventory_id || ''}" يُباع بسعر (${unitPrice.toLocaleString()} ر.ي) وهو أقل من سعر التكلفة (${costPrice.toLocaleString()} ر.ي) بمقدار (${roundMoney(costPrice - unitPrice).toLocaleString()} ر.ي). يتطلب تأكيد العملية.`);
        }

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

      // MOD-SCRAP Poka-Yoke Validation
      const scrapDeduction = roundMoney(Math.max(0, safeNum(data.scrap_battery_deduction, 0)));
      if (scrapDeduction > 0) {
        // 1. Verify that there is at least one battery item in the invoice
        let batteryItemsGross = 0;
        for (const item of items) {
          let isBattery = (item.category === 'battery') || (item.product_category === 'battery');
          if (!isBattery && item.inventory_id) {
            const inv = db.prepare('SELECT category FROM inventory WHERE id = ?').get(item.inventory_id);
            isBattery = inv && inv.category === 'battery';
          }
          if (isBattery) {
            batteryItemsGross = roundMoney(batteryItemsGross + safeNum(item._subtotal, 0));
          }
        }

        if (batteryItemsGross <= 0) {
          throw new Error(`حظر أمني [MOD-SCRAP]: لا يمكن تطبيق خصم مقايضة البطارية الرجيع (${scrapDeduction.toLocaleString()} ر.ي) على فاتورة لا تحتوي على بيع بطارية جديدة.`);
        }

        if (scrapDeduction > batteryItemsGross) {
          throw new Error(`حظر أمني [MOD-SCRAP]: قيمة خصم البطارية الرجيع (${scrapDeduction.toLocaleString()} ر.ي) تتجاوز إجمالي قيمة البطاريات الجديدة في الفاتورة (${batteryItemsGross.toLocaleString()} ر.ي). يُمنع صرف نقدية من الصندوق كبدل سكراب.`);
        }
      }

      const discount = roundMoney(Math.max(0, safeNum(data.discount, 0)));
      const grossTotal = roundMoney(itemsTotal + laborTotal - scrapDeduction);

      if (discount > grossTotal) {
        throw new Error(`قيمة الخصم (${discount.toLocaleString()} ر.ي) لا يمكن أن تتجاوز إجمالي الفاتورة (${grossTotal.toLocaleString()} ر.ي). تم إيقاف المعاملة لحماية الإيرادات ومنع الفروق المحاسبية.`);
      }

      const netTotal = calcNetTotal(itemsTotal, laborTotal, scrapDeduction, discount);

      const rawPaid = data.paid_amount !== undefined && data.paid_amount !== null && data.paid_amount !== ''
        ? roundMoney(safeNum(data.paid_amount, 0))
        : (data.payment_method === 'credit' ? 0 : netTotal);

      // Any excess over netTotal is change returned to the customer at the counter
      const paidAmount = roundMoney(Math.min(rawPaid, netTotal));
      const changeDue = roundMoney(Math.max(0, rawPaid - netTotal));

      // Remaining debt cannot be negative
      const remainingDebt = roundMoney(Math.max(0, netTotal - paidAmount));

      // Guard: Disallow credit sale for anonymous or quick walk-in customers [MOD-CREDIT-PARTIES]
      const isQuickOrAnonymous = vehicle.id === 1 ||
                                  vehicle.plate_number === 'فاتورة سريعة' ||
                                  vehicle.customer_name === 'عميل عام (نقدي)' ||
                                  vehicle.customer_name === 'عميل نقدي سريع' ||
                                  vehicle.customer_name === 'عميل غير مسمى' ||
                                  vehicle.plate_number.startsWith('بدون-') ||
                                  !vehicle.phone ||
                                  vehicle.phone.trim() === '' ||
                                  vehicle.phone.trim() === '---';

      if (data.payment_method === 'credit' && isQuickOrAnonymous && !hasDirectCustomerInfo) {
        throw new Error(`حظر ائتماني صارم [MOD-CREDIT-PARTIES]: يُمنع اختيار طريقة الدفع "آجل" للعميل العابر السريع (${vehicle.customer_name}) إلا بعد تسجيل (اسم العميل، رقم هاتفه، ورقم لوحة سيارته).`);
      }

      if (remainingDebt > 0 && isQuickOrAnonymous && !hasDirectCustomerInfo) {
        throw new Error(`حظر ائتماني: لا يمكن تسجيل متبقي آجل (دين) على عميل عابر إلا بعد تسجيل بيانات العميل كاملة (اسم العميل، رقم هاتفه، ورقم لوحة سيارته) لحفظ حقوق الورشة.`);
      }

      const isQuickCustomer = vehicle.plate_number === 'فاتورة سريعة';

      // MOD-LANE: Enforce Pit Bay Single-Vehicle Invariant (Empty ➔ In-Service ➔ Invoiced)
      if (data.service_status === 'pending_service' && data.vehicle_id && Number(data.vehicle_id) !== 1 && !isQuickCustomer) {
        const existingPending = db.prepare(`
          SELECT invoice_number FROM invoices 
          WHERE vehicle_id = ? AND service_status = 'pending_service' AND is_voided = 0 
          LIMIT 1
        `).get(data.vehicle_id);
        if (existingPending) {
          throw new Error(`تنبيه الحفرة [MOD-LANE]: المركبة (${vehicle.plate_number}) متواجدة حالياً بالفعل داخل الحفرة بموجب الفاتورة رقم (${existingPending.invoice_number}). يجب إتمام فحصها وخدمتها أو إلغاء فاتورتها السابقة أولاً.`);
        }
      }

      // Determine next odometer: default delta is service_interval_km (default 3,000 km)
      const lastRecordedOdo = Number(vehicle.last_odometer) || 0;
      let enteredOdo = 0;
      if (data.current_odometer !== undefined && data.current_odometer !== null && data.current_odometer !== '') {
        enteredOdo = Math.max(0, safeNum(data.current_odometer, 0));
      }

      // Non-regression odometer validation: automatically clamp to MAX(lastRecordedOdo, enteredOdo) unless reset requested
      const isResetApproved = Boolean(data.allow_odometer_reset);
      const currentOdo = enteredOdo > 0
        ? (isResetApproved ? enteredOdo : Math.max(lastRecordedOdo, enteredOdo))
        : (!isQuickCustomer ? lastRecordedOdo : 0);

      // Audit Immunization: document odometer reset exception in invoice notes
      if (isResetApproved && enteredOdo > 0 && enteredOdo < lastRecordedOdo) {
        const auditTag = '[استثناء: تم اعتماد تصفير/تغيير عداد الطبلون]';
        if (!data.notes || !data.notes.includes(auditTag)) {
          data.notes = data.notes ? `${data.notes} | ${auditTag}` : auditTag;
        }
      }

      const serviceInterval = Number(vehicle.service_interval_km) || 3000;
      let nextOdo = safeNum(data.next_odometer, 0);
      if (!nextOdo || nextOdo <= currentOdo) {
        nextOdo = currentOdo > 0 ? currentOdo + serviceInterval : 0;
      }

      // Determine next service date
      const nextServiceDate = data.next_service_date || addDaysToDate(new Date(), 60);

      // Generate invoice number authoritative on server [MOD-GAPLESS]
      const invoiceNumber = data._system_override_number || generateInvoiceNumber(db);
      const activeShift = db.prepare("SELECT id FROM cash_shifts WHERE status = 'open' LIMIT 1").get();
      const shiftId = data.shift_id ? Number(data.shift_id) : (activeShift?.id || null);

      // 3. Insert invoice header
      const insertInvoiceStmt = db.prepare(`
        INSERT INTO invoices (
          invoice_number, vehicle_id, worker_id, current_odometer,
          next_odometer, next_service_date, items_total, labor_total,
          scrap_battery_deduction, discount, net_total, payment_method,
          wallet_ref_number, paid_amount, remaining_debt, notes,
          service_status, safety_inspection_data, inspection_completed_at, shift_id,
          client_token, created_at
        ) VALUES (
          @invoice_number, @vehicle_id, @worker_id, @current_odometer,
          @next_odometer, @next_service_date, @items_total, @labor_total,
          @scrap_battery_deduction, @discount, @net_total, @payment_method,
          @wallet_ref_number, @paid_amount, @remaining_debt, @notes,
          @service_status, @safety_inspection_data, @inspection_completed_at, @shift_id,
          @client_token, COALESCE(@created_at, datetime('now', 'localtime'))
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
        service_status: data.service_status || 'completed',
        safety_inspection_data: data.safety_inspection_data
          ? typeof data.safety_inspection_data === 'string'
            ? data.safety_inspection_data
            : JSON.stringify(data.safety_inspection_data)
          : null,
        inspection_completed_at: data.inspection_completed_at || null,
        shift_id: shiftId,
        client_token: data.client_token || null,
        created_at: data.created_at || null,
      });

      const invoiceId = invoiceResult.lastInsertRowid;

      // 4. Insert items and decrement inventory stock
      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, inventory_id, item_type, description,
          qty, unit_price, cost_price, labor_fee, warranty_serial, subtotal
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const decrementStockStmt = db.prepare(`
        UPDATE inventory 
        SET stock_qty = stock_qty - ? 
        WHERE id = ?
      `);

      for (const item of items) {
        let frozenCostPrice = 0;
        if (item.inventory_id) {
          const invItem = db.prepare('SELECT id, name, item_type, category, cost_price, stock_qty FROM inventory WHERE id = ?').get(item.inventory_id);
          if (invItem) {
            if (invItem.item_type !== 'service' && invItem.category !== 'service') {
              frozenCostPrice = roundMoney(safeNum(invItem.cost_price, 0));
              if (data.prevent_negative_stock !== false && invItem.stock_qty < item._qty) {
                throw new Error(`نفد المخزون أو لا يكفي للصنف "${invItem.name}". الرصيد المتوفر بالمخزن: (${invItem.stock_qty})، الكمية المطلوبة: (${item._qty}). تم منع البيع بالسالب.`);
              }
              decrementStockStmt.run(item._qty, item.inventory_id);
            }
          }
        }
        item.cost_price = frozenCostPrice;

        insertItemStmt.run(
          invoiceId,
          item.inventory_id || null,
          item.item_type || (item.inventory_id ? 'product' : 'service'),
          item.description || 'خدمة سريعة',
          item._qty,
          item._unitPrice,
          frozenCostPrice, // [MOD-CATALOG-RETRO]: Frozen historical unit cost at time of sale
          item._laborFee,
          item.warranty_serial || null,
          item._subtotal
        );
      }

      // 5. Update vehicle odometer and next due visit (with Odometer Rollback & Quick Customer Isolation)
      if (!isQuickCustomer) {
        if (currentOdo > 0) {
          const finalLastOdo = data.allow_odometer_reset ? currentOdo : Math.max(lastRecordedOdo, currentOdo);
          const finalNextOdo = Math.max(finalLastOdo + 100, nextOdo);
          db.prepare(`
            UPDATE customers_vehicles SET
              last_odometer = ?,
              next_due_odometer = ?,
              next_due_date = ?,
              balance_due = balance_due + ?
            WHERE id = ?
          `).run(finalLastOdo, finalNextOdo, nextServiceDate, remainingDebt, data.vehicle_id);
        } else {
          db.prepare(`
            UPDATE customers_vehicles SET
              balance_due = balance_due + ?
            WHERE id = ?
          `).run(remainingDebt, data.vehicle_id);
        }
      } else {
        // Quick customer generic entity: preserve zeroed mileage, only update debt if any
        db.prepare(`
          UPDATE customers_vehicles SET
            balance_due = balance_due + ?
          WHERE id = ?
        `).run(remainingDebt, data.vehicle_id);
      }

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
        split_payments: data.split_payments || null,
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

  voidInvoice(id, reason = 'إلغاء رسمي من الكاشير', options = {}) {
    const opts = (typeof reason === 'object' && reason !== null) ? reason : options;
    const voidReason = (typeof reason === 'string') ? reason : (opts.reason || 'إلغاء معتمد من الإدارة');

    const executeTransaction = db.transaction(() => {
      const invoice = this.getById(id);
      if (!invoice) {
        throw new Error(`الفاتورة رقم ${id} غير موجودة`);
      }

      if (invoice.is_voided) {
        throw new Error(`الفاتورة (${invoice.invoice_number}) ملغاة ومبطلة مسبقاً.`);
      }

      // Shift Freezing Check: Prevent voiding invoices belonging to closed shifts unless manager override is provided
      if (invoice.shift_id) {
        const shift = db.prepare('SELECT status, shift_code FROM cash_shifts WHERE id = ?').get(invoice.shift_id);
        if (shift && shift.status === 'closed') {
          if (!opts.manager_override) {
            throw new Error(`لا يمكن إلغاء الفاتورة (${invoice.invoice_number}) لأنها تتبع وردية تم إغلاقها وترحيلها (${shift.shift_code}) إلا بصلاحية المدير الإداري (Manager Override).`);
          }
        }
      }

      // 1. Restock items back to inventory
      const restockStmt = db.prepare(`
        UPDATE inventory 
        SET stock_qty = stock_qty + ? 
        WHERE id = ?
      `);

      for (const item of invoice.items || []) {
        if (item.inventory_id && item.item_type !== 'service' && item.product_category !== 'service') {
          restockStmt.run(item.qty, item.inventory_id);
        }
      }

      // 2. Adjust customer debt if remaining_debt was logged
      if (invoice.remaining_debt > 0 && invoice.vehicle_id) {
        db.prepare(`
          UPDATE customers_vehicles 
          SET balance_due = MAX(0, balance_due - ?) 
          WHERE id = ?
        `).run(invoice.remaining_debt, invoice.vehicle_id);
      }

      // 3. Smart Odometer & Retention Radar Rollback
      if (invoice.vehicle_id) {
        const prevInvoice = db.prepare(`
          SELECT current_odometer, next_odometer, next_service_date 
          FROM invoices 
          WHERE vehicle_id = ? AND id != ? AND is_voided = 0
          ORDER BY id DESC LIMIT 1
        `).get(invoice.vehicle_id, id);

        if (prevInvoice) {
          db.prepare(`
            UPDATE customers_vehicles SET
              last_odometer = ?,
              next_due_odometer = ?,
              next_due_date = ?
            WHERE id = ?
          `).run(
            prevInvoice.current_odometer || 0,
            prevInvoice.next_odometer || 0,
            prevInvoice.next_service_date || null,
            invoice.vehicle_id
          );
        } else {
          db.prepare(`
            UPDATE customers_vehicles SET
              last_odometer = 0,
              next_due_odometer = 0,
              next_due_date = NULL
            WHERE id = ?
          `).run(invoice.vehicle_id);
        }
      }

      // 4. Create Reversal Journal Entry [MOD-GAPLESS Audit Parity]
      try {
        const jv = db.prepare("SELECT * FROM journal_entries WHERE ref_type = 'invoice' AND ref_id = ?").get(id);
        if (jv) {
          const lines = db.prepare("SELECT * FROM journal_lines WHERE journal_entry_id = ?").all(jv.id);
          const reversalLines = lines.map(line => ({
            account_code: line.account_code,
            debit: line.credit, // Invert debit and credit
            credit: line.debit,
            party_type: line.party_type,
            party_id: line.party_id,
            description: `قيد عكسي لتسوية وإلغاء الفاتورة (${invoice.invoice_number}): ${reason}`,
          }));

          const { createJournalEntry } = require('../utils/accountingEngine');
          createJournalEntry(db, {
            entry_date: formatDate(),
            ref_type: 'closing_entry',
            ref_id: invoice.id,
            ref_number: `REV-${invoice.invoice_number}`,
            description: `قيد عكسي لتسوية وإلغاء الفاتورة (${invoice.invoice_number}) - السبب: ${voidReason}`,
            lines: reversalLines,
          });

          // Reconcile consignment supplier sub-ledger if this invoice credited suppliers (2101) [MOD-CONSIGNMENT]
          for (const line of lines) {
            if (line.account_code === '2101' && line.credit > 0 && line.party_type === 'supplier' && line.party_id) {
              db.prepare('UPDATE suppliers SET balance_due = balance_due - ? WHERE id = ?').run(line.credit, line.party_id);
            }
          }
        }
      } catch (jvErr) {
        console.warn('[Void] Reversing journal entry warning:', jvErr.message);
      }

      // 5. Soft-Void the invoice record and clear from pit bay [MOD-GAPLESS + MOD-LANE]
      db.prepare(`
        UPDATE invoices 
        SET is_voided = 1, service_status = 'completed', void_reason = ?, voided_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(voidReason, id);

      // 6. Audit log
      try {
        db.prepare(`
          INSERT INTO financial_audit_logs (
            action, entity_type, entity_id, old_data, new_data, performed_by, created_at
          ) VALUES (?, 'invoice', ?, ?, ?, 'cashier', datetime('now', 'localtime'))
        `).run(
          'INVOICE_VOIDED',
          id,
          JSON.stringify({
            invoice_number: invoice.invoice_number,
            net_total: invoice.net_total,
            customer_name: invoice.customer_name,
            scrap_battery_deduction: invoice.scrap_battery_deduction || 0,
          }),
          JSON.stringify({
            status: 'voided_and_restocked',
            reason: voidReason,
            reverse_tradein: invoice.scrap_battery_deduction > 0 ? 'RETURNED_IN_KIND_NO_CASH_REFUND' : 'NONE',
          })
        );
      } catch (auditErr) {
        // Non-fatal
      }

      return {
        id,
        invoice_number: invoice.invoice_number,
        is_voided: 1,
        message: invoice.scrap_battery_deduction > 0
          ? `تم إلغاء الفاتورة واسترجاع المخزون وتسوية الحسابات بنجاح. بروتوكول المقايضة العكسية [MOD-SCRAP]: تم إلغاء خصم السكراب (${invoice.scrap_battery_deduction.toLocaleString()} ر.ي) وتُعاد البطارية التالفة للعميل عيناً - يُحظر صرف قيمتها نقداً.`
          : 'تم إلغاء الفاتورة واسترجاع المخزون وتسوية الحسابات بنجاح دون حذف السجل (حفظ التسلسل المحاسبي)',
      };
    });

    return executeTransaction();
  },

  getPendingServices() {
    const query = `
      SELECT 
        inv.*,
        cv.plate_number,
        cv.plate_type,
        cv.car_make_model,
        cv.customer_name,
        cv.phone AS customer_phone,
        w.name AS worker_name
      FROM invoices inv
      JOIN customers_vehicles cv ON inv.vehicle_id = cv.id
      LEFT JOIN workers w ON inv.worker_id = w.id
      WHERE inv.service_status = 'pending_service' AND inv.is_voided = 0
      ORDER BY inv.id ASC
    `;
    const rows = db.prepare(query).all();

    for (const row of rows) {
      row.items = db.prepare(`
        SELECT 
          ii.*,
          inv.category AS product_category,
          inv.brand AS product_brand,
          inv.viscosity AS product_viscosity
        FROM invoice_items ii
        LEFT JOIN inventory inv ON ii.inventory_id = inv.id
        WHERE ii.invoice_id = ?
      `).all(row.id);

      if (row.safety_inspection_data) {
        try {
          row.safety_points = JSON.parse(row.safety_inspection_data);
        } catch {
          row.safety_points = null;
        }
      } else {
        row.safety_points = null;
      }
    }

    return rows;
  },

  completeService(id, { worker_id, safety_points, inspection_notes }) {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      throw new Error(`الفاتورة بالرقم ${id} غير موجودة في النظام`);
    }

    if (invoice.is_voided) {
      throw new Error(`لا يمكن إتمام خدمة فاتورة تم إلغاؤها وإبطالها مسبقاً (${invoice.invoice_number}).`);
    }

    if (invoice.service_status === 'completed') {
      throw new Error(`الخدمة بالفاتورة رقم (${invoice.invoice_number}) معتمدة ومنجزة مسبقاً.`);
    }

    const safetyDataStr = safety_points ? JSON.stringify(safety_points) : null;
    const workerIdToSave = worker_id || invoice.worker_id || null;

    db.prepare(`
      UPDATE invoices
      SET 
        service_status = 'completed',
        worker_id = ?,
        safety_inspection_data = ?,
        inspection_completed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(workerIdToSave, safetyDataStr, id);

    return this.getById(id);
  },

  getTodayServicesStats() {
    const today = formatDate();
    const row = db.prepare(`
      SELECT 
        COUNT(*) AS total_invoices,
        SUM(CASE WHEN service_status = 'completed' THEN 1 ELSE 0 END) AS cars_completed,
        SUM(CASE WHEN service_status = 'pending_service' THEN 1 ELSE 0 END) AS cars_in_service
      FROM invoices
      WHERE date(created_at) = date(?) AND is_voided = 0
    `).get(today);
    return {
      total_invoices: row?.total_invoices || 0,
      cars_completed: row?.cars_completed || 0,
      cars_in_service: row?.cars_in_service || 0,
    };
  },
};

module.exports = invoiceModel;
