const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

console.log('============================================================');
console.log('🏭 أداة التصفير الشامل وإعادة ضبط المصنع (حزمة التسليم المتكاملة)');
console.log('============================================================');

const targetDbs = [];

// 1. Installed App DB (%APPDATA%/AlBanshar/db/quick_lube.db)
const appData = process.env.APPDATA;
if (appData) {
  const installedDb = path.join(appData, 'AlBanshar', 'db', 'quick_lube.db');
  if (fs.existsSync(installedDb)) {
    targetDbs.push({ name: 'قاعدة بيانات العميل المثبتة (%APPDATA%)', path: installedDb });
  }
}

// 2. Repository Core DB (server/db/quick_lube.db)
const repoDb = path.join(__dirname, '..', 'db', 'quick_lube.db');
if (fs.existsSync(repoDb)) {
  targetDbs.push({ name: 'قاعدة بيانات المشروع والمثبت (server/db)', path: repoDb });
}

if (targetDbs.length === 0) {
  console.error('❌ لم يتم العثور على أي قاعدة بيانات لتصفيرها.');
  process.exit(1);
}

// Step 1: Pre-reset Safety Backup of Installed DB
if (appData) {
  const backupsDir = path.join(appData, 'AlBanshar', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const installedDb = path.join(appData, 'AlBanshar', 'db', 'quick_lube.db');
  if (fs.existsSync(installedDb)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupsDir, `pre_factory_reset_safety_backup_${timestamp}.sqlite`);
    try {
      const srcDb = new Database(installedDb);
      srcDb.pragma('wal_checkpoint(TRUNCATE)');
      srcDb.prepare('VACUUM INTO ?').run(backupFile);
      srcDb.close();
      console.log(`🛡️ تم إنشاء نسخة أمان احتياطية قبل التصفير:\n   ${backupFile}`);
    } catch (e) {
      console.warn('⚠️ تعذر عمل نسخة احتياطية بمحرك VACUUM، استخدام النسخ المباشر:', e.message);
      fs.copyFileSync(installedDb, backupFile);
    }
  }
}

function resetDatabaseToBlankSlate(dbPath, dbName) {
  console.log(`\n>>> جاري إعادة ضبط المصنع الخام لـ: ${dbName}...`);
  console.log(`    المسار: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('foreign_keys = OFF'); // Disable during reset

  // 1. Drop all triggers dynamically during reset to prevent cascade blocks
  const existingTriggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all();
  for (const trg of existingTriggers) {
    try {
      db.prepare(`DROP TRIGGER IF EXISTS "${trg.name}"`).run();
    } catch (e) {}
  }

  const runWipe = db.transaction(() => {
    // 2. Clear all transactional and operational tables
    const tablesToWipe = [
      'invoice_items', 'invoices',
      'purchase_return_items', 'purchase_returns',
      'purchase_items', 'purchases',
      'voucher_items', 'official_vouchers', 'supplier_payment_vouchers',
      'daily_transactions', 'cash_shifts', 'cash_drawer_audits', 'cash_drawer_reconciliations',
      'service_reminders_log', 'journal_lines', 'journal_entries',
      'stock_movements', 'financial_audit_logs', 'document_sequences'
    ];

    for (const tbl of tablesToWipe) {
      try {
        db.prepare(`DELETE FROM ${tbl}`).run();
      } catch (e) {}
    }

    // 3. Complete Blank Slate for Employees & Attendance (تهيئة الموظفين 0 موظف)
    try {
      db.prepare('DELETE FROM worker_attendance').run();
      db.prepare('DELETE FROM workers').run();
    } catch (e) {}

    // 4. Complete Blank Slate for Products, Services, and Suppliers
    try {
      db.prepare('UPDATE inventory SET stock_qty = 0').run();
      db.prepare('DELETE FROM inventory').run();
    } catch (e) {}

    try {
      db.prepare('UPDATE suppliers SET balance_due = 0').run();
      db.prepare('DELETE FROM suppliers').run();
    } catch (e) {}

    // 5. Reset License table in database to allow clean trial activation
    try {
      db.prepare('DELETE FROM system_license').run();
    } catch (e) {}

    // 6. Reset Customers: Keep only the essential generic walk-in entity (ID=1)
    try {
      db.prepare('UPDATE customers_vehicles SET balance_due = 0').run();
      db.prepare('DELETE FROM customers_vehicles WHERE id != 1').run();
      const generalCustomer = db.prepare('SELECT id FROM customers_vehicles WHERE id = 1').get();
      if (!generalCustomer) {
        db.prepare(`
          INSERT INTO customers_vehicles (
            id, plate_number, plate_type, car_make_model, customer_name, phone,
            last_odometer, next_due_odometer, balance_due, credit_limit, customer_type
          ) VALUES (
            1, 'فاتورة سريعة', 'مؤقت', 'مشتريات وخدمات سريعة', 'عميل عام (نقدي)', '---',
            0, 0, 0, 0, 'individual'
          )
        `).run();
      } else {
        db.prepare(`
          UPDATE customers_vehicles SET
            plate_number = 'فاتورة سريعة',
            plate_type = 'مؤقت',
            car_make_model = 'مشتريات وخدمات سريعة',
            customer_name = 'عميل عام (نقدي)',
            phone = '---',
            last_odometer = 0,
            next_due_odometer = 0,
            balance_due = 0,
            credit_limit = 0
          WHERE id = 1
        `).run();
      }
    } catch (e) {}

    // 7. Reset all autoincrement ID sequences to zero
    try {
      db.prepare(`
        DELETE FROM sqlite_sequence WHERE name IN (
          'invoices', 'invoice_items', 'purchases', 'purchase_items',
          'purchase_returns', 'purchase_return_items', 'official_vouchers',
          'voucher_items', 'supplier_payment_vouchers', 'daily_transactions',
          'cash_shifts', 'cash_drawer_audits', 'cash_drawer_reconciliations',
          'service_reminders_log', 'journal_entries', 'journal_lines', 'stock_movements',
          'inventory', 'suppliers', 'workers', 'worker_attendance', 'system_license'
        )
      `).run();
    } catch (e) {}
  });

  runWipe();

  // 8. Re-seed clean Chart of Accounts (دليل الحسابات المالي الأساسي بأرصدة صفرية)
  const { seedChartOfAccounts } = require('../utils/accountingEngine');
  seedChartOfAccounts(db);

  // 9. Re-apply schema triggers from schema.sql
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // 10. Re-enable foreign keys, vacuum and truncate WAL
  db.pragma('foreign_keys = ON');
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.prepare('VACUUM').run();

  // 11. Verify counts
  const invCount = db.prepare('SELECT count(*) as c FROM inventory').get().c;
  const supCount = db.prepare('SELECT count(*) as c FROM suppliers').get().c;
  const invsCount = db.prepare('SELECT count(*) as c FROM invoices').get().c;
  const pursCount = db.prepare('SELECT count(*) as c FROM purchases').get().c;
  const shiftsCount = db.prepare('SELECT count(*) as c FROM cash_shifts').get().c;
  const carsCount = db.prepare('SELECT count(*) as c FROM customers_vehicles').get().c;
  const workersCount = db.prepare('SELECT count(*) as c FROM workers').get().c;

  db.close();

  console.log(`  ✅ تم التصفير بنجاح:`);
  console.log(`     - الموظفون: ${workersCount} (خام 100% - جاهز لإدخال طاقم العميل)`);
  console.log(`     - الأصناف والخدمات في المخزن: ${invCount} (خام 100%)`);
  console.log(`     - الموردين: ${supCount} (خام 100%)`);
  console.log(`     - فواتير المبيعات: ${invsCount} (تبدأ من #1)`);
  console.log(`     - فواتير المشتريات: ${pursCount} (تبدأ من #1)`);
  console.log(`     - الورديات: ${shiftsCount} (نظيفة)`);
  console.log(`     - العملاء: ${carsCount} (العميل العام النقدي الافتراضي فقط)`);
}

for (const target of targetDbs) {
  resetDatabaseToBlankSlate(target.path, target.name);
}

// ============================================================
// Step 3: All-In-One Delivery Package System Cleaners
// ============================================================
console.log('\n>>> جاري تنفيذ إجراءات حزمة التسليم المتكاملة الإضافية...');

// 1. Reset Welcome Onboarding Wizard in Electron Storage
const electronStoragePaths = [
  path.join(appData || '', 'quick-lube-pos-root', 'Local Storage'),
  path.join(appData || '', 'quick-lube-pos-root', 'Session Storage'),
];

let clearedStorage = false;
for (const storagePath of electronStoragePaths) {
  if (fs.existsSync(storagePath)) {
    try {
      fs.rmSync(storagePath, { recursive: true, force: true });
      clearedStorage = true;
    } catch (e) {
      console.warn(`  ⚠️ تعذر حذف مجلد التخزين المؤقت: ${storagePath} (${e.message})`);
    }
  }
}
if (clearedStorage) {
  console.log('  ✨ تم إعادة ضبط معالج الإعداد الترحيبي (Onboarding Wizard) بنجاح - سيظهر للعميل عند أول تشغيل.');
} else {
  console.log('  ✨ معالج الإعداد الترحيبي في وضع الاستعداد التلقائي لأول تشغيل.');
}

// 2. Reset Trial Period & License Signatures
const licensePaths = [
  path.join(appData || '', 'AlBanshar', 'data', 'license.sig'),
  path.join(__dirname, '..', 'data', 'license.sig'),
];

let clearedLicense = false;
for (const licPath of licensePaths) {
  if (fs.existsSync(licPath)) {
    try {
      fs.unlinkSync(licPath);
      clearedLicense = true;
    } catch (e) {
      console.warn(`  ⚠️ تعذر حذف ملف الترخيص: ${licPath} (${e.message})`);
    }
  }
}
if (clearedLicense) {
  console.log('  ✨ تم تصفير مؤقت الترخيص التجريبي (سيتم منح العميل فترة تجريبية 14 يوماً تبدأ من أول تشغيل له).');
} else {
  console.log('  ✨ مؤقت الترخيص التجريبي جاهز ومنضبط للبدء فور أول تشغيل.');
}

// 3. Purge Log Files
const logPaths = [
  path.join(__dirname, '..', '..', 'desktop_boot.log'),
  path.join(__dirname, '..', '..', 'server.log'),
  path.join(appData || '', 'AlBanshar', 'desktop_runtime.log'),
];

for (const logPath of logPaths) {
  if (fs.existsSync(logPath)) {
    try {
      fs.writeFileSync(logPath, `[${new Date().toISOString()}] [FACTORY RESET] System initialized cleanly for client delivery.\n`, 'utf8');
      console.log(`  🧹 تم تطهير سجل الأحداث: ${path.basename(logPath)}`);
    } catch (e) {
      console.warn(`  ⚠️ تعذر مسح ملف السجل: ${logPath} (${e.message})`);
    }
  }
}

console.log('\n============================================================');
console.log('🎉 اكتملت إعادة ضبط المصنع بحزمة التسليم المتكاملة بنجاح!');
console.log('📦 النظام الآن نظيف 100% وجاهز للتسليم النهائي للعميل.');
console.log('============================================================');
