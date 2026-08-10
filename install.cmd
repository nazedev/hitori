@echo off
setlocal

:: Determine the path to the PowerShell script (same directory as this CMD file)
set "PS_SCRIPT=%~dp0install.ps1"

echo Launching PowerShell installer...
echo.

:: Launch the PowerShell script bypassing execution policies
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

endlocal
