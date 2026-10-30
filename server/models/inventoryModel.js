const db = require('../db/database');
const { roundMoney, safeNum } = require('../utils/mathPrecision');
const { createJournalEntry, getInventoryAccountCode } = require('../utils/accountingEngine');
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
    const sku = data.sku && data.sku.trim() ? data.sku.trim() : `SKU-${Date.now().toString().slice(-6)}`;

    const stmt = db.prepare(`
      INSERT INTO inventory (
        sku, barcode, name, category, item_type, brand, viscosity, oil_type, api_grade,
        pack_size, carton_pack_qty, tire_battery_spec, country_of_origin, dot_code,
        battery_capacity_ah, warranty_months, cost_price, sell_price, stock_qty,
        min_stock_alert, location_shelf, is_consignment, consignment_supplier_name,
        is_active, notes, created_at
      ) VALUES (
        @sku, @barcode, @name, @category, @item_type, @brand, @viscosity, @oil_type, @api_grade,
        @pack_size, @carton_pack_qty, @tire_battery_spec, @country_of_origin, @dot_code,
        @battery_capacity_ah, @warranty_months, @cost_price, @sell_price, @stock_qty,
        @min_stock_alert, @location_shelf, @is_consignment, @consignment_supplier_name,
        @is_active, @notes, datetime('now', 'localtime')
      )
    `);

    const result = stmt.run({
      sku,
      barcode: data.barcode ? data.barcode.trim() : null,
      name: data.name.trim(),
      category: data.category || (isService ? 'service' : 'oil'),
      item_type: isService ? 'service' : 'product',
      brand: data.brand ? data.brand.trim() : 'عام',
      viscosity: data.viscosity || null,
      oil_type: data.oil_type || null,
      api_grade: data.api_grade || null,
      pack_size: data.pack_size || (isService ? 'unit' : '4L'),
      carton_pack_qty: Math.max(1, safeNum(data.carton_pack_qty, 1)),
      tire_battery_spec: data.tire_battery_spec || null,
      country_of_origin: data.country_of_origin ? data.country_of_origin.trim() : null,
      dot_code: data.dot_code ? data.dot_code.trim() : null,
      battery_capacity_ah: data.battery_capacity_ah ? data.battery_capacity_ah.trim() : null,
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

    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    const isService = (data.category || existing.category) === 'service' || (data.item_type || existing.item_type) === 'service';

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
      category: data.category || existing.category,
      item_type: isService ? 'service' : (data.item_type || existing.item_type || 'product'),
      brand: data.brand ? data.brand.trim() : existing.brand,
      viscosity: data.viscosity !== undefined ? data.viscosity : existing.viscosity,
      oil_type: data.oil_type !== undefined ? data.oil_type : existing.oil_type,
      api_grade: data.api_grade !== undefined ? data.api_grade : existing.api_grade,
      pack_size: data.pack_size || existing.pack_size,
      carton_pack_qty: data.carton_pack_qty !== undefined ? Math.max(1, safeNum(data.carton_pack_qty, 1)) : existing.carton_pack_qty,
      tire_battery_spec: data.tire_battery_spec !== undefined ? data.tire_battery_spec : existing.tire_battery_spec,
      country_of_origin: data.country_of_origin !== undefined ? data.country_of_origin : existing.country_of_origin,
      dot_code: data.dot_code !== undefined ? data.dot_code : existing.dot_code,
      battery_capacity_ah: data.battery_capacity_ah !== undefined ? data.battery_capacity_ah : existing.battery_capacity_ah,
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

    // Check references in invoice_items, purchase_items, or stock_movements
    const invoiceRefCount = db.prepare('SELECT COUNT(*) as count FROM invoice_items WHERE inventory_id = ?').get(id).count;
    const purchaseRefCount = db.prepare('SELECT COUNT(*) as count FROM purchase_items WHERE inventory_id = ?').get(id).count;
    const movementRefCount = db.prepare('SELECT COUNT(*) as count FROM stock_movements WHERE inventory_id = ?').get(id).count;

    const totalRefs = invoiceRefCount + purchaseRefCount + movementRefCount;

    if (totalRefs > 0) {
      // Soft-delete / Archive to preserve financial ledger integrity
      db.prepare('UPDATE inventory SET is_active = 0 WHERE id = ?').run(id);
      return {
        id,
        action: 'archived',
        is_active: 0,
        message: `تم أرشفة الصنف وتعطيله لحماية السجلات المحاسبية؛ لوجود (${invoiceRefCount} مبيعات / ${purchaseRefCount} مشتريات) مسجلة عليه مسبقاً.`,
      };
    } else {
      // Clean delete
      db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
      return {
        id,
        action: 'deleted',
        message: 'تم حذف الصنف نهائياً من قاعدة البيانات لعدم ارتباطه بأي معاملات سابقة.',
      };
    }
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
      db.prepare(`
        INSERT INTO stock_movements (
          inventory_id, movement_type, ref_type, ref_id,
          qty_in, qty_out, unit_cost, total_cost, unit_price,
          balance_qty_after, wac_cost_after, notes, created_at
        ) VALUES (?, ?, 'adjustment', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        id,
        movementType,
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

      return this.getById(id);
    });

    return execute();
  },

  /**
   * Converts parent packaging (Carton/Drum) into child units (Can/Liter)
   */
  convertPackaging({ from_id, to_id, packages_to_convert, units_per_package }) {
    const execute = db.transaction(() => {
      const fromItem = this.getById(from_id);
      const toItem = this.getById(to_id);

      if (!fromItem || !toItem) throw new Error('أحد الأصناف المحددة للتحويل غير موجود');

      const packages = Math.max(1, safeNum(packages_to_convert, 1));
      const unitsPerPkg = Math.max(1, safeNum(units_per_package, fromItem.carton_pack_qty || 24));
      const totalUnitsProduced = packages * unitsPerPkg;

      if (fromItem.stock_qty < packages) {
        throw new Error(`الرصيد المتاح من ${fromItem.name} (${fromItem.stock_qty}) أقل من الكمية المراد فكها (${packages})`);
      }

      // Decrement parent
      db.prepare('UPDATE inventory SET stock_qty = stock_qty - ? WHERE id = ?').run(packages, from_id);
      // Increment child
      db.prepare('UPDATE inventory SET stock_qty = stock_qty + ? WHERE id = ?').run(totalUnitsProduced, to_id);

      const fromTotalCost = roundMoney(packages * fromItem.cost_price);
      const toTotalCost = roundMoney(totalUnitsProduced * toItem.cost_price);
      const newFromQty = roundMoney(fromItem.stock_qty - packages);
      const newToQty = roundMoney(toItem.stock_qty + totalUnitsProduced);

      // Record stock movements
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
        fromTotalCost,
        newFromQty,
        fromItem.cost_price,
        `فك عبوة وتحويل إلى (${toItem.name})`
      );

      db.prepare(`
        INSERT INTO stock_movements (
          inventory_id, movement_type, ref_type, ref_id,
          qty_in, qty_out, unit_cost, total_cost, balance_qty_after, wac_cost_after, notes
        ) VALUES (?, 'adjustment_in', 'packaging_conversion', ?, ?, 0, ?, ?, ?, ?, ?)
      `).run(
        to_id,
        from_id,
        totalUnitsProduced,
        toItem.cost_price,
        toTotalCost,
        newToQty,
        toItem.cost_price,
        `ناتج فك عبوات من (${fromItem.name})`
      );

      return {
        from_item: this.getById(from_id),
        to_item: this.getById(to_id),
        packages_converted: packages,
        units_produced: totalUnitsProduced,
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
