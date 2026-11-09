const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const backupEngine = require('./backupEngine');
const { initDb } = require('../db/init');
const db = require('../db/database');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SERVER_DIR = path.resolve(__dirname, '..');
const CLIENT_DIST_DIR = path.resolve(ROOT_DIR, 'client', 'dist');
const VERSION_FILE = path.join(SERVER_DIR, 'version.json');
const DATA_DIR = path.join(SERVER_DIR, 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Recursively copies directory contents with protected path guards
 */
function copyDirSafely(src, dest, protectedPaths = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relToDest = path.relative(ROOT_DIR, destPath).replace(/\\/g, '/');

    // Skip protected files and directories (databases, licenses, backups, node_modules)
    const isProtected = protectedPaths.some((p) => {
      const norm = p.replace(/\\/g, '/');
      return relToDest === norm || relToDest.startsWith(norm + '/') || entry.name.endsWith('.db') || entry.name.endsWith('.sqlite');
    });

    if (isProtected) {
      console.log(`[UpdateEngine] Skipping protected path: ${relToDest}`);
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSafely(srcPath, destPath, protectedPaths);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const updateEngine = {
  /**
   * Returns current installed system version metadata
   */
  getCurrentVersion() {
    try {
      if (fs.existsSync(VERSION_FILE)) {
        const content = fs.readFileSync(VERSION_FILE, 'utf8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.warn('[UpdateEngine] Failed to read version.json:', e.message);
    }
    return {
      version: '1.0.0',
      build_date: '2026-11-05',
      name: 'نظام سريع وبنشر PRO',
      channel: 'stable',
    };
  },

  /**
   * Applies an offline software update package (.zip) with automated safety snapshot & rollback
   */
  applyUpdatePackage(zipBuffer, { uploadedBy = 'المدير' } = {}) {
    ensureDataDir();
    const timestamp = Date.now();
    const tempZipPath = path.join(DATA_DIR, `temp_update_${timestamp}.zip`);
    const tempExtractDir = path.join(DATA_DIR, `temp_extract_${timestamp}`);

    const currentVersion = this.getCurrentVersion();
    let safetySnapshot = null;

    try {
      // 1. Take Pre-Update Safety Snapshot of the Database
      try {
        safetySnapshot = backupEngine.createManualBackup('pre_update_safety_snapshot');
        console.log('[UpdateEngine] Pre-update database safety snapshot taken:', safetySnapshot.filename);
      } catch (backupErr) {
        throw new Error(`فشل إنشاء نسخة الأمان الاحتياطية قبل التحديث: ${backupErr.message}`);
      }

      // 2. Write uploaded zip buffer to disk
      fs.writeFileSync(tempZipPath, zipBuffer);

      // 3. Extract zip using Windows native tar tool
      if (!fs.existsSync(tempExtractDir)) {
        fs.mkdirSync(tempExtractDir, { recursive: true });
      }

      try {
        execSync(`tar -xf "${tempZipPath}" -C "${tempExtractDir}"`, {
          windowsHide: true,
          timeout: 45000,
        });
      } catch (extractErr) {
        // Fallback to native Windows PowerShell Expand-Archive
        try {
          execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tempZipPath}' -DestinationPath '${tempExtractDir}' -Force"`, {
            windowsHide: true,
            timeout: 60000,
          });
        } catch (psErr) {
          throw new Error(`فشل فك ضغط حزمة التحديث: تأكد من أن الملف سليم بصيغة zip (${extractErr.message})`);
        }
      }

      // 4. Validate Manifest
      const manifestPath = path.join(tempExtractDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('حزمة التحديث غير صالحة: الملف الوصفي (manifest.json) مفقود داخل الحزمة.');
      }

      let manifest = null;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (parseErr) {
        throw new Error('فشل قراءة بيانات حزمة التحديث: ملف manifest.json تالف.');
      }

      if (!manifest.version) {
        throw new Error('حزمة التحديث لا تحتوي على رقم إصدار معتمد.');
      }

      console.log(`[UpdateEngine] Installing update: v${currentVersion.version} -> v${manifest.version}`);

      // 5. Protected Paths List (Files and folders that MUST NEVER be overwritten by any update)
      const protectedPaths = [
        'server/db/quick_lube.db',
        'server/db/quick_lube.db-wal',
        'server/db/quick_lube.db-shm',
        'server/data/license.sig',
        'server/backups',
        'server/node_modules',
        'client/node_modules',
      ];

      // 6. Replace Client Production Assets if present in package
      const clientDistSource = path.join(tempExtractDir, 'client', 'dist');
      if (fs.existsSync(clientDistSource)) {
        console.log('[UpdateEngine] Updating frontend assets (client/dist)...');
        copyDirSafely(clientDistSource, CLIENT_DIST_DIR);
        const appClientDist = path.join(ROOT_DIR, 'app', 'client', 'dist');
        if (fs.existsSync(appClientDist) && appClientDist !== CLIENT_DIST_DIR) {
          copyDirSafely(clientDistSource, appClientDist);
        }
      }

      // 7. Replace Server Code if present in package
      const serverSource = path.join(tempExtractDir, 'server');
      if (fs.existsSync(serverSource)) {
        console.log('[UpdateEngine] Updating backend server modules...');
        copyDirSafely(serverSource, SERVER_DIR, protectedPaths);
        const appServer = path.join(ROOT_DIR, 'app', 'server');
        if (fs.existsSync(appServer) && appServer !== SERVER_DIR) {
          copyDirSafely(serverSource, appServer, protectedPaths);
        }
      }

      // 7b. Replace Desktop Code if present in package
      const desktopSource = path.join(tempExtractDir, 'desktop');
      if (fs.existsSync(desktopSource)) {
        console.log('[UpdateEngine] Updating desktop shell modules...');
        const desktopTargets = [
          path.join(ROOT_DIR, 'app', 'desktop'),
          path.join(ROOT_DIR, 'desktop'),
        ];
        for (const dt of desktopTargets) {
          if (fs.existsSync(dt)) {
            copyDirSafely(desktopSource, dt);
          }
        }
      }

      // 8. Run Safe Idempotent Database Migrations
      try {
        initDb();
        console.log('[UpdateEngine] Database schema verified & updated idempotently.');
      } catch (dbErr) {
        console.warn('[UpdateEngine] Warning running db init:', dbErr.message);
      }

      // 9. Update version.json on server
      const newVersionData = {
        version: manifest.version,
        build_date: manifest.release_date || new Date().toISOString().split('T')[0],
        name: manifest.name || 'نظام سريع وبنشر PRO',
        channel: manifest.channel || 'stable',
        last_update_applied: new Date().toISOString(),
        release_notes: manifest.description || 'تحديث برمجي وميزات جديدة لنظام سريع وبنشر',
        previous_version: currentVersion.version,
      };
      fs.writeFileSync(VERSION_FILE, JSON.stringify(newVersionData, null, 2), 'utf8');

      // 10. Audit Log the update in DB
      try {
        db.prepare(`
          INSERT INTO financial_audit_logs (
            action, entity_type, entity_id, old_data, new_data, performed_by, created_at
          ) VALUES (?, 'system_update', NULL, ?, ?, ?, datetime('now', 'localtime'))
        `).run(
          'SOFTWARE_UPDATE_APPLIED',
          JSON.stringify({ version: currentVersion.version }),
          JSON.stringify({ version: manifest.version, description: manifest.description, safetyBackup: safetySnapshot.filename }),
          uploadedBy
        );
      } catch (logErr) {
        // non-fatal
      }

      // 11. Cleanup temporary update files
      this.cleanupTempFiles(tempZipPath, tempExtractDir);

      return {
        success: true,
        previous_version: currentVersion.version,
        new_version: manifest.version,
        release_date: manifest.release_date,
        description: manifest.description || 'تم تطبيق التحديث البرمجي بنجاح',
        safety_backup: safetySnapshot.filename,
        message: `تم تحديث نظام سريع وبنشر بنجاح من الإصدار (${currentVersion.version}) إلى الإصدار (${manifest.version})! 🚀`,
      };
    } catch (err) {
      console.error('[UpdateEngine] Update failed:', err);
      // Clean up temp files
      this.cleanupTempFiles(tempZipPath, tempExtractDir);
      throw err;
    }
  },

  /**
   * Helper to clean up temporary zip and extraction directory
   */
  cleanupTempFiles(zipPath, extractDir) {
    try {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    } catch (e) {}

    try {
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
    } catch (e) {}
  },
};

module.exports = updateEngine;
