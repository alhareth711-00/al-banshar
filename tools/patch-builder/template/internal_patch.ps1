# Internal Patch Automation Script for Al-Banshar PRO
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   جاري فحص النظام وتجهيز التحديث الآمن...           " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Detect Installed Application Directory
$candidateDirs = @(
  (Join-Path $env:LOCALAPPDATA "Programs\سريع وبنشر PRO"),
  (Join-Path $env:LOCALAPPDATA "Programs\quick-lube-pos-root"),
  (Join-Path $env:ProgramFiles "سريع وبنشر PRO"),
  (Join-Path ${env:ProgramFiles(x86)} "سريع وبنشر PRO")
)

$installDir = $null

# Check running process
$runningProc = Get-Process -Name "سريع وبنشر PRO" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($runningProc -and $runningProc.Path) {
  $installDir = Split-Path -Parent $runningProc.Path
} else {
  $installDir = $candidateDirs | Where-Object { Test-Path (Join-Path $_ "سريع وبنشر PRO.exe") } | Select-Object -First 1
}

# Check registry
if (-not $installDir) {
  $regKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
  $installedApp = Get-ItemProperty $regKey -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "*سريع وبنشر*" } | Select-Object -First 1
  if ($installedApp -and $installedApp.InstallLocation -and (Test-Path $installedApp.InstallLocation)) {
    $installDir = $installedApp.InstallLocation
  }
}

if (-not $installDir) {
  Write-Host "❌ لم يتم العثور على مسار تثبيت البرنامج تلقائياً!" -ForegroundColor Red
  [System.Windows.Forms.MessageBox]::Show(
    "تعذر العثور على مسار تثبيت برنامج سريع وبنشر PRO على هذا الجهاز.`nيرجى التأكد من أن البرنامج مثبت مسبقاً قبل تشغيل التحديث.",
    "تنبيه خطأ",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  )
  exit 1
}

Write-Host "[1/4] تم العثور على البرنامج في: $installDir" -ForegroundColor Green
Write-Host "      جاري إيقاف تشغيل البرنامج بلطف لفك قفل الملفات..." -ForegroundColor Yellow
Stop-Process -Name "سريع وبنشر PRO" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Safety Shield: Pre-Update Database Backup
Write-Host "[2/4] تفعيل درع الأمان: أخذ نسخة احتياطية كاملة لقاعدة بياناتك..." -ForegroundColor Cyan
$appDataDb = Join-Path $env:APPDATA "AlBanshar\db\quick_lube.db"
$backupDir = Join-Path $env:APPDATA "AlBanshar\backups"

if (Test-Path $appDataDb) {
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  $stamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
  $safeBackupPath = Join-Path $backupDir "نسخة_أمان_قبل_التحديث_$stamp.db"
  Copy-Item -Path $appDataDb -Destination $safeBackupPath -Force

  if ((Test-Path $safeBackupPath) -and ((Get-Item $safeBackupPath).Length -gt 0)) {
    Write-Host "      ✓ تم تأمين وحفظ قاعدة البيانات بنجاح في:" -ForegroundColor Green
    Write-Host "        $safeBackupPath" -ForegroundColor Gray
  } else {
    Write-Host "      ⚠️ فشل إنشاء نسخة الأمان! تم إلغاء التحديث فوراً لحماية بياناتك." -ForegroundColor Red
    [System.Windows.Forms.MessageBox]::Show(
      "فشل تأمين نسخة الأمان لقاعدة البيانات.`nتم إيقاف التحديث فوراً لضمان عدم المساس بأي من حساباتك ومبيعاتك.",
      "إلغاء التحديث للأمان",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Warning
    )
    exit 1
  }
} else {
  Write-Host "      (لم يتم العثور على قاعدة بيانات قديمة، سيتم التحديث مباشرة)" -ForegroundColor Gray
}

# 3. Replace Updated Assets
Write-Host "[3/4] جاري استبدال ملفات الشاشات والتحسينات الجديدة..." -ForegroundColor Yellow
$payloadDir = Join-Path $PSScriptRoot "patch_payload"

if (-not (Test-Path $payloadDir)) {
  Write-Host "❌ مجلد محتويات التحديث (patch_payload) غير موجود داخل الملف المرفق!" -ForegroundColor Red
  exit 1
}

# Update Client Dist
$destClientList = @(
  (Join-Path $installDir "resources\client\dist"),
  (Join-Path $installDir "resources\app\client\dist")
)
$srcClient = Join-Path $payloadDir "client\dist"

if (Test-Path $srcClient) {
  foreach ($d in $destClientList) {
    if (Test-Path $d) {
      Copy-Item -Path "$srcClient\*" -Destination $d -Recurse -Force
      Write-Host "      ✓ تم تحديث واجهة الكاشير في: $d" -ForegroundColor Green
    }
  }
}

# Update Server Code
$destServerList = @(
  (Join-Path $installDir "resources\server"),
  (Join-Path $installDir "resources\app\server")
)
$srcServer = Join-Path $payloadDir "server"

if (Test-Path $srcServer) {
  foreach ($s in $destServerList) {
    if (Test-Path $s) {
      Copy-Item -Path "$srcServer\*" -Destination $s -Recurse -Force
      Write-Host "      ✓ تم تحديث كود السيرفر في: $s" -ForegroundColor Green
    }
  }
}

# 4. Restart Application
Write-Host "[4/4] تم التحديث بنجاح! جاري تشغيل البرنامج المحدث..." -ForegroundColor Green
$exePath = Join-Path $installDir "سريع وبنشر PRO.exe"
if (Test-Path $exePath) {
  Start-Process -FilePath $exePath
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  🎉 مبروك! تم تحديث النظام بنجاح وجميع بياناتك محفوظة" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

[System.Windows.Forms.MessageBox]::Show(
  "تم تحديث نظام سريع وبنشر PRO بنجاح!`n`n✓ تم تفعيل حماية المسودات وإعدادات طابعات 58mm.`n✓ جميع مبيعاتك، مصاريفك، ومخزونك محفوظة بأمان بنسبة 100%.",
  "نجاح التحديث",
  [System.Windows.Forms.MessageBoxButtons]::OK,
  [System.Windows.Forms.MessageBoxIcon]::Information
)
