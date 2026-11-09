const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { formatDate } = require('./helpers');

const BACKUPS_DIR = process.env.BACKUPS_DIR || path.join(__dirname, '..', 'backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

const backupEngine = {
  getBackupsDir() {
    ensureBackupsDir();
    return BACKUPS_DIR;
  },

  performDailyAutoBackup() {
    try {
      ensureBackupsDir();
      const today = formatDate();
      const backupFileName = `pos_backup_${today}.sqlite`;
      const targetFilePath = path.join(BACKUPS_DIR, backupFileName);

      // Check if already created today
      if (fs.existsSync(targetFilePath)) {
        return {
          created: false,
          message: `نسخة اليوم الاحتياطية (${backupFileName}) موجودة مسبقاً.`,
          filePath: targetFilePath,
        };
      }

      // Checkpoint WAL and vacuum into backup target
      db.pragma('wal_checkpoint(PASSIVE)');
      db.prepare(`VACUUM INTO ?`).run(targetFilePath);

      // Clean older backups beyond 30 days
      this.cleanOldBackups(30);

      return {
        created: true,
        message: `تم إنشاء النسخة الاحتياطية اليومية بنجاح: ${backupFileName}`,
        filePath: targetFilePath,
      };
    } catch (err) {
      console.error('[Backup Engine] Failed to perform auto-backup:', err);
      return {
        created: false,
        error: err.message,
      };
    }
  },

  createManualBackup(prefix = 'pos_manual_backup') {
    ensureBackupsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${prefix}_${timestamp}.sqlite`;
    const targetFilePath = path.join(BACKUPS_DIR, backupFileName);

    db.pragma('wal_checkpoint(PASSIVE)');
    db.prepare(`VACUUM INTO ?`).run(targetFilePath);

    const stats = fs.existsSync(targetFilePath) ? fs.statSync(targetFilePath) : { size: 0 };

    return {
      success: true,
      filename: backupFileName,
      fileName: backupFileName,
      filePath: targetFilePath,
      size_bytes: stats.size,
      sizeBytes: stats.size,
      sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      createdAt: new Date().toISOString(),
    };
  },

  cleanOldBackups(retentionDays = 30) {
    try {
      ensureBackupsDir();
      const files = fs.readdirSync(BACKUPS_DIR);
      const now = Date.now();
      const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.sqlite')) continue;
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          console.log(`[Backup Engine] Purged old backup: ${file}`);
        }
      }
    } catch (e) {
      console.warn('[Backup Engine] Clean old backups warning:', e.message);
    }
  },

  checkDatabaseIntegrity() {
    try {
      // 1. Run SQLite integrity check
      const checkResult = db.prepare('PRAGMA integrity_check').all();
      const isOk = checkResult.length === 1 && checkResult[0].integrity_check === 'ok';

      // 2. Run optimize and truncate WAL
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.pragma('optimize');

      // 3. Count core tables records
      const counts = {
        invoices: db.prepare('SELECT COUNT(*) as count FROM invoices').get().count,
        vehicles: db.prepare('SELECT COUNT(*) as count FROM customers_vehicles').get().count,
        inventory: db.prepare('SELECT COUNT(*) as count FROM inventory').get().count,
        journal_entries: db.prepare('SELECT COUNT(*) as count FROM journal_entries').get().count,
        vouchers: db.prepare('SELECT COUNT(*) as count FROM official_vouchers').get().count,
      };

      return {
        success: true,
        integrity: isOk ? 'ok' : 'error',
        integrity_status: isOk ? 'healthy' : 'warning',
        wal_checkpoint: 'TRUNCATE',
        details: checkResult,
        counts,
        checked_at: new Date().toISOString(),
        message: isOk ? 'قاعدة البيانات سليمة ومحكمة 100%' : 'توجد تحذيرات في الفحص',
      };
    } catch (err) {
      return {
        success: false,
        integrity_status: 'error',
        error: err.message,
      };
    }
  },

  listBackups() {
    ensureBackupsDir();
    const files = fs.readdirSync(BACKUPS_DIR);
    return files
      .filter((f) => f.endsWith('.sqlite'))
      .map((f) => {
        const fullPath = path.join(BACKUPS_DIR, f);
        const stats = fs.statSync(fullPath);
        return {
          fileName: f,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  },

  getBackupStatus() {
    ensureBackupsDir();
    const list = this.listBackups();
    if (!list || list.length === 0) {
      return {
        hasBackup: false,
        lastBackupDate: null,
        daysAgo: null,
        isStale: true,
        totalBackups: 0,
      };
    }
    const latest = list[0];
    const latestDate = new Date(latest.modifiedAt || latest.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now - latestDate) / (1000 * 60 * 60 * 24));
    return {
      hasBackup: true,
      lastBackupDate: latestDate.toISOString().slice(0, 10),
      latestFileName: latest.fileName,
      sizeFormatted: latest.sizeFormatted,
      daysAgo: Math.max(0, diffDays),
      isStale: diffDays >= 7,
      totalBackups: list.length,
    };
  },

  /**
   * Pre-flight schema & integrity check on any SQLite file before restoration
   */
  validateBackupFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'الملف غير موجود على القرص' };
    }

    try {
      const stats = fs.statSync(filePath);
      if (stats.size < 4096) {
        return { valid: false, error: 'حجم ملف النسخة الاحتياطية غير صالح (أقل من الحد الأدنى المقبول 4KB)' };
      }

      // Verify SQLite 3 Magic Header ("SQLite format 3\0")
      const headerBuf = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, headerBuf, 0, 16, 0);
      fs.closeSync(fd);

      if (headerBuf.toString('utf8', 0, 15) !== 'SQLite format 3' || headerBuf[15] !== 0) {
        return { valid: false, error: 'الملف ليس قاعدة بيانات SQLite صالحة (الترويسة التوقيعية للملف تالفة أو غير متوافقة)' };
      }
    } catch (e) {
      return { valid: false, error: `فشل فحص ترويسة الملف: ${e.message}` };
    }

    const Database = require('better-sqlite3');
    let testDb = null;
    try {
      testDb = new Database(filePath, { readonly: true, fileMustExist: true });
      const integrity = testDb.prepare('PRAGMA integrity_check').all();
      const isIntegrityOk = integrity.length === 1 && integrity[0].integrity_check === 'ok';
      if (!isIntegrityOk) {
        return { valid: false, error: 'ملف قاعدة البيانات تالف أو غير صالح (فشل فحص PRAGMA integrity_check)' };
      }

      // Check required tables
      const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
      const requiredTables = ['customers_vehicles', 'invoices', 'inventory', 'chart_of_accounts'];
      const missing = requiredTables.filter((t) => !tables.includes(t));
      if (missing.length > 0) {
        return { valid: false, error: `الملف غير متوافق، تنقصه جداول النظام الأساسية: ${missing.join(', ')}` };
      }

      const counts = {
        vehicles: testDb.prepare('SELECT COUNT(*) as c FROM customers_vehicles').get()?.c || 0,
        invoices: testDb.prepare('SELECT COUNT(*) as c FROM invoices').get()?.c || 0,
        inventory: testDb.prepare('SELECT COUNT(*) as c FROM inventory').get()?.c || 0,
        suppliers: tables.includes('suppliers') ? testDb.prepare('SELECT COUNT(*) as c FROM suppliers').get()?.c || 0 : 0,
        vouchers: tables.includes('official_vouchers') ? testDb.prepare('SELECT COUNT(*) as c FROM official_vouchers').get()?.c || 0 : 0,
        journal_entries: tables.includes('journal_entries') ? testDb.prepare('SELECT COUNT(*) as c FROM journal_entries').get()?.c || 0 : 0,
      };

      const stats = fs.statSync(filePath);
      return {
        valid: true,
        counts,
        sizeBytes: stats.size,
        sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        message: 'الملف سليم ومطابق لقواعد نظام سريع وبنشر 100%',
      };
    } catch (err) {
      return { valid: false, error: `فشل فحص بنية الملف: ${err.message}` };
    } finally {
      if (testDb) {
        try {
          testDb.close();
        } catch (e) {
          // ignore
        }
      }
    }
  },

  /**
   * Safe Hot-Swap Database Restoration with Pre-Restore Safety Snapshot
   */
  restoreFromBackup(sourceFilePath, { createSafetySnapshot = true } = {}) {
    // 1. Validate the source file first
    const validation = this.validateBackupFile(sourceFilePath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. Take automatic safety snapshot of the CURRENT database before overwriting
    let safetySnapshot = null;
    if (createSafetySnapshot) {
      try {
        safetySnapshot = this.createManualBackup('pre_restore_safety_backup');
        console.log('[Backup Engine] Pre-restore safety backup created:', safetySnapshot.filename);
      } catch (err) {
        console.warn('[Backup Engine] Warning taking pre-restore safety backup:', err.message);
      }
    }

    // 3. Prepare target DB path
    const activeDbPath = (typeof db.getDbPath === 'function' ? db.getDbPath() : null) || process.env.DB_PATH || path.join(__dirname, '..', 'db', 'quick_lube.db');
    const walPath = `${activeDbPath}-wal`;
    const shmPath = `${activeDbPath}-shm`;

    // 4. Close active database via reconnect hook
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      // ignore
    }

    if (typeof db.close === 'function') {
      try {
        db.close();
      } catch (e) {
        // ignore
      }
    }

    // 5. Replace database file
    fs.copyFileSync(sourceFilePath, activeDbPath);

    // Delete stale WAL/SHM files
    if (fs.existsSync(walPath)) {
      try {
        fs.unlinkSync(walPath);
      } catch (e) {}
    }
    if (fs.existsSync(shmPath)) {
      try {
        fs.unlinkSync(shmPath);
      } catch (e) {}
    }

    // 6. Reconnect active DB
    if (typeof db.reconnect === 'function') {
      db.reconnect(activeDbPath);
    }

    // 7. Verify restored database
    const postIntegrity = this.checkDatabaseIntegrity();

    return {
      success: true,
      message: 'تمت استعادة وتنشيط قاعدة البيانات بنجاح 100%',
      safetySnapshot: safetySnapshot ? safetySnapshot.filename : null,
      restoredCounts: validation.counts,
      integrity: postIntegrity.integrity,
      restoredAt: new Date().toISOString(),
    };
  },
};

module.exports = backupEngine;
