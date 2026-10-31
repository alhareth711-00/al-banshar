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
} = require('../utils/accountingEngine');

function reconcileHistoricalLedger() {
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
      if (!colNames.includes('country_of_origin')) db.exec("ALTER TABLE inventory ADD COLUMN country_of_origin TEXT");
      if (!colNames.includes('dot_code')) db.exec("ALTER TABLE inventory ADD COLUMN dot_code TEXT");
      if (!colNames.includes('battery_capacity_ah')) db.exec("ALTER TABLE inventory ADD COLUMN battery_capacity_ah TEXT");
      if (!colNames.includes('location_shelf')) db.exec("ALTER TABLE inventory ADD COLUMN location_shelf TEXT");
      if (!colNames.includes('is_consignment')) db.exec("ALTER TABLE inventory ADD COLUMN is_consignment INTEGER NOT NULL DEFAULT 0");
      if (!colNames.includes('consignment_supplier_name')) db.exec("ALTER TABLE inventory ADD COLUMN consignment_supplier_name TEXT");
      if (!colNames.includes('is_active')) db.exec("ALTER TABLE inventory ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
      if (!colNames.includes('notes')) db.exec("ALTER TABLE inventory ADD COLUMN notes TEXT");
      if (!colNames.includes('created_at')) db.exec("ALTER TABLE inventory ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))");
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
      console.log('[DB] Pre-schema migration applied: upgraded invoices schema with shift_id.');
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
        party_type TEXT CHECK(party_type IN ('customer', 'supplier', 'worker', 'owner', 'expense', 'other')),
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

  // Seed default shop services catalog if none exist
  try {
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
    `);
    console.log('[DB] Migration applied: expense_categories is_active and technician performance indexes verified.');
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

  // Seed standard Chart of Accounts
  seedChartOfAccounts(db);

  // Reconcile any existing unlinked historical records
  reconcileHistoricalLedger();
}

module.exports = { initDb };
