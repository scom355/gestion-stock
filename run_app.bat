@echo off
TITLE Gestion Stock - Launcher
COLOR 0B

echo ==========================================
echo    🚀 GESTION STOCK - AUTO LAUNCHER
echo ==========================================
echo.

cd /d "c:\Users\sohai\.gemini\antigravity\scratch\gestion-stock"

echo [1/2] Starting Backend Server...
start /b node server.cjs
timeout /t 3 > nul

echo [2/2] Starting Frontend Development Server...
start "" npm run dev

echo.
echo ==========================================
echo    ✅ System is starting! 
echo    Keep this window open.
echo ==========================================
pause
