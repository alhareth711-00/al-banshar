@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================================
echo   جاري إنشاء اختصار سريع وبنشر PRO على سطح المكتب...
echo ========================================================

node server/scripts/manageShortcuts.js desktop

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] تم إنشاء الاختصار بنجاح على سطح المكتب!
    echo      يمكنك الآن تشغيل النظام مباشرة من أيقونة "سريع وبنشر PRO" على سطح المكتب.
) else (
    echo.
    echo [ERROR] حدث خطأ أثناء إنشاء الاختصار.
)
echo.
pause
