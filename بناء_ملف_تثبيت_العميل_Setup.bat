@echo off
chcp 65001 >nul
title تجهيز وبناء ملف تثبيت العميل Setup.exe
color 0A
echo ======================================================================
echo    نظام سريع وبنشر PRO - بناء مثبت ويندوز الرسمي (NSIS Installer)
echo ======================================================================
echo.
echo [1/3] جاري بناء وتحديث الواجهة الأمامية (Vite Production Build)...
call npm run client:build
echo.
echo [2/3] جاري إنتاج ملف التثبيت النهائي (Setup.exe) بكامل المكاتب المدمجة...
call npx electron-builder --win nsis
echo.
echo [3/3] جاري نسخ ملف التثبيت مباشرة إلى سطح المكتب...
copy /y "dist_desktop\سريع وبنشر PRO Setup 1.0.0.exe" "%USERPROFILE%\Desktop\سريع وبنشر PRO Setup 1.0.0.exe" >nul
echo.
echo ======================================================================
echo  ✅ اكتمل البناء بنجاح!
echo  📁 ملف التثبيت الرسمي متاح الآن في:
echo     1. المجلد المحلي: dist_desktop\سريع وبنشر PRO Setup 1.0.0.exe
echo     2. سطح المكتب: %USERPROFILE%\Desktop\سريع وبنشر PRO Setup 1.0.0.exe
echo ======================================================================
pause
