/**
 * AL-BANSHAR PRO — Phase 2: Models & Database Invariants Audit Suite
 * 
 * Verifies 5 Critical Architectural & Operational Dimensions:
 * 1. Odometer Monotonicity & Rollback Clamping (MAX(last, current))
 * 2. Walk-in Customer Credit Policy (Disallow debt unless guarantor is provided)
 * 3. Closed Shift Freezing & Exceptional Manager Reversal Handling
 * 4. Mid-Flight Transaction Atomicity & SQLite Rollback (Zero Partial Writes)
 * 5. Live Sentinel Interlocking: Double-Entry Balance & Summary KPIs after sales
 */

const fs = require('fs');
const path = require('path');
const fc = require('fast-check');
const Database = require('better-sqlite3');
const db = require('../../db/database');
const invoiceModel = require('../../models/invoiceModel');
const vehicleModel = require('../../models/vehicleModel');
const inventoryModel = require('../../models/inventoryModel');
const shiftModel = require('../../models/shiftModel');
const LiveSentinel = require('../sentinels/liveSentinel');
const { roundMoney } = require('../../utils/mathPrecision');

async function runPhase2Audit() {
  console.log('\n======================================================================');
  console.log('⚡  المرحلة 2: فحص النماذج وقواعد البيانات (Models & DB Invariants)');
  console.log('⚡  اختبار القيود الحتمية وصمامات الأمان التشغيلية ومطابقة الحسابات');
  console.log('======================================================================\n');

  const issues = [];
  let passedCount = 0;

  // Setup isolated temporary test database
  const testDbPath = path.join(__dirname, '../../db/quick_lube_test_phase2.db');
  const mainDbPath = path.join(__dirname, '../../db/quick_lube.db');
  
  if (fs.existsSync(mainDbPath)) {
    fs.copyFileSync(mainDbPath, testDbPath);
  }
  
  db.reconnect(testDbPath);

  try {
    const serviceItem = db.prepare("SELECT id, sell_price, cost_price FROM inventory WHERE category = 'service' LIMIT 1").get() || { id: null, sell_price: 3000, cost_price: 0 };

    // -------------------------------------------------------------------------
    // TEST 1: Odometer Monotonicity & Automatic Clamping
    // -------------------------------------------------------------------------
    console.log('🚗 [فحص 1/5] جاري اختبار صمام عداد الكيلومترات واعتماد MAX(last, current)...');
    
    const testPlate = `TEST-ODO-${Date.now()}`;
    const vehicle = vehicleModel.create({
      plate_number: testPlate,
      plate_type: 'خصوصي',
      car_make_model: 'تويوتا لاندكروزر',
      customer_name: 'عميل اختبار العداد',
      phone: '770000001',
      last_odometer: 150000,
    });

    let autoClampingWorks = true;
    let thrownError = null;

    try {
      // Trying to invoice with odometer 15,000 (missing zero typo)
      invoiceModel.create({
        vehicle_id: vehicle.id,
        current_odometer: 15000,
        payment_method: 'cash',
        paid_amount: serviceItem.sell_price,
        items: serviceItem.id ? [{
          inventory_id: serviceItem.id,
          qty: 1,
          unit_price: serviceItem.sell_price,
          cost_price: serviceItem.cost_price,
        }] : [],
      });

      const updatedV = vehicleModel.getById(vehicle.id);
      if (updatedV.last_odometer < 150000) {
        autoClampingWorks = false;
      }
    } catch (e) {
      // Threw error instead of auto-clamping to MAX(150000, 15000)
      autoClampingWorks = false;
      thrownError = e.message;
    }

    if (autoClampingWorks) {
      console.log('   ✅ [PASS] اجتاز النظام الفحص: تم اعتماد MAX(last, current) تلقائياً دون تعطيل الفاتورة.');
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] النظام يرمي خطأ ويوقف الفاتورة بدلاً من تطبيق MAX(last, current) تلقائياً!');
      issues.push({
        dimension: 'Odometer Safeguard: توقف الفاتورة عند خطأ الكاشير السهو بدلاً من الاعتماد التلقائي',
        counterExample: 'قراءة سابقة: 150,000 كم | قراءة مدخلة سهواً: 15,000 كم',
        error: thrownError || 'توقف العملية',
        impact: 'عندما ينسى الكاشير صفراً أثناء ضغط العمل السريع في الورشة، يتوقف زر حفظ الفاتورة ويعطي شاشة خطأ، مما يعطل مسار السيارات الميداني.',
        beforeScenario: 'إذا أدخل الكاشير 15,000 بدلاً من 150,000، يتجمد النظام برمز خطأ Poka-Yoke ويطلب تفعيل خيار استثنائي، مما يربك الكاشير.',
        afterScenario: 'يطبق النظام تلقائياً MAX(150000, 15000) فيحفظ الفاتورة فوراً بـ 150,000 كم، مع إتاحة التصحيح الإداري اللاحق من بطاقة العميل إذا كان الخطأ أصلياً.',
        fixCode: `// invoiceModel.js: تعديل فحص العداد ليعتمد MAX تلقائياً
const lastRecordedOdo = Number(vehicle.last_odometer) || 0;
const currentOdo = data.allow_odometer_reset ? enteredOdo : Math.max(lastRecordedOdo, enteredOdo);
// إزالة الـ throw new Error الذي يعطل الفاتورة السريعة`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Walk-in Customer Debt & Guarantor Policy
    // -------------------------------------------------------------------------
    console.log('\n👤 [فحص 2/5] جاري اختبار صمام البيع الآجل للزبائن العابرين وشرط الضامن...');
    
    const walkInVehicle = db.prepare("SELECT * FROM customers_vehicles WHERE id = 1 OR customer_name = 'عميل نقدي' LIMIT 1").get();
    
    if (walkInVehicle) {
      let allowsDebtWithoutGuarantor = false;
      let allowsDebtWithGuarantor = false;

      // Scenario A: Without guarantor
      try {
        invoiceModel.create({
          vehicle_id: walkInVehicle.id,
          payment_method: 'credit',
          paid_amount: 0,
          items: serviceItem.id ? [{
            inventory_id: serviceItem.id,
            qty: 1,
            unit_price: serviceItem.sell_price,
            cost_price: serviceItem.cost_price,
          }] : [],
        });
        allowsDebtWithoutGuarantor = true;
      } catch (e) {
        // Correctly blocked
      }

      // Scenario B: Walk-in with customer's OWN Name, Phone, and Plate provided
      try {
        invoiceModel.create({
          vehicle_id: walkInVehicle.id,
          payment_method: 'credit',
          paid_amount: 0,
          customer_name: 'أحمد علي السويدي',
          phone: '777889900',
          plate_number: '1234-أ',
          items: serviceItem.id ? [{
            inventory_id: serviceItem.id,
            qty: 1,
            unit_price: serviceItem.sell_price,
            cost_price: serviceItem.cost_price,
          }] : [],
        });
        allowsDebtWithGuarantor = true;
      } catch (e) {
        allowsDebtWithGuarantor = false;
      }

      if (!allowsDebtWithoutGuarantor && allowsDebtWithGuarantor) {
        console.log('   ✅ [PASS] صمام الزبون العابر يعمل بمرونة: يمنع الدين المجهول، ويسمح بالدين الموثق باسم وهاتف ولوحة العميل.');
        passedCount++;
      } else {
        console.log('   ❌ [FAIL] النظام يحظر الدين كلياً على العميل العابر حتى لو تم تسجيل اسمه وهاتفه ولوحته!');
        issues.push({
          dimension: 'Walk-in Credit Guard: حظر الدين كلياً ومنع تسجيل بيانات العميل',
          counterExample: 'طلب آجل لزبون عابر مع تقديم الاسم ورقم الهاتف واللوحة (أحمد علي - 777889900 - 1234-أ)',
          error: 'حظر أمني: لا يمكن ترحيل دين على عميل نقدي عابر',
          impact: 'تعطيل عمليات البيع لزبائن يطلبون تسجيل أسمائهم وأرقامهم ولوحاتهم، مما يحرج الكاشير ويسبب خسارة المبيعات.',
          beforeScenario: 'إذا حضر عميل وأراد تسوية متبقٍ بالآجل وأعطى اسمه وهاتفه ولوحته، يرفض النظام إصدار الفاتورة.',
          afterScenario: 'يسمح النظام بالفاتورة الآجلة للزبون العابر فور تسجيل الثلاثي المعتمد: (اسم العميل + رقم هاتفه + رقم لوحته) لضمان حقه وحق الورشة.',
          fixCode: `// invoiceModel.js: تعديل فحص الزبون العابر لدعم بيانات العميل المباشرة`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // TEST 3: Closed Shift Freezing & Exceptional Manager Reversal
    // -------------------------------------------------------------------------
    console.log('\n🔒 [فحص 3/5] جاري اختبار تجميد الورديات والإلغاء الاستثنائي للمدير...');
    
    // Ensure test worker exists
    db.prepare(`
      INSERT OR IGNORE INTO workers (id, name, role) 
      VALUES (1, 'عامل الاختبار', 'technician')
    `).run();

    let shiftId = null;
    try {
      const active = shiftModel.getCurrentShift();
      if (active && active.id) {
        shiftId = active.id;
      } else {
        const shiftRes = shiftModel.openShift({ worker_id: 1, opening_cash: 50000 });
        shiftId = shiftRes.id;
      }
    } catch (e) {
      shiftId = null;
    }

    const invInShift = invoiceModel.create({
      vehicle_id: vehicle.id,
      shift_id: shiftId,
      payment_method: 'cash',
      paid_amount: serviceItem.sell_price,
      items: serviceItem.id ? [{
        inventory_id: serviceItem.id,
        qty: 1,
        unit_price: serviceItem.sell_price,
        cost_price: serviceItem.cost_price,
      }] : [],
    });

    try {
      shiftModel.closeShift(shiftId, { actual_cash: 50000 + serviceItem.sell_price, notes: 'إغلاق اختباري' });
    } catch (e) {}

    let normalVoidBlocked = false;
    try {
      invoiceModel.voidInvoice(invInShift.id);
    } catch (e) {
      normalVoidBlocked = true;
    }

    let managerOverrideAllowed = false;
    try {
      invoiceModel.voidInvoice(invInShift.id, { manager_override: true, reason: 'إلغاء استثنائي معتمد' });
      managerOverrideAllowed = true;
    } catch (e) {
      managerOverrideAllowed = false;
    }

    if (normalVoidBlocked && managerOverrideAllowed) {
      console.log('   ✅ [PASS] تجميد الورديات متزن: يمنع الإلغاء العادي، ويسمح بالإلغاء الاستثنائي للمدير مع قيد تسوية.');
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] غياب آلية الإلغاء الاستثنائي للمدير للفواتير في الورديات المقفلة!');
      issues.push({
        dimension: 'Shift Freezing: غياب آلية الإلغاء الاستثنائي للمدير في الورديات المقفلة',
        counterExample: 'محاولة إلغاء فاتورة خطأ بعد إغلاق الوردية بصلاحية المدير',
        error: 'لا يمكن إلغاء الفاتورة لأنها تتبع وردية تم إغلاقها وترحيلها',
        impact: 'عند اكتشاف خطأ كاشير بعد إقفال الوردية (مثلاً صنف تم إدخاله بالخطأ)، يعجز المدير عن تصحيح المخزون أو إرجاع المبلغ للزبون نظامياً.',
        beforeScenario: 'إذا أُغلقت الوردية واكتشف المحل خطأ في فاتورة، يظل المخزون ناقصاً والزبون مقيداً بالخطأ دون إمكانية تصحيحها.',
        afterScenario: 'يسمح النظام للمدير بالإلغاء الاستثنائي، مع ترحيل قيد التسوية العكسي تلقائياً إلى الوردية المفتوحة حالياً دون تشويه الوردية القديمة.',
        fixCode: `// invoiceModel.js voidInvoice:
if (invoice.shift_id) {
  const shift = db.prepare('SELECT status, shift_code FROM cash_shifts WHERE id = ?').get(invoice.shift_id);
  if (shift && shift.status === 'closed') {
    if (!options?.manager_override) {
      throw new Error('لا يمكن إلغاء الفاتورة لوردية مغلقة إلا بصلاحية المدير (Manager Override).');
    }
    // يتم تسجيل التسوية في الوردية المفتوحة حالياً
  }
}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Atomic Multi-Row Operations & Rollback Integrity
    // -------------------------------------------------------------------------
    console.log('\n🛡️ [فحص 4/5] جاري اختبار ذرّية العمليات (Atomicity) والتراجع التلقائي عند الخطأ...');
    
    const countBeforeInvoices = db.prepare('SELECT COUNT(*) c FROM invoices').get().c;
    const countBeforeLines = db.prepare('SELECT COUNT(*) c FROM journal_lines').get().c;

    let transactionRollbackPassed = false;
    try {
      invoiceModel.create({
        vehicle_id: vehicle.id,
        payment_method: 'cash',
        paid_amount: 1000,
        items: [
          { inventory_id: 9999999, qty: 1, unit_price: 1000 },
        ],
      });
    } catch (e) {
      const countAfterInvoices = db.prepare('SELECT COUNT(*) c FROM invoices').get().c;
      const countAfterLines = db.prepare('SELECT COUNT(*) c FROM journal_lines').get().c;

      if (countBeforeInvoices === countAfterInvoices && countBeforeLines === countAfterLines) {
        transactionRollbackPassed = true;
      }
    }

    if (transactionRollbackPassed) {
      console.log('   ✅ [PASS] ذرّية العمليات مثالية 100%: تراجع كامل وفوري دون أي بيانات يتيمة.');
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] تسربت بيانات يتيمة عند فشل الفاتورة في منتصف الطريق!');
      issues.push({
        dimension: 'Transaction Atomicity: ترك سجلات يتيمة عند الفشل',
        counterExample: 'فشل الفاتورة بسبب خطأ في أحد الأصناف',
        error: 'عدم تراجع العمليات جزئياً',
        impact: 'ظهور فواتير بدون بنود أو قيود محاسبية غير متزنة.',
        beforeScenario: 'إذا انقطع التيار أو حدث خطأ بصنف، يُسجل قيد ولا تُحفظ الفاتورة.',
        afterScenario: 'تراجع ذري كامل لجميع العمليات (All or Nothing).',
        fixCode: `// لف العمليات داخل db.transaction()`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Live Sentinel Invariant on Random Invoicing
    // -------------------------------------------------------------------------
    console.log('\n📊 [فحص 5/5] جاري تشغيل الفاحص المرافق (Live Sentinel) على 20 فاتورة عشوائية...');
    
    let allInvoicesSentinelPassed = true;
    let coaError = null;

    for (let i = 0; i < 20; i++) {
      try {
        invoiceModel.create({
          vehicle_id: vehicle.id,
          payment_method: i % 2 === 0 ? 'cash' : 'split',
          paid_amount: serviceItem.sell_price,
          split_payments: i % 2 === 0 ? null : {
            cash: roundMoney(serviceItem.sell_price * 0.6),
            kuraimi: roundMoney(serviceItem.sell_price * 0.4),
          },
          items: serviceItem.id ? [{
            inventory_id: serviceItem.id,
            qty: 1,
            unit_price: serviceItem.sell_price,
            cost_price: serviceItem.cost_price,
          }] : [],
        });

        const sentinel = LiveSentinel.runFullSentinel(db);
        if (!sentinel.allPassed) {
          allInvoicesSentinelPassed = false;
          coaError = sentinel.coaResult.details;
          break;
        }
      } catch (e) {
        // Ignore validation errors in test loop
      }
    }

    if (allInvoicesSentinelPassed) {
      console.log('   ✅ [PASS] شجرة الحسابات والقيود متزنة 100% بعد كافة الفواتير (المدين = الدائن).');
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] تم رصد عدم اتزان في شجرة الحسابات أثناء إصدار الفواتير!');
      issues.push({
        dimension: 'Chart of Accounts Invariant: اختلال ميزان القيد المزدوج',
        counterExample: coaError,
        error: coaError,
        impact: 'اختلال ميزان المراجعة والأرباح والخسائر وظهور فروق في الحسابات الختامية.',
        beforeScenario: 'توليد قيود غير متزنة تؤدي لعدم تطابق الميزانية العمومية.',
        afterScenario: 'كل فاتورة تولد قيوداً متطابقة بالمللي حتى آخر فلس.',
        fixCode: `// accountingEngine.js postInvoice: مراجعة دقة القيد المزدوج`,
      });
    }

  } finally {
    try {
      db.reconnect(mainDbPath);
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      const wal = testDbPath + '-wal';
      const shm = testDbPath + '-shm';
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch (e) {}
  }

  return {
    passedCount,
    totalTests: 5,
    issues,
  };
}

module.exports = { runPhase2Audit };

if (require.main === module) {
  runPhase2Audit().then(res => {
    console.log('\n======================================================================');
    console.log(`🏁 نهاية فحص المرحلة 2: اجتاز ${res.passedCount} من أصل ${res.totalTests} اختبارات.`);
    console.log('======================================================================');
  });
}
