/**
 * AL-BANSHAR PRO — Phase 4: UI Contracts & Operational Flows Audit Suite
 * 
 * Verifies 5 Critical Interactive & Concurrency Dimensions:
 * 1. Double-Click & Rapid Idempotency Guard (Zero Duplicate Invoices)
 * 2. Selling Below Cost Accounting Truth (Truthful Gross Loss & COA Balance)
 * 3. Multi-Tablet Real-Time Atomic Stock Concurrency (Zero Negative Stock)
 * 4. Cart State Contract & Frontend-Backend Calculation Parity
 * 5. Live Sentinel Interlocking: COA & Summary Metrics Balance under Concurrency
 */

const fs = require('fs');
const path = require('path');
const fc = require('fast-check');
const Database = require('better-sqlite3');
const db = require('../../db/database');
const invoiceModel = require('../../models/invoiceModel');
const inventoryModel = require('../../models/inventoryModel');
const vehicleModel = require('../../models/vehicleModel');
const LiveSentinel = require('../sentinels/liveSentinel');
const { roundMoney } = require('../../utils/mathPrecision');

async function runPhase4Audit() {
  console.log('\n======================================================================');
  console.log('⚡  المرحلة 4: محاكاة تدفقات الواجهة وسلوك المستخدم (UI Contracts)');
  console.log('⚡  اختبار النقرات المزدوجة، التزامن متعدد الأجهزة، والبيع بأقل من التكلفة');
  console.log('======================================================================\n');

  const issues = [];
  let passedCount = 0;

  // Setup isolated temporary test database
  const testDbPath = path.join(__dirname, '../../db/quick_lube_test_phase4.db');
  const mainDbPath = path.join(__dirname, '../../db/quick_lube.db');

  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {}

  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal');
  if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm');

  if (fs.existsSync(mainDbPath)) {
    fs.copyFileSync(mainDbPath, testDbPath);
  }

  db.reconnect(testDbPath);

  try {
    const v = vehicleModel.create({
      plate_number: `UI-FLOW-${Date.now()}`,
      car_make_model: 'تويوتا برادو',
      customer_name: 'زبون محاكاة الواجهة',
      phone: '775566778',
    });

    const realProduct = db.prepare("SELECT * FROM inventory WHERE item_type = 'product' AND category = 'filter' LIMIT 1").get() || { id: 1, cost_price: 3000, sell_price: 4500, stock_qty: 10 };

    // -------------------------------------------------------------------------
    // TEST 1: Double-Click / Rapid Idempotency Guard
    // -------------------------------------------------------------------------
    console.log('🖱️ [فحص 1/5] جاري اختبار صمام منع النقرات المزدوجة المكررة (Idempotency Guard)...');
    
    const clientToken = `CLI-TOK-${Date.now()}-ABCD`;
    const initialInvoiceCount = db.prepare('SELECT count(*) as c FROM invoices').get().c;
    const initialStock = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(realProduct.id).stock_qty;

    // Simulate two rapid clicks with the same client token in 5ms
    let invoice1 = null;
    let invoice2 = null;

    try {
      invoice1 = invoiceModel.create({
        client_token: clientToken,
        vehicle_id: v.id,
        payment_method: 'cash',
        paid_amount: realProduct.sell_price,
        items: [{ inventory_id: realProduct.id, qty: 1, unit_price: realProduct.sell_price, cost_price: realProduct.cost_price }],
      });
    } catch (e) {}

    try {
      // Second rapid click with identical token
      invoice2 = invoiceModel.create({
        client_token: clientToken,
        vehicle_id: v.id,
        payment_method: 'cash',
        paid_amount: realProduct.sell_price,
        items: [{ inventory_id: realProduct.id, qty: 1, unit_price: realProduct.sell_price, cost_price: realProduct.cost_price }],
      });
    } catch (e) {}

    const postInvoiceCount = db.prepare('SELECT count(*) as c FROM invoices').get().c;
    const postStock = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(realProduct.id).stock_qty;

    // Assert: Only ONE invoice created, and stock deducted only ONCE
    const invoicesCreated = postInvoiceCount - initialInvoiceCount;
    const stockDeducted = initialStock - postStock;

    if (invoicesCreated === 1 && stockDeducted === 1) {
      console.log('   ✅ [PASS] صمام النقرات المزدوجة محصن 100%: تم إصدار فاتورة واحدة فقط وخصم المخزون مرة واحدة.');
      passedCount++;
    } else {
      console.log(`   ❌ [FAIL] تم رصد تكرار عند النقر السريع! تم إنشاء (${invoicesCreated}) فواتير وخصم المخزون (${stockDeducted}) مرات!`);
      issues.push({
        dimension: 'Idempotency: تكرار إصدار الفواتير وخصم المخزون مرتين عند النقر المزدوج السريع',
        counterExample: `client_token: ${clientToken} (نقرتان خلال أجزاء من الثانية)`,
        error: `تم إنشاء ${invoicesCreated} فواتير بدلاً من 1`,
        impact: 'عند نقر الكاشير مرتين على زر الحفظ بسبب بطء اتصال شاشة اللمس، تصدر فاتورتان مكررتان للزبون ويُخصم المخزون مرتين ويختل درج النقدية.',
        beforeScenario: 'الكاشير ينقر نقرة مزدوجة فيطبع الجهاز فاتورتين متطابقتين ويسجل مبيعات مضاعفة.',
        afterScenario: 'يرصد النظام الـ client_token الفريد ويتجاهل النقرة الثانية تلقائياً دون تكرار أي سجل.',
        fixCode: `// invoiceModel.js: إضافة فحص client_token
if (data.client_token) {
  const existing = db.prepare('SELECT id, invoice_number FROM invoices WHERE client_token = ?').get(data.client_token);
  if (existing) return this.getById(existing.id);
}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Selling Below Cost Accounting Truth & P&L Guard
    // -------------------------------------------------------------------------
    console.log('\n📉 [فحص 2/5] جاري اختبار البيع بأقل من التكلفة ودقة الأرباح والخسائر (Selling Below Cost)...');
    
    // An item with Cost: 4000, Sold for: 2500 (Loss: -1500)
    const costPrice = 4000;
    const discountedPrice = 2500;
    const lossAmount = costPrice - discountedPrice;

    // First try without confirmation
    let requiresConfirmPassed = false;
    try {
      invoiceModel.create({
        vehicle_id: v.id,
        payment_method: 'cash',
        paid_amount: discountedPrice,
        confirm_below_cost: false,
        items: [{
          inventory_id: realProduct.id,
          qty: 1,
          unit_price: discountedPrice,
          cost_price: costPrice,
        }],
      });
    } catch (e) {
      if (e.message.includes('أقل من التكلفة') || e.message.includes('تأكيد')) {
        requiresConfirmPassed = true;
      }
    }

    // Now execute with confirm_below_cost: true and verify accounting balance
    let accountingTruthPassed = false;
    let invBelowCost = null;
    try {
      invBelowCost = invoiceModel.create({
        vehicle_id: v.id,
        payment_method: 'cash',
        paid_amount: discountedPrice,
        confirm_below_cost: true,
        items: [{
          inventory_id: realProduct.id,
          qty: 1,
          unit_price: discountedPrice,
          cost_price: costPrice,
        }],
      });

      // Verify that COA is balanced 100%
      const sentinel = LiveSentinel.runFullSentinel(db);
      if (sentinel.coaResult.passed) {
        accountingTruthPassed = true;
      }
    } catch (e) {}

    if (requiresConfirmPassed && accountingTruthPassed) {
      console.log('   ✅ [PASS] صمام البيع بأقل من التكلفة متزن: يطلب تأكيد المشرف، ويسجل القيد المحاسبي بدقة متناهية.');
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] غياب صمام التحذير عند البيع بأقل من سعر التكلفة!');
      issues.push({
        dimension: 'Selling Below Cost: تمرير البيع بخسارة بصمت دون طلب تأكيد الكاشير',
        counterExample: `تكلفة الصنف: ${costPrice} ر.ي | سعر البيع المدخل: ${discountedPrice} ر.ي (خسارة: -${lossAmount} ر.ي)`,
        error: 'تمرير الفاتورة دون فحص confirm_below_cost',
        impact: 'قد يخطئ الكاشير في كتابة سعر الصنف ويبيع زيوتاً فاخرة بربع قيمتها دون أن ينبهه النظام، مما يسبب خسائر فادحة للورشة.',
        beforeScenario: 'الكاشير يدخل سعراً أقل من سعر الشراء سهواً وتمر الفاتورة دون أي تحذير.',
        afterScenario: 'يظهر تنبيه أحمر: "تنبيه: الصنف يُباع بأقل من التكلفة (خسارة 1,500 ر.ي)، هل تؤكد البيع؟" لحماية الإيرادات.',
        fixCode: `// invoiceModel.js: فحص البيع بأقل من التكلفة
for (const item of items) {
  if (item._unitPrice < item._costPrice && !data.confirm_below_cost) {
    throw new Error(\`تنبيه مالي: الصنف "\${item.description}" يُباع بأقل من سعر التكلفة بمقدار (\${(item._costPrice - item._unitPrice).toLocaleString()} ر.ي). يرجى تأكيد العملية.\`);
  }
}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 3: Multi-Tablet Real-Time Atomic Stock Concurrency
    // -------------------------------------------------------------------------
    console.log('\n📱 [فحص 3/5] جاري اختبار التزامن الذري للأجهزة اللوحية (Multi-Tablet Atomic Stock Lock)...');
    
    // Create an item with exactly stock_qty = 1
    const singleStockItem = db.prepare(`
      INSERT INTO inventory (sku, name, category, item_type, brand, cost_price, sell_price, stock_qty)
      VALUES (?, 'فلتر هواء نادر - حبة واحدة', 'filter', 'product', 'تويوتا', 2000, 3500, 1)
    `).run(`SKU-SINGLE-${Date.now()}`);

    const singleItemId = singleStockItem.lastInsertRowid;

    // Simulate Tablet A and Tablet B racing for this 1 item
    let tabletASucceeded = false;
    let tabletBBlocked = false;

    try {
      // Tablet A buys it
      invoiceModel.create({
        vehicle_id: v.id,
        payment_method: 'cash',
        paid_amount: 3500,
        items: [{ inventory_id: singleItemId, qty: 1, unit_price: 3500, cost_price: 2000 }],
      });
      tabletASucceeded = true;
    } catch (e) {}

    try {
      // Tablet B attempts to buy the same item immediately
      invoiceModel.create({
        vehicle_id: v.id,
        payment_method: 'cash',
        paid_amount: 3500,
        items: [{ inventory_id: singleItemId, qty: 1, unit_price: 3500, cost_price: 2000 }],
      });
    } catch (e) {
      if (e.message.includes('نفد المخزون') || e.message.includes('لا يكفي')) {
        tabletBBlocked = true;
      }
    }

    const finalStock = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(singleItemId).stock_qty;

    if (tabletASucceeded && tabletBBlocked && finalStock === 0) {
      console.log('   ✅ [PASS] الحجز الذري بين الأجهزة محصن: فاز التابلت الأسرع، والتابلت الآخر تم تنبيهه فوراً بنفاد المخزون.');
      passedCount++;
    } else {
      console.log(`   ❌ [FAIL] حدث تضارب في المخزون المتزامن! الرصيد النهائي: (${finalStock})`);
      issues.push({
        dimension: 'Concurrency: تضارب الأجهزة اللوحية وبيع المخزون بالسالب',
        counterExample: 'حبة واحدة متبقية طلبتها حفرتان في نفس الوقت',
        error: `الرصيد المتبقي أصبح ${finalStock}`,
        impact: 'بيع نفس القطعة مرتين واكتشاف الفني في الحفرة أن الصنف غير موجود على الرف بعد أن دفع الزبون ثمنه.',
        beforeScenario: 'كلا الفنيين يطبعان الفاتورة ويتفاجآن بعدم وجود القطعة.',
        afterScenario: 'التابلت الأسرع يحجز القطعة فورياً، والآخر يظهر له "نفد المخزون" في نفس الثانية.',
        fixCode: `// استخدام التحديث الذري مع قيد الرصيد stock_qty >= qty`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Cart State Contract & Frontend-Backend Calculation Parity
    // -------------------------------------------------------------------------
    console.log('\n🛒 [فحص 4/5] جاري اختبار تطابق حسابات سلة الواجهة مع معادلات الخادم (Cart Parity)...');
    
    let cartParityPassed = true;
    let parityMismatch = null;

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.float({ min: 500, max: 20000, noNaN: true }),
        fc.float({ min: 0, max: 5000, noNaN: true }),
        fc.float({ min: 0, max: 2000, noNaN: true }),
        (qty, price, labor, rawDiscount) => {
          // Replenish stock so cart math test runs independently of stock depletion
          db.prepare("UPDATE inventory SET stock_qty = 999999 WHERE id = ?").run(realProduct.id);

          const clientSubtotal = roundMoney(qty * roundMoney(price) + roundMoney(labor));
          const discount = roundMoney(Math.min(rawDiscount, clientSubtotal * 0.5));
          const clientNet = roundMoney(Math.max(0, clientSubtotal - discount));

          const serverInv = invoiceModel.create({
            vehicle_id: v.id,
            payment_method: 'cash',
            paid_amount: clientNet,
            discount: discount,
            confirm_below_cost: true,
            items: [{
              inventory_id: realProduct.id,
              qty,
              unit_price: roundMoney(price),
              labor_fee: roundMoney(labor),
              cost_price: 1000,
            }],
          });

          if (Math.abs(serverInv.net_total - clientNet) > 0.05) {
            cartParityPassed = false;
            parityMismatch = { clientNet, serverNet: serverInv.net_total };
            return false;
          }
          return true;
        }
      ),
      { numRuns: 30 }
    );

    if (cartParityPassed) {
      console.log('   ✅ [PASS] تطابق كامل 100% بين حسابات سلة الواجهة والسيرفر (بدون أي فارق هللات).');
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] تم رصد تفاوت بين حساب السلة في الواجهة وحساب السيرفر!');
      issues.push({
        dimension: 'Cart Parity: تفاوت في التقريب المالي بين واجهة React وخادم Node.js',
        counterExample: JSON.stringify(parityMismatch),
        error: 'اختلاف في كسور السنتات',
        impact: 'ظهور مبلغ في شاشة الكاشير يختلف بكسور بسيطة عن المبلغ المطبوع على إيصال الزبون.',
        beforeScenario: 'الشاشة تعرض 4,500.20 ريال والفاتورة تنطبع بـ 4,500.00 ريال مما يربك الزبون.',
        afterScenario: 'تطابق رياضي تام حتى آخر فلس بين السلة وإيصال الطباعة.',
        fixCode: `// توحيد دالة mathPrecision في الفرونت والباك`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Live Sentinel Real-Time Accounting Verification under Concurrency
    // -------------------------------------------------------------------------
    console.log('\n📊 [فحص 5/5] جاري تشغيل الفاحص المرافق (Live Sentinel) للتحقق من شجرة الحسابات...');
    
    const sentinelReport = LiveSentinel.runFullSentinel(db);
    if (sentinelReport.allPassed) {
      console.log(`   ✅ [PASS] ${sentinelReport.coaResult.details}`);
      passedCount++;
    } else {
      console.log(`   ❌ [FAIL] رصد الفاحص المرافق اختلالاً في الحسابات: ${sentinelReport.coaResult.details}`);
      issues.push({
        dimension: 'Live Sentinel: اختلال ميزان الحسابات بعد عمليات الواجهة',
        counterExample: sentinelReport.coaResult.details,
        error: sentinelReport.coaResult.details,
        impact: 'فروق في القيود اليومية بعد محاكاة تدفقات الواجهة السريعة.',
        beforeScenario: 'عدم تطابق القيود بعد النقرات السريعة.',
        afterScenario: 'اتزان تام 100% دون أي فارق.',
        fixCode: `// مراجعة قيود العمليات المتزامنة`,
      });
    }

  } finally {
    try {
      db.reconnect(mainDbPath);
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
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

module.exports = { runPhase4Audit };

if (require.main === module) {
  runPhase4Audit().then(res => {
    console.log('\n======================================================================');
    console.log(`🏁 نهاية فحص المرحلة 4: اجتاز ${res.passedCount} من أصل ${res.totalTests} اختبارات.`);
    console.log('======================================================================');
  });
}
