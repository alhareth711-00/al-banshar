const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { formatDate } = require('./helpers');

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

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

  createManualBackup() {
    ensureBackupsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pos_manual_backup_${timestamp}.sqlite`;
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
};

module.exports = backupEngine;
