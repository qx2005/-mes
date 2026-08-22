@echo off
title 停止工业互联网平台服务
cd /d %~dp0

echo 正在停止平台UI（Nginx）...
call "%~dp0\50停止平台UI.bat"

echo 正在停止后端服务（按端口杀进程）...

call :killPort 8080
call :killPort 8090
call :killPort 6379
call :killPort 3306
call :killPort 5432
call :killPort 1893
call :killPort 8161
call :killPort 9000
call :killPort 9001

echo 停止完成。
pause
exit /b 0

:killPort
set port=%1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%port%" ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>&1
)
exit /b 0
