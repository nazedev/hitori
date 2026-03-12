@echo off
setlocal enabledelayedexpansion
title Install Dependencies (Node.js, FFmpeg, ImageMagick, Git, PM2, Yarn, etc.)

for /F "delims=#" %%E in ('"prompt #$E# & for %%E in (1) do rem"') do set ESC=%%E
set "RED=%ESC%[31m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "CYAN=%ESC%[36m"
set "PURPLE=%ESC%[35m"
set "NC=%ESC%[0m"

echo %CYAN%[INFO] Detecting Windows environment...%NC%
echo.

REM Check if winget is available
where winget >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR] 'winget' was not found. Please ensure you are running a modern version of Windows 10/11.%NC%
    pause
    exit /b 1
)

echo %CYAN%[INFO]%NC% Installing Git...
winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements

echo %CYAN%[INFO]%NC% Installing Node.js...
winget install -e --id OpenJS.NodeJS --accept-source-agreements --accept-package-agreements

echo %CYAN%[INFO]%NC% Installing FFmpeg...
winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements

echo %CYAN%[INFO] Midnight Commander (mc) is skipped as it is natively for Unix-like systems.%NC%

echo %CYAN%[INFO] Installing PM2 and Yarn globally...%NC%
call npm install -g pm2 yarn

if exist "package.json" (
    echo %CYAN%[INFO] Found package.json. Running 'yarn install' for the project...%NC%
    call yarn install
) else (
    echo %YELLOW%[WARNING] No package.json found. Skipping project dependency installation.%NC%
)

echo.
echo ==========================================================
echo %GREEN%[SUCCESS] All supported dependencies have been installed!%NC%
echo %YELLOW%[WARNING] IMPORTANT: Please RESTART your command prompt 
echo or terminal window so the system can register the new environment variables.%NC%
echo ==========================================================
echo %PURPLE%[START] Starting application...%NC%
call npm start
pause