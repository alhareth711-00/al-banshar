@echo off
chcp 65001 >nul
title سريع وبنشر PRO - Quick Lube & Tire Touch POS
color 0A
echo ======================================================================
echo       نظام سريع وبنشر PRO - إدارة ورش تغيير الزيوت والبناشر
echo       Quick Lube & Tire Touch Specialized POS & Accounting (Yemen)
echo ======================================================================
echo.
echo [1/3] جاري تشغيل خادم النظام وقاعدة البيانات المحلية (Backend Port 5000)...
start "Quick Lube Server" /min cmd /c "node server/index.js"

echo [2/3] جاري تشغيل واجهة نقطة البيع والشاشات اللمسية (Frontend Port 3000)...
start "Quick Lube Client" /min cmd /c "cd client && npm run dev"

echo [3/3] جاري فحص جاهزية النظام وفتح شاشة العمل...
timeout /t 3 /nobreak >nul

:: Launch in native Desktop App / Kiosk mode if Edge or Chrome is available
where msedge >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo فتح النظام في نافذة تطبيق مستقلة عبر Microsoft Edge...
    start msedge --app=http://localhost:3000 --window-size=1280,800
    goto DONE
)

where chrome >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo فتح النظام في نافذة تطبيق مستقلة عبر Google Chrome...
    start chrome --app=http://localhost:3000 --window-size=1280,800
    goto DONE
)

echo فتح النظام عبر المتصفح الافتراضي...
start http://localhost:3000

:DONE
echo.
echo ======================================================================
echo   ✅ النظام يعمل الآن بنجاح على العنوان: http://localhost:3000
echo   📖 اضغط F1 داخل النظام لفتح دليل التشغيل الميداني الشامل
echo   💾 النسخ الاحتياطي التلقائي يعمل يومياً في مجلد server/backups
echo   🛑 لإيقاف النظام بالكامل، قم بتشغيل: ايقاف_النظام.bat
echo ======================================================================
echo.
pause
