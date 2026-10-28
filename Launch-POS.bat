@echo off
title Beta Pharmacy POS - Terminal Launcher
echo ======================================================================
echo   BETA PHARMACY POS - 1-CLICK SILENT PRINT TERMINAL LAUNCHER
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking POS Server status on port 3000...
powershell -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 3000 -InformationLevel Quiet" > nul 2>&1
if %errorlevel% neq 0 (
    echo [2/3] Starting Beta Pharmacy POS server...
    start /min "Beta POS Engine" cmd /c "npm run dev"
    echo Waiting for server to initialize...
    powershell -Command "Start-Sleep -Seconds 3"
) else (
    echo [2/3] POS server is already running on port 3000.
)

echo [3/3] Launching Zero-Popup Kiosk Printing Terminal...
set TARGET_URL=http://localhost:3000

:: Check for Microsoft Edge (Standard on Windows 10/11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)

:: Check for Google Chrome
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)

:: Fallback if neither found in standard location
start "" msedge.exe --kiosk-printing --app="%TARGET_URL%"

:done
echo.
echo Terminal launched successfully!
echo Silent printing active: Press F10 or click [Print Bill] for instant dot-matrix printing.
timeout /t 3 > nul
