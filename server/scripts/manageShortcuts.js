const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const mode = process.argv[2] || 'desktop'; // 'desktop', 'startup', 'remove_startup'

const projectRoot = path.resolve(__dirname, '..', '..');
const desktopDir = path.join(os.homedir(), 'Desktop');
const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const startupDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');

const vbsLauncher = path.join(projectRoot, 'run_silent.vbs');

function createShortcut(shortcutPath, description) {
  // Use powershell with Base64 encoded UTF-16LE to avoid ANY character encoding or quoting issues
  const script = `
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$s.TargetPath = 'wscript.exe'
$s.Arguments = '"${vbsLauncher.replace(/"/g, '`"')}"'
$s.WorkingDirectory = '${projectRoot.replace(/'/g, "''")}'
$s.Description = '${description.replace(/'/g, "''")}'
$s.IconLocation = 'shell32.dll,13'
$s.Save()
`;
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { stdio: 'inherit' });
}

if (mode === 'desktop') {
  const dest = path.join(desktopDir, 'سريع وبنشر PRO.lnk');
  createShortcut(dest, 'نظام سريع وبنشر PRO لنقاط البيع وإدارة البناشر');
  console.log('✅ تم إنشاء اختصار سطح المكتب بنجاح:');
  console.log(`   ${dest}`);
} else if (mode === 'startup') {
  const dest = path.join(startupDir, 'سريع وبنشر PRO.lnk');
  createShortcut(dest, 'إقلاع تلقائي لنظام سريع وبنشر PRO عند تشغيل الجهاز');
  console.log('✅ تم تفعيل التشغيل التلقائي مع الويندوز بنجاح:');
  console.log(`   ${dest}`);
} else if (mode === 'remove_startup') {
  const dest = path.join(startupDir, 'سريع وبنشر PRO.lnk');
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
    console.log('✅ تم إزالة الاختصار من مجلد الإقلاع التلقائي بنجاح.');
  } else {
    console.log('ℹ️ لم يتم العثور على اختصار في مجلد الإقلاع التلقائي.');
  }
} else {
  console.error('Unknown mode:', mode);
  process.exit(1);
}
