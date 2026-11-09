@echo off
chcp 65001 >nul
title سريع وبنشر PRO - وضع سطح المكتب المستقل
color 0B
cd /d "%~dp0"
echo ======================================================================
echo    نظام سريع وبنشر PRO - تشغيل تطبيق سطح المكتب (Electron Desktop)
echo    وضع الكشك الكامل (Full Kiosk Mode) - اضغط F11 لتصغير النافذة
echo ======================================================================
echo.
echo جاري تشغيل شاشة النظام في بيئة سطح مكتب مستقلة...
if exist "node_modules\.bin\electron.cmd" (
    call "node_modules\.bin\electron.cmd" .
) else (
    npx electron .
)
