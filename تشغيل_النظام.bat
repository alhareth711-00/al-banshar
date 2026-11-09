@echo off
cd /d "%~dp0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>nul
start "POS Server" /min cmd /c "node server/index.js"
ping 127.0.0.1 -n 3 >nul
start msedge --app=http://localhost:5000 --kiosk-printing || start http://localhost:5000
exit
