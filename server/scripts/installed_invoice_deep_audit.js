const path = require('path');
const fs = require('fs');

// 1. Target Installed Client DB in %APPDATA%/AlBanshar/db/quick_lube.db
const appData = process.env.APPDATA;
const installedDbPath = path.join(appData, 'AlBanshar', 'db', 'quick_lube.db');
if (!fs.existsSync(installedDbPath)) {
  console.error('[FAIL] Installed DB does not exist at:', installedDbPath);
  process.exit(1);
}

// Point server modules to installed DB via DB_PATH env var
process.env.DB_PATH = installedDbPath;

const Database = require('better-sqlite3');
const db = require('../db/database');
const invoiceModel = require('../models/invoiceModel');
const shiftModel = require('../models/shiftModel');
const { roundMoney, safeNum } = require('../utils/mathPrecision');

const AUDIT_RESULTS = {
  timestamp: new Date().toISOString(),
  db_path: installedDbPath,
  scenarios: [],
  guards: [],
  accounting_checks: [],
  ui_compat_checks: [],
  critical_issues: [],
  warnings: [],
  cleanups_ready: false,
};

function logHeader(title) {
  console.log('\n============================================================');
  console.log(`>>> ${title}`);
  console.log('============================================================');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ [FAIL]: ${message}`);
    AUDIT_RESULTS.critical_issues.push(message);
    throw new Error(message);
  } else {
    console.log(`  ✅ [PASS]: ${message}`);
  }
}

async function runDeepAudit() {
  logHeader('بدء الفحص المعملي العميق لفواتير العملاء (Installed Client DB)');
  console.log('المسار المفحوص:', installedDbPath);

  // -------------------------------------------------------------
  // STEP 0: Check / Setup Open Shift for Accurate Cash Verification
  // -------------------------------------------------------------
  logHeader('الخطوة 0: التحقق من وردية الكاشير النشطة');
  let activeShift = db.prepare("SELECT * FROM cash_shifts WHERE status = 'open' LIMIT 1").get();
  let createdAuditShift = false;

  if (!activeShift) {
    console.log('  ℹ️ لا توجد وردية مفتوحة حالياً. فتح وردية فحص معملية لاختبار حركة النقدية...');
    const shiftRes = db.prepare(`
      INSERT INTO cash_shifts (shift_code, worker_id, cashier_name, opening_cash, status, opened_at)
      VALUES ('SH-LAB-AUDIT-01', 1, 'كاشير الفحص المعملي', 10000, 'open', datetime('now', 'localtime'))
    `).run();
    activeShift = db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(shiftRes.lastInsertRowid);
    createdAuditShift = true;
    console.log(`  ✅ تم فتح وردية تجريبية بنجاح: ${activeShift.shift_code} (رصيد افتتاحي: 10,000 ر.ي)`);
  } else {
    console.log(`  ℹ️ تم رصد وردية مفتوحة مسبقاً: ${activeShift.shift_code}`);
  }

  // -------------------------------------------------------------
  // STEP 1: Setup Dedicated Audit Test Customer & Vehicle
  // -------------------------------------------------------------
  logHeader('الخطوة 1: تهيئة عميل ومركبة الفحص المعملي المخصصة');
  const LAB_PLATE = '9999-فحص';
  const LAB_PHONE = '777999888';
  const LAB_NAME = 'عميل فحص معملي (سريع وبنشر)';

  let labVehicle = db.prepare('SELECT * FROM customers_vehicles WHERE plate_number = ?').get(LAB_PLATE);
  if (!labVehicle) {
    const vRes = db.prepare(`
      INSERT INTO customers_vehicles (plate_number, customer_name, phone, car_make_model, last_odometer, service_interval_km, credit_limit, balance_due)
      VALUES (?, ?, ?, 'تويوتا برادو 2022 (اختبار)', 60000, 3000, 100000, 0)
    `).run(LAB_PLATE, LAB_NAME, LAB_PHONE);
    labVehicle = db.prepare('SELECT * FROM customers_vehicles WHERE id = ?').get(vRes.lastInsertRowid);
    console.log(`  ✅ تم إنشاء مركبة الفحص بنجاح: ID=${labVehicle.id}, لوحة=${labVehicle.plate_number}`);
  } else {
    console.log(`  ℹ️ مركبة الفحص موجودة مسبقاً: ID=${labVehicle.id}, رصيد الديون=${labVehicle.balance_due}`);
  }

  // Fetch real inventory items for testing
  const oilItem = db.prepare("SELECT * FROM inventory WHERE category = 'oil' AND stock_qty >= 5 LIMIT 1").get();
  assert(Boolean(oilItem), 'يجب توفر صنف زيت واحد على الأقل به رصيد كافٍ للفحص');
  console.log(`  📦 صنف الزيت المختار: ${oilItem.name} (المخزون الحالي: ${oilItem.stock_qty})`);

  let batteryItem = db.prepare("SELECT * FROM inventory WHERE (category = 'battery' OR name LIKE '%بطارية%') LIMIT 1").get();
  if (!batteryItem) {
    // Insert temporary test battery if not existing
    const batRes = db.prepare(`
      INSERT INTO inventory (sku, name, category, item_type, cost_price, sell_price, stock_qty)
      VALUES ('BAT-AUDIT-TEST', 'بطارية فحص معملي 60 أمبير (هانكوك)', 'battery', 'product', 35000, 42000, 10)
    `).run();
    batteryItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(batRes.lastInsertRowid);
  }
  console.log(`  🔋 صنف البطارية المختار: ${batteryItem.name} (المخزون الحالي: ${batteryItem.stock_qty})`);

  const createdInvoices = [];

  // -------------------------------------------------------------
  // SCENARIO 1: Comprehensive Oil Change & Filter with Mileage/Odometer
  // -------------------------------------------------------------
  logHeader('السيناريو 1: فاتورة غيار زيت متكاملة (حساب العداد، المخزون، والقيود المحاسبية)');
  const initialOilStock = oilItem.stock_qty;
  const initialLabVehicleOdo = labVehicle.last_odometer;

  const invoice1Data = {
    vehicle_id: labVehicle.id,
    payment_method: 'cash',
    current_odometer: 65000,
    items: [
      {
        inventory_id: oilItem.id,
        item_type: 'product',
        description: oilItem.name,
        qty: 4,
        unit_price: oilItem.sell_price,
        cost_price: oilItem.cost_price,
        labor_fee: 1000, // أجور يد 1,000 ر.ي
      }
    ],
    discount: 500,
    notes: 'فاتورة فحص معملي - سيناريو 1 غيار زيت وفلتر',
    client_token: `lab_token_sc1_${Date.now()}`,
  };

  const inv1 = invoiceModel.create(invoice1Data);
  createdInvoices.push(inv1.id);
  assert(Boolean(inv1 && inv1.id), 'تم إنشاء فاتورة غيار الزيت بنجاح ورقمها: ' + inv1.invoice_number);

  // 1.1 Verify Inventory Stock Decrement
  const updatedOil = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(oilItem.id);
  assert(updatedOil.stock_qty === initialOilStock - 4, `تم خصم كمية الزيت بدقة: كان ${initialOilStock} وأصبح ${updatedOil.stock_qty}`);

  // 1.2 Verify Stock Movement Log
  const stockMove = db.prepare("SELECT * FROM stock_movements WHERE ref_type = 'invoice' AND ref_id = ?").get(inv1.id);
  assert(Boolean(stockMove && stockMove.qty_out === 4), 'تم توثيق حركة الصرف المخزني في جدول stock_movements');

  // 1.3 Verify Vehicle Odometer and Next Visit Calculation
  const updatedVehicle1 = db.prepare('SELECT last_odometer, next_due_odometer, next_due_date FROM customers_vehicles WHERE id = ?').get(labVehicle.id);
  assert(updatedVehicle1.last_odometer === 65000, `تم تحديث قراءة العداد الحالي للمركبة إلى: ${updatedVehicle1.last_odometer} كم`);
  assert(updatedVehicle1.next_due_odometer === 68000, `تم احتساب عداد الزيارة القادمة تلقائياً بدقة: ${updatedVehicle1.next_due_odometer} كم`);
  assert(Boolean(updatedVehicle1.next_due_date), `تم تحديد موعد الزيارة القادمة في رادار الصيانة: ${updatedVehicle1.next_due_date}`);

  // 1.4 Verify Double-Entry Accounting Balance (Debit == Credit)
  const jEntries1 = db.prepare("SELECT id, entry_number, total_debit, total_credit, is_balanced FROM journal_entries WHERE ref_type = 'invoice' AND ref_id = ?").all(inv1.id);
  assert(jEntries1.length > 0, 'تم إنشاء قيود اليومية المحاسبية الآلية للفاتورة');
  for (const je of jEntries1) {
    assert(je.total_debit === je.total_credit, `توازن القيد المحاسبي (${je.entry_number}): مدين ${je.total_debit} = دائن ${je.total_credit}`);
    assert(je.is_balanced === 1, `حالة القيد المحاسبي متوازن رسمياً`);
  }
  AUDIT_RESULTS.scenarios.push({ name: 'فاتورة غيار زيت متكاملة', status: 'PASS', invoice_id: inv1.id, invoice_number: inv1.invoice_number });

  // -------------------------------------------------------------
  // SCENARIO 2: Quick Puncture & Labor Service (Zero Stock Impact, Cash Drawer)
  // -------------------------------------------------------------
  logHeader('السيناريو 2: فاتورة بنشر وأجور يد نقدية (خدمة صافية بدون سحب مخزني)');
  const quickVehicle = db.prepare('SELECT * FROM customers_vehicles WHERE id = 1').get();
  assert(Boolean(quickVehicle), 'العميل العابر السريع (ID=1) موجود');

  const invoice2Data = {
    vehicle_id: 1, // عميل نقدي عابر
    payment_method: 'cash',
    items: [
      {
        item_type: 'service',
        description: 'رقعة تيوبلس ألماني + وزن هواء بنشر',
        qty: 1,
        unit_price: 1500,
        labor_fee: 0,
      }
    ],
    notes: 'فاتورة فحص معملي - سيناريو 2 بنشر سريع',
    client_token: `lab_token_sc2_${Date.now()}`,
  };

  const inv2 = invoiceModel.create(invoice2Data);
  createdInvoices.push(inv2.id);
  assert(Boolean(inv2 && inv2.id), 'تم إنشاء فاتورة البنشر بنجاح: ' + inv2.invoice_number);
  assert(inv2.net_total === 1500, `إجمالي فاتورة البنشر 1,500 ر.ي`);

  // Verify journal lines for service revenue (Account 4201)
  const serviceLines = db.prepare(`
    SELECT jl.* FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE je.ref_type = 'invoice' AND je.ref_id = ? AND jl.account_code = '4201'
  `).all(inv2.id);
  assert(serviceLines.length > 0 && serviceLines[0].credit === 1500, 'تم قيد 1,500 ر.ي كإيراد خدمات وتركيب صافٍ (حساب 4201)');
  AUDIT_RESULTS.scenarios.push({ name: 'فاتورة بنشر وأجور يد', status: 'PASS', invoice_id: inv2.id, invoice_number: inv2.invoice_number });

  // -------------------------------------------------------------
  // SCENARIO 3: Battery Sale with Scrap Buyback (Poka-Yoke & Scrap Asset)
  // -------------------------------------------------------------
  logHeader('السيناريو 3: بيع بطارية جديدة مع مقايضة سكراب رجيع (Poka-Yoke Scrap)');
  
  // 3.1 Negative Guard Test: Scrap deduction without battery must fail
  let illegalScrapBlocked = false;
  try {
    invoiceModel.create({
      vehicle_id: 1,
      payment_method: 'cash',
      items: [{ item_type: 'service', description: 'وزن هواء', qty: 1, unit_price: 500 }],
      scrap_battery_deduction: 5000,
    });
  } catch (err) {
    illegalScrapBlocked = true;
    console.log(`  🛡️ تم التصدي بنجاح لمحاولة تطبيق خصم سكراب غير شرعي: "${err.message}"`);
  }
  assert(illegalScrapBlocked, 'درع Poka-Yoke منع خصم سكراب لعدم وجود بطارية جديدة في الفاتورة');

  // 3.2 Legitimate Battery Sale with Scrap Trade-in
  const invoice3Data = {
    vehicle_id: labVehicle.id,
    payment_method: 'cash',
    items: [
      {
        inventory_id: batteryItem.id,
        item_type: 'product',
        description: batteryItem.name,
        qty: 1,
        unit_price: batteryItem.sell_price,
        cost_price: batteryItem.cost_price,
      }
    ],
    scrap_battery_deduction: 8000, // خصم 8,000 بدل بطارية قديمة
    notes: 'فاتورة فحص معملي - سيناريو 3 بطارية + مقايضة سكراب',
    client_token: `lab_token_sc3_${Date.now()}`,
  };

  const inv3 = invoiceModel.create(invoice3Data);
  createdInvoices.push(inv3.id);
  assert(Boolean(inv3 && inv3.id), 'تم إنشاء فاتورة البطارية مع المقايضة: ' + inv3.invoice_number);
  assert(inv3.scrap_battery_deduction === 8000, 'تم إثبات خصم السكراب بقيمة 8,000 ر.ي');
  assert(inv3.net_total === batteryItem.sell_price - 8000, `صافي الفاتورة بعد المقايضة: ${inv3.net_total} ر.ي`);

  // Verify Scrap Asset Ledger (Account 1304 Debited)
  const scrapAssetLine = db.prepare(`
    SELECT jl.* FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE je.ref_type = 'invoice' AND je.ref_id = ? AND jl.account_code = '1304'
  `).get(inv3.id);
  assert(Boolean(scrapAssetLine && scrapAssetLine.debit === 8000), 'تم إدخال قيمة السكراب (8,000 ر.ي) كأصل مسترجع في حساب 1304');
  AUDIT_RESULTS.scenarios.push({ name: 'فاتورة بطارية مع مقايضة سكراب', status: 'PASS', invoice_id: inv3.id, invoice_number: inv3.invoice_number });

  // -------------------------------------------------------------
  // SCENARIO 4: Credit Sale on Identified Customer (Receivables & Credit Guard)
  // -------------------------------------------------------------
  logHeader('السيناريو 4: فاتورة بيع آجل (ذمم مدينة وفحص سقف الائتمان)');

  // 4.1 Negative Guard Test: Anonymous customer cannot buy on credit
  let anonymousCreditBlocked = false;
  try {
    invoiceModel.create({
      vehicle_id: 1, // العميل العابر
      payment_method: 'credit',
      items: [{ item_type: 'service', description: 'تغيير صوفة', qty: 1, unit_price: 3000 }],
    });
  } catch (err) {
    anonymousCreditBlocked = true;
    console.log(`  🛡️ تم التصدي لمحاولة بيع آجل لعميل عابر: "${err.message}"`);
  }
  assert(anonymousCreditBlocked, 'درع الائتمان منع بيع آجل لعميل مجهول/عابر');

  // 4.2 Legitimate Credit Sale on Lab Customer
  const debtBefore = db.prepare('SELECT balance_due FROM customers_vehicles WHERE id = ?').get(labVehicle.id).balance_due;
  const invoice4Data = {
    vehicle_id: labVehicle.id,
    payment_method: 'credit',
    paid_amount: 0,
    items: [
      {
        item_type: 'service',
        description: 'صيانة عكوس وتشحيم كامل',
        qty: 1,
        unit_price: 12000,
      }
    ],
    notes: 'فاتورة فحص معملي - سيناريو 4 بيع آجل',
    client_token: `lab_token_sc4_${Date.now()}`,
  };

  const inv4 = invoiceModel.create(invoice4Data);
  createdInvoices.push(inv4.id);
  assert(Boolean(inv4 && inv4.id), 'تم إصدار الفاتورة الآجلة: ' + inv4.invoice_number);
  assert(inv4.remaining_debt === 12000, 'المتبقي كدين آجل 12,000 ر.ي');

  const debtAfter = db.prepare('SELECT balance_due FROM customers_vehicles WHERE id = ?').get(labVehicle.id).balance_due;
  assert(debtAfter === debtBefore + 12000, `تم ترحيل الدين إلى حساب العميل بدقة: كان ${debtBefore} وأصبح ${debtAfter} ر.ي`);

  // Verify Receivable Line (Account 1201 Debited)
  const recLine = db.prepare(`
    SELECT jl.* FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE je.ref_type = 'invoice' AND je.ref_id = ? AND jl.account_code = '1201'
  `).get(inv4.id);
  assert(Boolean(recLine && recLine.debit === 12000), 'تم ترحيل قيد مدين لذمم العملاء (حساب 1201) بقيمة 12,000 ر.ي');
  AUDIT_RESULTS.scenarios.push({ name: 'فاتورة بيع آجل لعميل دائم', status: 'PASS', invoice_id: inv4.id, invoice_number: inv4.invoice_number });

  // -------------------------------------------------------------
  // SCENARIO 5: Voiding & Inverting Invoices (Restock & Reverse Ledger)
  // -------------------------------------------------------------
  logHeader('السيناريو 5: إلغاء فاتورة وعكس العمليات (إرجاع المخزون وتسوية الحسابات)');
  
  // Void Invoice 1 (which deducted 4L of oil)
  const stockBeforeVoid = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(oilItem.id).stock_qty;
  const voidResult = invoiceModel.voidInvoice(inv1.id, 'إلغاء فحص معملي معتمد');
  assert(voidResult.is_voided === 1, 'تم تنفيذ عملية إلغاء الفاتورة رقم: ' + inv1.invoice_number);

  // 5.1 Verify Inventory Restock
  const stockAfterVoid = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(oilItem.id).stock_qty;
  assert(stockAfterVoid === stockBeforeVoid + 4, `تم استرجاع 4 لتر زيت للمخزن فوراً: كان ${stockBeforeVoid} وأصبح ${stockAfterVoid}`);

  // 5.2 Verify Invoice Status Flag
  const voidedInv = db.prepare('SELECT is_voided, void_reason FROM invoices WHERE id = ?').get(inv1.id);
  assert(voidedInv.is_voided === 1, 'تم وسم الفاتورة كملغاة ومبطلة رسمياً');
  assert(voidedInv.void_reason === 'إلغاء فحص معملي معتمد', 'تم توثيق سبب الإلغاء');

  // 5.3 Attempting to Void Already Voided Invoice must be rejected
  let doubleVoidBlocked = false;
  try {
    invoiceModel.voidInvoice(inv1.id);
  } catch (err) {
    doubleVoidBlocked = true;
    console.log(`  🛡️ تم منع إلغاء الفاتورة الملغاة مسبقاً: "${err.message}"`);
  }
  assert(doubleVoidBlocked, 'درع الحماية منع تكرار إلغاء فاتورة ملغاة مسبقاً');
  AUDIT_RESULTS.scenarios.push({ name: 'إلغاء فاتورة وردّ المخزون', status: 'PASS', invoice_id: inv1.id, invoice_number: inv1.invoice_number });

  // -------------------------------------------------------------
  // STEP 6: Safeguards & Edge Cases Verification
  // -------------------------------------------------------------
  logHeader('الخطوة 6: فحص دروع الحماية وحالات الفوضى');

  // Guard 1: Idempotency (Prevent Duplicate Submission on Double-Click)
  const testToken = `double_click_${Date.now()}`;
  const invA = invoiceModel.create({
    vehicle_id: 1,
    items: [{ item_type: 'service', description: 'خدمة سريعة', qty: 1, unit_price: 500 }],
    client_token: testToken,
  });
  const invB = invoiceModel.create({
    vehicle_id: 1,
    items: [{ item_type: 'service', description: 'خدمة سريعة', qty: 1, unit_price: 500 }],
    client_token: testToken,
  });
  createdInvoices.push(invA.id);
  assert(invA.id === invB.id, `درع النقر المزدوج (Idempotency Guard) منع تكرار الفاتورة وأعاد نفس المعرف (${invA.id})`);
  AUDIT_RESULTS.guards.push({ name: 'منع التكرار بالنقر المزدوج (client_token)', status: 'PASS' });

  // Guard 2: Negative Stock Prevention
  let negativeStockBlocked = false;
  try {
    invoiceModel.create({
      vehicle_id: 1,
      items: [{ inventory_id: oilItem.id, qty: 999999, unit_price: 30000 }],
    });
  } catch (err) {
    negativeStockBlocked = true;
    console.log(`  🛡️ تم حظر البيع بالسالب بنجاح: "${err.message}"`);
  }
  assert(negativeStockBlocked, 'درع المخزون منع بيع كميات تتجاوز الرصيد المتوفر بالسالب');
  AUDIT_RESULTS.guards.push({ name: 'منع البيع بالسالب (Negative Stock Guard)', status: 'PASS' });

  // Guard 3: Excessive Discount Prevention
  let excessDiscountBlocked = false;
  try {
    invoiceModel.create({
      vehicle_id: 1,
      items: [{ item_type: 'service', description: 'غسيل محرك', qty: 1, unit_price: 2000 }],
      discount: 5000, // خصم أكبر من الفاتورة
    });
  } catch (err) {
    excessDiscountBlocked = true;
    console.log(`  🛡️ تم حظر الخصم الزائد: "${err.message}"`);
  }
  assert(excessDiscountBlocked, 'درع الإيرادات منع منح خصم أكبر من إجمالي الفاتورة');
  AUDIT_RESULTS.guards.push({ name: 'حظر الخصم الزائد عن قيمة الفاتورة', status: 'PASS' });

  // -------------------------------------------------------------
  // STEP 7: Check Front-end / Electron POS Payload Compatibility
  // -------------------------------------------------------------
  logHeader('الخطوة 7: التحقق من توافق البيانات مع واجهة الكاشير وسطح المكتب');
  const fetchedForUI = invoiceModel.getById(inv4.id);
  assert(Boolean(fetchedForUI), 'تم استدعاء الفاتورة عبر محرك واجهات العميل getById');
  assert(fetchedForUI.plate_number === LAB_PLATE, `ظهور رقم لوحة المركبة: ${fetchedForUI.plate_number}`);
  assert(fetchedForUI.customer_name === LAB_NAME, `ظهور اسم العميل: ${fetchedForUI.customer_name}`);
  assert(Array.isArray(fetchedForUI.items) && fetchedForUI.items.length > 0, 'الفاتورة تحتوي على مصفوفة الأصناف والخدمات');
  assert(typeof fetchedForUI.items[0].line_gross_profit !== 'undefined', 'حساب هامش الربح والربح الإجمالي لكل سطر فاتورة متوفر للتقارير');
  AUDIT_RESULTS.ui_compat_checks.push({ name: 'توافق واجهة الكاشير وسند الطباعة', status: 'PASS' });

  // -------------------------------------------------------------
  // STEP 8: Shift Aggregation Verification
  // -------------------------------------------------------------
  logHeader('الخطوة 8: التحقق من تجميع بيانات الفواتير داخل الوردية');
  const shiftStats = shiftModel.getCurrentShift();
  assert(shiftStats.has_active_shift === true, 'الوردية تسجل نشاطها بنجاح');
  console.log(`  📊 إجمالي مبيعات الوردية المسجلة: ${shiftStats.shift.total_sales || 'تم التجميع'} ر.ي`);
  console.log(`  📊 رصيد الصندوق المحاسبي المباشر: ${shiftStats.current_drawer_balance} ر.ي`);

  // Record Lab Invoices IDs for cleanup
  console.log('\n📝 أرقام معرفات فواتير الفحص المعملي المنشأة:', createdInvoices);
  return {
    success: true,
    createdInvoices,
    labVehicleId: labVehicle.id,
    createdAuditShift: createdAuditShift ? activeShift.id : null,
  };
}

runDeepAudit()
  .then(res => {
    console.log('\n============================================================');
    console.log('🎉 اكتمل الفحص المعملي العميق بنجاح تام 100% دون أي أخطاء حرجة!');
    console.log('============================================================');
    
    fs.writeFileSync(
      path.join(__dirname, 'last_invoice_audit_result.json'),
      JSON.stringify({ ...AUDIT_RESULTS, meta: res }, null, 2),
      'utf8'
    );
  })
  .catch(err => {
    console.error('\n💥 فشل في الفحص:', err.message);
    process.exit(1);
  });
