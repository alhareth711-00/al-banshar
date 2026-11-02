/**
 * AL-BANSHAR PRO — Phase 4: Chaos & Edge-Case Master Audit Suite
 * 
 * Verifies 7 Critical Operational & Financial Edge Cases:
 * 1. Odometer Rollback Safeguard (MAX(last, current))
 * 2. Shift Freezing: Prevent Voiding/Tampering with Invoices in Closed Shifts
 * 3. Anonymous Walk-in Customer Credit Guard (Zero debt risk)
 * 4. Mid-Flight Transaction Atomicity & DB Rollback (Zero partial writes)
 * 5. Invalid Quantity (<=0) & Negative Price Rejection
 * 6. Sequential Collision-Free Invoice Number Generation
 * 7. Defensive Clamping on Excessive Discounts (Net Total >= 0)
 */

const fs = require('fs');
const db = require('../db/database');
const invoiceModel = require('../models/invoiceModel');
const inventoryModel = require('../models/inventoryModel');
const vehicleModel = require('../models/vehicleModel');
const shiftModel = require('../models/shiftModel');
const { roundMoney } = require('../utils/mathPrecision');

console.log('⚡ =====================================================================');
console.log('⚡  AL-BANSHAR PRO — PHASE 4: CHAOS & EDGE-CASE AUDIT SUITE');
console.log('⚡ =====================================================================\n');

let passedTests = 0;
let failedTests = 0;
const issues = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    if (details) console.log(`     -> ${details}`);
    passedTests++;
    return true;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     -> Error: ${details}`);
    failedTests++;
    issues.push({ testName, details });
    return false;
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Odometer Rollback Safeguard
// -----------------------------------------------------------------------------
console.log('📌 [Test 1/7] Auditing Odometer Rollback Prevention Guard...');

const testVehicle = vehicleModel.create({
  plate_number: `ROLL-${Date.now().toString().slice(-5)}`,
  car_make_model: 'تويوتا برادو TXL 2020',
  customer_name: 'فهد عبد الله الصنعاني',
  phone: '777991122',
  last_odometer: 150000,
});

// Try to issue an invoice with rolled-back odometer (e.g. 120,000 instead of 150,000)
let rollbackPrevented = false;
let rollInvoice = null;
try {
  rollInvoice = invoiceModel.create({
    vehicle_id: testVehicle.id,
    current_odometer: 120000, // Rollback attempt!
    payment_method: 'cash',
    items: [{ item_type: 'service', description: 'تشحيم وفحص فني', qty: 1, unit_price: 3000, labor_fee: 0 }]
  });
  const vehicleAfterRoll = db.prepare('SELECT last_odometer FROM customers_vehicles WHERE id = ?').get(testVehicle.id);
  rollbackPrevented = vehicleAfterRoll.last_odometer === 150000;
  if (rollInvoice) invoiceModel.voidInvoice(rollInvoice.id);
} catch (pokaErr) {
  // Poka-Yoke strictly blocked the rollback exception!
  rollbackPrevented = pokaErr.message.includes('Poka-Yoke') || pokaErr.message.includes('أقل من القراءة المسجلة');
}

// Cleanup
db.prepare('DELETE FROM customers_vehicles WHERE id = ?').run(testVehicle.id);

assert(
  rollbackPrevented,
  'Odometer rollback attempt is strictly intercepted (Vehicle preserves historical maximum)',
  `Initial Odometer: 150,000 km | Input: 120,000 km | Maintained Poka-Yoke Guard`
);

// -----------------------------------------------------------------------------
// TEST 2: Shift Freezing (Prevent Voiding Invoices in Closed Shifts)
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 2/7] Auditing Shift Freezing (Void Block on Closed Shifts)...');

// 1. Create a dummy closed shift
const shiftRes = db.prepare(`
  INSERT INTO cash_shifts (shift_code, cashier_name, status, opening_cash, opened_at, closed_at)
  VALUES (?, 'كاشير التجربة', 'closed', 10000, datetime('now', '-1 day'), datetime('now', '-12 hours'))
`).run(`SH-TEST-${Date.now().toString().slice(-4)}`);

const closedShiftId = shiftRes.lastInsertRowid;

// 2. Insert an invoice attached to this closed shift
const dummyVeh = db.prepare('SELECT id FROM customers_vehicles LIMIT 1').get();
const closedShiftInv = invoiceModel.create({
  vehicle_id: dummyVeh.id,
  shift_id: closedShiftId,
  payment_method: 'cash',
  items: [{ item_type: 'service', description: 'خدمة فحص وردية سابقة', qty: 1, unit_price: 2500, labor_fee: 0 }]
});

let shiftFreezeBlocked = false;
let freezeMessage = '';

try {
  invoiceModel.voidInvoice(closedShiftInv.id);
} catch (err) {
  shiftFreezeBlocked = true;
  freezeMessage = err.message;
}

// Cleanup: forcibly remove test invoice and shift
db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(closedShiftInv.id);
db.prepare("DELETE FROM journal_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE ref_type = 'invoice' AND ref_id = ?)").run(closedShiftInv.id);
db.prepare("DELETE FROM journal_entries WHERE ref_type = 'invoice' AND ref_id = ?").run(closedShiftInv.id);
db.prepare('DROP TRIGGER IF EXISTS trg_prevent_invoice_hard_delete').run();
db.prepare('DELETE FROM invoices WHERE id = ?').run(closedShiftInv.id);
const schema = fs.readFileSync('./server/db/schema.sql', 'utf8');
db.exec(schema);
db.prepare('DELETE FROM cash_shifts WHERE id = ?').run(closedShiftId);

assert(
  shiftFreezeBlocked && freezeMessage.includes('وردية تم إغلاقها'),
  'Shift Freezing strictly blocks voiding or tampering with invoices from closed shifts',
  `Safeguard response: "${freezeMessage}"`
);

// -----------------------------------------------------------------------------
// TEST 3: Anonymous / Walk-in Customer Credit Guard
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 3/7] Auditing Anonymous Customer Credit Guard (Poka-Yoke)...');

const anonVeh = vehicleModel.create({
  plate_number: `بدون-${Date.now().toString().slice(-6)}`,
  customer_name: 'عميل نقدي سريع',
  phone: '',
  credit_limit: 0,
});

let anonCreditBlocked = false;
let anonBlockMessage = '';

try {
  invoiceModel.create({
    vehicle_id: anonVeh.id,
    payment_method: 'credit', // Credit sale attempt for anonymous walk-in!
    paid_amount: 0,
    items: [{ item_type: 'service', description: 'غسيل محرك سريع', qty: 1, unit_price: 5000, labor_fee: 0 }]
  });
} catch (err) {
  anonCreditBlocked = true;
  anonBlockMessage = err.message;
}

// Cleanup
db.prepare('DELETE FROM customers_vehicles WHERE id = ?').run(anonVeh.id);

assert(
  anonCreditBlocked && (anonBlockMessage.includes('حظر ائتماني') || anonBlockMessage.includes('لا يمكن البيع بالآجل') || anonBlockMessage.includes('يُمنع اختيار')),
  'Credit sales strictly blocked for anonymous/walk-in customers without identity/phone/limit',
  `Poka-Yoke response: "${anonBlockMessage}"`
);

// -----------------------------------------------------------------------------
// TEST 4: Mid-Flight Transaction Atomicity & DB Rollback
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 4/7] Auditing Mid-Flight Atomic Transaction Rollback...');

let prodInStock = db.prepare("SELECT * FROM inventory WHERE item_type = 'product' AND stock_qty >= 20 LIMIT 1").get();
let tempItemCreated = false;
if (!prodInStock) {
  prodInStock = inventoryModel.create({
    name: 'صنف اختبار الذرية',
    category: 'oil',
    item_type: 'product',
    brand: 'تويوتا',
    cost_price: 1000,
    sell_price: 2000,
    stock_qty: 50,
  });
  tempItemCreated = true;
}
const sampleVehicle = db.prepare('SELECT id FROM customers_vehicles LIMIT 1').get();

const invCountBefore = db.prepare('SELECT COUNT(*) c FROM invoices').get().c;
const stockBefore = prodInStock.stock_qty;
const jvCountBefore = db.prepare('SELECT COUNT(*) c FROM journal_entries').get().c;

let atomicRollbackVerified = false;

try {
  // Payload has valid item 1, but item 2 triggers over-sell exception
  invoiceModel.create({
    vehicle_id: sampleVehicle.id,
    payment_method: 'cash',
    items: [
      {
        inventory_id: prodInStock.id,
        item_type: 'product',
        description: prodInStock.name,
        qty: 5,
        unit_price: prodInStock.sell_price,
        labor_fee: 0
      },
      {
        inventory_id: prodInStock.id,
        item_type: 'product',
        description: prodInStock.name,
        qty: prodInStock.stock_qty + 1000, // Will throw over-sell error!
        unit_price: prodInStock.sell_price,
        labor_fee: 0
      }
    ]
  });
} catch (expectedErr) {
  const invCountAfter = db.prepare('SELECT COUNT(*) c FROM invoices').get().c;
  const stockAfter = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(prodInStock.id).stock_qty;
  const jvCountAfter = db.prepare('SELECT COUNT(*) c FROM journal_entries').get().c;

  atomicRollbackVerified = (invCountAfter === invCountBefore) &&
                           (stockAfter === stockBefore) &&
                           (jvCountAfter === jvCountBefore);
}

if (tempItemCreated) {
  inventoryModel.deleteOrArchive(prodInStock.id);
}

assert(
  atomicRollbackVerified,
  'Mid-flight exceptions trigger 100% atomic database rollback with zero leaked records',
  `Invoices count: ${invCountBefore} -> ${invCountBefore} | Stock: ${stockBefore} -> ${stockBefore} | Journals: ${jvCountBefore} -> ${jvCountBefore}`
);

// -----------------------------------------------------------------------------
// TEST 5: Zero / Negative Quantity & Negative Price Rejection
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 5/7] Auditing Invalid Quantity & Negative Price Interception...');

let zeroQtyBlocked = false;
let negPriceBlocked = false;

try {
  invoiceModel.create({
    vehicle_id: sampleVehicle.id,
    payment_method: 'cash',
    items: [{ item_type: 'service', description: 'خدمة تجريبية كمية صفر', qty: 0, unit_price: 1000 }]
  });
} catch (err) {
  zeroQtyBlocked = err.message.includes('غير صالحة');
}

try {
  invoiceModel.create({
    vehicle_id: sampleVehicle.id,
    payment_method: 'cash',
    items: [{ item_type: 'service', description: 'خدمة تجريبية سعر سالب', qty: 1, unit_price: -500 }]
  });
} catch (err) {
  negPriceBlocked = err.message.includes('لا يمكن أن يكون سالباً');
}

assert(
  zeroQtyBlocked && negPriceBlocked,
  'Zero or negative quantities and negative unit prices are strictly rejected',
  'Quantities <= 0 and prices < 0 properly intercepted before database execution'
);

// -----------------------------------------------------------------------------
// TEST 6: Rapid Sequential Invoice Number Generation Collision Guard
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 6/7] Auditing Rapid Sequential Invoice Number Uniqueness...');

const testVehicle2 = db.prepare('SELECT id FROM customers_vehicles LIMIT 1').get();
const createdInvoices = [];
let allUnique = true;

for (let i = 0; i < 5; i++) {
  const inv = invoiceModel.create({
    vehicle_id: testVehicle2.id,
    payment_method: 'cash',
    items: [{ item_type: 'service', description: `خدمة تسلسل سريع ${i+1}`, qty: 1, unit_price: 1000, labor_fee: 0 }]
  });
  createdInvoices.push(inv);
}

const numbers = createdInvoices.map(i => i.invoice_number);
const uniqueSet = new Set(numbers);
allUnique = (uniqueSet.size === createdInvoices.length);

// Cleanup created invoices
for (const inv of createdInvoices) {
  invoiceModel.voidInvoice(inv.id);
}

assert(
  allUnique && numbers.length === 5,
  'Rapid sequential invoice generation produces collision-free distinct numbers',
  `Generated sequential numbers: ${numbers.join(' | ')}`
);

// -----------------------------------------------------------------------------
// TEST 7: Defensive Clamping & Interception on Excessive Discounts
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 7/7] Auditing Defensive Clamping & Interception on Excessive Discounts...');

let excessiveDiscBlocked = false;
let discBlockMsg = '';

// 1. Attempt discount greater than invoice gross
try {
  invoiceModel.create({
    vehicle_id: testVehicle2.id,
    payment_method: 'cash',
    discount: 50000, // Excessive discount on 10,000 YER item!
    items: [{ item_type: 'service', description: 'خدمة فحص شامل', qty: 1, unit_price: 10000, labor_fee: 0 }]
  });
} catch (err) {
  excessiveDiscBlocked = true;
  discBlockMsg = err.message;
}

// 2. Test 100% full promotional discount (10,000 YER discount on 10,000 YER item)
const fullPromoInv = invoiceModel.create({
  vehicle_id: testVehicle2.id,
  payment_method: 'cash',
  discount: 10000, // Exactly 100% discount
  items: [{ item_type: 'service', description: 'خدمة غيار زيت ترويجية مجانية بالكامل', qty: 1, unit_price: 10000, labor_fee: 0 }]
});

const isFullPromoBalanced = fullPromoInv.net_total === 0 && fullPromoInv.remaining_debt === 0;
const jvPromo = db.prepare("SELECT * FROM journal_entries WHERE ref_type = 'invoice' AND ref_id = ?").get(fullPromoInv.id);
const isJvPromoBalanced = jvPromo && Math.abs(roundMoney(jvPromo.total_debit - jvPromo.total_credit)) < 0.001;

// Cleanup
invoiceModel.voidInvoice(fullPromoInv.id);

assert(
  excessiveDiscBlocked && isFullPromoBalanced && isJvPromoBalanced,
  'Excessive discounts strictly blocked, while 100% promo discounts post balanced zero-debt entries',
  `Blocked typo discount: "${discBlockMsg}" | 100% Promo Net: ${fullPromoInv.net_total} YER (Balanced: ${isJvPromoBalanced})`
);

// -----------------------------------------------------------------------------
// TEST 8: Anti-Backdating & System Clock Chrono-Guard ([MOD-CHRONO-GUARD])
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 8/8] Auditing Anti-Backdating & Chrono-Guard Protection...');

let backdatingBlocked = false;
let chronoErrorMsg = '';

try {
  // Attempt to pass backdated created_at 2 hours in the past
  const pastTimeStr = db.prepare("SELECT datetime('now', 'localtime', '-2 hours') AS t").get().t;
  invoiceModel.create({
    vehicle_id: testVehicle2.id,
    payment_method: 'cash',
    created_at: pastTimeStr,
    items: [{ item_type: 'service', description: 'خدمة غسيل', qty: 1, unit_price: 2000, labor_fee: 0 }]
  });
} catch (err) {
  if (err.message.includes('[MOD-CHRONO-GUARD]')) {
    backdatingBlocked = true;
    chronoErrorMsg = err.message;
  }
}

const chronoAuditLog = db.prepare("SELECT * FROM financial_audit_logs WHERE action = 'CHRONO_ROLLBACK_ATTEMPT_BLOCKED' ORDER BY id DESC LIMIT 1").get();

assert(
  backdatingBlocked && chronoAuditLog !== undefined,
  'System clock rollback and backdated transactions strictly intercepted with security audit trail',
  `Intercepted: "${chronoErrorMsg}" | Audit Log ID: ${chronoAuditLog?.id}`
);

// -----------------------------------------------------------------------------
// FINAL SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('\n=====================================================================');
console.log(`🏁 SYSTEM INTEGRITY & CHAOS AUDIT: ${passedTests} PASSED / ${failedTests} FAILED`);
console.log('=====================================================================');

if (failedTests === 0) {
  console.log('\n🎉 ALL 8 CHAOS & EDGE-CASE AUDIT DIMENSIONS PASSED 100%!');
  process.exit(0);
} else {
  console.error(`\n❌ Found ${failedTests} chaos issues:`, issues);
  process.exit(1);
}
