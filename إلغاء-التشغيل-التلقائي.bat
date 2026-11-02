@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ====================================================================
echo   جاري إلغاء إقلاع نظام سريع وبنشر PRO التلقائي مع الويندوز...
echo ====================================================================

node server/scripts/manageShortcuts.js remove_startup

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] تم إيقاف التشغيل التلقائي بنجاح.
) else (
    echo.
    echo [ERROR] حدث خطأ أثناء إلغاء التشغيل التلقائي.
)
echo.
pause
