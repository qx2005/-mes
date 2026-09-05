@echo off
title Industrial Internet Platform Startup
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start_all_platform_services.ps1"
set "result=%errorlevel%"
echo.
if "%result%"=="0" goto success
echo Platform startup failed. Check the runtime-logs directory.
pause
exit /b %result%

:success
echo Platform is ready: http://127.0.0.1:82/
pause
exit /b 0
