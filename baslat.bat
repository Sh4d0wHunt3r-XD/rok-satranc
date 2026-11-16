@echo off
chcp 65001 >nul
title Rok Satranc
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js bulunamadi. https://nodejs.org adresinden kurup tekrar dene.
  echo.
  pause
  exit /b
)
node server.js --ac
pause
