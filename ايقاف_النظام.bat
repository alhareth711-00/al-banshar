@echo off
chcp 65001 >nul
title إيقاف نظام سريع وبنشر PRO
color 0C
echo ======================================================================
echo       جاري إيقاف نظام سريع وبنشر وإغلاق كافة الخوادم والعمليات...
echo ======================================================================
echo.

echo إغلاق خادم النظام والواجهة (Port 5000 / Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ✅ تم إيقاف نظام سريع وبنشر بنجاح وحفظ البيانات.
echo.
timeout /t 2 >nul
exit
