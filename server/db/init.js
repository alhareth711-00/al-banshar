const fs = require('fs');
const path = require('path');
const db = require('./database');
const {
  seedChartOfAccounts,
  postInvoice,
  postPurchase,
  postExpense,
  postDebtCollection,
  postWorkerAdvance,
  reconcileAllOpeningBalances,
  reconcileAllOpeningInventory,
} = require('../utils/accountingEngine');

function reconcileHistoricalLedger() {
  // Always verify and reconcile any debtor vehicles or suppliers lacking opening balances
  try {
    reconcileAllOpeningBalances(db);
    reconcileAllOpeningInventory(db);
  } catch (err) {
    console.warn('[Accounting] Opening balance reconciliation warning:', err.message);
  }

  const jvCount = db.prepare('SELECT COUNT(*) as count FROM journal_entries').get().count;
  if (jvCount > 0) return; // Already populated

  console.log('[Accounting] Reconciling existing historical data into double-entry ledger...');

  // 1. Post historical invoices
  const invoices = db.prepare('SELECT * FROM invoices ORDER BY id ASC').all();
  for (const inv of invoices) {
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
    try {
      postInvoice(db, { invoice: inv, items });
    } catch (e) {
      console.warn(`[Reconcile] Skipping historical invoice ${inv.id}: ${e.message}`);
    }
  }

  // 2. Post historical purchases
  const purchases = db.prepare('SELECT * FROM purchases ORDER BY id ASC').all();
  for (const pur of purchases) {
    const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(pur.id);
    try {
      postPurchase(db, { purchase: pur, items });
    } catch (e) {
      console.warn(`[Reconcile] Skipping historical purchase ${pur.id}: ${e.message}`);
    }
  }

  // 3. Post historical daily transactions
  const txs = db.prepare('SELECT * FROM daily_transactions ORDER BY id ASC').all();
  for (const tx of txs) {
    // Avoid double posting purchases that were previously logged in daily_transactions
    if (tx.description && tx.description.includes('سداد فاتورة مشتريات')) continue;
    try {
      if (tx.tx_type === 'expense') postExpense(db, tx);
      else if (tx.tx_type === 'debt_collection') postDebtCollection(db, tx);
      else if (tx.tx_type === 'worker_advance') postWorkerAdvance(db, tx);
    } catch (e) {
      console.warn(`[Reconcile] Skipping historical tx ${tx.id}: ${e.message}`);
    }
  }

  const finalCount = db.prepare('SELECT COUNT(*) as count FROM journal_entries').get().count;
  console.log(`[Accounting] Historical reconciliation complete. Generated ${finalCount} balanced journal entries.`);
}

function initDb() {
  // Pre-schema migrations: ensure columns exist in existing tables before schema index execution
  try {
    const invCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'").get();
    if (invCheck) {
      const invCols = db.prepare("PRAGMA table_info(inventory)").all();
      const colNames = invCols.map(c => c.name);

      if (!colNames.includes('barcode')) db.exec("ALTER TABLE inventory ADD COLUMN barcode TEXT");
      if (!colNames.includes('item_type')) db.exec("ALTER TABLE inventory ADD COLUMN item_type TEXT NOT NULL DEFAULT 'product'");
      if (!colNames.includes('oil_type')) db.exec("ALTER TABLE inventory ADD COLUMN oil_type TEXT");
      if (!colNames.includes('api_grade')) db.exec("ALTER TABLE inventory ADD COLUMN api_grade TEXT");
      if (!colNames.includes('carton_pack_qty')) db.exec("ALTER TABLE inventory ADD COLUMN carton_pack_qty REAL DEFAULT 1");
      if (!colNames.includes('retail_unit')) db.exec("ALTER TABLE inventory ADD COLUMN retail_unit TEXT NOT NULL DEFAULT 'حبة'");
      if (!colNames.includes('bulk_unit')) db.exec("ALTER TABLE inventory ADD COLUMN bulk_unit TEXT NOT NULL DEFAULT 'كرتون'");
      if (!colNames.includes('country_of_origin')) db.exec("ALTER TABLE inventory ADD COLUMN country_of_origin TEXT");
      if (!colNames.includes('dot_code')) db.exec("ALTER TABLE inventory ADD COLUMN dot_code TEXT");
      if (!colNames.includes('battery_capacity_ah')) db.exec("ALTER TABLE inventory ADD COLUMN battery_capacity_ah TEXT");
      if (!colNames.includes('location_shelf')) db.exec("ALTER TABLE inventory ADD COLUMN location_shelf TEXT");
      if (!colNames.includes('is_consignment')) db.exec("ALTER TABLE inventory ADD COLUMN is_consignment INTEGER NOT NULL DEFAULT 0");
      if (!colNames.includes('consignment_supplier_name')) db.exec("ALTER TABLE inventory ADD COLUMN consignment_supplier_name TEXT");
      if (!colNames.includes('is_active')) db.exec("ALTER TABLE inventory ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
      if (!colNames.includes('notes')) db.exec("ALTER TABLE inventory ADD COLUMN notes TEXT");
      if (!colNames.includes('created_at')) db.exec("ALTER TABLE inventory ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))");
      // Normalize oil_type: migrate 'معدني تقليدي' to 'معدني'
      db.exec("UPDATE inventory SET oil_type = 'معدني' WHERE oil_type = 'معدني تقليدي'");

      // Sanitize and isolate non-oil items from oil specifications
      db.exec("UPDATE inventory SET viscosity = NULL, oil_type = NULL, api_grade = NULL WHERE category != 'oil'");
      db.exec("UPDATE inventory SET brand = '' WHERE brand = 'عام' AND category != 'oil'");

      // Clean existing inventory items 1 through 6
      db.exec(`
        UPDATE inventory SET retail_unit = 'علبة', bulk_unit = 'كرتون', carton_pack_qty = 24 WHERE id = 1;
        UPDATE inventory SET category = 'filter', brand = 'تويوتا', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'حبة', bulk_unit = 'شدة', carton_pack_qty = 10 WHERE id = 2;
        UPDATE inventory SET category = 'battery', brand = 'إنديكو', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'حبة', bulk_unit = 'حبة', carton_pack_qty = 1, battery_capacity_ah = '50Ah' WHERE id = 3;
        UPDATE inventory SET category = 'tire', brand = 'سيلون', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'إطار', bulk_unit = 'إطار', carton_pack_qty = 1 WHERE id = 4;
        UPDATE inventory SET category = 'service', brand = 'خدمات المركز', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'خدمة', bulk_unit = 'خدمة', cost_price = 0 WHERE id = 5;
        UPDATE inventory SET category = 'accessory', brand = 'عام', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'قطعة', bulk_unit = 'شدة', carton_pack_qty = 10 WHERE id = 6;
      `);

      // Upgrade inventory table CHECK constraint to support 20L and 25L pack sizes
      const invTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inventory'").get()?.sql || '';
      if (invTableSql && !invTableSql.includes('20L')) {
        db.exec("PRAGMA foreign_keys=OFF;");
        db.exec(`
          CREATE TABLE inventory_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT UNIQUE NOT NULL,
            barcode TEXT,
            name TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('oil', 'filter', 'tire', 'battery', 'accessory', 'service')),
            item_type TEXT NOT NULL DEFAULT 'product' CHECK(item_type IN ('product', 'service')),
            brand TEXT NOT NULL,
            viscosity TEXT,
            oil_type TEXT,
            api_grade TEXT,
            pack_size TEXT CHECK(pack_size IN ('1L', '4L', '5L', '20L', '25L', 'bulk_liter', 'unit', 'carton')),
            carton_pack_qty REAL DEFAULT 1,
            tire_battery_spec TEXT,
            country_of_origin TEXT,
            dot_code TEXT,
            battery_capacity_ah TEXT,
            warranty_months INTEGER NOT NULL DEFAULT 0,
            cost_price REAL NOT NULL DEFAULT 0,
            sell_price REAL NOT NULL DEFAULT 0,
            stock_qty REAL NOT NULL DEFAULT 0,
            min_stock_alert REAL NOT NULL DEFAULT 5,
            location_shelf TEXT,
            is_consignment INTEGER NOT NULL DEFAULT 0 CHECK(is_consignment IN (0, 1)),
            consignment_supplier_name TEXT,
            is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
          );
          INSERT INTO inventory_new (
            id, sku, barcode, name, category, item_type, brand, viscosity, oil_type, api_grade,
            pack_size, carton_pack_qty, tire_battery_spec, country_of_origin, dot_code,
            battery_capacity_ah, warranty_months, cost_price, sell_price, stock_qty,
            min_stock_alert, location_shelf, is_consignment, consignment_supplier_name,
            is_active, notes, created_at
          )
          SELECT 
            id, sku, barcode, name, category, item_type, brand, viscosity, oil_type, api_grade,
            pack_size, carton_pack_qty, tire_battery_spec, country_of_origin, dot_code,
            battery_capacity_ah, warranty_months, cost_price, sell_price, stock_qty,
            min_stock_alert, location_shelf, is_consignment, consignment_supplier_name,
            is_active, notes, created_at
          FROM inventory;
          DROP TABLE inventory;
          ALTER TABLE inventory_new RENAME TO inventory;
          CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
          CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode);
          CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
          CREATE INDEX IF NOT EXISTS idx_inventory_brand ON inventory(brand);
          CREATE INDEX IF NOT EXISTS idx_inventory_viscosity ON inventory(viscosity);
          CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON inventory(item_type);
          CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory(is_active);
          PRAGMA foreign_keys=ON;
        `);
        console.log('[DB] Upgraded inventory CHECK constraint to include 20L and 25L.');
      }

      console.log('[DB] Pre-schema migration applied: upgraded inventory schema.');
    }
  } catch (err) {
    console.warn('[DB] Pre-migration warning on inventory:', err.message);
  }

  // Pre-schema migration: invoices service_status, safety_inspection_data, inspection_completed_at
  try {
    const invoiceTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'").get();
    if (invoiceTableCheck) {
      const invCols = db.prepare("PRAGMA table_info(invoices)").all().map(c => c.name);
      if (!invCols.includes('service_status')) {
        db.exec("ALTER TABLE invoices ADD COLUMN service_status TEXT DEFAULT 'completed'");
      }
      if (!invCols.includes('safety_inspection_data')) {
        db.exec("ALTER TABLE invoices ADD COLUMN safety_inspection_data TEXT");
      }
      if (!invCols.includes('inspection_completed_at')) {
        db.exec("ALTER TABLE invoices ADD COLUMN inspection_completed_at TEXT");
      }
      if (!invCols.includes('shift_id')) {
        db.exec("ALTER TABLE invoices ADD COLUMN shift_id INTEGER REFERENCES cash_shifts(id)");
      }
      if (!invCols.includes('is_voided')) {
        db.exec("ALTER TABLE invoices ADD COLUMN is_voided INTEGER NOT NULL DEFAULT 0");
      }
      if (!invCols.includes('void_reason')) {
        db.exec("ALTER TABLE invoices ADD COLUMN void_reason TEXT");
      }
      if (!invCols.includes('voided_at')) {
        db.exec("ALTER TABLE invoices ADD COLUMN voided_at TEXT");
      }
      if (!invCols.includes('client_token')) {
        db.exec("ALTER TABLE invoices ADD COLUMN client_token TEXT");
        db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_client_token ON invoices(client_token) WHERE client_token IS NOT NULL");
      }
      console.log('[DB] Pre-schema migration applied: upgraded invoices schema with shift_id, is_voided, client_token, and audit columns.');
    }

    // Pre-schema migration: invoice_items cost_price [MOD-CATALOG-RETRO]
    const iiTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='invoice_items'").get();
    if (iiTableCheck) {
      const iiCols = db.prepare("PRAGMA table_info(invoice_items)").all().map(c => c.name);
      if (!iiCols.includes('cost_price')) {
        db.exec("ALTER TABLE invoice_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0");
        console.log('[DB] Pre-schema migration applied: upgraded invoice_items with frozen historical cost_price [MOD-CATALOG-RETRO].');
      }
    }
  } catch (err) {
    console.warn('[DB] Pre-migration warning on invoices:', err.message);
  }

  // Pre-schema migration: official_vouchers status, void_reason, voided_at, is_multiline
  try {
    const voucherTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='official_vouchers'").get();
    if (voucherTableCheck) {
      const vCols = db.prepare("PRAGMA table_info(official_vouchers)").all().map(c => c.name);
      if (!vCols.includes('status')) {
        db.exec("ALTER TABLE official_vouchers ADD COLUMN status TEXT NOT NULL DEFAULT 'posted'");
      }
      if (!vCols.includes('void_reason')) {
        db.exec("ALTER TABLE official_vouchers ADD COLUMN void_reason TEXT");
      }
      if (!vCols.includes('voided_at')) {
        db.exec("ALTER TABLE official_vouchers ADD COLUMN voided_at TEXT");
      }
      if (!vCols.includes('is_multiline')) {
        db.exec("ALTER TABLE official_vouchers ADD COLUMN is_multiline INTEGER NOT NULL DEFAULT 0");
      }
      console.log('[DB] Pre-schema migration applied: upgraded official_vouchers schema.');
    }
  } catch (err) {
    console.warn('[DB] Pre-migration warning on official_vouchers:', err.message);
  }

  // Pre-schema migration: upgrade official_vouchers CHECK constraint to support waste_oil & scrap_battery [MOD-RECLAMATION]
  try {
    const ovTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='official_vouchers'").get()?.sql || '';
    if (ovTableSql && !ovTableSql.includes('waste_oil')) {
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec(`
        CREATE TABLE official_vouchers_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          voucher_number TEXT UNIQUE NOT NULL,
          voucher_type TEXT NOT NULL CHECK(voucher_type IN ('receipt', 'payment')),
          party_type TEXT CHECK(party_type IN ('customer', 'supplier', 'worker', 'owner', 'expense', 'waste_oil', 'scrap_battery', 'other')),
          party_id INTEGER,
          party_name TEXT NOT NULL,
          amount REAL NOT NULL CHECK(amount > 0),
          payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'kuraimi', 'jeeb', 'bank', 'jawali', 'onecash')),
          cash_account_code TEXT NOT NULL DEFAULT '1101',
          offset_account_code TEXT NOT NULL,
          paper_bill_number TEXT,
          description TEXT NOT NULL,
          notes TEXT,
          prev_balance REAL NOT NULL DEFAULT 0,
          new_balance REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'posted',
          void_reason TEXT,
          voided_at TEXT,
          is_multiline INTEGER NOT NULL DEFAULT 0,
          created_by TEXT DEFAULT 'أمين الصندوق',
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        INSERT INTO official_vouchers_new (
          id, voucher_number, voucher_type, party_type, party_id, party_name,
          amount, payment_method, cash_account_code, offset_account_code,
          paper_bill_number, description, notes, prev_balance, new_balance,
          status, void_reason, voided_at, is_multiline, created_by, created_at
        )
        SELECT 
          id, voucher_number, voucher_type, party_type, party_id, party_name,
          amount, payment_method, cash_account_code, offset_account_code,
          paper_bill_number, description, notes, prev_balance, new_balance,
          COALESCE(status, 'posted'), void_reason, voided_at, COALESCE(is_multiline, 0), created_by, created_at
        FROM official_vouchers;

        DROP TABLE official_vouchers;
        ALTER TABLE official_vouchers_new RENAME TO official_vouchers;

        CREATE INDEX IF NOT EXISTS idx_vouchers_type ON official_vouchers(voucher_type);
        CREATE INDEX IF NOT EXISTS idx_vouchers_party ON official_vouchers(party_type, party_id);
        CREATE INDEX IF NOT EXISTS idx_vouchers_date ON official_vouchers(created_at);
        CREATE INDEX IF NOT EXISTS idx_vouchers_cash_acc ON official_vouchers(cash_account_code);
        CREATE INDEX IF NOT EXISTS idx_vouchers_offset_acc ON official_vouchers(offset_account_code);
      `);
      db.exec("PRAGMA foreign_keys=ON;");
      console.log('[DB] Pre-schema migration applied: upgraded official_vouchers party_type to support waste_oil & scrap_battery.');
    }
  } catch (err) {
    console.warn('[DB] Pre-migration warning on official_vouchers party_type upgrade:', err.message);
  }

  // Pre-schema migration: upgrade journal_entries CHECK constraint to include 'opening_balance' and 'balance_adjustment'
  try {
    const jvTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='journal_entries'").get()?.sql || '';
    if (jvTableSql && !jvTableSql.includes('opening_balance')) {
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec(`
        CREATE TABLE journal_entries_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entry_number TEXT UNIQUE NOT NULL,
          entry_date TEXT NOT NULL,
          ref_type TEXT NOT NULL CHECK(ref_type IN (
              'invoice', 'purchase', 'sale_return', 'purchase_return',
              'expense', 'worker_advance', 'debt_collection', 'supplier_payment',
              'wage_payout', 'capital_deposit', 'inventory_adjustment', 'closing_entry',
              'opening_balance', 'balance_adjustment'
          )),
          ref_id INTEGER,
          ref_number TEXT,
          description TEXT NOT NULL,
          total_debit REAL NOT NULL DEFAULT 0,
          total_credit REAL NOT NULL DEFAULT 0,
          is_balanced INTEGER NOT NULL DEFAULT 1 CHECK(is_balanced IN (0, 1)),
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
        INSERT INTO journal_entries_new (
          id, entry_number, entry_date, ref_type, ref_id, ref_number,
          description, total_debit, total_credit, is_balanced, created_at
        )
        SELECT 
          id, entry_number, entry_date, ref_type, ref_id, ref_number,
          description, total_debit, total_credit, is_balanced, created_at
        FROM journal_entries;
        DROP TABLE journal_entries;
        ALTER TABLE journal_entries_new RENAME TO journal_entries;
        CREATE INDEX IF NOT EXISTS idx_jv_entry_number ON journal_entries(entry_number);
        CREATE INDEX IF NOT EXISTS idx_jv_entry_date ON journal_entries(entry_date);
        CREATE INDEX IF NOT EXISTS idx_jv_ref ON journal_entries(ref_type, ref_id);
        PRAGMA foreign_keys=ON;
      `);
      console.log('[DB] Upgraded journal_entries CHECK constraint to include opening_balance and balance_adjustment.');
    }
  } catch (err) {
    console.warn('[DB] Pre-migration warning on journal_entries:', err.message);
  }

  // Stage 5 Pre-schema migration: upgrade chart_of_accounts with hierarchy columns before schema.sql index execution
  try {
    const coaCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chart_of_accounts'").get();
    if (coaCheck) {
      const coaCols = db.prepare("PRAGMA table_info(chart_of_accounts)").all().map(c => c.name);
      if (!coaCols.includes('parent_code')) {
        db.exec("ALTER TABLE chart_of_accounts ADD COLUMN parent_code TEXT REFERENCES chart_of_accounts(code) ON UPDATE CASCADE");
      }
      if (!coaCols.includes('level')) {
        db.exec("ALTER TABLE chart_of_accounts ADD COLUMN level INTEGER NOT NULL DEFAULT 1");
      }
      if (!coaCols.includes('is_system')) {
        db.exec("ALTER TABLE chart_of_accounts ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0");
      }
      console.log('[DB] Pre-schema migration applied: upgraded chart_of_accounts with parent_code, level, is_system.');
    }
  } catch (err) {
    console.warn('[DB] Pre-migration warning on chart_of_accounts:', err.message);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema definitions
  db.exec(schemaSql);
  console.log('[DB] Schema verified and initialized successfully.');

  // Migration: add credit_limit and corporate fleet fields to customers_vehicles if missing
  try {
    const cols = db.prepare("PRAGMA table_info(customers_vehicles)").all();
    const colNames = cols.map(c => c.name);

    if (!colNames.includes('credit_limit')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN credit_limit REAL NOT NULL DEFAULT 50000");
    }
    if (!colNames.includes('customer_type')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN customer_type TEXT NOT NULL DEFAULT 'individual'");
    }
    if (!colNames.includes('corporate_name')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN corporate_name TEXT");
    }
    if (!colNames.includes('price_tier')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN price_tier TEXT NOT NULL DEFAULT 'standard'");
    }
    if (!colNames.includes('discount_percent')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN discount_percent REAL NOT NULL DEFAULT 0");
    }
    if (!colNames.includes('corporate_tax_no')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN corporate_tax_no TEXT");
    }
    if (!colNames.includes('billing_cycle')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'instant'");
    }
    if (!colNames.includes('plate_divider')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN plate_divider TEXT DEFAULT '1'");
    }
    if (!colNames.includes('vehicle_category')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN vehicle_category TEXT DEFAULT 'سيارة'");
    }
    if (!colNames.includes('customer_notes')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN customer_notes TEXT DEFAULT ''");
    }
    if (!colNames.includes('service_interval_km')) {
      db.exec("ALTER TABLE customers_vehicles ADD COLUMN service_interval_km INTEGER DEFAULT 3000");
    }
    console.log('[DB] Migration applied: upgraded customers_vehicles with corporate, divider, category, notes & interval fields.');
  } catch (err) {
    console.warn('[DB] Migration warning on customers_vehicles corporate fields:', err.message);
  }

  // Migration: create service_reminders_log table for WhatsApp predictive reminders
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_reminders_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL REFERENCES customers_vehicles(id),
        reminder_type TEXT NOT NULL DEFAULT 'whatsapp',
        odometer_at_reminder REAL,
        sent_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON service_reminders_log(vehicle_id);
    `);
    console.log('[DB] Migration applied: service_reminders_log table verified.');
  } catch (err) {
    console.warn('[DB] Migration warning on service_reminders_log:', err.message);
  }

  // Stage 4 Migrations: Purchases & Suppliers & Purchase Returns
  try {
    // 1. Upgrade purchases table with due_date and is_returned
    const purCols = db.prepare("PRAGMA table_info(purchases)").all().map(c => c.name);
    if (!purCols.includes('due_date')) {
      db.exec("ALTER TABLE purchases ADD COLUMN due_date TEXT");
    }
    if (!purCols.includes('is_returned')) {
      db.exec("ALTER TABLE purchases ADD COLUMN is_returned INTEGER NOT NULL DEFAULT 0");
    }

    // 2. Upgrade suppliers table with commercial_reg, agency_brand, credit_days, is_active
    const suppCols = db.prepare("PRAGMA table_info(suppliers)").all().map(c => c.name);
    if (!suppCols.includes('commercial_reg')) {
      db.exec("ALTER TABLE suppliers ADD COLUMN commercial_reg TEXT");
    }
    if (!suppCols.includes('agency_brand')) {
      db.exec("ALTER TABLE suppliers ADD COLUMN agency_brand TEXT");
    }
    if (!suppCols.includes('credit_days')) {
      db.exec("ALTER TABLE suppliers ADD COLUMN credit_days INTEGER NOT NULL DEFAULT 30");
    }
    if (!suppCols.includes('is_active')) {
      db.exec("ALTER TABLE suppliers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
    }

    // 3. Create purchase_returns and purchase_return_items tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT UNIQUE NOT NULL,
        purchase_id INTEGER REFERENCES purchases(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        supplier_name TEXT NOT NULL,
        total_amount REAL NOT NULL,
        refund_amount REAL NOT NULL DEFAULT 0,
        debt_reduction_amount REAL NOT NULL DEFAULT 0,
        refund_method TEXT NOT NULL DEFAULT 'credit',
        refund_to_cash_drawer INTEGER NOT NULL DEFAULT 1,
        reason TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
        inventory_id INTEGER NOT NULL REFERENCES inventory(id),
        qty REAL NOT NULL,
        unit_cost REAL NOT NULL,
        subtotal REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_returns_supplier ON purchase_returns(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_returns_purchase ON purchase_returns(purchase_id);
      CREATE INDEX IF NOT EXISTS idx_return_items_return ON purchase_return_items(return_id);

      -- Stage 4 Pro Upgrades: Supplier Payment Vouchers & Landed Cost Columns
      CREATE TABLE IF NOT EXISTS supplier_payment_vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_number TEXT UNIQUE NOT NULL,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON UPDATE CASCADE,
        supplier_name TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'kuraimi', 'jeeb', 'bank', 'jawali', 'onecash')),
        prev_balance REAL NOT NULL DEFAULT 0,
        new_balance REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX IF NOT EXISTS idx_spv_supplier ON supplier_payment_vouchers(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_spv_number ON supplier_payment_vouchers(voucher_number);
      CREATE INDEX IF NOT EXISTS idx_spv_created ON supplier_payment_vouchers(created_at);
    `);

    // Add shipping columns to purchases if not exist
    const purchasesCols = db.prepare("PRAGMA table_info(purchases)").all().map(c => c.name);
    if (!purchasesCols.includes('shipping_cost')) {
      db.prepare("ALTER TABLE purchases ADD COLUMN shipping_cost REAL NOT NULL DEFAULT 0").run();
    }
    if (!purchasesCols.includes('shipping_payer')) {
      db.prepare("ALTER TABLE purchases ADD COLUMN shipping_payer TEXT DEFAULT 'cash_drawer'").run();
    }

    // Add shipping columns to purchase_items if not exist
    const purchaseItemsCols = db.prepare("PRAGMA table_info(purchase_items)").all().map(c => c.name);
    if (!purchaseItemsCols.includes('allocated_shipping')) {
      db.prepare("ALTER TABLE purchase_items ADD COLUMN allocated_shipping REAL NOT NULL DEFAULT 0").run();
    }
    if (!purchaseItemsCols.includes('effective_unit_cost')) {
      db.prepare("ALTER TABLE purchase_items ADD COLUMN effective_unit_cost REAL NOT NULL DEFAULT 0").run();
    }

    if (!purchasesCols.includes('paper_bill_number')) {
      db.prepare("ALTER TABLE purchases ADD COLUMN paper_bill_number TEXT").run();
    }

    // Stage 5 Migration: Official Receipt & Payment Vouchers
    db.exec(`
      CREATE TABLE IF NOT EXISTS official_vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_number TEXT UNIQUE NOT NULL,
        voucher_type TEXT NOT NULL CHECK(voucher_type IN ('receipt', 'payment')),
        party_type TEXT CHECK(party_type IN ('customer', 'supplier', 'worker', 'owner', 'expense', 'waste_oil', 'scrap_battery', 'other')),
        party_id INTEGER,
        party_name TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'kuraimi', 'jeeb', 'bank', 'jawali', 'onecash')),
        cash_account_code TEXT NOT NULL DEFAULT '1101',
        offset_account_code TEXT NOT NULL,
        paper_bill_number TEXT,
        description TEXT NOT NULL,
        notes TEXT,
        prev_balance REAL NOT NULL DEFAULT 0,
        new_balance REAL NOT NULL DEFAULT 0,
        created_by TEXT DEFAULT 'أمين الصندوق',
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX IF NOT EXISTS idx_vouchers_type ON official_vouchers(voucher_type);
      CREATE INDEX IF NOT EXISTS idx_vouchers_party ON official_vouchers(party_type, party_id);
      CREATE INDEX IF NOT EXISTS idx_vouchers_created ON official_vouchers(created_at);

      -- Stage 5 Pro Upgrade 2: Cash Drawer Reconciliation & Variance Audits
      CREATE TABLE IF NOT EXISTS cash_drawer_audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
        system_balance REAL NOT NULL,
        physical_balance REAL NOT NULL,
        variance REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('matched', 'shortage', 'overage')),
        notes TEXT,
        created_by TEXT DEFAULT 'أمين الصندوق',
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_date ON cash_drawer_audits(audit_date);

      -- Stage 7 Migration: Enhanced Vouchers, Reversals, Statuses & Multi-line Items
      CREATE TABLE IF NOT EXISTS voucher_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_id INTEGER NOT NULL REFERENCES official_vouchers(id) ON DELETE CASCADE ON UPDATE CASCADE,
        account_code TEXT NOT NULL REFERENCES chart_of_accounts(code) ON UPDATE CASCADE,
        category_name TEXT,
        amount REAL NOT NULL CHECK(amount > 0),
        description TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_voucher_items_vid ON voucher_items(voucher_id);
    `);

    // Ensure status, void_reason, voided_at, is_multiline columns exist in official_vouchers
    const voucherCols = db.prepare("PRAGMA table_info(official_vouchers)").all().map(c => c.name);
    if (!voucherCols.includes('status')) {
      db.prepare("ALTER TABLE official_vouchers ADD COLUMN status TEXT NOT NULL DEFAULT 'posted'").run();
    }
    if (!voucherCols.includes('void_reason')) {
      db.prepare("ALTER TABLE official_vouchers ADD COLUMN void_reason TEXT").run();
    }
    if (!voucherCols.includes('voided_at')) {
      db.prepare("ALTER TABLE official_vouchers ADD COLUMN voided_at TEXT").run();
    }
    if (!voucherCols.includes('is_multiline')) {
      db.prepare("ALTER TABLE official_vouchers ADD COLUMN is_multiline INTEGER NOT NULL DEFAULT 0").run();
    }

    // Stage 6 Migration: Cash shifts enhancements (cashier_name, handed_over_to, total_inflow, total_outflow)
    const shiftCols = db.prepare("PRAGMA table_info(cash_shifts)").all().map(c => c.name);
    if (!shiftCols.includes('cashier_name')) {
      db.prepare("ALTER TABLE cash_shifts ADD COLUMN cashier_name TEXT").run();
    }
    if (!shiftCols.includes('handed_over_to')) {
      db.prepare("ALTER TABLE cash_shifts ADD COLUMN handed_over_to TEXT").run();
    }
    if (!shiftCols.includes('total_inflow')) {
      db.prepare("ALTER TABLE cash_shifts ADD COLUMN total_inflow REAL DEFAULT 0").run();
    }
    if (!shiftCols.includes('total_outflow')) {
      db.prepare("ALTER TABLE cash_shifts ADD COLUMN total_outflow REAL DEFAULT 0").run();
    }

    console.log('[DB] Stage 5 & 6 Migrations applied: official_vouchers, cash_drawer_audits, and cash_shifts initialized.');
  } catch (err) {
    console.warn('[DB] Stage 5/6 Migration warning:', err.message);
  }

  // Seed default shop services catalog if explicitly requested
  try {
    if (process.env.SEED_DEFAULT_SERVICES === 'true') {
      const srvCount = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE category = 'service' OR item_type = 'service'").get().count;
      if (srvCount === 0) {
        const insertSrv = db.prepare(`
          INSERT INTO inventory (
            sku, barcode, name, category, item_type, brand, viscosity, pack_size,
            carton_pack_qty, tire_battery_spec, country_of_origin, dot_code,
            battery_capacity_ah, warranty_months, cost_price, sell_price,
            stock_qty, min_stock_alert, location_shelf, is_active, notes
          ) VALUES (?, ?, ?, 'service', 'service', 'خدمات المركز', null, 'unit', 1, null, 'محلي', null, null, 0, ?, ?, 9999, 0, 'حفرة الغيار', 1, ?)
        `);

        insertSrv.run('SRV-OIL-CHG', 'SRV001', 'أجرة مصنعية غيار زيت وفلتر', 0, 1500, 'أجرة يد غيار زيت مع فحص سائل الفرامل والرديتر مجاناً');
        insertSrv.run('SRV-TIRE-PATCH', 'SRV002', 'رقعة تيوبلس ألماني حراري مع فحص تسريب', 300, 2500, 'رقعة تيوبلس سريعة مع فحص البلف');
        insertSrv.run('SRV-WHEEL-BAL', 'SRV003', 'ترصيص أرضي ليزر ديجيتال (للكفر الواحد)', 200, 2000, 'ترصيص كمبيوتر مع أوزان الرصاص');
        insertSrv.run('SRV-CHASSIS-LUBE', 'SRV004', 'تشحيم شاسيه ومفاصل وعمود كردان كامل', 500, 3500, 'تشحيم شحم عالي الحرارة للمفاصل');
        insertSrv.run('SRV-DIAG-COMP', 'SRV005', 'فحص كمبيوتر سيارات شامل OBD2 وكشف أعطال', 0, 5000, 'قراءة ومسح أكواد الأعطال وفحص الحساسات');
        console.log('[DB] Seeded 5 standard automotive pit & tire workshop services.');
      }
    }
  } catch (err) {
    console.warn('[DB] Seeding services warning:', err.message);
  }

  // Seed default Quick Invoice customer record if none exists
  try {
    const quickCustomer = db.prepare("SELECT * FROM customers_vehicles WHERE plate_number = 'فاتورة سريعة'").get();
    if (!quickCustomer) {
      db.prepare(`
        INSERT INTO customers_vehicles (
          plate_number, plate_type, car_make_model, customer_name, phone,
          last_odometer, next_due_odometer, balance_due, credit_limit, customer_type
        ) VALUES (
          'فاتورة سريعة', 'مؤقت', 'مشتريات وخدمات سريعة', 'عميل عام (نقدي)', '---',
          0, 0, 0, 0, 'individual'
        )
      `).run();
      console.log('[DB] Seeded default Quick Invoice general customer record.');
    }
  } catch (err) {
    console.warn('[DB] Seeding quick customer warning:', err.message);
  }

  // Migration: Invoices service_status, safety_inspection_data, inspection_completed_at
  try {
    const invCols = db.prepare("PRAGMA table_info(invoices)").all().map(c => c.name);
    if (!invCols.includes('service_status')) {
      db.exec("ALTER TABLE invoices ADD COLUMN service_status TEXT DEFAULT 'completed'");
    }
    if (!invCols.includes('safety_inspection_data')) {
      db.exec("ALTER TABLE invoices ADD COLUMN safety_inspection_data TEXT");
    }
    if (!invCols.includes('inspection_completed_at')) {
      db.exec("ALTER TABLE invoices ADD COLUMN inspection_completed_at TEXT");
    }
    console.log('[DB] Migration applied: invoices upgraded with service_status and safety_inspection_data.');
  } catch (err) {
    console.warn('[DB] Migration warning on invoices service fields:', err.message);
  }

  // Migration: expense_categories is_active and technician performance indexes
  try {
    const expCols = db.prepare("PRAGMA table_info(expense_categories)").all().map(c => c.name);
    if (!expCols.includes('is_active')) {
      db.exec("ALTER TABLE expense_categories ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_invoices_worker_date ON invoices(worker_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_daily_tx_worker_date ON daily_transactions(worker_id, tx_type, created_at);
      UPDATE workers SET commission_rate = 0 WHERE commission_rate != 0;

      -- Worker Daily Attendance & Cumulative Wage Accrual
      CREATE TABLE IF NOT EXISTS worker_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        work_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present', 'absent')),
        daily_wage REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        UNIQUE(worker_id, work_date)
      );
      CREATE INDEX IF NOT EXISTS idx_worker_attendance_date ON worker_attendance(work_date);
      CREATE INDEX IF NOT EXISTS idx_worker_attendance_worker ON worker_attendance(worker_id, work_date);
    `);

    // Update technician #1 name if it was generic 'عامل'
    const existingWorker = db.prepare('SELECT id, name FROM workers WHERE id = 1').get();
    if (existingWorker) {
      if (existingWorker.name === 'عامل' || !existingWorker.name) {
        db.prepare(`
          UPDATE workers SET 
            name = 'محمد', 
            role = 'فني غيار زيوت وبنشر', 
            daily_base_wage = 3000, 
            commission_rate = 0, 
            active = 1 
          WHERE id = 1
        `).run();
        console.log('[DB] Updated technician #1 to: محمد (3,000 YER/day).');
      }
    }
    console.log('[DB] Migration applied: expense_categories, worker_attendance, and technician verified.');
  } catch (err) {
    console.warn('[DB] Migration warning on expense_categories and indexes:', err.message);
  }

  // Migration: Treasury & Official Vouchers performance indexes
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_vouchers_paper_bill ON official_vouchers(paper_bill_number);
      CREATE INDEX IF NOT EXISTS idx_vouchers_cash_acc ON official_vouchers(cash_account_code);
      CREATE INDEX IF NOT EXISTS idx_vouchers_offset_acc ON official_vouchers(offset_account_code);
    `);
    console.log('[DB] Migration applied: Treasury and Official Vouchers performance indexes verified.');
  } catch (err) {
    console.warn('[DB] Migration warning on vouchers performance indexes:', err.message);
  }

  // Migration: Radar & Fleet Vehicle Performance Indexes
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_balance ON customers_vehicles(balance_due);
      CREATE INDEX IF NOT EXISTS idx_vehicles_corporate ON customers_vehicles(corporate_name);
      CREATE INDEX IF NOT EXISTS idx_invoices_veh_id_desc ON invoices(vehicle_id, id DESC);
    `);
    console.log('[DB] Migration applied: Radar and Vehicle performance indexes verified.');
  } catch (err) {
    console.warn('[DB] Migration warning on radar vehicle performance indexes:', err.message);
  }

  // Migration: Reconcile daily expenses into official_vouchers for unified Treasury audit
  try {
    const expensesWithoutVoucher = db.prepare(`
      SELECT dt.*
      FROM daily_transactions dt
      WHERE dt.tx_type = 'expense'
        AND dt.description NOT LIKE '%سداد فاتورة مشتريات%'
        AND dt.description NOT LIKE '%سند صرف%'
        AND NOT EXISTS (
          SELECT 1 FROM official_vouchers ov 
          WHERE ov.amount = dt.amount 
            AND date(ov.created_at) = date(dt.created_at)
            AND ov.voucher_type = 'payment'
        )
    `).all();

    for (const exp of expensesWithoutVoucher) {
      const desc = exp.description || '';
      let partyName = 'مصروف تشغيلي';
      let offsetCode = '6109';
      if (desc.includes('إيجار') || desc.includes('ايجار')) {
        partyName = 'إيجار المحل والمركز';
        offsetCode = '6101';
      } else if (desc.includes('كهرباء') || desc.includes('ماء') || desc.includes('ديزل')) {
        partyName = 'فواتير الكهرباء والماء';
        offsetCode = '6102';
      } else if (desc.includes('غداء') || desc.includes('شاي') || desc.includes('ضيافة')) {
        partyName = 'ضيافة وغداء';
        offsetCode = '6103';
      }

      const datePart = (exp.created_at || '').split(' ')[0].replace(/-/g, '') || '20261101';
      const seq = db.prepare(`SELECT COUNT(*) + 1 AS nextSeq FROM official_vouchers WHERE voucher_type = 'payment'`).get().nextSeq;
      const vNum = `PV-${datePart}-${String(seq).padStart(3, '0')}`;

      db.prepare(`
        INSERT INTO official_vouchers (
          voucher_number, voucher_type, party_type, party_name,
          amount, payment_method, cash_account_code, offset_account_code,
          description, status, created_by, created_at
        ) VALUES (
          ?, 'payment', 'expense', ?,
          ?, ?, '1101', ?,
          ?, 'posted', 'المدير المالي', ?
        )
      `).run(vNum, partyName, exp.amount, exp.payment_method || 'cash', offsetCode, desc, exp.created_at);
      console.log(`[DB] Reconciled expense transaction #${exp.id} (${exp.amount} YER) into official voucher ${vNum}`);
    }
  } catch (err) {
    console.warn('[DB] Migration warning on expenses to vouchers reconciliation:', err.message);
  }

  // Seed standard Chart of Accounts
  seedChartOfAccounts(db);

  // Reconcile any existing unlinked historical records
  reconcileHistoricalLedger();
}

module.exports = { initDb };
