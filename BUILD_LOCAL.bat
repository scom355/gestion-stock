@echo off
setlocal
TITLE 📦 CARREFOUR EXPRESS - LOCAL BUILDER
COLOR 0B

echo ======================================================
echo    🏗️  CARREFOUR EXPRESS - LOCAL PRODUCTION TEST
echo ======================================================
echo.

:: --- 1. KILL EXISTING ---
echo [1/3] 🛑 Stopping old Node processes...
taskkill /F /IM node.exe /T 2>nul

:: --- 2. BUILD ---
echo.
echo [2/3] 🏗️  Building Frontend (Vite)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: Build failed. Check your JS/React code.
    pause
    exit /b %ERRORLEVEL%
)

:: --- 3. RUN LOCAL SERVER ---
echo.
echo [3/3] 🚀 Starting Local Production Server...
echo Visit: http://localhost:5000 (or your configured port)
echo.
node server.cjs
pause
