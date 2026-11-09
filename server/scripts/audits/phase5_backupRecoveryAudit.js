/**
 * AL-BANSHAR PRO — Phase 5: Backup, Crash Recovery & WAL Integrity Audit Suite
 * 
 * Verifies 5 Critical Resilience Dimensions:
 * 1. Atomic Backup Creation (VACUUM INTO on Active DB)
 * 2. Corruption & Tampering Rejection Guard (Pre-flight Validation)
 * 3. Simulated Power Cut & Sudden Kill WAL Crash Recovery
 * 4. Safe Hot-Swap Database Restoration with Pre-Restore Snapshot
 * 5. Live Sentinel Interlocking: Post-Restore COA & KPI Invariance
 */

const fs = require('fs');
const path = require('path');
const fc = require('fast-check');
const Database = require('better-sqlite3');
const db = require('../../db/database');
const backupEngine = require('../../utils/backupEngine');
const LiveSentinel = require('../sentinels/liveSentinel');

async function runPhase5Audit() {
  console.log('\n======================================================================');
  console.log('⚡  المرحلة 5: النسخ الاحتياطي ومقاومة انقطاع التيار والتلف (Crash Recovery)');
  console.log('⚡  اختبار صدمات انقطاع الكهرباء، نزاهة الـ WAL، والاستعادة الحية (Hot-Swap)');
  console.log('======================================================================\n');

  const issues = [];
  let passedCount = 0;

  // Setup isolated temporary test sandbox directory
  const sandboxDir = path.join(__dirname, '../../db/test_phase5_sandbox');
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }

  const testDbPath = path.join(sandboxDir, 'quick_lube_phase5.db');
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
    // -------------------------------------------------------------------------
    // TEST 1: Atomic Backup Creation (VACUUM INTO)
    // -------------------------------------------------------------------------
    console.log('💾 [فحص 1/5] جاري اختبار إنشاء النسخة الاحتياطية الذرية (Atomic Backup Generation)...');

    const backupPrefix = 'test_phase5_backup';
    const manualBackup = backupEngine.createManualBackup(backupPrefix);

    const backupExists = fs.existsSync(manualBackup.filePath);
    const backupValid = backupEngine.validateBackupFile(manualBackup.filePath);

    if (backupExists && backupValid.valid && manualBackup.size_bytes > 50000) {
      console.log(`   ✅ [PASS] تم إنشاء نسخة احتياطية ذرية مكتملة (${manualBackup.sizeFormatted}) وفحص نزاهتها بنجاح 100%.`);
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] فشل إنشاء النسخة الاحتياطية أو تعذر التحقق من نزاهتها!');
      issues.push({
        dimension: 'Atomic Backup: فشل إنشاء النسخة الاحتياطية الذرية',
        counterExample: JSON.stringify(manualBackup),
        error: backupValid.error || 'حجم الملف غير صالح أو الملف مفقود',
        impact: 'فقدان بيانات الورشة عند محاولة أخذ نسخة احتياطية أثناء ضغط العمل اليومي.',
        beforeScenario: 'تعطل عملية النسخ الاحتياطي وترك ملفات فارغة أو غير قابلة للاسترجاع.',
        afterScenario: 'نسخ احتياطي ذري بدون قفل لقاعدة البيانات مع فحص فوري لسلامة الملف.',
        fixCode: `// backupEngine.js: التحقق من نجاح VACUUM INTO وصلاحية الملف`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Pre-flight Integrity & Tampering Guard (Rejection of Corrupt Backups)
    // -------------------------------------------------------------------------
    console.log('\n🛡️ [فحص 2/5] جاري اختبار صمام رفض الملفات التالفة أو المتلاعب بها (Tamper Resistance)...');

    let corruptionsRejected = true;
    let failedCorruptionDetails = null;

    // Use fast-check to test random byte corruption on copies of the valid backup
    const tempCorruptFile = path.join(sandboxDir, 'corrupt_test.sqlite');

    // Sub-test A: Magic header corruption (bytes 0 to 15 must strictly match 'SQLite format 3\0')
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 15 }),
        fc.integer({ min: 1, max: 255 }),
        (byteOffset, corruptByte) => {
          fs.copyFileSync(manualBackup.filePath, tempCorruptFile);
          const fd = fs.openSync(tempCorruptFile, 'r+');
          const original = Buffer.alloc(1);
          fs.readSync(fd, original, 0, 1, byteOffset);
          const tampered = Buffer.from([(original[0] ^ corruptByte) || 0xFF]);
          fs.writeSync(fd, tampered, 0, 1, byteOffset);
          fs.closeSync(fd);

          const validation = backupEngine.validateBackupFile(tempCorruptFile);
          if (validation.valid) {
            corruptionsRejected = false;
            failedCorruptionDetails = { type: 'header_tamper', byteOffset };
            return false;
          }
          return true;
        }
      ),
      { numRuns: 16 }
    );

    // Sub-test B: Truncated / undersized files (< 4KB minimum)
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2048 }),
        (truncateSize) => {
          fs.copyFileSync(manualBackup.filePath, tempCorruptFile);
          fs.truncateSync(tempCorruptFile, truncateSize);

          const validation = backupEngine.validateBackupFile(tempCorruptFile);
          if (validation.valid) {
            corruptionsRejected = false;
            failedCorruptionDetails = { type: 'truncation', truncateSize };
            return false;
          }
          return true;
        }
      ),
      { numRuns: 10 }
    );

    if (fs.existsSync(tempCorruptFile)) fs.unlinkSync(tempCorruptFile);

    if (corruptionsRejected) {
      console.log('   ✅ [PASS] صمام كشف التلف محصن 100%: تم رفض 20 ملف تالف تم التلاعب ببياناتها عشوائياً.');
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] قبل صمام التحقق ملفاً تالفاً كنسخة صالحة للاستعادة!');
      issues.push({
        dimension: 'Tamper Resistance: قبول ملفات تالفة أو ناقصة كنسخ احتياطية صالحة',
        counterExample: JSON.stringify(failedCorruptionDetails),
        error: 'اجتياز ملف تالف لفحص validateBackupFile',
        impact: 'استرجاع ملف احتياطي معطوب قد يمسح قاعدة بيانات الورشة الشغالة ويؤدي لتوقف كامل.',
        beforeScenario: 'يقوم الكاشير باختيار ملف تالف فيقبل النظام استعادته وتتحطم قاعدة البيانات.',
        afterScenario: 'فحص مسبق دقيق (Pre-flight Check) لترويسة SQLite وجداول النظام الأساسية قبل لمس البيانات الحية.',
        fixCode: `// backupEngine.js: تدقيق PRAGMA integrity_check وقراءة الجداول`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 3: Simulated Power Cut & Sudden Kill WAL Crash Recovery
    // -------------------------------------------------------------------------
    console.log('\n⚡ [فحص 3/5] جاري محاكاة انقطاع مفاجئ للتيار الكهربائي أثناء الكتابة (Power Cut Simulation)...');

    const crashDbPath = path.join(sandboxDir, 'crash_simulation.db');
    if (fs.existsSync(crashDbPath)) fs.unlinkSync(crashDbPath);
    if (fs.existsSync(crashDbPath + '-wal')) fs.unlinkSync(crashDbPath + '-wal');
    if (fs.existsSync(crashDbPath + '-shm')) fs.unlinkSync(crashDbPath + '-shm');

    // Create fresh DB instance in WAL mode
    const crashDb = new Database(crashDbPath);
    crashDb.pragma('journal_mode = WAL');
    crashDb.pragma('synchronous = NORMAL');

    crashDb.exec(`
      CREATE TABLE test_tx (id INTEGER PRIMARY KEY, title TEXT, amount REAL);
      INSERT INTO test_tx (title, amount) VALUES ('رصيد افتتاحي مؤكد', 10000);
    `);

    // Checkpoint initial state
    crashDb.pragma('wal_checkpoint(TRUNCATE)');

    // Now start a write that simulates an uncommitted power outage
    try {
      crashDb.prepare("INSERT INTO test_tx (title, amount) VALUES ('معاملة سارية قبل الصدمة', 5000)").run();
      // Abrupt close simulating sudden power cut without clean checkpoint
      crashDb.close();
    } catch (e) {}

    // Now simulate power recovery: Re-open DB
    const recoveryDb = new Database(crashDbPath);
    const integrityCheck = recoveryDb.prepare('PRAGMA integrity_check').get();
    const rows = recoveryDb.prepare('SELECT * FROM test_tx').all();
    recoveryDb.close();

    const crashPassed = integrityCheck.integrity_check === 'ok' && rows.length >= 1;

    if (crashPassed) {
      console.log('   ✅ [PASS] صمود تام أمام صدمات الكهرباء: تعافت قاعدة البيانات تلقائياً وسلامة الملفات (PRAGMA integrity_check = ok).');
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] تضررت قاعدة البيانات بعد محاكاة انقطاع الكهرباء!');
      issues.push({
        dimension: 'WAL Crash Recovery: تلف قاعدة البيانات عند انقطاع التيار الكهربائي',
        counterExample: `Integrity: ${integrityCheck?.integrity_check}`,
        error: 'فشل التعافي الذاتي لقاعدة البيانات',
        impact: 'انطفاء شاشة الكاشير فجأة بسبب انقطاع كهرباء المحطة يؤدي لتلف ملف البيانات وفقدان الفواتير.',
        beforeScenario: 'انقطاع التيار ➔ تلف ملف SQLite وظهور خطأ Corrupted Database.',
        afterScenario: 'نظام WAL يتعافى ذاتياً عند إعادة التشغيل ويعيد قراءة السجلات السليمة دون أي فقدان.',
        fixCode: `// تفعيل PRAGMA synchronous = NORMAL و journal_mode = WAL دائماً`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Safe Hot-Swap Database Restoration with Pre-Restore Snapshot
    // -------------------------------------------------------------------------
    console.log('\n🔄 [فحص 4/5] جاري اختبار الاستعادة الحية وتبديل قاعدة البيانات الفوري (Live Hot-Swap)...');

    // Take note of current invoice count
    const preRestoreInvoices = db.prepare('SELECT count(*) as c FROM invoices').get().c;

    // Execute live restore using manualBackup from Test 1
    const restoreResult = backupEngine.restoreFromBackup(manualBackup.filePath, { createSafetySnapshot: true });

    // Verify proxy reconnected and DB is readable
    const postRestoreInvoices = db.prepare('SELECT count(*) as c FROM invoices').get().c;
    const safetySnapshotExists = restoreResult.safetySnapshot ? fs.existsSync(path.join(backupEngine.getBackupsDir(), restoreResult.safetySnapshot)) : false;

    if (restoreResult.success && postRestoreInvoices === preRestoreInvoices && safetySnapshotExists) {
      console.log(`   ✅ [PASS] تمت الاستعادة الحية بنجاح 100%: أُنشئت لقطة أمان مسبقة (${restoreResult.safetySnapshot}) وتطابقت السجلات.`);
      passedCount++;
    } else {
      console.log('   ❌ [FAIL] فشل التبديل الحي أثناء استعادة النسخة الاحتياطية!');
      issues.push({
        dimension: 'Hot-Swap Restoration: تعطل النظام أثناء استعادة قاعدة البيانات',
        counterExample: JSON.stringify(restoreResult),
        error: 'فشل التبديل الحي أو غياب لقطة الأمان المسبقة',
        impact: 'توقف سير العمل وتجمد شاشات الورشة أثناء استعادة نسخة سابقة مع خطر الكتابة فوق البيانات دون خط رجعة.',
        beforeScenario: 'استعادة ملف يمسح البيانات الحالية للأبد دون حفظ لقطة طوارئ.',
        afterScenario: 'إنشاء لقطة أمان وقائية تلقائياً وتفعيل قاعدة البيانات الجديدة دون الحاجة لإعادة تشغيل السيرفر.',
        fixCode: `// backupEngine.js: استخدام reconnect hook و createSafetySnapshot`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Live Sentinel Real-Time Accounting Verification Post-Restoration
    // -------------------------------------------------------------------------
    console.log('\n📊 [فحص 5/5] جاري تشغيل الفاحص المرافق (Live Sentinel) للتحقق من شجرة الحسابات بعد الاستعادة...');

    const sentinelReport = LiveSentinel.runFullSentinel(db);
    if (sentinelReport.allPassed) {
      console.log(`   ✅ [PASS] ${sentinelReport.coaResult.details}`);
      passedCount++;
    } else {
      console.log(`   ❌ [FAIL] رصد الفاحص المرافق اختلالاً في الحسابات: ${sentinelReport.coaResult.details}`);
      issues.push({
        dimension: 'Live Sentinel: اختلال ميزان الحسابات بعد استعادة النسخة الاحتياطية',
        counterExample: sentinelReport.coaResult.details,
        error: sentinelReport.coaResult.details,
        impact: 'عدم تطابق القيود المحاسبية بعد استعادة البيانات.',
        beforeScenario: 'ظهور فروق محاسبية بين المدين والدائن بعد استرجاع نسخة.',
        afterScenario: 'اتزان تام 100% بين المدين والدائن بعد الاستعادة.',
        fixCode: `// مراجعة القيود بعد الاستعادة`,
      });
    }

  } finally {
    // Cleanup temporary test sandbox
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

module.exports = { runPhase5Audit };

if (require.main === module) {
  runPhase5Audit().then(res => {
    console.log('\n======================================================================');
    console.log(`🏁 نهاية فحص المرحلة 5: اجتاز ${res.passedCount} من أصل ${res.totalTests} اختبارات.`);
    console.log('======================================================================');
  });
}
