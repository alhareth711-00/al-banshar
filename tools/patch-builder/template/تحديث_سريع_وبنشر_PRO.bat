@echo off
chcp 65001 >nul
title تحديث نظام سريع وبنشر PRO
cls
echo ======================================================================
echo           أداة التحديث السريع والآمن - نظام سريع وبنشر PRO
echo ======================================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0internal_patch.ps1"

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ⚠️ واجه التحديث مشكلة أو تم إلغاؤه لحماية بياناتك.
  echo اضغط أي مفتاح للإغلاق...
  pause >nul
)
