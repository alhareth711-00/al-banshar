-- SQLite Database Schema for Quick Lube & Tire Touch POS (Yemen Market)

CREATE TABLE IF NOT EXISTS customers_vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT UNIQUE NOT NULL,
    plate_type TEXT NOT NULL DEFAULT 'خصوصي' CHECK(plate_type IN ('خصوصي', 'أجرة', 'نقل', 'مؤقت')),
    car_make_model TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    preferred_oil_brand TEXT,
    preferred_viscosity TEXT,
    last_odometer INTEGER NOT NULL DEFAULT 0,
    next_due_odometer INTEGER NOT NULL DEFAULT 0,
    next_due_date TEXT,
    balance_due REAL NOT NULL DEFAULT 0,
    credit_limit REAL NOT NULL DEFAULT 50000,
    customer_type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'fleet', 'taxi', 'gov', 'vip'
    corporate_name TEXT,
    price_tier TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'fleet_discount', 'vip_discount', 'wholesale'
    discount_percent REAL NOT NULL DEFAULT 0,
    corporate_tax_no TEXT,
    billing_cycle TEXT NOT NULL DEFAULT 'instant', -- 'instant', 'monthly'
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS service_reminders_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL REFERENCES customers_vehicles(id),
    reminder_type TEXT NOT NULL DEFAULT 'whatsapp',
    odometer_at_reminder REAL,
    sent_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON service_reminders_log(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON customers_vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_phone ON customers_vehicles(phone);
CREATE INDEX IF NOT EXISTS idx_vehicles_name ON customers_vehicles(customer_name);
CREATE INDEX IF NOT EXISTS idx_vehicles_next_due_date ON customers_vehicles(next_due_date);

CREATE TABLE IF NOT EXISTS inventory (
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
    pack_size TEXT CHECK(pack_size IN ('1L', '4L', '5L', 'bulk_liter', 'unit', 'carton')),
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
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_brand ON inventory(brand);
CREATE INDEX IF NOT EXISTS idx_inventory_viscosity ON inventory(viscosity);
CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory(is_active);

CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    daily_base_wage REAL NOT NULL DEFAULT 0,
    commission_rate REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    vehicle_id INTEGER NOT NULL REFERENCES customers_vehicles(id) ON UPDATE CASCADE,
    worker_id INTEGER REFERENCES workers(id) ON UPDATE CASCADE,
    current_odometer INTEGER NOT NULL DEFAULT 0,
    next_odometer INTEGER NOT NULL DEFAULT 0,
    next_service_date TEXT NOT NULL,
    items_total REAL NOT NULL DEFAULT 0,
    labor_total REAL NOT NULL DEFAULT 0,
    scrap_battery_deduction REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    net_total REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'jeeb', 'jawali', 'kuraimi', 'onecash', 'credit', 'split')),
    wallet_ref_number TEXT,
    paid_amount REAL NOT NULL DEFAULT 0,
    remaining_debt REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_vehicle ON invoices(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_invoices_worker ON invoices(worker_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
    inventory_id INTEGER REFERENCES inventory(id) ON UPDATE CASCADE,
    item_type TEXT NOT NULL CHECK(item_type IN ('product', 'service')),
    description TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    labor_fee REAL NOT NULL DEFAULT 0,
    warranty_serial TEXT,
    subtotal REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_items_inventory ON invoice_items(inventory_id);

CREATE TABLE IF NOT EXISTS daily_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_type TEXT NOT NULL CHECK(tx_type IN ('expense', 'worker_advance', 'debt_collection')),
    worker_id INTEGER REFERENCES workers(id) ON UPDATE CASCADE,
    vehicle_id INTEGER REFERENCES customers_vehicles(id) ON UPDATE CASCADE,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash', 'jeeb', 'jawali', 'kuraimi', 'onecash')),
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_tx_type ON daily_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_tx_created ON daily_transactions(created_at);

-- Phase 4: Suppliers, Purchases (Inbound Stock Bills), and Custom Expense Categories
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    agency_brand TEXT,
    commercial_reg TEXT,
    credit_days INTEGER NOT NULL DEFAULT 30,
    balance_due REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_number TEXT UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON UPDATE CASCADE,
    supplier_name TEXT NOT NULL,
    invoice_ref TEXT,
    paper_bill_number TEXT,
    due_date TEXT,
    is_returned INTEGER NOT NULL DEFAULT 0,
    shipping_cost REAL NOT NULL DEFAULT 0,
    shipping_payer TEXT DEFAULT 'cash_drawer',
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    remaining_debt REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'kuraimi', 'jeeb', 'credit', 'jawali', 'onecash')),
    paid_from_cash_drawer INTEGER NOT NULL DEFAULT 1 CHECK(paid_from_cash_drawer IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_number ON purchases(purchase_number);

CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE ON UPDATE CASCADE,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON UPDATE CASCADE,
    qty REAL NOT NULL DEFAULT 1,
    unit_cost REAL NOT NULL DEFAULT 0,
    unit_sell REAL,
    allocated_shipping REAL NOT NULL DEFAULT 0,
    effective_unit_cost REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0
);

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

CREATE TABLE IF NOT EXISTS purchase_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_number TEXT UNIQUE NOT NULL,
    purchase_id INTEGER REFERENCES purchases(id) ON UPDATE CASCADE,
    supplier_id INTEGER REFERENCES suppliers(id) ON UPDATE CASCADE,
    supplier_name TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    refund_amount REAL NOT NULL DEFAULT 0,
    debt_reduction_amount REAL NOT NULL DEFAULT 0,
    refund_method TEXT NOT NULL DEFAULT 'credit' CHECK(refund_method IN ('cash', 'kuraimi', 'jeeb', 'credit', 'jawali', 'onecash')),
    refund_to_cash_drawer INTEGER NOT NULL DEFAULT 1 CHECK(refund_to_cash_drawer IN (0, 1)),
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE ON UPDATE CASCADE,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON UPDATE CASCADE,
    qty REAL NOT NULL DEFAULT 1,
    unit_cost REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_returns_supplier ON purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_returns_purchase ON purchase_returns(purchase_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON purchase_return_items(return_id);

CREATE INDEX IF NOT EXISTS idx_purchase_items_pid ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_inv ON purchase_items(inventory_id);

CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT 'FileText',
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- =========================================================================
-- Stage 1: Central Double-Entry Financial Engine & Accounting Ledgers
-- =========================================================================

-- 1. Standard Chart of Accounts (دليل الحسابات المالية النظامي)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    sub_type TEXT NOT NULL, -- 'cash_drawer', 'bank', 'e_wallet', 'receivable', 'inventory', 'payable', 'operating_expense', etc.
    normal_balance TEXT NOT NULL CHECK(normal_balance IN ('debit', 'credit')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(type);
CREATE INDEX IF NOT EXISTS idx_coa_subtype ON chart_of_accounts(sub_type);

-- 2. General Journal Entries (سجل قيود اليومية العامة المركزية)
CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_number TEXT UNIQUE NOT NULL,
    entry_date TEXT NOT NULL,
    ref_type TEXT NOT NULL CHECK(ref_type IN (
        'invoice', 'purchase', 'sale_return', 'purchase_return',
        'expense', 'worker_advance', 'debt_collection', 'supplier_payment',
        'wage_payout', 'capital_deposit', 'inventory_adjustment', 'closing_entry'
    )),
    ref_id INTEGER,
    ref_number TEXT,
    description TEXT NOT NULL,
    total_debit REAL NOT NULL DEFAULT 0,
    total_credit REAL NOT NULL DEFAULT 0,
    is_balanced INTEGER NOT NULL DEFAULT 1 CHECK(is_balanced IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_jv_entry_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_jv_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_jv_ref ON journal_entries(ref_type, ref_id);

-- 3. Journal Lines / Double-Entry Ledger Lines (بنود القيد المحاسبي المزدوج)
CREATE TABLE IF NOT EXISTS journal_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE ON UPDATE CASCADE,
    account_code TEXT NOT NULL REFERENCES chart_of_accounts(code) ON UPDATE CASCADE,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    party_type TEXT CHECK(party_type IN ('customer', 'supplier', 'worker', null)),
    party_id INTEGER,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_jl_entry_id ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_jl_party ON journal_lines(party_type, party_id);

-- 4. Stock Movement & Weighted Average Cost Tracking (حركات المخزون ومتوسط التكلفة المرجح WAC)
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON UPDATE CASCADE,
    movement_type TEXT NOT NULL CHECK(movement_type IN (
        'purchase', 'sale', 'purchase_return', 'sale_return',
        'adjustment_in', 'adjustment_out', 'opening_balance'
    )),
    ref_type TEXT NOT NULL,
    ref_id INTEGER,
    qty_in REAL NOT NULL DEFAULT 0,
    qty_out REAL NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    balance_qty_after REAL NOT NULL DEFAULT 0,
    wac_cost_after REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_sm_inventory ON stock_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_sm_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sm_ref ON stock_movements(ref_type, ref_id);

-- 5. Cash Drawer Shifts & POS Closings (إغلاقات الخزينة والورديات)
CREATE TABLE IF NOT EXISTS cash_shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_code TEXT UNIQUE NOT NULL,
    worker_id INTEGER REFERENCES workers(id) ON UPDATE CASCADE,
    opened_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    closed_at TEXT,
    opening_cash REAL NOT NULL DEFAULT 0,
    expected_cash REAL NOT NULL DEFAULT 0,
    actual_cash REAL,
    difference REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_shifts_status ON cash_shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON cash_shifts(opened_at);

-- 6. Financial Audit Logs (سجل الرقابة المحاسبية ومنع التلاعب)
CREATE TABLE IF NOT EXISTS financial_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    old_data TEXT,
    new_data TEXT,
    performed_by TEXT DEFAULT 'system',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON financial_audit_logs(created_at);


