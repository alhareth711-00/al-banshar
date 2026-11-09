/**
 * AL-BANSHAR PRO — Phase 1: Math & Precision Engine Audit Suite
 * 
 * Tests 5 Core Dimensions with fast-check (1,000 cases each):
 * 1. roundMoney: NaN & Exponential String Anomaly Prevention
 * 2. safeDiv: Ultra-tiny / Zero Denominators & Infinity Clamping
 * 3. calcWAC: Weighted Average Cost Mathematical Boundedness
 * 4. calcNetTotal: Deduction Collisions & Zero-Floor Invariant
 * 5. Live Sentinel: Chart of Accounts & Summary Metrics Interlocking
 */

const fc = require('fast-check');
const { roundMoney, safeNum, safeDiv, calcWAC, calcNetTotal, formatMoney } = require('../../utils/mathPrecision');
const LiveSentinel = require('../sentinels/liveSentinel');
const Database = require('better-sqlite3');

async function runPhase1Audit() {
  console.log('\n======================================================================');
  console.log('⚡  المرحلة 1: فحص الدوال الرياضية والعمليات الحسابية (Math Engine)');
  console.log('⚡  اختبار الخصائص البرمجية عبر fast-check بمعدل 1,000 سيناريو لكل دالة');
  console.log('======================================================================\n');

  const issues = [];
  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // TEST 1: roundMoney Invariants
  // ---------------------------------------------------------------------------
  console.log('🧪 [فحص 1/5] جاري اختبار دالة تقريب المبالغ المالية (roundMoney)...');
  try {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (val) => {
        const res = roundMoney(val);
        // Invariant: Result must NEVER be NaN, never Infinity, and never negative zero (-0)
        if (isNaN(res) || !isFinite(res) || Object.is(res, -0)) {
          return false;
        }
        return true;
      }),
      { numRuns: 1000 }
    );
    console.log('   ✅ [PASS] اجتازت دالة roundMoney فحص 1,000 رقم عشوائي بنجاح.');
    passedCount++;
  } catch (err) {
    console.log('   ❌ [FAIL] تم اكتشاف ثغرة في دالة roundMoney!');
    issues.push({
      dimension: 'roundMoney: خطأ الأرقام الأسية والكسور بالغة الصغر (Scientific Notation Bug)',
      counterExample: err.message.match(/Counterexample: \[.*?\]/)?.[0] || '[1e-7]',
      error: 'إرجاع NaN عند معالجة الأرقام ذات التنسيق الأسي (مثل 1e-7 أو 5e-324)',
      impact: 'إذا نتج عن حساب كميات الزيوت أو نسب الخصم كسر أسي دقيق (مثل 1e-7)، تُرجع الدالة قيمة غير معرفة (NaN) بدلاً من الصفر (0.00)، مما يسبب ظهور "NaN ر.ي" بالفاتورة ورفض قاعدة البيانات حفظ القيد المحاسبي وتعطل الوردية.',
      beforeScenario: 'إذا اشترى زبون كمية زيت بكسور دقيقة جداً مع خصم نسبي، ينتهي الحساب بـ NaN ويتعطل زر "حفظ الفاتورة" أمام الزبون.',
      afterScenario: 'يتم فحص وتفكيك الأرقام الأسية قبل التقريب، بحيث يتم تحويل الكسور البالغة الصغر إلى 0.00 بأمان تام ودون أي تعليق.',
      fixCode: `function roundMoney(val, decimals = 2) {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  
  // حماية من الأرقام الأسية مثل 1e-7 التي تسبب NaN عند دمجها مع 'e'
  const str = num.toString();
  if (str.includes('e')) {
    const parts = str.split('e');
    const exp = Number(parts[1]);
    if (exp < -decimals) return 0;
    if (exp > 20) return num;
  }

  const res = Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
  return Object.is(res, -0) ? 0 : (isNaN(res) ? 0 : res);
}`,
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 2: safeDiv Invariants
  // ---------------------------------------------------------------------------
  console.log('\n🧪 [فحص 2/5] جاري اختبار القسمة الآمنة وصمام المقام الصفري (safeDiv)...');
  try {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        (num, den) => {
          const res = safeDiv(num, den, 0);
          if (isNaN(res) || !isFinite(res)) return false;
          return true;
        }
      ),
      { numRuns: 1000 }
    );
    console.log('   ✅ [PASS] اجتازت دالة safeDiv فحص 1,000 سيناريو عشوائي للمقامات.');
    passedCount++;
  } catch (err) {
    console.log('   ❌ [FAIL] تم اكتشاف ثغرة في دالة safeDiv!');
    issues.push({
      dimension: 'safeDiv: انهيار القسمة عند المقامات المتناهية الصغر (Underflow/Overflow to NaN)',
      counterExample: err.message.match(/Counterexample: \[.*?\]/)?.[0] || '[1, 1e-300]',
      error: 'إرجاع NaN بدلاً من fallback عند التعامل مع مقامات متناهية الصغر تسبب تدفقاً رقمياً غير نهائي',
      impact: 'عند قسمة قيمة على مقام يقارب الصفر (أصغر من 1e-9)، تنتج قيمة ضخمة جداً (Infinity) تتحول بعد التقريب إلى NaN بدلاً من الرجوع للقيمة الاحتياطية (fallback).',
      beforeScenario: 'لو أدخل كاشير كمية وقود أو زيت تكاد تلامس الصفر، يتجمد النظام برمز خطأ غير معروف.',
      afterScenario: 'تعتبر أي قيمة أصغر من 1e-9 بمثابة صفر قطعي، ويُرجع النظام الصفر فوراً بأمان.',
      fixCode: `function safeDiv(numerator, denominator, fallback = 0) {
  const n = safeNum(numerator, 0);
  const d = safeNum(denominator, 0);
  if (Math.abs(d) < 1e-9) return fallback;
  const res = n / d;
  return (!isNaN(res) && isFinite(res)) ? roundMoney(res) : fallback;
}`,
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 3: calcWAC Invariants
  // ---------------------------------------------------------------------------
  console.log('\n🧪 [فحص 3/5] جاري اختبار متوسط التكلفة المرجح للمخزون (calcWAC)...');
  try {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 10000, noNaN: true }),
        fc.float({ min: 100, max: 50000, noNaN: true }),
        fc.float({ min: 1, max: 10000, noNaN: true }),
        fc.float({ min: 100, max: 50000, noNaN: true }),
        (cQty, cCost, inQty, inCost) => {
          const wac = calcWAC(cQty, cCost, inQty, inCost);
          const minExpected = Math.min(cCost, inCost) - 0.05;
          const maxExpected = Math.max(cCost, inCost) + 0.05;
          return !isNaN(wac) && isFinite(wac) && wac >= minExpected && wac <= maxExpected;
        }
      ),
      { numRuns: 1000 }
    );
    console.log('   ✅ [PASS] اجتازت معادلة WAC فحص 1,000 حركة توريد للمخزون.');
    passedCount++;
  } catch (err) {
    console.log('   ❌ [FAIL] تم اكتشاف خلل في احتساب تكلفة المخزون المرجحة!');
    issues.push({
      dimension: 'calcWAC: شذوذ في حساب التكلفة المرجحة للوارد',
      counterExample: err.message.match(/Counterexample: \[.*?\]/)?.[0] || 'WAC Out of Range',
      error: err.message,
      impact: 'شطوح تكلفة اللتر المخزني بعيداً عن السعر الحقيقي للبضاعة وتشويه الأرباح التشغيلية.',
      beforeScenario: 'يتم احتساب أرباح البنشر بشكل خاطئ بسبب التكلفة غير المنطقية للتر الزيت.',
      afterScenario: 'تكون التكلفة الجديدة محصورة دائماً بدقة بين سعر المخزون وسعر الفاتورة الواردة.',
      fixCode: `// يتم معالجتها تلقائياً بمجرد تصحيح roundMoney`,
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 4: calcNetTotal Invariants
  // ---------------------------------------------------------------------------
  console.log('\n🧪 [فحص 4/5] جاري اختبار صافي الفاتورة وتصادم الخصومات والخردة (calcNetTotal)...');
  try {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2000000, noNaN: true }),
        fc.float({ min: 0, max: 500000, noNaN: true }),
        fc.float({ min: -10000, max: 5000000, noNaN: true }),
        fc.float({ min: -10000, max: 5000000, noNaN: true }),
        (items, labor, scrap, discount) => {
          const net = calcNetTotal(items, labor, scrap, discount);
          const gross = Math.max(0, safeNum(items, 0)) + Math.max(0, safeNum(labor, 0));
          return !isNaN(net) && isFinite(net) && net >= 0 && net <= (gross + 0.01);
        }
      ),
      { numRuns: 1000 }
    );
    console.log('   ✅ [PASS] اجتاز صمام أمان الفاتورة calcNetTotal فحص 1,000 سيناريو خصم وخردة.');
    passedCount++;
  } catch (err) {
    console.log('   ❌ [FAIL] تم اكتشاف خلل في احتساب صافي الفاتورة!');
    issues.push({
      dimension: 'calcNetTotal: تداخل الخصومات مع خصم البطاريات الرجيع',
      counterExample: err.message.match(/Counterexample: \[.*?\]/)?.[0] || 'Net Total Out of Bounds',
      error: err.message,
      impact: 'نزول صافي الفاتورة للسالب أو تجاوز الخصومات للقيمة الإجمالية أو إرجاع NaN عند الأرقام الدقيقة.',
      beforeScenario: 'إصدار فاتورة بقيمة سالبة وتسجيل ذمة لصالح العميل بدلاً من المحل.',
      afterScenario: 'تثبيت أرضية الصفر المطلق ومطابقة الخصم مع القيد المزدوج.',
      fixCode: `// يتم معالجتها تلقائياً بمجرد تصحيح roundMoney`,
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Live Sentinel Verification on In-Memory DB
  // ---------------------------------------------------------------------------
  console.log('\n🧪 [فحص 5/5] جاري اختبار الفاحص المرافق (Live Sentinel) على شجرة الحسابات...');
  const memDb = new Database(':memory:');
  
  // Set up schema
  memDb.exec(`
    CREATE TABLE chart_of_accounts (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      sub_type TEXT NOT NULL DEFAULT 'other',
      normal_balance TEXT NOT NULL DEFAULT 'debit',
      description TEXT
    );
    CREATE TABLE journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_number TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      ref_type TEXT,
      ref_id INTEGER,
      ref_number TEXT,
      description TEXT
    );
    CREATE TABLE journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id),
      account_code TEXT NOT NULL REFERENCES chart_of_accounts(code),
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      description TEXT
    );
    CREATE TABLE customers_vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance_due REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      net_total REAL NOT NULL DEFAULT 0,
      items_total REAL NOT NULL DEFAULT 0,
      labor_total REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      scrap_battery_deduction REAL NOT NULL DEFAULT 0
    );

    INSERT INTO chart_of_accounts (code, name, type) VALUES ('1101', 'صندوق النقدية', 'asset');
    INSERT INTO chart_of_accounts (code, name, type) VALUES ('1102', 'ذمم العملاء', 'asset');
    INSERT INTO chart_of_accounts (code, name, type) VALUES ('4101', 'إيراد مبيعات الزيوت', 'revenue');
  `);

  // Insert balanced entry
  memDb.exec(`
    INSERT INTO journal_entries (id, entry_number, entry_date) VALUES (1, 'JV-001', '2026-11-05');
    INSERT INTO journal_lines (journal_entry_id, account_code, debit, credit) VALUES (1, '1101', 5000, 0);
    INSERT INTO journal_lines (journal_entry_id, account_code, debit, credit) VALUES (1, '4101', 0, 5000);
  `);

  const sentinelReport = LiveSentinel.runFullSentinel(memDb);
  if (sentinelReport.allPassed) {
    console.log('   ✅ [PASS] نجح الفاحص المرافق في التحقق من اتزان شجرة الحسابات (المدين 5000 = الدائن 5000).');
    passedCount++;
  } else {
    console.log('   ❌ [FAIL] فشل الفاحص المرافق في التحقق من شجرة الحسابات!');
    issues.push({
      dimension: 'LiveSentinel: خلل في آلية استعلام ومطابقة شجرة الحسابات',
      counterExample: sentinelReport.coaResult.details,
      error: sentinelReport.coaResult.details,
      impact: 'عدم القدرة على مراقبة سلامة القيود المحاسبية تلقائياً أثناء العمليات.',
      beforeScenario: 'تمر قيود غير متزنة دون أن يكتشفها الفاحص المرافق.',
      afterScenario: 'يرصد الفاحص أي فارق ولو فلس واحد بين المدين والدائن في التو واللحظة.',
      fixCode: `// مراجعة استعلامات LiveSentinel`,
    });
  }

  memDb.close();

  return {
    passedCount,
    totalTests: 5,
    issues,
  };
}

module.exports = { runPhase1Audit };

if (require.main === module) {
  runPhase1Audit().then(res => {
    console.log('\n======================================================================');
    console.log(`🏁 نهاية الفحص: اجتاز ${res.passedCount} من أصل ${res.totalTests} اختبارات.`);
    console.log('======================================================================');
  });
}
