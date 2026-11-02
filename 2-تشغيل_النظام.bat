@echo off
cd /d "%~dp0"
start "POS Server" /min cmd /c "node server/index.js"
ping 127.0.0.1 -n 3 >nul
start msedge --app=http://localhost:5000 || start http://localhost:5000
exit
