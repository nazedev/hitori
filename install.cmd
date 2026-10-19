@echo off
setlocal

set "PS_SCRIPT=%~dp0install.ps1"

echo   Launching PowerShell installer...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

endlocal
