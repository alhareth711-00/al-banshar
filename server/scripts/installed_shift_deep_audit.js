const path = require('path');
const fs = require('fs');

// Target installed client database
const appData = process.env.APPDATA;
const installedDbPath = path.join(appData, 'AlBanshar', 'db', 'quick_lube.db');
if (!fs.existsSync(installedDbPath)) {
  console.error('[FAIL] Installed DB does not exist at:', installedDbPath);
  process.exit(1);
}

process.env.DB_PATH = installedDbPath;

const Database = require('better-sqlite3');
const db = require('../db/database');
const shiftModel = require('../models/shiftModel');
const invoiceModel = require('../models/invoiceModel');
const { roundMoney, safeNum } = require('../utils/mathPrecision');

const AUDIT_RESULTS = {
  timestamp: new Date().toISOString(),
  db_path: installedDbPath,
  scenarios: [],
  guards: [],
  critical_issues: [],
  warnings: [],
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

async function runShiftDeepAudit() {
  logHeader('بدء الفحص المعملي العميق لدورة الورديات وجرد الصندوق ومطابقة العجز والفائض');
  console.log('المسار المفحوص:', installedDbPath);

  // -------------------------------------------------------------
  // STEP 0: Clean any previous lab shifts idempotently
  // -------------------------------------------------------------
  logHeader('الخطوة 0: تهيئة بيئة الفحص وتنظيف الورديات المعملية السابقة');
  
  // Close any open shifts
  db.prepare("UPDATE cash_shifts SET status = 'closed', closed_at = datetime('now', 'localtime') WHERE status = 'open'").run();

  const testShifts = db.prepare(`
    SELECT id, shift_code FROM cash_shifts 
    WHERE notes LIKE '%فحص معملي%' 
       OR shift_code LIKE '%LAB%' 
       OR cashier_name LIKE '%معملي%'
  `).all();
  for (const s of testShifts) {
    // Delete settlement journal entries
    const jes = db.prepare("SELECT id FROM journal_entries WHERE description LIKE ?").all(`%${s.shift_code}%`);
    for (const je of jes) {
      db.prepare("DELETE FROM journal_lines WHERE journal_entry_id = ?").run(je.id);
      db.prepare("DELETE FROM journal_entries WHERE id = ?").run(je.id);
    }
    // Unlink invoices (respecting MOD-GAPLESS trigger: invoices cannot be deleted)
    db.prepare("UPDATE invoices SET shift_id = NULL WHERE shift_id = ?").run(s.id);
    db.prepare("DELETE FROM cash_shifts WHERE id = ?").run(s.id);
  }
  console.log('  ✅ تم تصفير الورديات السابقة وتنظيف القيود المرتبطة بنجاح');

  const createdShiftIds = [];

  // -------------------------------------------------------------
  // SCENARIO 1: Shift Lifecycle with Exact Cash Match (Zero Variance)
  // -------------------------------------------------------------
  logHeader('السيناريو 1: دورة الوردية المتوازنة ذات المطابقة التامة (عجز/فائض = 0)');
  const shift1 = shiftModel.openShift({
    worker_id: 1,
    cashier_name: 'كاشير الفحص المتطابق',
    opening_cash: 20000,
    notes: 'وردية فحص معملي - سيناريو 1 مطابقة تامة',
  });
  createdShiftIds.push(shift1.id);
  assert(Boolean(shift1 && shift1.id), 'تم فتح الوردية الأولى بنجاح: ' + shift1.shift_code);
  assert(shift1.status === 'open', 'حالة الوردية: مفتوحة (open)');
  assert(shift1.opening_cash === 20000, 'الرصيد الافتتاحي للوردية: 20,000 ر.ي');

  // Issue cash sales invoice linked to Shift 1
  const inv1 = invoiceModel.create({
    vehicle_id: 1, // عميل عابر نقدي
    payment_method: 'cash',
    shift_id: shift1.id,
    items: [
      {
        item_type: 'service',
        description: 'وزن أذرعة وترصيص ليزر',
        qty: 1,
        unit_price: 5000,
      }
    ],
    notes: 'فاتورة نقدية تابعة لوردية 1',
    client_token: `shift1_sale_${Date.now()}`,
  });
  assert(Boolean(inv1 && inv1.id), 'تم تسجيل فاتورة مبيعات نقدية بقيمة 5,000 ر.ي');

  // Verify shift live status reflects expected cash = opening (20,000) + sale (5,000) = 25,000
  const liveStats1 = shiftModel.getCurrentShift();
  assert(liveStats1.has_active_shift === true, 'يوجد وردية نشطة حالياً');
  const expectedCash1 = liveStats1.shift.metrics.expected_cash;
  assert(expectedCash1 === 25000, `تم احتساب النقدية المتوقعة بالصندوق بدقة: ${expectedCash1} ر.ي (20,000 افتتاح + 5,000 مبيعات)`);

  // Close Shift with exact cash count (25,000 YER)
  const closeRes1 = shiftModel.closeShift({
    shift_id: shift1.id,
    actual_cash: 25000,
    handed_over_to: 'فني الفترة المسائية',
    notes: 'إغلاق معملي متطابق تماماً بدون أي فروقات',
  });

  const closedShift1 = db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(shift1.id);
  assert(closedShift1.status === 'closed', 'تم إغلاق الوردية الأولى بنجاح');
  assert(closedShift1.difference === 0, 'الفارق النقدي مطابق بنسبة 100% (Difference = 0)');
  assert(Boolean(closedShift1.closed_at), 'تم توثيق وقت إغلاق الوردية: ' + closedShift1.closed_at);

  // Verify no unnecessary variance JVs were created
  const varJv1 = db.prepare("SELECT * FROM journal_entries WHERE description LIKE ?").all(`%${shift1.shift_code}%`);
  assert(varJv1.length === 0, 'لم يتم توليد أي قيود تسوية عجز أو فائض لعدم وجود فروقات (نظافة السجلات)');
  AUDIT_RESULTS.scenarios.push({ name: 'وردية مطابقة تامة بدون فروقات', status: 'PASS', shift_code: shift1.shift_code });

  // -------------------------------------------------------------
  // SCENARIO 2: Cash Shortage / Deficit Settlement (عجز عهدة الصندوق)
  // -------------------------------------------------------------
  logHeader('السيناريو 2: إغلاق وردية بها عجز نقدي وتسوية دفتر الأستاذ (Account 6110 Deficit)');
  const shift2 = shiftModel.openShift({
    worker_id: 1,
    cashier_name: 'كاشير الفحص - حالة عجز',
    opening_cash: 30000,
    notes: 'وردية فحص معملي - سيناريو 2 عجز نقدي',
  });
  createdShiftIds.push(shift2.id);
  assert(Boolean(shift2 && shift2.id), 'تم فتح الوردية الثانية: ' + shift2.shift_code);

  // Cash sale of 10,000 YER
  const inv2 = invoiceModel.create({
    vehicle_id: 1,
    payment_method: 'cash',
    shift_id: shift2.id,
    items: [{ item_type: 'service', description: 'تغيير بواجي وتنظيف بخاخات', qty: 1, unit_price: 10000 }],
    notes: 'فاتورة نقدية تابعة لوردية 2',
    client_token: `shift2_sale_${Date.now()}`,
  });
  assert(Boolean(inv2 && inv2.id), 'تم إصدار فاتورة بقيمة 10,000 ر.ي (المتوقع بالصندوق: 40,000 ر.ي)');

  // Cashier counted actual cash = 38,000 YER (Deficit of 2,000 YER)
  const closeRes2 = shiftModel.closeShift({
    shift_id: shift2.id,
    actual_cash: 38000,
    handed_over_to: 'المشرف العام',
    notes: 'إغلاق مع عجز قدره 2000 ر.ي',
  });

  const closedShift2 = db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(shift2.id);
  assert(closedShift2.status === 'closed', 'تم إغلاق الوردية');
  assert(closedShift2.difference === -2000, `تم رصد العجز المالي بدقة: ${closedShift2.difference} ر.ي`);

  // Verify Automated Shortage Settlement Journal Entry (Debit 6110, Credit 1101)
  const shortageJv = db.prepare("SELECT * FROM journal_entries WHERE ref_type = 'expense' AND ref_id = ?").get(shift2.id);
  assert(Boolean(shortageJv), 'تم إنشاء قيد التسوية المحاسبية الآلية لعجز الصندوق: ' + shortageJv?.entry_number);
  assert(shortageJv.is_balanced === 1, `توازن قيد العجز: مدين ${shortageJv.total_debit} = دائن ${shortageJv.total_credit}`);
  assert(shortageJv.total_debit === 2000, 'مبلغ القيد مطابق تماماً للعجز: 2,000 ر.ي');

  const shortageLines = db.prepare("SELECT * FROM journal_lines WHERE journal_entry_id = ?").all(shortageJv.id);
  const debitLine6110 = shortageLines.find(l => l.account_code === '6110');
  const creditLine1101 = shortageLines.find(l => l.account_code === '1101');
  assert(Boolean(debitLine6110 && debitLine6110.debit === 2000), 'تم تحميل العجز كمصروف تشغيلي (حساب 6110: عجز وفروقات الصندوق)');
  assert(Boolean(creditLine1101 && creditLine1101.credit === 2000), 'تم تخفيض رصيد الصندوق النقدي (حساب 1101) بمقدار 2,000 ر.ي لمطابقة الواقع الفعلي في الخزينة');
  AUDIT_RESULTS.scenarios.push({ name: 'إغلاق وردية بها عجز وتسوية القيود', status: 'PASS', shift_code: shift2.shift_code });

  // -------------------------------------------------------------
  // SCENARIO 3: Cash Surplus Settlement (فائض عهدة الصندوق)
  // -------------------------------------------------------------
  logHeader('السيناريو 3: إغلاق وردية بها فائض نقدي وتسوية الإيرادات (Account 4303 Surplus)');
  const shift3 = shiftModel.openShift({
    worker_id: 1,
    cashier_name: 'كاشير الفحص - حالة فائض',
    opening_cash: 25000,
    notes: 'وردية فحص معملي - سيناريو 3 فائض نقدي',
  });
  createdShiftIds.push(shift3.id);
  assert(Boolean(shift3 && shift3.id), 'تم فتح الوردية الثالثة: ' + shift3.shift_code);

  // Cash sale of 5,000 YER
  const inv3 = invoiceModel.create({
    vehicle_id: 1,
    payment_method: 'cash',
    shift_id: shift3.id,
    items: [{ item_type: 'service', description: 'تشحيم صلايب وبنشر', qty: 1, unit_price: 5000 }],
    notes: 'فاتورة نقدية تابعة لوردية 3',
    client_token: `shift3_sale_${Date.now()}`,
  });
  assert(Boolean(inv3 && inv3.id), 'تم إصدار فاتورة بقيمة 5,000 ر.ي (المتوقع: 30,000 ر.ي)');

  // Cashier found actual cash = 31,500 YER (Surplus of 1,500 YER)
  const closeRes3 = shiftModel.closeShift({
    shift_id: shift3.id,
    actual_cash: 31500,
    handed_over_to: 'المشرف العام',
    notes: 'إغلاق مع فائض قدره 1500 ر.ي',
  });

  const closedShift3 = db.prepare('SELECT * FROM cash_shifts WHERE id = ?').get(shift3.id);
  assert(closedShift3.status === 'closed', 'تم إغلاق الوردية');
  assert(closedShift3.difference === 1500, `تم رصد الفائض المالي بدقة: +${closedShift3.difference} ر.ي`);

  // Verify Automated Surplus Settlement Journal Entry (Debit 1101, Credit 4303)
  const surplusJv = db.prepare("SELECT * FROM journal_entries WHERE ref_type = 'closing_entry' AND ref_id = ?").get(shift3.id);
  assert(Boolean(surplusJv), 'تم إنشاء قيد التسوية المحاسبية الآلية لفائض الصندوق: ' + surplusJv?.entry_number);
  assert(surplusJv.is_balanced === 1, `توازن قيد الفائض: مدين ${surplusJv.total_debit} = دائن ${surplusJv.total_credit}`);
  assert(surplusJv.total_debit === 1500, 'مبلغ القيد مطابق تماماً للفائض: 1,500 ر.ي');

  const surplusLines = db.prepare("SELECT * FROM journal_lines WHERE journal_entry_id = ?").all(surplusJv.id);
  const debitLineSurplus = surplusLines.find(l => l.account_code === '1101');
  const creditLineSurplus = surplusLines.find(l => l.account_code === '4303');
  assert(Boolean(debitLineSurplus && debitLineSurplus.debit === 1500), 'تم إيداع الزيادة الفعلية في الصندوق النقدي (حساب 1101: 1,500 ر.ي)');
  assert(Boolean(creditLineSurplus && creditLineSurplus.credit === 1500), 'تم قيد الزيادة كإيراد فائض عهدة (حساب 4303) دون تلويث حساب إيراد الخدمات 4201');
  AUDIT_RESULTS.scenarios.push({ name: 'إغلاق وردية بها فائض وتسوية الإيرادات', status: 'PASS', shift_code: shift3.shift_code });

  // -------------------------------------------------------------
  // SCENARIO 4: Closed Shift Invoice Freezing Invariant (درع تجميد الفواتير)
  // -------------------------------------------------------------
  logHeader('السيناريو 4: درع تجميد فواتير الورديات المغلقة (Shift Freezing Invariant)');
  // Attempt to void inv1 which belongs to Shift 1 (which is CLOSED) without manager override
  let unauthorizedVoidBlocked = false;
  try {
    invoiceModel.voidInvoice(inv1.id, 'محاولة إلغاء فاتورة وردية مقفلة بدون إذن');
  } catch (err) {
    unauthorizedVoidBlocked = true;
    console.log(`  🛡️ تم التصدي بنجاح لمحاولة التلاعب بفاتورة وردية مقفلة: "${err.message}"`);
  }
  assert(unauthorizedVoidBlocked, 'درع الحماية منع إلغاء فاتورة وردية مغلقة ومرحلة حسابياً بدون إذن الإدارة');

  // Authorize with manager override
  const authorizedVoid = invoiceModel.voidInvoice(inv1.id, 'إلغاء معتمد من الإدارة العليا', { manager_override: true });
  assert(authorizedVoid.is_voided === 1, 'تم السماح بالإلغاء فقط عند تمرير صلاحية المدير الإداري (Manager Override)');
  AUDIT_RESULTS.scenarios.push({ name: 'درع تجميد فواتير الورديات المغلقة', status: 'PASS' });

  // -------------------------------------------------------------
  // STEP 5: Safeguards & Concurrency Guards
  // -------------------------------------------------------------
  logHeader('الخطوة 5: فحص دروع الحماية والتزامن للورديات');

  // Guard 1: Dual Open Shift Prevention (Poka-Yoke)
  // Open one shift
  const testShift = shiftModel.openShift({ opening_cash: 10000, cashier_name: 'كاشير تجربة 1', notes: 'فحص معملي مؤقت' });
  createdShiftIds.push(testShift.id);

  let dualOpenBlocked = false;
  try {
    shiftModel.openShift({ opening_cash: 15000, cashier_name: 'كاشير تجربة 2', notes: 'محاولة فتح وردية ثانية' });
  } catch (err) {
    dualOpenBlocked = true;
    console.log(`  🛡️ تم منع فتح ورديتين مفتوحتين في نفس الوقت: "${err.message}"`);
  }
  assert(dualOpenBlocked, 'درع Poka-Yoke منع وجود أكثر من وردية نشطة متزامنة');
  AUDIT_RESULTS.guards.push({ name: 'منع فتح ورديتين متزامنتين', status: 'PASS' });

  // Guard 2: Re-closing Already Closed Shift
  // Close the open test shift first
  shiftModel.closeShift({ shift_id: testShift.id, actual_cash: 10000 });

  let recloseBlocked = false;
  try {
    shiftModel.closeShift({ shift_id: testShift.id, actual_cash: 10000 });
  } catch (err) {
    recloseBlocked = true;
    console.log(`  🛡️ تم منع إعادة إغلاق وردية مغلقة بالفعل: "${err.message}"`);
  }
  assert(recloseBlocked, 'درع الحالة منع تكرار إغلاق وردية مغلقة مسبقاً');
  AUDIT_RESULTS.guards.push({ name: 'منع تكرار إغلاق الوردية المغلقة', status: 'PASS' });

  console.log('\n📝 أرقام معرفات الورديات المنشأة للفحص المعملي:', createdShiftIds);

  return {
    success: true,
    createdShiftIds,
  };
}

runShiftDeepAudit()
  .then(res => {
    console.log('\n============================================================');
    console.log('🎉 اكتمل الفحص المعملي العميق لدورة الورديات والصندوق بنجاح 100%!');
    console.log('============================================================');

    fs.writeFileSync(
      path.join(__dirname, 'last_shift_audit_result.json'),
      JSON.stringify({ ...AUDIT_RESULTS, meta: res }, null, 2),
      'utf8'
    );
  })
  .catch(err => {
    console.error('\n💥 فشل في الفحص:', err.message);
    process.exit(1);
  });
