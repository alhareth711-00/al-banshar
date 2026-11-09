const db = require('../db/database');
const { roundMoney, safeNum, calcWAC } = require('../utils/mathPrecision');
const { createJournalEntry, getInventoryAccountCode, postInventoryOpeningBalance } = require('../utils/accountingEngine');
const { formatDate } = require('../utils/helpers');

const inventoryModel = {
  getAll(filters = {}) {
    let query = 'SELECT * FROM inventory WHERE 1=1';
    const params = [];

    // Filter by Active status (default active only unless specified)
    if (filters.is_active === 'all') {
      // show all
    } else if (filters.is_active === '0' || filters.is_active === 0) {
      query += ' AND is_active = 0';
    } else {
      query += ' AND is_active = 1';
    }

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.item_type) {
      query += ' AND item_type = ?';
      params.push(filters.item_type);
    }

    if (filters.brand) {
      query += ' AND brand = ?';
      params.push(filters.brand);
    }

    if (filters.viscosity) {
      query += ' AND viscosity = ?';
      params.push(filters.viscosity);
    }

    if (filters.pack_size) {
      query += ' AND pack_size = ?';
      params.push(filters.pack_size);
    }

    if (filters.low_stock === 'true' || filters.low_stock === true) {
      query += ' AND item_type = "product" AND stock_qty <= min_stock_alert';
    }

    if (filters.is_consignment !== undefined) {
      if (filters.is_consignment === '1' || filters.is_consignment === 1 || filters.is_consignment === true) {
        query += ' AND is_consignment = 1';
      } else if (filters.is_consignment === '0' || filters.is_consignment === 0 || filters.is_consignment === false) {
        query += ' AND is_consignment = 0';
      }
    }

    if (filters.search) {
      query += ` AND (
        name LIKE ? OR 
        sku LIKE ? OR 
        barcode LIKE ? OR 
        brand LIKE ? OR 
        viscosity LIKE ? OR 
        tire_battery_spec LIKE ? OR
        dot_code LIKE ? OR
        consignment_supplier_name LIKE ?
      )`;
      const s = `%${filters.search.trim()}%`;
      params.push(s, s, s, s, s, s, s, s);
    }

    query += ' ORDER BY category ASC, brand ASC, name ASC';
    return db.prepare(query).all(...params);
  },

  getById(id) {
    return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  },

  getByName(name) {
    if (!name) return null;
    return db.prepare('SELECT * FROM inventory WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(name.trim());
  },

  getBySku(sku) {
    if (!sku) return null;
    return db.prepare('SELECT * FROM inventory WHERE sku = ?').get(sku.trim());
  },

  getByBarcode(barcode) {
    if (!barcode) return null;
    return db.prepare('SELECT * FROM inventory WHERE barcode = ?').get(barcode.trim());
  },

  getLowStockItems() {
    return db.prepare(`
      SELECT *, (min_stock_alert - stock_qty) AS deficit
      FROM inventory 
      WHERE is_active = 1 AND item_type = 'product' AND stock_qty <= min_stock_alert 
      ORDER BY (min_stock_alert - stock_qty) DESC
    `).all();
  },

  create(data) {
    const isService = data.category === 'service' || data.item_type === 'service';
    const category = data.category || (isService ? 'service' : 'oil');
    const sku = data.sku && data.sku.trim() ? data.sku.trim() : `SKU-${Date.now().toString().slice(-6)}`;

    // Category-specific sanitization
    const isOil = category === 'oil';
    const isTire = category === 'tire';
    const isBattery = category === 'battery';

    const viscosity = isOil ? (data.viscosity || null) : null;
    const oil_type = isOil ? (data.oil_type || null) : null;
    const api_grade = isOil ? (data.api_grade || null) : null;
    const pack_size = isOil ? (data.pack_size || '4L') : 'unit';

    const dot_code = isTire && data.dot_code ? data.dot_code.trim() : null;
    const battery_capacity_ah = isBattery && data.battery_capacity_ah ? data.battery_capacity_ah.trim() : null;

    // Default units
    let defaultRetail = 'حبة';
    let defaultBulk = 'كرتون';
    let defaultPackQty = 1;

    if (isOil) {
      if (pack_size === '1L') { defaultRetail = 'علبة'; defaultBulk = 'كرتون'; defaultPackQty = 24; }
      else if (pack_size === 'bulk_liter') { defaultRetail = 'لتر'; defaultBulk = 'برميل الزيت'; defaultPackQty = 200; }
      else if (['20L', '25L'].includes(pack_size)) { defaultRetail = 'دبة'; defaultBulk = 'دبة'; defaultPackQty = 1; }
      else { defaultRetail = 'دبة'; defaultBulk = 'كرتون'; defaultPackQty = 4; }
    } else if (category === 'filter') {
      defaultRetail = 'حبة'; defaultBulk = 'شدة'; defaultPackQty = 10;
    } else if (isBattery) {
      defaultRetail = 'حبة'; defaultBulk = 'حبة'; defaultPackQty = 1;
    } else if (isTire) {
      defaultRetail = 'إطار'; defaultBulk = 'إطار'; defaultPackQty = 1;
    } else if (category === 'accessory') {
      defaultRetail = 'قطعة'; defaultBulk = 'شدة'; defaultPackQty = 10;
    } else if (isService) {
      defaultRetail = 'خدمة'; defaultBulk = 'خدمة'; defaultPackQty = 1;
    }

    const retail_unit = data.retail_unit || defaultRetail;
    const bulk_unit = data.bulk_unit || defaultBulk;
    const carton_pack_qty = isService
      ? 1
      : ['حبة', 'إطار', 'دبة'].includes(bulk_unit)
      ? 1
      : Math.max(1, safeNum(data.carton_pack_qty, defaultPackQty));

    const stmt = db.prepare(`
      INSERT INTO inventory (
        sku, barcode, name, category, item_type, brand, viscosity, oil_type, api_grade,
        pack_size, retail_unit, bulk_unit, carton_pack_qty, tire_battery_spec, country_of_origin, dot_code,
        battery_capacity_ah, warranty_months, cost_price, sell_price, stock_qty,
        min_stock_alert, location_shelf, is_consignment, consignment_supplier_name,
        is_active, notes, created_at
      ) VALUES (
        @sku, @barcode, @name, @category, @item_type, @brand, @viscosity, @oil_type, @api_grade,
        @pack_size, @retail_unit, @bulk_unit, @carton_pack_qty, @tire_battery_spec, @country_of_origin, @dot_code,
        @battery_capacity_ah, @warranty_months, @cost_price, @sell_price, @stock_qty,
        @min_stock_alert, @location_shelf, @is_consignment, @consignment_supplier_name,
        @is_active, @notes, datetime('now', 'localtime')
      )
    `);

    const executeTx = db.transaction(() => {
      const result = stmt.run({
        sku,
        barcode: data.barcode ? data.barcode.trim() : null,
        name: data.name.trim(),
        category,
        item_type: isService ? 'service' : 'product',
        brand: data.brand && data.brand.trim() ? data.brand.trim() : (isService ? 'خدمات المركز' : ''),
        viscosity,
        oil_type,
        api_grade,
        pack_size,
        retail_unit,
        bulk_unit,
        carton_pack_qty,
        tire_battery_spec: data.tire_battery_spec || null,
        country_of_origin: data.country_of_origin ? data.country_of_origin.trim() : null,
        dot_code,
        battery_capacity_ah,
        warranty_months: Math.max(0, safeNum(data.warranty_months, 0)),
        cost_price: Math.max(0, roundMoney(safeNum(data.cost_price, 0))),
        sell_price: Math.max(0, roundMoney(safeNum(data.sell_price, 0))),
        stock_qty: isService ? 9999 : Math.max(0, safeNum(data.stock_qty, 0)),
        min_stock_alert: isService ? 0 : Math.max(0, safeNum(data.min_stock_alert, 5)),
        location_shelf: data.location_shelf ? data.location_shelf.trim() : null,
        is_consignment: data.is_consignment ? 1 : 0,
        consignment_supplier_name: data.is_consignment && data.consignment_supplier_name ? data.consignment_supplier_name.trim() : null,
        is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        notes: data.notes ? data.notes.trim() : null,
      });

      const newId = result.lastInsertRowid;
      const initialQty = isService ? 0 : Math.max(0, safeNum(data.stock_qty, 0));
      const unitCost = Math.max(0, roundMoney(safeNum(data.cost_price, 0)));
      const totalCost = roundMoney(initialQty * unitCost);

      if (!isService && initialQty > 0 && unitCost > 0) {
        // 1. Record official stock movement for opening balance
        const isConsignment = Boolean(data.is_consignment);
        db.prepare(`
          INSERT INTO stock_movements (
            inventory_id, movement_type, ref_type, ref_id,
            qty_in, qty_out, unit_cost, total_cost, balance_qty_after, wac_cost_after, notes
          ) VALUES (?, 'opening_balance', 'inventory_initial', ?, ?, 0, ?, ?, ?, ?, ?)
        `).run(
          newId,
          newId,
          initialQty,
          unitCost,
          totalCost,
          initialQty,
          unitCost,
          isConsignment ? 'رصيد أولي (بضاعة أمانة عهدة للغير برسم البيع)' : 'رصيد افتتاحي (بضاعة أول المدة)'
        );

        // 2. Post opening journal entry to GL: Dr. Inventory Asset, Cr. 3001 Capital (ONLY FOR OWNED INVENTORY)
        // [MOD-CONSIGNMENT]: Consignment stock belongs to third-party suppliers, NOT shop capital or assets!
        if (!isConsignment) {
          try {
            postInventoryOpeningBalance(db, {
              inventory_id: newId,
              name: data.name.trim(),
              category,
              stock_qty: initialQty,
              cost_price: unitCost,
              pack_size,
              retail_unit,
            });
          } catch (e) {
            console.warn(`[Inventory] Warning posting opening balance journal entry: ${e.message}`);
          }
        }
      }

      return this.getById(newId);
    });

    return executeTx();
  },

  update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    const category = data.category || existing.category;
    const isService = category === 'service' || (data.item_type || existing.item_type) === 'service';

    // Category sanitization
    const isOil = category === 'oil';
    const isTire = category === 'tire';
    const isBattery = category === 'battery';

    const viscosity = isOil ? (data.viscosity !== undefined ? data.viscosity : existing.viscosity) : null;
    const oil_type = isOil ? (data.oil_type !== undefined ? data.oil_type : existing.oil_type) : null;
    const api_grade = isOil ? (data.api_grade !== undefined ? data.api_grade : existing.api_grade) : null;
    const pack_size = isOil ? (data.pack_size || existing.pack_size || '4L') : 'unit';

    const dot_code = isTire ? (data.dot_code !== undefined ? (data.dot_code ? data.dot_code.trim() : null) : existing.dot_code) : null;
    const battery_capacity_ah = isBattery ? (data.battery_capacity_ah !== undefined ? (data.battery_capacity_ah ? data.battery_capacity_ah.trim() : null) : existing.battery_capacity_ah) : null;

    const retail_unit = data.retail_unit !== undefined ? data.retail_unit : (existing.retail_unit || 'حبة');
    const bulk_unit = data.bulk_unit !== undefined ? data.bulk_unit : (existing.bulk_unit || 'كرتون');
    const carton_pack_qty = isService
      ? 1
      : ['حبة', 'إطار', 'دبة'].includes(bulk_unit)
      ? 1
      : data.carton_pack_qty !== undefined
      ? Math.max(1, safeNum(data.carton_pack_qty, 1))
      : (existing.carton_pack_qty || 1);

    // [MOD-CONSIGNMENT Guard]: Prevent switching ownership on items with existing physical stock
    if (data.is_consignment !== undefined) {
      const newIsConsignment = data.is_consignment ? 1 : 0;
      const currentIsConsignment = existing.is_consignment ? 1 : 0;
      if (newIsConsignment !== currentIsConsignment && Number(existing.stock_qty) > 0) {
        throw new Error(`حظر محاسبي [MOD-CONSIGNMENT]: لا يمكن تغيير صفة ملكية الصنف "${existing.name}" (من/إلى بضاعة أمانة) طالما يوجد له رصيد حالي بالمستودع (${existing.stock_qty} وحدة). يرجى تسوية رصيد المخزن إلى الصفر أولاً لحماية ميزان المراجعة والأستاذ العام.`);
      }
    }

    const stmt = db.prepare(`
      UPDATE inventory SET
        sku = @sku,
        barcode = @barcode,
        name = @name,
        category = @category,
        item_type = @item_type,
        brand = @brand,
        viscosity = @viscosity,
        oil_type = @oil_type,
        api_grade = @api_grade,
        pack_size = @pack_size,
        retail_unit = @retail_unit,
        bulk_unit = @bulk_unit,
        carton_pack_qty = @carton_pack_qty,
        tire_battery_spec = @tire_battery_spec,
        country_of_origin = @country_of_origin,
        dot_code = @dot_code,
        battery_capacity_ah = @battery_capacity_ah,
        warranty_months = @warranty_months,
        cost_price = @cost_price,
        sell_price = @sell_price,
        stock_qty = @stock_qty,
        min_stock_alert = @min_stock_alert,
        location_shelf = @location_shelf,
        is_consignment = @is_consignment,
        consignment_supplier_name = @consignment_supplier_name,
        is_active = @is_active,
        notes = @notes
      WHERE id = @id
    `);

    stmt.run({
      id,
      sku: data.sku ? data.sku.trim() : existing.sku,
      barcode: data.barcode !== undefined ? (data.barcode ? data.barcode.trim() : null) : existing.barcode,
      name: data.name ? data.name.trim() : existing.name,
      category,
      item_type: isService ? 'service' : (data.item_type || existing.item_type || 'product'),
      brand: data.brand !== undefined ? (data.brand && data.brand.trim() ? data.brand.trim() : '') : existing.brand,
      viscosity,
      oil_type,
      api_grade,
      pack_size,
      retail_unit,
      bulk_unit,
      carton_pack_qty,
      tire_battery_spec: data.tire_battery_spec !== undefined ? data.tire_battery_spec : existing.tire_battery_spec,
      country_of_origin: data.country_of_origin !== undefined ? data.country_of_origin : existing.country_of_origin,
      dot_code,
      battery_capacity_ah,
      warranty_months: data.warranty_months !== undefined ? Math.max(0, safeNum(data.warranty_months, 0)) : existing.warranty_months,
      cost_price: data.cost_price !== undefined ? Math.max(0, roundMoney(safeNum(data.cost_price, 0))) : existing.cost_price,
      sell_price: data.sell_price !== undefined ? Math.max(0, roundMoney(safeNum(data.sell_price, 0))) : existing.sell_price,
      stock_qty: data.stock_qty !== undefined ? safeNum(data.stock_qty, existing.stock_qty) : existing.stock_qty,
      min_stock_alert: data.min_stock_alert !== undefined ? Math.max(0, safeNum(data.min_stock_alert, 5)) : existing.min_stock_alert,
      location_shelf: data.location_shelf !== undefined ? data.location_shelf : existing.location_shelf,
      is_consignment: data.is_consignment !== undefined ? (data.is_consignment ? 1 : 0) : (existing.is_consignment || 0),
      consignment_supplier_name: data.is_consignment !== undefined
        ? (data.is_consignment && data.consignment_supplier_name ? data.consignment_supplier_name.trim() : null)
        : existing.consignment_supplier_name,
      is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    });

    return this.getById(id);
  },

  deleteOrArchive(id) {
    const item = this.getById(id);
    if (!item) return null;

    const executeTx = db.transaction(() => {
      // Check references in invoice_items, purchase_items, purchase_return_items, or stock_movements
      const invoiceRefCount = db.prepare('SELECT COUNT(*) as count FROM invoice_items WHERE inventory_id = ?').get(id).count;
      const purchaseRefCount = db.prepare('SELECT COUNT(*) as count FROM purchase_items WHERE inventory_id = ?').get(id).count;
      const returnRefCount = db.prepare('SELECT COUNT(*) as count FROM purchase_return_items WHERE inventory_id = ?').get(id).count;
      const movementRefCount = db.prepare('SELECT COUNT(*) as count FROM stock_movements WHERE inventory_id = ?').get(id).count;

      const totalRefs = invoiceRefCount + purchaseRefCount + returnRefCount + movementRefCount;
      const hasStock = item.item_type !== 'service' && item.category !== 'service' && Number(item.stock_qty) > 0;

      if (totalRefs > 0 || hasStock) {
        // Soft-delete / Archive to preserve financial ledger and physical stock integrity
        db.prepare('UPDATE inventory SET is_active = 0 WHERE id = ?').run(id);

        let reason = '';
        if (totalRefs > 0) {
          reason = `لوجود (${invoiceRefCount} مبيعات / ${purchaseRefCount} مشتريات / ${returnRefCount} مردودات / ${movementRefCount} حركات مخزن) مسجلة عليه مسبقاً.`;
        } else if (hasStock) {
          reason = `لاحتوائه على رصيد كمية فعلي بالمستودع (${item.stock_qty} ${item.retail_unit || 'حبة'}). يرجى تسوية المخزون أولاً في حال الرغبة بحذفه نهائياً.`;
        }

        return {
          id,
          action: 'archived',
          is_active: 0,
          message: `تم أرشفة الصنف وتعطيله لحماية السجلات المالية والمخزنية؛ ${reason}`,
        };
      } else {
        // Clean delete
        db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
        return {
          id,
          action: 'deleted',
          message: 'تم حذف الصنف نهائياً من قاعدة البيانات لعدم ارتباطه بأي معاملات سابقة وتصفير رصيده.',
        };
      }
    });

    return executeTx();
  },

  toggleActive(id) {
    const item = this.getById(id);
    if (!item) return null;

    const newStatus = item.is_active ? 0 : 1;
    db.prepare('UPDATE inventory SET is_active = ? WHERE id = ?').run(newStatus, id);
    return this.getById(id);
  },

  /**
   * Performs an official stock adjustment (تسوية جردية) with balanced journal entry
   */
  adjustStock(id, { qty_delta, reason = 'تسوية جرد دوري', adjusted_by = 'أمين المستودع' }) {
    const execute = db.transaction(() => {
      const item = this.getById(id);
      if (!item) throw new Error('الصنف غير موجود');

      const delta = safeNum(qty_delta, 0);
      if (delta === 0) throw new Error('فارق التسوية يجب أن يكون قيمة موجبة أو سالبة غير صفرية');

      const newStock = roundMoney(item.stock_qty + delta);
      if (newStock < 0) {
        throw new Error(`لا يمكن خصم كمية (${Math.abs(delta)})؛ لأن الرصيد الحالي (${item.stock_qty}) غير كافٍ.`);
      }

      // 1. Update stock
      db.prepare('UPDATE inventory SET stock_qty = ? WHERE id = ?').run(newStock, id);

      const movementType = delta > 0 ? 'adjustment_in' : 'adjustment_out';
      const costValue = roundMoney(Math.abs(delta) * item.cost_price);

      // 2. Record stock movement
      const refType = item.is_consignment && delta < 0 ? 'consignment_damage' : 'adjustment';
      db.prepare(`
        INSERT INTO stock_movements (
          inventory_id, movement_type, ref_type, ref_id,
          qty_in, qty_out, unit_cost, total_cost, unit_price,
          balance_qty_after, wac_cost_after, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        id,
        movementType,
        refType,
        id,
        delta > 0 ? delta : 0,
        delta < 0 ? Math.abs(delta) : 0,
        item.cost_price,
        costValue,
        item.sell_price,
        newStock,
        item.cost_price,
        `${reason} (بواسطة: ${adjusted_by})`
      );

      // 3. Post balanced double-entry adjustment in General Ledger
      if (costValue > 0) {
        const isConsignment = Boolean(item.is_consignment);

        if (isConsignment) {
          // [MOD-CONSIGNMENT]: Consignment goods do NOT belong to shop inventory assets (1301-1305).
          // If Deficit (delta < 0): workshop bears the loss for third-party custody!
          // Debit Operating Loss (6109), Credit Consignment Supplier Payables (2101).
          if (delta < 0) {
            const supplierName = (item.consignment_supplier_name || 'مورد بضاعة أمانة').trim();
            let supplier = db.prepare('SELECT id, name, balance_due FROM suppliers WHERE name = ? OR company_name = ? LIMIT 1').get(supplierName, supplierName);
            if (!supplier) {
              const newSup = db.prepare('INSERT INTO suppliers (name, company_name, balance_due, notes) VALUES (?, ?, ?, ?)').run(
                supplierName,
                supplierName,
                costValue,
                'مورد بضاعة أمانة تم إنشاؤه آلياً عند تسوية عجز أمانة'
              );
              supplier = { id: newSup.lastInsertRowid, name: supplierName, balance_due: costValue };
            } else {
              db.prepare('UPDATE suppliers SET balance_due = balance_due + ? WHERE id = ?').run(costValue, supplier.id);
            }

            const lines = [
              { account_code: '6109', debit: costValue, credit: 0, description: `خسائر تلف وعجز بضاعة أمانة: ${item.name}` },
              { account_code: '2101', debit: 0, credit: costValue, party_type: 'supplier', party_id: supplier.id, description: `التزام مورد أمانة (${supplier.name}) عن تلف/عجز (${item.name})` }
            ];

            createJournalEntry(db, {
              entry_date: formatDate(),
              ref_type: 'inventory_adjustment',
              ref_id: id,
              description: `تسوية عجز/تلف بضاعة أمانة (${item.name}): ${delta} عبوة`,
              lines,
            });
          }
          // If Surplus (delta > 0): Consignment goods do NOT inflate shop equity!
          // We only adjusted physical custody stock and recorded stock movement. No equity distortion.
        } else {
          // Standard Owned Inventory
          const invAccount = getInventoryAccountCode(item.category);
          const lines = [];

          if (delta > 0) {
            // Surplus: Debit Inventory, Credit Retained Earnings / Equity
            lines.push(
              { account_code: invAccount, debit: costValue, credit: 0, description: `تسوية جردية فائض: ${item.name}` },
              { account_code: '3201', debit: 0, credit: costValue, description: `أرباح تسوية جردية فائض: ${item.name}` }
            );
          } else {
            // Shrinkage/Loss: Debit Operating Loss/Expense, Credit Inventory
            lines.push(
              { account_code: '6109', debit: costValue, credit: 0, description: `خسائر عجز جردي: ${item.name}` },
              { account_code: invAccount, debit: 0, credit: costValue, description: `تخفيض مخزون بعجز جردي: ${item.name}` }
            );
          }

          createJournalEntry(db, {
            entry_date: formatDate(),
            ref_type: 'inventory_adjustment',
            ref_id: id,
            description: `قيد تسوية جردية (${item.name}): ${delta > 0 ? '+' : ''}${delta} ${item.pack_size}`,
            lines,
          });
        }
      }

      return this.getById(id);
    });

    return execute();
  },

  /**
   * Receives a new batch of consignment stock without generating immediate financial debt
   * (Debt is recognized only upon actual sale)
   */
  receiveConsignmentStock(id, { qty, supplier_name, notes = '', received_by = 'أمين المستودع' }) {
    const execute = db.transaction(() => {
      const item = this.getById(id);
      if (!item) throw new Error('الصنف غير موجود');
      if (!item.is_consignment) {
        throw new Error('هذا الصنف ليس مسجلاً كبضاعة أمانة. لتوريد بضاعة مملوكة يرجى استخدام فاتورة مشتريات رسمية.');
      }

      const inQty = safeNum(qty, 0);
      if (inQty <= 0) {
        throw new Error('الكمية المستلمة يجب أن تكون أكبر من الصفر');
      }

      const effectiveSupplier = (supplier_name || item.consignment_supplier_name || 'مورد عام').trim();
      const newStock = roundMoney(item.stock_qty + inQty);

      // 1. Update stock
      db.prepare('UPDATE inventory SET stock_qty = ? WHERE id = ?').run(newStock, id);

      // If supplier name was changed/updated during receipt, update item
      if (effectiveSupplier && effectiveSupplier !== item.consignment_supplier_name) {
        db.prepare('UPDATE inventory SET consignment_supplier_name = ? WHERE id = ?').run(effectiveSupplier, id);
      }

      // 2. Ensure supplier exists in suppliers table
      let supplier = db.prepare('SELECT id, name FROM suppliers WHERE name = ? OR company_name = ? LIMIT 1').get(effectiveSupplier, effectiveSupplier);
      if (!supplier) {
        const newSup = db.prepare('INSERT INTO suppliers (name, company_name, balance_due, notes) VALUES (?, ?, 0, ?)').run(
          effectiveSupplier,
          effectiveSupplier,
          'مورد بضاعة أمانة تم تسجيله عند استلام دفعة أمانة'
        );
        supplier = { id: newSup.lastInsertRowid, name: effectiveSupplier };
      }

      const totalCostValue = roundMoney(inQty * item.cost_price);

      // 3. Record stock movement (custody receipt, zero immediate debt)
      db.prepare(`
        INSERT INTO stock_movements (
          inventory_id, movement_type, ref_type, ref_id,
          qty_in, qty_out, unit_cost, total_cost, unit_price,
          balance_qty_after, wac_cost_after, notes, created_at
        ) VALUES (?, 'adjustment_in', 'consignment_receipt', ?, ?, 0, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        id,
        supplier.id,
        inQty,
        item.cost_price,
        totalCostValue,
        item.sell_price,
        newStock,
        item.cost_price,
        `استلام دفعة بضاعة أمانة برسم البيع (المورد: ${effectiveSupplier})${notes ? ` - ${notes}` : ''} [بواسطة: ${received_by}]`
      );

      return this.getById(id);
    });

    return execute();
  },

  /**
   * Converts parent packaging (Carton/Drum) into child units (Can/Liter)
   * Handles decanting cling & evaporation loss for 208L drums (~204L actual yield)
   * Accurately rolls transferred cost into child WAC so that no inventory value is lost
   */
  convertPackaging({ from_id, to_id, packages_to_convert, units_per_package, actual_units_produced }) {
    const execute = db.transaction(() => {
      const fromItem = this.getById(from_id);
      const toItem = this.getById(to_id);

      if (!fromItem || !toItem) throw new Error('أحد الأصناف المحددة للتحويل غير موجود');

      // [MOD-CONSIGNMENT]: Enforce Consignment Ownership Parity
      if (fromItem.is_consignment) {
        if (!toItem.is_consignment) {
          // If child item has zero stock, auto-align it as consignment with the same supplier
          if (Number(toItem.stock_qty) === 0) {
            db.prepare('UPDATE inventory SET is_consignment = 1, consignment_supplier_name = ? WHERE id = ?')
              .run(fromItem.consignment_supplier_name, to_id);
          } else {
            throw new Error(`لا يمكن تفكيك صنف أمانة تابع للمورد (${fromItem.consignment_supplier_name}) إلى صنف مملوك للمحل (${toItem.name}). يرجى اختيار صنف ناتج مخصص للأمانة لنفس المورد منعاً لاختلاط الذمة المالية.`);
          }
        } else if (fromItem.consignment_supplier_name !== toItem.consignment_supplier_name) {
          throw new Error(`تعارض في اسم مورد الأمانة: الصنف الأصل يتبع (${fromItem.consignment_supplier_name}) بينما الصنف الناتج يتبع (${toItem.consignment_supplier_name}).`);
        }
      } else if (toItem.is_consignment) {
        throw new Error(`لا يمكن تفكيك صنف مملوك للمحل (${fromItem.name}) إلى صنف أمانة تابع للمورد (${toItem.consignment_supplier_name}).`);
      }

      const packages = Math.max(1, safeNum(packages_to_convert, 1));
      const unitsPerPkg = Math.max(1, safeNum(units_per_package, fromItem.carton_pack_qty || 24));
      const nominalUnits = packages * unitsPerPkg;

      // Handle Decanting & Clinging Loss for 208L drums (or custom actual yield)
      // Standard Yemeni & lube market reality: a 208L drum physically yields ~204L actual usable oil.
      const is208LBarrel = unitsPerPkg === 208 || (fromItem.pack_size && fromItem.pack_size.toUpperCase() === '208L') || (fromItem.name && fromItem.name.includes('208'));
      
      let totalUnitsProduced = 0;
      let wasteUnits = 0;

      if (actual_units_produced !== undefined && actual_units_produced !== null && Number(actual_units_produced) > 0) {
        totalUnitsProduced = Math.max(1, Number(actual_units_produced));
        wasteUnits = Math.max(0, roundMoney(nominalUnits - totalUnitsProduced));
      } else if (is208LBarrel) {
        // Default standard: 204 liters actual yield per 208L barrel (4L decanting loss)
        totalUnitsProduced = packages * 204;
        wasteUnits = packages * 4;
      } else {
        totalUnitsProduced = nominalUnits;
        wasteUnits = 0;
      }

      if (fromItem.stock_qty < packages) {
        throw new Error(`الرصيد المتاح من ${fromItem.name} (${fromItem.stock_qty}) أقل من الكمية المراد فكها (${packages})`);
      }

      // Cost Calculation: Full parent cost is transferred and absorbed by produced units
      const totalParentCost = roundMoney(packages * fromItem.cost_price);
      const producedUnitCost = totalUnitsProduced > 0 ? roundMoney(totalParentCost / totalUnitsProduced) : toItem.cost_price;

      // Recompute Child WAC defensively
      const prevChildQty = Math.max(0, safeNum(toItem.stock_qty, 0));
      const prevChildCost = safeNum(toItem.cost_price, 0);
      const newChildWac = calcWAC(prevChildQty, prevChildCost, totalUnitsProduced, producedUnitCost);
      const newToQty = roundMoney(prevChildQty + totalUnitsProduced);
      const newFromQty = roundMoney(fromItem.stock_qty - packages);

      // 1. Decrement parent stock
      db.prepare('UPDATE inventory SET stock_qty = stock_qty - ? WHERE id = ?').run(packages, from_id);

      // 2. Increment child stock and update WAC cost
      db.prepare(`
        UPDATE inventory 
        SET stock_qty = stock_qty + ?, cost_price = ? 
        WHERE id = ?
      `).run(totalUnitsProduced, newChildWac, to_id);

      // 3. Record stock movements
      const fromNotes = `فك وتجزئة عبوة وتحويل إلى (${toItem.name})` + (wasteUnits > 0 ? ` [فاقد تفريغ وترسيب: ${wasteUnits} وحدة]` : '');
      db.prepare(`
        INSERT INTO stock_movements (
          inventory_id, movement_type, ref_type, ref_id,
          qty_in, qty_out, unit_cost, total_cost, balance_qty_after, wac_cost_after, notes
        ) VALUES (?, 'adjustment_out', 'packaging_conversion', ?, 0, ?, ?, ?, ?, ?, ?)
      `).run(
        from_id,
        to_id,
        packages,
        fromItem.cost_price,
        totalParentCost,
        newFromQty,
        fromItem.cost_price,
        fromNotes
      );

      const toNotes = `ناتج فك عبوات من (${fromItem.name})` + (wasteUnits > 0 ? ` [صافي فعلي بعد استبعاد هدر ${wasteUnits} وحدة]` : '');
      db.prepare(`
        INSERT INTO stock_movements (
          inventory_id, movement_type, ref_type, ref_id,
          qty_in, qty_out, unit_cost, total_cost, balance_qty_after, wac_cost_after, notes
        ) VALUES (?, 'adjustment_in', 'packaging_conversion', ?, ?, 0, ?, ?, ?, ?, ?)
      `).run(
        to_id,
        from_id,
        totalUnitsProduced,
        producedUnitCost,
        totalParentCost, // All parent value transferred
        newToQty,
        newChildWac,
        toNotes
      );

      return {
        from_item: this.getById(from_id),
        to_item: this.getById(to_id),
        packages_converted: packages,
        nominal_units: nominalUnits,
        units_produced: totalUnitsProduced,
        waste_units: wasteUnits,
        transferred_cost: totalParentCost,
        produced_unit_cost: producedUnitCost,
        new_child_wac: newChildWac,
      };
    });

    return execute();
  },

  /**
   * Comprehensive Inventory Valuation Summary
   */
  getValuationSummary() {
    const categories = db.prepare(`
      SELECT 
        category,
        item_type,
        COUNT(*) AS items_count,
        COALESCE(SUM(CASE WHEN item_type = 'product' AND stock_qty > 0 AND (is_consignment = 0 OR is_consignment IS NULL) THEN stock_qty ELSE 0 END), 0) AS total_units,
        COALESCE(SUM(CASE WHEN item_type = 'product' AND stock_qty > 0 AND (is_consignment = 0 OR is_consignment IS NULL) THEN stock_qty * cost_price ELSE 0 END), 0) AS total_cost_value,
        COALESCE(SUM(CASE WHEN item_type = 'product' AND stock_qty > 0 AND (is_consignment = 0 OR is_consignment IS NULL) THEN stock_qty * sell_price ELSE 0 END), 0) AS total_sell_value,
        COALESCE(SUM(CASE WHEN item_type = 'product' AND stock_qty > 0 AND is_consignment = 1 THEN stock_qty * cost_price ELSE 0 END), 0) AS consignment_cost_value,
        SUM(CASE WHEN item_type = 'product' AND stock_qty <= min_stock_alert THEN 1 ELSE 0 END) AS low_stock_count,
        SUM(CASE WHEN item_type = 'product' AND stock_qty < 0 THEN 1 ELSE 0 END) AS negative_stock_count
      FROM inventory
      WHERE is_active = 1
      GROUP BY category, item_type
      ORDER BY total_cost_value DESC
    `).all();

    let grandCost = 0;
    let grandSell = 0;
    let grandConsignmentCost = 0;
    let totalProducts = 0;
    let totalServices = 0;
    let lowStockTotal = 0;
    let negativeStockTotal = 0;

    for (const c of categories) {
      c.total_cost_value = roundMoney(c.total_cost_value);
      c.total_sell_value = roundMoney(c.total_sell_value);
      c.consignment_cost_value = roundMoney(c.consignment_cost_value || 0);
      c.expected_profit = roundMoney(c.total_sell_value - c.total_cost_value);
      c.margin_percent = c.total_cost_value > 0 ? Math.round((c.expected_profit / c.total_cost_value) * 100) : 0;

      if (c.item_type === 'product') {
        grandCost = roundMoney(grandCost + c.total_cost_value);
        grandSell = roundMoney(grandSell + c.total_sell_value);
        grandConsignmentCost = roundMoney(grandConsignmentCost + c.consignment_cost_value);
        totalProducts += c.items_count;
        lowStockTotal += c.low_stock_count;
        negativeStockTotal += (c.negative_stock_count || 0);
      } else {
        totalServices += c.items_count;
      }
    }

    return {
      grand_cost_value: Math.round(grandCost),
      grand_sell_value: Math.round(grandSell),
      grand_expected_profit: Math.round(grandSell - grandCost),
      grand_consignment_cost: Math.round(grandConsignmentCost),
      overall_margin_percent: grandCost > 0 ? Math.round(((grandSell - grandCost) / grandCost) * 100) : 0,
      total_products: totalProducts,
      total_services: totalServices,
      total_low_stock_alerts: lowStockTotal,
      total_negative_stock_alerts: negativeStockTotal,
      categories,
    };
  },

  /**
   * Retrieves comprehensive consignment settlement data grouped by supplier
   * for consignment audit, liquidation, and settlements with reps
   */
  getConsignmentSettlementSummary(supplierFilter = null) {
    let query = `
      SELECT id, name, sku, brand, category, viscosity, pack_size, cost_price, sell_price, stock_qty, consignment_supplier_name
      FROM inventory
      WHERE is_consignment = 1 AND is_active = 1
    `;
    const params = [];
    if (supplierFilter && supplierFilter !== 'all') {
      query += ' AND consignment_supplier_name = ?';
      params.push(supplierFilter.trim());
    }
    query += ' ORDER BY consignment_supplier_name ASC, name ASC';
    const items = db.prepare(query).all(...params);

    // Group items by supplier
    const suppliersMap = {};

    for (const item of items) {
      const supName = (item.consignment_supplier_name || 'مورد عام').trim();
      if (!suppliersMap[supName]) {
        // Find supplier record
        const supRecord = db.prepare('SELECT id, name, company_name, phone, balance_due FROM suppliers WHERE name = ? OR company_name = ? LIMIT 1').get(supName, supName);
        
        let totalPaidVouchers = 0;
        if (supRecord) {
          const pvSum = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total_paid
            FROM official_vouchers
            WHERE voucher_type = 'payment' AND party_type = 'supplier' AND party_id = ? AND status != 'voided'
          `).get(supRecord.id);
          totalPaidVouchers = Number(pvSum?.total_paid) || 0;
        }

        suppliersMap[supName] = {
          supplier_name: supName,
          supplier_id: supRecord?.id || null,
          supplier_phone: supRecord?.phone || null,
          current_balance_due: Number(supRecord?.balance_due) || 0,
          total_paid_vouchers: totalPaidVouchers,
          total_stock_qty: 0,
          total_sold_qty: 0,
          total_lost_qty: 0,
          total_cost_due: 0,
          total_stock_cost_value: 0,
          items: [],
        };
      }

      // Compute units sold and lost from stock movements
      const soldStats = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN movement_type = 'sale' THEN qty_out ELSE 0 END), 0) AS sold_qty,
          COALESCE(SUM(CASE WHEN ref_type = 'consignment_damage' OR (movement_type = 'adjustment_out' AND notes LIKE '%أمانة%') THEN qty_out ELSE 0 END), 0) AS lost_qty
        FROM stock_movements
        WHERE inventory_id = ?
      `).get(item.id);

      const soldQty = Number(soldStats?.sold_qty) || 0;
      const lostQty = Number(soldStats?.lost_qty) || 0;
      const shelfStock = Math.max(0, Number(item.stock_qty) || 0);
      const costDue = roundMoney((soldQty + lostQty) * item.cost_price);
      const stockCostVal = roundMoney(shelfStock * item.cost_price);

      item.sold_qty = soldQty;
      item.lost_qty = lostQty;
      item.total_cost_due = costDue;
      item.stock_cost_value = stockCostVal;

      suppliersMap[supName].items.push(item);
      suppliersMap[supName].total_stock_qty += shelfStock;
      suppliersMap[supName].total_sold_qty += soldQty;
      suppliersMap[supName].total_lost_qty += lostQty;
      suppliersMap[supName].total_cost_due = roundMoney(suppliersMap[supName].total_cost_due + costDue);
      suppliersMap[supName].total_stock_cost_value = roundMoney(suppliersMap[supName].total_stock_cost_value + stockCostVal);
    }

    return Object.values(suppliersMap);
  },

  /**
   * ABC Turnover & Velocity Analytics (المقترح 4)
   * Analyzes sales frequency in the last 90 days, classifies items into:
   * Class A: Fast moving (sold >= 5 units or sold in last 14 days)
   * Class B: Moderate moving (sold 1-4 units or sold in last 45 days)
   * Class C: Slow / Dead stock (zero sales or > 45 days inactive)
   */
  getTurnoverAnalytics(days = 90) {
    const products = db.prepare(`
      SELECT 
        i.id,
        i.sku,
        i.barcode,
        i.name,
        i.category,
        i.brand,
        i.viscosity,
        i.pack_size,
        i.cost_price,
        i.sell_price,
        i.stock_qty,
        COALESCE(sales.total_sold_qty, 0) AS total_sold_qty,
        COALESCE(sales.total_revenue, 0) AS total_revenue,
        sales.last_sold_date,
        CAST((julianday('now', 'localtime') - julianday(COALESCE(sales.last_sold_date, i.created_at, '2026-01-01'))) AS INTEGER) AS days_since_last_sale
      FROM inventory i
      LEFT JOIN (
        SELECT 
          ii.inventory_id,
          SUM(ii.qty) AS total_sold_qty,
          SUM(ii.subtotal) AS total_revenue,
          MAX(inv.created_at) AS last_sold_date
        FROM invoice_items ii
        JOIN invoices inv ON ii.invoice_id = inv.id
        WHERE date(inv.created_at) >= date('now', 'localtime', '-' || ? || ' days')
        GROUP BY ii.inventory_id
      ) sales ON i.id = sales.inventory_id
      WHERE i.is_active = 1 AND i.item_type = 'product'
      ORDER BY total_sold_qty DESC, total_revenue DESC
    `).all(days);

    let classACount = 0;
    let classBCount = 0;
    let classCCount = 0;
    let deadStockCostValue = 0;
    let totalStockCostValue = 0;

    const classified = products.map((item) => {
      const stockCost = roundMoney(item.stock_qty * item.cost_price);
      totalStockCostValue = roundMoney(totalStockCostValue + stockCost);

      let turnover_class = 'C';
      let status_label = 'راكد / ميت';
      let status_color = 'rose';

      if (item.total_sold_qty >= 5 || (item.days_since_last_sale !== null && item.days_since_last_sale <= 14 && item.total_sold_qty > 0)) {
        turnover_class = 'A';
        status_label = 'سريع الدوران';
        status_color = 'emerald';
        classACount++;
      } else if (item.total_sold_qty > 0 || (item.days_since_last_sale !== null && item.days_since_last_sale <= 45)) {
        turnover_class = 'B';
        status_label = 'متوسط الدوران';
        status_color = 'amber';
        classBCount++;
      } else {
        turnover_class = 'C';
        status_label = 'راكد / ميت';
        status_color = 'rose';
        classCCount++;
        deadStockCostValue = roundMoney(deadStockCostValue + stockCost);
      }

      return {
        ...item,
        stock_cost_value: stockCost,
        turnover_class,
        status_label,
        status_color,
      };
    });

    return {
      period_days: days,
      summary: {
        total_products: products.length,
        class_a_fast: classACount,
        class_b_moderate: classBCount,
        class_c_slow: classCCount,
        total_stock_cost: totalStockCostValue,
        dead_stock_cost: deadStockCostValue,
        dead_stock_ratio_percent: totalStockCostValue > 0 ? Math.round((deadStockCostValue / totalStockCostValue) * 100) : 0,
      },
      items: classified,
    };
  },

  /**
   * Reorder Suggestions for Low Stock (المقترح 5)
   * Auto-compiles items that reached safety threshold with recommended replenishment quantities.
   */
  getReorderSuggestions() {
    const lowStock = db.prepare(`
      SELECT 
        i.*,
        (i.min_stock_alert - i.stock_qty) AS deficit_qty,
        COALESCE(last_pur.supplier_id, NULL) AS last_supplier_id,
        COALESCE(s.name, 'مورد عام') AS last_supplier_name
      FROM inventory i
      LEFT JOIN (
        SELECT 
          pi.inventory_id,
          p.supplier_id,
          MAX(p.created_at) AS last_purchase_date
        FROM purchase_items pi
        JOIN purchases p ON pi.purchase_id = p.id
        GROUP BY pi.inventory_id
      ) last_pur ON i.id = last_pur.inventory_id
      LEFT JOIN suppliers s ON last_pur.supplier_id = s.id
      WHERE i.is_active = 1 AND i.item_type = 'product' AND i.stock_qty <= i.min_stock_alert
      ORDER BY (i.min_stock_alert - i.stock_qty) DESC
    `).all();

    let totalEstimatedCost = 0;
    let totalItemsToOrder = 0;

    const suggestions = lowStock.map((item) => {
      // Suggested order qty: replenishment up to 2x safety stock, minimum 5 units or carton pack
      const targetStock = Math.max(item.min_stock_alert * 2, 6);
      let suggestedQty = Math.max(targetStock - item.stock_qty, 1);
      
      // If packed in cartons, suggest rounding up to full cartons
      if (item.carton_pack_qty && item.carton_pack_qty > 1) {
        suggestedQty = Math.ceil(suggestedQty / item.carton_pack_qty) * item.carton_pack_qty;
      }

      const estimatedCost = roundMoney(suggestedQty * item.cost_price);
      totalEstimatedCost = roundMoney(totalEstimatedCost + estimatedCost);
      totalItemsToOrder += suggestedQty;

      return {
        inventory_id: item.id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        brand: item.brand,
        category: item.category,
        viscosity: item.viscosity,
        pack_size: item.pack_size,
        current_stock: item.stock_qty,
        min_stock_alert: item.min_stock_alert,
        deficit_qty: item.deficit_qty,
        suggested_qty: suggestedQty,
        unit_cost: item.cost_price,
        estimated_cost: estimatedCost,
        preferred_supplier_id: item.last_supplier_id,
        preferred_supplier_name: item.last_supplier_name,
      };
    });

    return {
      requisition_number: `PO-REQ-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      total_items_count: suggestions.length,
      total_units_to_order: totalItemsToOrder,
      total_estimated_cost: totalEstimatedCost,
      items: suggestions,
    };
  },
};

module.exports = inventoryModel;
