@echo off
chcp 65001 >nul
title MES 平台与在线 IDE 启动
cd /d "%~dp0"

"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start_ui_and_ide.ps1"
if errorlevel 1 (
  echo.
  echo 启动失败，请查看上方提示。
) else (
  echo.
  echo 平台启动完成：http://127.0.0.1:82/
)
pause
