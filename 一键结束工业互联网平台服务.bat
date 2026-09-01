@echo off
title Stop Industrial Internet Platform Services
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\stop_all_platform_services.ps1" %*
set "stopResult=%errorlevel%"

echo.
if /i "%~1"=="-Preview" (
    echo Preview completed. No services were stopped.
    echo.
    pause
    exit /b %stopResult%
)
if "%stopResult%"=="0" (
    echo All platform services have been stopped. You can now edit or restart the platform.
) else (
    echo Some services could not be stopped. Please review the messages above.
)
echo.
pause
exit /b %stopResult%
