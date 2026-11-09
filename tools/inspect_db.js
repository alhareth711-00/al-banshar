const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'AlBanshar', 'db', 'quick_lube.db');
const db = new Database(dbPath);

console.log('--- DB INSPECTION ---');
console.log('DB Path:', dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);
console.log('Tables in DB:', tables.join(', '));

const shift = db.prepare("SELECT * FROM cash_shifts WHERE status = 'open' LIMIT 1").get();
console.log('Open Shift:', shift ? `ID=${shift.id}, Code=${shift.shift_code}, Cash=${shift.opening_cash}` : 'None open');

const totalInvoices = db.prepare("SELECT count(*) as c FROM invoices").get().c;
console.log('Existing Invoices Count:', totalInvoices);

const sampleProducts = db.prepare("SELECT id, name, category, cost_price, sale_price, stock_qty FROM inventory LIMIT 5").all();
console.log('Sample Products:', sampleProducts);

const sampleVehicles = db.prepare("SELECT id, plate_number, customer_name, phone, last_odometer, balance_due FROM customers_vehicles LIMIT 5").all();
console.log('Sample Vehicles:', sampleVehicles);
