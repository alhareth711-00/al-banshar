@echo off
chcp 65001 > nul
title فحص نظام البنشر التفاعلي — 6 مراحل
color 0B
echo.
echo ====================================================================
echo   جاري تشغيل جناح الفحص التفاعلي السداسي لنظام البنشر Pro
echo ====================================================================
echo.
cd /d "%~dp0server"
node scripts/masterInteractiveAudit.js
echo.
pause
