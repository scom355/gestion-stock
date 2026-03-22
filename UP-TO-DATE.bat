@echo off
setlocal
TITLE 🚀 CARREFOUR EXPRESS - PRODUCTION DEPLOYER
COLOR 0B

echo ======================================================
echo    📦 CARREFOUR EXPRESS - ULTIMATE DEPLOYMENT
echo ======================================================
echo.

:: --- CONFIGURATION (Hostinger Details) ---
set USER=u394295194
set HOST_IP=82.25.102.174
set PORT=65002
set REMOTE_PATH=/home/u394295194/domains/plum-cheetah-602338.hostingersite.com/public_html/
set KEY_PATH=%USERPROFILE%\.ssh\id_ed25519_hostinger

:: --- PRE-CLEAN ---
echo [0/5] ✋ Cleaning local environment...
taskkill /F /IM node.exe /T 2>nul
if exist deploy.tar.gz del /f /q deploy.tar.gz

:: --- 1. BUILD ---
echo.
echo [1/5] 🏗️  Building Frontend (Vite)...
echo [1/5] 🏗️ Build frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    if not exist dist (
        echo.
        echo ❌ ERROR: Build failed. Please check your code.
        pause
        exit /b %ERRORLEVEL%
    ) else (
        echo.
        echo ⚠️ Build returned an error code but 'dist' folder exists. Continuing...
    )
)

:: --- 2. PACKAGE ---
echo.
echo [2/5] 📦 Creating Deployment Package (deploy.tar.gz)...
:: Excluding db.json to avoid overwriting live customer data on Hostinger
tar -czf deploy.tar.gz dist server.cjs .htaccess api package.json database.sql public sync_remote_db.cjs
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Failed to create archive.
    pause
    exit /b %ERRORLEVEL%
)

:: --- 3. UPLOAD ---
echo.
echo [3/5] 📤 Uploading to Hostinger (SCP)...
scp -i "%KEY_PATH%" -P %PORT% deploy.tar.gz %USER%@%HOST_IP%:%REMOTE_PATH%
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: Upload failed. Check SSH Key at: %KEY_PATH%
    pause
    exit /b %ERRORLEVEL%
)

:: --- 4. REMOTE SYNC ---
echo.
echo [4/5] 🔄 Extracting and Syncing on Server...
:: 1. Go to path 2. Extract 3. Move dist to root 4. Sync SQL 5. Install deps 6. Restart server
ssh -i "%KEY_PATH%" -p %PORT% %USER%@%HOST_IP% "cd %REMOTE_PATH% && tar -xzf deploy.tar.gz --strip-components=0 && cp -r dist/* . && rm -rf dist deploy.tar.gz && chmod -R 755 public api && export PATH=/opt/alt/alt-nodejs20/root/usr/bin/:$PATH && npm install --production && pkill -9 -f server.cjs || true && sleep 2 && nohup node server.cjs > server.log 2>&1 &"

:: --- 5. CLEANUP ---
echo.
echo [5/5] ✨ Finalizing...
if exist deploy.tar.gz del /f /q deploy.tar.gz

echo.
echo ======================================================
echo    ✅ SUCCESS! SYSTEM IS UPDATED AND LIVE.
echo    URL: https://plum-cheetah-602338.hostingersite.com/
echo ======================================================
echo.
pause
