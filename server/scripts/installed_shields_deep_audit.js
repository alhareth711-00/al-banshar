const path = require('path');
const fs = require('fs');

// Target installed client database
const appData = process.env.APPDATA;
const installedDbPath = path.join(appData, 'AlBanshar', 'db', 'quick_lube.db');
const backupsDir = path.join(appData, 'AlBanshar', 'backups');

if (!fs.existsSync(installedDbPath)) {
  console.error('[FAIL] Installed DB does not exist at:', installedDbPath);
  process.exit(1);
}

process.env.DB_PATH = installedDbPath;
process.env.BACKUPS_DIR = backupsDir;

const Database = require('better-sqlite3');
const db = require('../db/database');
const { validateSystemClock, getLatestSystemTimestamp } = require('../utils/helpers');
const backupEngine = require('../utils/backupEngine');
const { getMachineId } = require('../utils/machineId');
const { createLicenseKey, verifyLicenseKey, checkClockTampering, getLicenseStatus } = require('../utils/licenseEngine');

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

async function runShieldsDeepAudit() {
  logHeader('بدء الفحص المعملي العميق لدروع حماية النظام والوقت والنسخ والترخيص');
  console.log('قاعدة البيانات المفحوصة:', installedDbPath);
  console.log('مجلد النسخ الاحتياطية المفحوص:', backupsDir);

  // -------------------------------------------------------------
  // SHIELD 1: Anti-Clock Tampering & Chrono-Guard
  // -------------------------------------------------------------
  logHeader('الدرع 1: محرك حماية الوقت وكشف التراجع الزمني (Anti-Clock Rollback)');
  const latestTs = getLatestSystemTimestamp(db);
  console.log(`  🕒 آخر حركة موثقة رسمياً في النظام: ${latestTs || 'لا توجد حركات سابقة'}`);

  // 1.1 Normal Clock Verification
  const normalCheck = validateSystemClock(db);
  assert(normalCheck === true, 'فحص الساعة بالوقت الطبيعي يعمل بنجاح وبدون أي اعتراض');

  // 1.2 Simulate Clock Rollback (Past Timestamp)
  let rollbackBlocked = false;
  const fakePastTime = '2025-01-01 10:00:00'; // تراجع زمني لسنة سابقة
  try {
    validateSystemClock(db, fakePastTime);
  } catch (err) {
    rollbackBlocked = true;
    console.log(`  🛡️ تم التصدي لمحاولة تأخير ساعة الجهاز بنجاح: "${err.message}"`);
  }
  assert(rollbackBlocked, 'درع Chrono-Guard منع تمرير عملية بتاريخ متراجع للوراء');

  // 1.3 Verify Audit Incident was logged into financial_audit_logs
  const auditIncident = db.prepare(`
    SELECT * FROM financial_audit_logs 
    WHERE action = 'CHRONO_ROLLBACK_ATTEMPT_BLOCKED' 
    ORDER BY id DESC LIMIT 1
  `).get();
  assert(Boolean(auditIncident), 'تم توثيق محاولة التلاعب بالساعة في سجل الرقابة الجنائية والمالية (financial_audit_logs)');
  console.log(`  📋 تفاصيل السجل الأمني الموثق: ${auditIncident.new_data}`);

  // 1.4 Test License Engine Clock Tampering Check
  const licenseTamperCheck = checkClockTampering(db, latestTs);
  assert(licenseTamperCheck.tampered === false, 'محرك التراخيص يؤكد سلامة الوقت الحالي للجهاز وعدم تراجعه');
  AUDIT_RESULTS.scenarios.push({ name: 'درع حماية تراجع الوقت وساعة ويندوز', status: 'PASS' });

  // -------------------------------------------------------------
  // SHIELD 2: Database Integrity & Instant Backup / Restore Guard
  // -------------------------------------------------------------
  logHeader('الدرع 2: سلامة قاعدة البيانات والنسخ الاحتياطي السريع والحماية من التلف');

  // 2.1 SQLite Internal PRAGMA Integrity Check
  const integrity = backupEngine.checkDatabaseIntegrity();
  assert(integrity.success === true, 'فحص PRAGMA integrity_check الداخلي مكتمل بنجاح');
  assert(integrity.integrity_status === 'healthy', 'حالة قاعدة البيانات: سليمة ومحكمة 100% (Healthy)');
  console.log(`  📊 إحصائيات السجلات المحمية في قاعدة البيانات:`, integrity.counts);

  // 2.2 Create Instant Verified Backup (VACUUM INTO)
  const backupRes = backupEngine.createManualBackup('audit_shield_test');
  assert(backupRes.success === true, 'تم إنشاء نسخة احتياطية فورية باستخدام محرك VACUUM الآمن: ' + backupRes.filename);
  assert(fs.existsSync(backupRes.filePath), 'ملف النسخة الاحتياطية تم حفظه بنجاح على القرص الصلب');
  assert(backupRes.size_bytes >= 4096, `حجم النسخة الاحتياطية سليم: ${backupRes.sizeFormatted} (${backupRes.size_bytes} بايت)`);

  // 2.3 Validate SQLite Magic 16-byte Header Signature
  const valResult = backupEngine.validateBackupFile(backupRes.filePath);
  assert(valResult.valid === true, 'الترويسة التوقيعية الرقمية (SQLite format 3\\0) للنسخة الاحتياطية سليمة ومعتمدة');

  // 2.4 Corrupted / Invalid File Rejection Test
  const fakeCorruptPath = path.join(backupsDir, 'fake_corrupt_test.sqlite');
  fs.writeFileSync(fakeCorruptPath, 'THIS IS NOT AN SQLITE DATABASE FILE DUMMY CONTENT', 'utf8');
  const corruptValidation = backupEngine.validateBackupFile(fakeCorruptPath);
  assert(corruptValidation.valid === false, 'درع الحماية رفض ملف النسخة المزيفة / التالفة فوراً برسالة: ' + corruptValidation.error);
  // Clean fake corrupt file
  fs.unlinkSync(fakeCorruptPath);

  // 2.5 List Backups & Backup Status
  const backupStatus = backupEngine.getBackupStatus();
  assert(backupStatus.hasBackup === true, 'محرك إدارة النسخ يتعرف على النسخ المحفوظة بنجاح');
  assert(backupStatus.totalBackups > 0, `إجمالي النسخ الاحتياطية المتوفرة بالأرشيف: ${backupStatus.totalBackups} نسخة`);
  AUDIT_RESULTS.scenarios.push({ name: 'درع سلامة البيانات والنسخ الاحتياطي السريع', status: 'PASS' });

  // -------------------------------------------------------------
  // SHIELD 3: Machine ID & Cryptographic HMAC-SHA256 License Engine
  // -------------------------------------------------------------
  logHeader('الدرع 3: بصمة الجهاز والترخيص المشفر (HMAC-SHA256 Security)');

  // 3.1 Unique Hardware Machine ID
  const mid = getMachineId();
  assert(Boolean(mid && mid.startsWith('ALB-')), `تم توليد بصمة الجهاز الفريدة بنجاح: ${mid}`);
  assert(mid.split('-').length === 4, 'بصمة الجهاز تتكون من 4 مقاطع قياسية خالية من الحروف الملتبسة');

  // 3.2 Legitimate License Generation & Verification
  const validKey = createLicenseKey({
    machineId: mid,
    type: 'annual',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // ترخيص سنوي
  });
  console.log(`  🔑 مفتاح الترخيص المشفر المولد للجهاز: ${validKey}`);

  const keyVerification = verifyLicenseKey(validKey, mid);
  assert(keyVerification.valid === true, 'تم التحقق من صحة التوقيع الرقمي للمفتاح بنجاح 100%');
  assert(keyVerification.type === 'annual', 'نوع الاشتراك: سنوي (annual)');

  // 3.3 Foreign Machine Rejection Test (Piracy Protection)
  const foreignMid = 'ALB-9999-8888-7777';
  const foreignVerification = verifyLicenseKey(validKey, foreignMid);
  assert(foreignVerification.valid === false, 'تم منع تفعيل المفتاح على جهاز كمبيوتر آخر مختلف');
  console.log(`  🛡️ رسالة الحظر عند النقل لجهاز آخر: "${foreignVerification.error}"`);

  // 3.4 Tampered Signature Rejection Test (Forgery Protection)
  const tamperedKey = validKey.substring(0, validKey.length - 2) + 'XY'; // تعديل آخر حرفين
  const tamperedVerification = verifyLicenseKey(tamperedKey, mid);
  assert(tamperedVerification.valid === false, 'تم كشف تزوير التوقيع الرقمي للمفتاح فوراً');
  console.log(`  🛡️ رسالة كشف التزوير: "${tamperedVerification.error}"`);
  AUDIT_RESULTS.scenarios.push({ name: 'درع بصمة الجهاز والتوقيع المشفر للتراخيص', status: 'PASS' });

  // -------------------------------------------------------------
  // SHIELD 4: Desktop Shell & Kiosk Mode Configuration Verification
  // -------------------------------------------------------------
  logHeader('الدرع 4: فحص إعدادات مشغل سطح المكتب ووضع الكشك (Desktop Kiosk)');
  const mainJsPath = path.join(__dirname, '..', '..', 'desktop', 'main.js');
  assert(fs.existsSync(mainJsPath), 'ملف إعدادات سطح المكتب desktop/main.js موجود');

  const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

  // Verify Kiosk Mode
  assert(mainJsContent.includes('kiosk: true'), 'وضع الكشك الكامل (kiosk: true) مفعل للشاشات اللمسية');
  assert(mainJsContent.includes('fullscreen: true'), 'وضع ملء الشاشة (fullscreen: true) مفعل تلقائياً');
  assert(mainJsContent.includes('autoHideMenuBar: true'), 'إخفاء أشرطة ويندوز التقليدية (autoHideMenuBar: true) مفعل');

  // Verify Single Instance Lock
  assert(mainJsContent.includes('requestSingleInstanceLock'), 'قفل المثيل الواحد (Single Instance Lock) مفعل لمنع تشغيل نسختين في نفس الوقت');

  // Verify F11 Manager Toggle
  assert(mainJsContent.includes("globalShortcut.register('F11'"), 'اختصار F11 مفعل لتمكين المدير من التبديل بين وضع الكشك ووضع النوافذ');

  // Verify Security Context Isolation
  assert(mainJsContent.includes('contextIsolation: true'), 'عزل سياق المتصفح (contextIsolation: true) مفعل لأعلى معايير الأمان');
  assert(mainJsContent.includes('nodeIntegration: false'), 'منع تشغيل أوامر النظام مباشرة من واجهة الويب (nodeIntegration: false) مفعل');

  AUDIT_RESULTS.scenarios.push({ name: 'فحص إعدادات Kiosk وضع الكشك لسطح المكتب', status: 'PASS' });

  // Clean test backup created in this audit
  try {
    if (fs.existsSync(backupRes.filePath)) {
      fs.unlinkSync(backupRes.filePath);
      console.log(`\n🧹 تم تنظيف ملف النسخة الاحتياطية التجريبية: ${backupRes.filename}`);
    }
  } catch (e) {}

  return { success: true };
}

runShieldsDeepAudit()
  .then(res => {
    console.log('\n============================================================');
    console.log('🎉 اكتمل الفحص المعملي لدروع الحماية والوقت والترخيص بنجاح 100%!');
    console.log('============================================================');

    fs.writeFileSync(
      path.join(__dirname, 'last_shields_audit_result.json'),
      JSON.stringify(AUDIT_RESULTS, null, 2),
      'utf8'
    );
  })
  .catch(err => {
    console.error('\n💥 فشل في الفحص:', err.message);
    process.exit(1);
  });
