@echo off
chcp 65001 >nul
cd /d "%~dp0..\bridge"
if not exist node_modules (
  echo Installing bridge dependencies...
  call npm install
)
if not exist .env (
  copy .env.example .env
  echo Created bridge\.env from .env.example - please edit DB/MQTT settings.
)
echo Starting production line bridge on port 8080...
npm start
