@echo off
cd /d "%~dp0"

:: 1. Check if server is already running on port 5000
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto OPEN_APP

:: 2. Start node server minimized in background
start "" /min node server/index.js

:: 3. Wait for port 5000 (up to 8 seconds)
set RETRY=0
:WAIT_LOOP
ping 127.0.0.1 -n 2 >nul
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto OPEN_APP
set /a RETRY+=1
if %RETRY% LSS 8 goto WAIT_LOOP

:OPEN_APP
:: 4. Launch Edge App Mode
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5000 --window-size=1366,768
    exit
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5000 --window-size=1366,768
    exit
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000 --window-size=1366,768
    exit
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000 --window-size=1366,768
    exit
)

start http://localhost:5000
exit
