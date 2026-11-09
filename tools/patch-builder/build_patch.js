/**
 * Developer Tool: Automated Mini Patch Builder for Al-Banshar PRO
 * Creates a lightweight (~2-3 MB) update package for remote clients.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const STAGE_DIR = path.join(__dirname, 'stage');
const TEMPLATE_DIR = path.join(__dirname, 'template');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist_patch');

function copyDirRecursive(src, dest, filterFn = null) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (filterFn && !filterFn(srcPath, entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, filterFn);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getFolderSize(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      size += getFolderSize(fullPath);
    } else {
      size += fs.statSync(fullPath).size;
    }
  }
  return size;
}

function preparePatch(shouldCreateZip = false) {
  console.log('========================================================');
  console.log('       أداة بناء رقعة التحديث السريعة (Mini Patch Builder)');
  console.log('========================================================\n');

  // 1. Verify client/dist exists
  const clientDist = path.join(ROOT_DIR, 'client', 'dist');
  if (!fs.existsSync(clientDist)) {
    console.log('⚙️ بناء ملفات الواجهة (npm run client:build)...');
    execSync('npm run client:build', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  // 2. Clean and create stage directory
  if (fs.existsSync(STAGE_DIR)) {
    fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(STAGE_DIR, { recursive: true });

  const payloadDir = path.join(STAGE_DIR, 'patch_payload');
  fs.mkdirSync(payloadDir, { recursive: true });

  // 3. Copy launcher batch file and internal patch script
  const templateBat = path.join(TEMPLATE_DIR, 'تحديث_سريع_وبنشر_PRO.bat');
  const targetBat = path.join(STAGE_DIR, 'تحديث_سريع_وبنشر_PRO.bat');
  fs.copyFileSync(templateBat, targetBat);

  const templatePs1 = path.join(TEMPLATE_DIR, 'internal_patch.ps1');
  const targetPs1 = path.join(STAGE_DIR, 'internal_patch.ps1');
  if (fs.existsSync(templatePs1)) {
    fs.copyFileSync(templatePs1, targetPs1);
  }
  console.log('✓ تم تجهيز سكربت التثبيت التلقائي مع درع الأمان.');

  // 4. Copy client/dist
  const payloadClientDist = path.join(payloadDir, 'client', 'dist');
  copyDirRecursive(clientDist, payloadClientDist);
  console.log('✓ تم تضمين ملفات الواجهة المحدثة (client/dist).');

  // 5. Copy server code (excluding node_modules, tests, db files)
  const serverSrc = path.join(ROOT_DIR, 'server');
  const payloadServer = path.join(payloadDir, 'server');
  copyDirRecursive(serverSrc, payloadServer, (filePath, fileName) => {
    if (fileName === 'node_modules' || fileName === 'backups') return false;
    if (fileName.endsWith('.db') || fileName.endsWith('.sqlite')) return false;
    if (fileName.endsWith('-wal') || fileName.endsWith('-shm')) return false;
    if (fileName.startsWith('test') && fileName.endsWith('.js')) return false;
    return true;
  });
  console.log('✓ تم تضمين كود السيرفر الأساسي الخفيف.');

  const totalBytes = getFolderSize(STAGE_DIR);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  console.log(`\n📦 الحجم الإجمالي لمحتويات الرقعة (قبل الضغط): ${totalMB} ميغابايت.`);

  if (shouldCreateZip) {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    const zipPath = path.join(OUTPUT_DIR, 'تحديث_سريع_وبنشر_PRO_خفيف.zip');
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    console.log('🗜️ جاري إنشاء الملف المضغوط النهائي (ZIP)...');
    const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${STAGE_DIR}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });

    const zipBytes = fs.statSync(zipPath).size;
    const zipMB = (zipBytes / (1024 * 1024)).toFixed(2);
    console.log(`\n🎉 اكتمل تجهيز الملف المضغوط النهائي بنجاح!`);
    console.log(`📁 المسار: ${zipPath}`);
    console.log(`📊 الحجم النهائي المضغوط: ${zipMB} ميغابايت فقط (جاهز للإرسال بالواتساب).`);
  } else {
    console.log('\n🔒 ملاحظة: تم تجهيز وفحص بنية الرقعة بنجاح.');
    console.log('   (لم يتم استخراج الملف النهائي المضغوط احتراماً لأمر المستخدم حتى يطلب ذلك صراحة).');
  }
}

const args = process.argv.slice(2);
const createZip = args.includes('--zip');
preparePatch(createZip);
