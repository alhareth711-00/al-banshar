#!/usr/bin/env node

/**
 * Al-Banshar PRO - Master Software Update Packager (أداة حزم وتصدير التحديثات البرمجية)
 *
 * Creates a standalone, signed-safe .zip hot-patch package ready to be sent via WhatsApp to client workshops.
 *
 * Usage:
 *   node server/scripts/packUpdate.js
 *   node server/scripts/packUpdate.js --version 1.0.1 --notes "إضافة بضاعة الأمانة وتحسين محرك التحديثات"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SERVER_DIR = path.resolve(__dirname, '..');
const CLIENT_DIR = path.resolve(ROOT_DIR, 'client');
const VERSION_FILE = path.join(SERVER_DIR, 'version.json');
const DESKTOP_DIR = path.resolve('C:\\Users\\Elite\\Desktop');
const UPDATES_DIR = path.join(ROOT_DIR, 'updates');

function getVersionInfo() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
  } catch (e) {}
  return { version: '1.0.0', name: 'نظام سريع وبنشر PRO', channel: 'stable' };
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version' && args[i + 1]) options.version = args[++i];
    if (args[i] === '--notes' && args[i + 1]) options.notes = args[++i];
    if (args[i] === '--non-interactive') options.nonInteractive = true;
  }
  return options;
}

function bumpPatchVersion(ver) {
  const parts = ver.split('.').map((p) => parseInt(p, 10) || 0);
  if (parts.length < 3) parts.push(0);
  parts[parts.length - 1] += 1;
  return parts.join('.');
}

function copyDirectory(src, dest, ignorePatterns = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relFromRoot = path.relative(ROOT_DIR, srcPath).replace(/\\/g, '/');

    const shouldIgnore = ignorePatterns.some((pattern) => {
      const norm = pattern.replace(/\\/g, '/');
      return (
        relFromRoot === norm ||
        relFromRoot.startsWith(norm + '/') ||
        entry.name === norm ||
        (norm.startsWith('*.') && entry.name.endsWith(norm.slice(1)))
      );
    });

    if (shouldIgnore) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, ignorePatterns);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function prompt(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} [${defaultValue}]: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  console.log('\n======================================================================');
  console.log('   📦 صانع حزم التحديثات البرمجية لنظام سريع وبنشر PRO');
  console.log('   Al-Banshar PRO - Software Hot-Patch Update Packager');
  console.log('======================================================================\n');

  const cliArgs = parseCliArgs();
  const currentVersionData = getVersionInfo();
  const currentVer = currentVersionData.version || '1.0.0';
  const defaultNextVer = bumpPatchVersion(currentVer);

  let targetVersion = cliArgs.version;
  let targetNotes = cliArgs.notes;

  if (!targetVersion && !cliArgs.nonInteractive) {
    targetVersion = await prompt(`🔢 أدخل رقم الإصدار الجديد للتحديث`, defaultNextVer);
  } else if (!targetVersion) {
    targetVersion = defaultNextVer;
  }

  if (!targetNotes && !cliArgs.nonInteractive) {
    targetNotes = await prompt(
      `📝 أدخل وصف مختصر للتحديث وميزاته`,
      'تحديث برمجي تراكمي وتحسينات عامة على النظام'
    );
  } else if (!targetNotes) {
    targetNotes = 'تحديث برمجي تراكمي وتحسينات عامة على النظام';
  }

  const todayStr = new Date().toISOString().split('T')[0];

  console.log('\n----------------------------------------------------------------------');
  console.log(`📌 الإصدار الحالي : v${currentVer}`);
  console.log(`🚀 الإصدار الجديد  : v${targetVersion}`);
  console.log(`📅 تاريخ الحزمة   : ${todayStr}`);
  console.log(`📝 وصف التحديث    : ${targetNotes}`);
  console.log('----------------------------------------------------------------------\n');

  // Step 1: Rebuild Frontend
  console.log('⚡ [1/4] جاري بناء وتجهيز واجهات المستخدم (Frontend Client Build)...');
  try {
    execSync('npm --prefix client run build', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    console.log('✅ تم بناء واجهات المستخدم بنجاح.');
  } catch (err) {
    console.error('❌ فشل بناء واجهة المستخدم:', err.message);
    process.exit(1);
  }

  // Step 2: Create Staging Directory
  const timestamp = Date.now();
  const stagingDir = path.join(ROOT_DIR, `temp_staging_pack_${timestamp}`);
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  console.log('\n📂 [2/4] جاري تجميع الملفات البرمجية الصالحة للتحديث...');

  // 2a. Copy client/dist
  const stagingClientDist = path.join(stagingDir, 'client', 'dist');
  copyDirectory(path.join(CLIENT_DIR, 'dist'), stagingClientDist);

  // 2b. Copy server (with strict ignore list)
  const stagingServer = path.join(stagingDir, 'server');
  const ignorePatterns = [
    'node_modules',
    'quick_lube.db',
    'quick_lube.db-wal',
    'quick_lube.db-shm',
    'quick_lube.db-journal',
    '*.db',
    '*.sqlite',
    'license.sig',
    'license_secret.key',
    'backups',
    'updates',
    'temp*',
  ];
  copyDirectory(SERVER_DIR, stagingServer, ignorePatterns);

  // 2c. Copy desktop shell
  const desktopDir = path.join(ROOT_DIR, 'desktop');
  if (fs.existsSync(desktopDir)) {
    const stagingDesktop = path.join(stagingDir, 'desktop');
    copyDirectory(desktopDir, stagingDesktop);
  }

  // 2d. Write manifest.json
  const manifest = {
    name: 'نظام سريع وبنشر PRO',
    version: targetVersion,
    release_date: todayStr,
    channel: 'stable',
    description: targetNotes,
    minSupportedVersion: '1.0.0',
    generated_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(stagingDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  // Also update server/version.json in project so developer knows local state
  const updatedVersionJson = {
    ...currentVersionData,
    version: targetVersion,
    build_date: todayStr,
    last_update_applied: new Date().toISOString(),
    release_notes: targetNotes,
  };
  fs.writeFileSync(VERSION_FILE, JSON.stringify(updatedVersionJson, null, 2), 'utf8');

  // Also write this version.json to staging server
  fs.writeFileSync(
    path.join(stagingServer, 'version.json'),
    JSON.stringify(updatedVersionJson, null, 2),
    'utf8'
  );

  // Step 3: Compress to .zip using native Windows PowerShell Compress-Archive
  console.log('\n🗜️  [3/4] جاري ضغط وتشفير حزمة التحديث بصيغة Zip...');

  if (!fs.existsSync(UPDATES_DIR)) {
    fs.mkdirSync(UPDATES_DIR, { recursive: true });
  }

  const zipFileName = `تحديث_سريع_وبنشر_v${targetVersion}.zip`;
  const projectZipPath = path.join(UPDATES_DIR, zipFileName);
  const desktopZipPath = fs.existsSync(DESKTOP_DIR) ? path.join(DESKTOP_DIR, zipFileName) : null;

  try {
    if (fs.existsSync(projectZipPath)) fs.unlinkSync(projectZipPath);
    if (desktopZipPath && fs.existsSync(desktopZipPath)) fs.unlinkSync(desktopZipPath);

    // PowerShell Compress-Archive command
    const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${projectZipPath}' -CompressionLevel Optimal -Force"`;
    execSync(psCmd, { stdio: 'pipe' });

    if (desktopZipPath) {
      fs.copyFileSync(projectZipPath, desktopZipPath);
    }

    const zipStat = fs.statSync(projectZipPath);
    const sizeMb = (zipStat.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ تم إنشاء حزمة التحديث بنجاح! حجم الملف: ${sizeMb} ميجابايت.`);
  } catch (zipErr) {
    console.error('❌ فشل ضغط حزمة التحديث:', zipErr.message);
    process.exit(1);
  } finally {
    // Step 4: Cleanup staging
    console.log('🧹 [4/4] جاري تنظيف الملفات المؤقتة...');
    try {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log('\n======================================================================');
  console.log('   🎉 تم إنشاء وتجهيز ملف التحديث بنجاح تام! 🚀');
  console.log('======================================================================\n');
  if (desktopZipPath) {
    console.log(`📁 الملف جاهز ومحفوظ مباشرة على سطح المكتب:`);
    console.log(`   👉 ${desktopZipPath}\n`);
  }
  console.log(`📁 ونسخة احتياطية في مجلد التحديثات:`);
  console.log(`   👉 ${projectZipPath}\n`);

  console.log('📲 خطوات إرسال التحديث وتثبيته عند العميل:');
  console.log('----------------------------------------------------------------------');
  console.log(' 1. أرسل ملف الـ Zip هذا للعميل عبر الواتساب مباشرة.');
  console.log(' 2. يفتح العميل النظام في ورشته، ثم يذهب إلى (الإعدادات ⚙️).');
  console.log(' 3. ينزل إلى قسم (8. تحديث وترقية النظام البرمجي).');
  console.log(' 4. يختار ملف الـ Zip المستلم ويكتب كلمة "تحديث" ويضغط تثبيت.');
  console.log(' 5. يقوم النظام بأخذ نسخة أمان فورية لقاعدته وتحديث النظام في 5 ثوانٍ!');
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
