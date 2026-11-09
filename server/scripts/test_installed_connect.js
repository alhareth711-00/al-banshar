const path = require('path');
const Database = require('better-sqlite3');

const appData = process.env.APPDATA;
const installedDbPath = path.join(appData, 'AlBanshar', 'db', 'quick_lube.db');
const db = new Database(installedDbPath);

console.log('--- DETAILED INSPECTION ---');
const existingInvoices = db.prepare("SELECT id, invoice_number, net_total, payment_method, service_status, created_at FROM invoices").all();
console.log('Existing Invoices:', existingInvoices);

const products = db.prepare("SELECT id, name, category, cost_price, sell_price, stock_qty FROM inventory LIMIT 10").all();
console.log('Sample Products:', products);

const vehicles = db.prepare("SELECT id, plate_number, customer_name, phone, last_odometer, balance_due FROM customers_vehicles LIMIT 10").all();
console.log('Sample Vehicles:', vehicles);

const lastShift = db.prepare("SELECT id, shift_code, status, opening_cash, closed_at FROM cash_shifts ORDER BY id DESC LIMIT 3").all();
console.log('Recent Shifts:', lastShift);
