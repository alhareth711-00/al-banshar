/**
 * AL-BANSHAR PRO — Phase 6: Fiscal Year-End Closing & Retained Earnings Audit Suite
 * 
 * Verifies 5 Critical Fiscal & Accounting Dimensions:
 * 1. Nominal Accounts Zeroing (4xxx Revenues, 5xxx COGS, 6xxx Expenses reset to 0.00)
 * 2. Mathematical Exactness of Net Profit/Loss Transfer into Account 3201 (Retained Earnings)
 * 3. Closed Year Period Lock & Anti-Retroactive Backdating Guard
 * 4. Reversible Reopen Audit Trail & Balance Restoration
 * 5. Live Sentinel Interlocking: Post-Closing COA Double-Entry Balance
 */

const fs = require('fs');
const path = require('path');
const fc = require('fast-check');
const Database = require('better-sqlite3');
const db = require('../../db/database');
const fiscalClosingEngine = require('../../utils/fiscalClosingEngine');
const LiveSentinel = require('../sentinels/liveSentinel');
const { roundMoney } = require('../../utils/mathPrecision');
const { createJournalEntry } = require('../../utils/accountingEngine');

async function runPhase6Audit() {
  console.log('\n======================================================================');
  console.log('⚡  المرحلة 6: الإغلاق السنوي وترحيل الأرباح والخسائر (Fiscal Year-End Closing)');
  console.log('⚡  اختبار تصفير الحسابات الاسمية، ترحيل 3201، وتجميد الفترات المقفلة');
  console.log('======================================================================\n');

  const issues = [];
  let passedCount = 0;

  // Setup isolated temporary test database
  const sandboxDir = path.join(__dirname, '../../db/test_phase6_sandbox');
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }

  const testDbPath = path.join(sandboxDir, 'quick_lube_phase6.db');
  const mainDbPath = path.join(__dirname, '../../db/quick_lube.db');

  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {}

  if (fs.existsSync(mainDbPath)) {
    fs.copyFileSync(mainDbPath, testDbPath);
  }

  // Connect to isolated test database
  db.reconnect(testDbPath);

  try {
    const testYear = 2025;

    // Seed test year with balanced journal entries
    // 1. Revenue entry: Cash Drawer (1101) Debit 100,000 | Sales Revenue (4101) Credit 100,000
    createJournalEntry(db, {
      entry_date: `${testYear}-05-15`,
      ref_type: 'invoice',
      ref_id: 9901,
      ref_number: 'INV-TEST-2025-1',
      description: 'مبيعات زيوت تجريبية لعام 2025',
      lines: [
        { account_code: '1101', debit: 100000, credit: 0, description: 'تحصيل نقدية' },
        { account_code: '4101', debit: 0, credit: 100000, description: 'إيراد مبيعات' },
      ],
    });

    // 2. COGS entry: COGS (5101) Debit 60,000 | Inventory (1301) Credit 60,000
    createJournalEntry(db, {
      entry_date: `${testYear}-05-15`,
      ref_type: 'invoice',
      ref_id: 9901,
      ref_number: 'COGS-TEST-2025-1',
      description: 'تكلفة بضاعة مباعة لعام 2025',
      lines: [
        { account_code: '5101', debit: 60000, credit: 0, description: 'تكلفة بضاعة' },
        { account_code: '1301', debit: 0, credit: 60000, description: 'صرف من المخزون' },
      ],
    });

    // 3. Operating Expense entry: Rent Expense (6101) Debit 15,000 | Cash Drawer (1101) Credit 15,000
    createJournalEntry(db, {
      entry_date: `${testYear}-06-01`,
      ref_type: 'expense',
      ref_id: 9902,
      ref_number: 'EXP-TEST-2025-1',
      description: 'مصروف إيجار لعام 2025',
      lines: [
        { account_code: '6101', debit: 15000, credit: 0, description: 'إيجار المركز' },
        { account_code: '1101', debit: 0, credit: 15000, description: 'صرف نقدية' },
      ],
    });

    // Expected Net Profit for 2025: 100,000 - 60,000 - 15,000 = 25,000 YER

    // -------------------------------------------------------------------------
    // TEST 1: Preview Calculation & Mathematical Truth
    // -------------------------------------------------------------------------
    console.log('🔍 [فحص 1/5] جاري اختبار معاينة الإغلاق السنوي واحتساب صافي الأرباح...');
    const preview = fiscalClosingEngine.previewFiscalClosing(db, testYear);

    const expectedProfit = 25000;
    if (
      preview.totalRevenues === 100000 &&
      preview.totalCOGS === 60000 &&
      preview.totalExpenses === 15000 &&
      preview.netProfit === expectedProfit &&
      preview.isProfit === true
    ) {
      console.log(`   ✅ [PASS] معادلات المعاينة دقيقة 100%: إيرادات (100,000)، تكلفة (60,000)، مصروفات (15,000)، صافي أرباح (+${preview.netProfit.toLocaleString()} ر.ي).`);
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] خطأ في حسابات معاينة الإغلاق السنوي!');
      issues.push({
        dimension: 'Fiscal Preview: عدم دقة احتساب صافي الأرباح',
        counterExample: JSON.stringify(preview),
        error: `صافي الربح المتوقع 25,000 ولكن المحسوب ${preview.netProfit}`,
        impact: 'ترحيل أرقام أرباح خاطئة لحساب الأرباح والخسائر المدورة وتشويه ميزانية المركز.',
        beforeScenario: 'ترحيل مبالغ غير مطابقة للواقع الفعلي.',
        afterScenario: 'احتساب دقيق مطابق للمعايير المحاسبية المعتمدة.',
        fixCode: `// fiscalClosingEngine.js: مراجعة دوال التجميع`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Execution of Closing & Zeroing Out Nominal Accounts
    // -------------------------------------------------------------------------
    console.log('\n🔒 [فحص 2/5] جاري تنفيذ قيد الإغلاق السنوي وتصفير الحسابات الاسمية (Nominal Accounts Zeroing)...');

    // Get 3201 balance before closing
    const pre3201 = db.prepare(`
      SELECT COALESCE(SUM(credit - debit), 0) as bal 
      FROM journal_lines 
      WHERE account_code = '3201'
    `).get().bal;

    const closingResult = fiscalClosingEngine.executeFiscalClosing(db, {
      year: testYear,
      closedBy: 'مدير النظام',
      notes: 'إغلاق سنوي رسمي خاضع للفحص',
    });

    // Check balances of 4101, 5101, 6101 as of end of testYear
    const postNominalBalances = db.prepare(`
      SELECT 
        coa.code,
        COALESCE(SUM(jel.debit - jel.credit), 0) as net_debit_balance
      FROM chart_of_accounts coa
      JOIN journal_lines jel ON jel.account_code = coa.code
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE (coa.code LIKE '4%' OR coa.code LIKE '5%' OR coa.code LIKE '6%')
        AND je.entry_date >= '${testYear}-01-01' AND je.entry_date <= '${testYear}-12-31'
      GROUP BY coa.code
    `).all();

    const allZeroed = postNominalBalances.every(b => Math.abs(b.net_debit_balance) < 0.001);

    // Check 3201 balance after closing
    const post3201 = db.prepare(`
      SELECT COALESCE(SUM(credit - debit), 0) as bal 
      FROM journal_lines 
      WHERE account_code = '3201'
    `).get().bal;

    const transferredExact = roundMoney(post3201 - pre3201) === expectedProfit;

    if (closingResult.success && allZeroed && transferredExact) {
      console.log(`   ✅ [PASS] تصفير تام لجميع حسابات الإيرادات والمصروفات للسنة (${testYear})، وحساب (3201) زاد بدقة بمقدار (+${expectedProfit.toLocaleString()} ر.ي).`);
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] لم يتم تصفير الحسابات الاسمية بالكامل أو اختل ترحيل الأرباح!');
      issues.push({
        dimension: 'Nominal Accounts Zeroing: بقاء أرصدة مفتوحة بعد قيد الإغلاق',
        counterExample: JSON.stringify({ postNominalBalances, pre3201, post3201 }),
        error: 'الحسابات لم تصفر إلى 0.00 بعد الإغلاق',
        impact: 'تكرار احتساب إيرادات ومصروفات العام الماضي في ميزانية العام الجديد وظهور أرباح مضاعفة وهمية.',
        beforeScenario: 'العام الجديد يبدأ بإيرادات العام السابق مدمجة معه.',
        afterScenario: 'تصفير الحسابات الاسمية تماماً لتبدأ السنة الجديدة برصيد صفر للإيرادات والمصروفات.',
        fixCode: `// fiscalClosingEngine.js: إنشاء قيد الإغلاق التصفيري العكسي`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 3: Closed Period Lock & Backdating Guard
    // -------------------------------------------------------------------------
    console.log('\n🛡️ [فحص 3/5] جاري اختبار صمام تجميد السنة المقفلة ومنع التعديل بأثر رجعي...');

    let doubleClosingBlocked = false;
    try {
      fiscalClosingEngine.executeFiscalClosing(db, { year: testYear });
    } catch (e) {
      if (e.message.includes('مقفلة مسبقاً')) {
        doubleClosingBlocked = true;
      }
    }

    const backdatedDateBlocked = fiscalClosingEngine.isDateInClosedYear(db, `${testYear}-08-20`);
    const futureDateAllowed = !fiscalClosingEngine.isDateInClosedYear(db, `${testYear + 1}-01-15`);

    if (doubleClosingBlocked && backdatedDateBlocked && futureDateAllowed) {
      console.log(`   ✅ [PASS] السنة المقفلة محصنة 100%: تم حظر التكرار ومنع إدراج معاملات بأثر رجعي في سنة ${testYear}.`);
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] غياب صمام تجميد الفترات المقفلة!');
      issues.push({
        dimension: 'Period Lock: إمكانية تكرار الإغلاق أو إدراج فواتير بأثر رجعي بعد الإغلاق',
        counterExample: `doubleClosingBlocked: ${doubleClosingBlocked}, backdatedDateBlocked: ${backdatedDateBlocked}`,
        error: 'عدم تجميد السنة المالية المقفلة',
        impact: 'إمكانية إدراج فواتير أو سندات قديمة في سنوات مقفلة ومراجعة ضريبياً مما يؤدي لخلل محاسبي قانوني.',
        beforeScenario: 'إمكانية تسجيل فاتورة بتاريخ قديم في سنة مقفلة.',
        afterScenario: 'حظر كامل لأي عملية بتاريخ سنة مقفلة إلا بعد فتح رسمي معتمد من الإدارة.',
        fixCode: `// fiscalClosingEngine.isDateInClosedYear`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Reversible Reopen Audit Trail & Balance Restoration
    // -------------------------------------------------------------------------
    console.log('\n🔄 [فحص 4/5] جاري اختبار إلغاء الإغلاق الاستثنائي وإعادة فتح القيود (Reopen Audit)...');

    const reopenRes = fiscalClosingEngine.reopenFiscalYear(db, {
      year: testYear,
      reopenedBy: 'المحاسب القانوني',
      reason: 'مراجعة قيود تدقيق استثنائية',
    });

    const statusAfterReopen = fiscalClosingEngine.getFiscalYearStatus(db, testYear);
    const balance3201AfterReopen = db.prepare(`
      SELECT COALESCE(SUM(credit - debit), 0) as bal 
      FROM journal_lines 
      WHERE account_code = '3201'
    `).get().bal;

    if (
      reopenRes.success &&
      statusAfterReopen.is_closed === 0 &&
      roundMoney(balance3201AfterReopen) === roundMoney(pre3201)
    ) {
      console.log(`   ✅ [PASS] إلغاء الإغلاق آمن وقانوني: عاد حساب (3201) لرصيده الأصلي بدقة، وألغي قيد الإغلاق دون أي أثر تالف.`);
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] فشل التراجع الآمن عن الإغلاق السنوي!');
      issues.push({
        dimension: 'Reopen Audit: عدم عودة الأرصدة لوضعها الصحيح بعد إلغاء الإغلاق',
        counterExample: JSON.stringify({ reopenRes, statusAfterReopen, balance3201AfterReopen }),
        error: 'خلل في استعادة الأرصدة الأصلية',
        impact: 'صعوبة تصحيح الأخطاء المحاسبية في حال اضطرت الورشة لمراجعة قيد قديم قبل الاعتماد النهائي.',
        beforeScenario: 'إلغاء الإغلاق يترك قيوداً تائهة أو يكرر الحسابات.',
        afterScenario: 'إلغاء نظيف يمسح قيد الإغلاق ويعيد الحسابات لحالتها الأصلية بدقة 100%.',
        fixCode: `// fiscalClosingEngine.reopenFiscalYear`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Live Sentinel Real-Time Accounting Verification Post-Closing
    // -------------------------------------------------------------------------
    console.log('\n📊 [فحص 5/5] جاري تشغيل الفاحص المرافق (Live Sentinel) للتحقق من شجرة الحسابات...');

    // Re-execute closing to verify final state balance
    fiscalClosingEngine.executeFiscalClosing(db, {
      year: testYear,
      closedBy: 'مدير النظام - اعتماد نهائي',
    });

    const sentinelReport = LiveSentinel.runFullSentinel(db);
    if (sentinelReport.allPassed) {
      console.log(`   ✅ [PASS] ${sentinelReport.coaResult.details}`);
      passedCount++;
    } else {
      console.log(`   ❌ [FAIL] رصد الفاحص المرافق اختلالاً في الحسابات: ${sentinelReport.coaResult.details}`);
      issues.push({
        dimension: 'Live Sentinel: اختلال ميزان الحسابات بعد الإغلاق السنوي',
        counterExample: sentinelReport.coaResult.details,
        error: sentinelReport.coaResult.details,
        impact: 'اختلال القيد المزدوج بعد الإغلاق السنوي.',
        beforeScenario: 'ميزان المراجعة غير متطابق بعد الإغلاق.',
        afterScenario: 'تطابق تام حتى آخر فلس (المدين = الدائن).',
        fixCode: `// مراجعة القيد المزدوج للإغلاق`,
      });
    }

  } finally {
    // Cleanup temporary test database
    try {
      db.reconnect(mainDbPath);
      if (fs.existsSync(sandboxDir)) {
        fs.rmSync(sandboxDir, { recursive: true, force: true });
      }
    } catch (e) {}
  }

  return {
    passedCount,
    totalTests: 5,
    issues,
  };
}

module.exports = { runPhase6Audit };

if (require.main === module) {
  runPhase6Audit().then(res => {
    console.log('\n======================================================================');
    console.log(`🏁 نهاية فحص المرحلة 6: اجتاز ${res.passedCount} من أصل ${res.totalTests} اختبارات.`);
    console.log('======================================================================');
  });
}
