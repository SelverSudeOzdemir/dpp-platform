@echo off
cd /d "%~dp0frontend"
start http://localhost:3000
npm run dev
pause
