@echo off
setlocal
echo ======================================================
echo 🚀 CARREFOUR EXPRESS - OPTIMIZED DEPLOYMENT
echo ======================================================

:: --- CONFIGURATION ---
set USER=u394295194
set HOST_IP=82.25.102.174
set PORT=65002
set REMOTE_PATH=/home/u394295194/domains/plum-cheetah-602338.hostingersite.com/public_html/
set KEY_PATH=%USERPROFILE%\.ssh\id_ed25519_hostinger

:: --- 1. BUILD ---
echo [1/4] 🏗️ Building Project (Vite)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Build failed. Deployment aborted.
    pause
    exit /b %ERRORLEVEL%
)

:: --- 2. PACKAGE ---
echo [2/4] 📦 Creating Deployment Package...
:: Note: db.json is EXCLUDED to prevent overwriting live production data
tar -czf deploy.tar.gz dist server.cjs .htaccess api package.json database.sql public
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Failed to create package.
    pause
    exit /b %ERRORLEVEL%
)

:: --- 3. UPLOAD ---
echo [3/4] 📤 Uploading to Hostinger via SCP...
scp -i "%KEY_PATH%" -P %PORT% deploy.tar.gz %USER%@%HOST_IP%:%REMOTE_PATH%
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Upload failed. Check your SSH key or internet.
    pause
    exit /b %ERRORLEVEL%
)

:: --- 4. EXTRACT & RESTART ---
echo [4/4] 🔄 Finalizing on Server (Extract, Permissions, Restart)...
ssh -i "%KEY_PATH%" -p %PORT% %USER%@%HOST_IP% "cd %REMOTE_PATH% && tar -xzf deploy.tar.gz --strip-components=0 && cp -r dist/* . && chmod -R 755 assets api && rm -rf dist deploy.tar.gz && pkill -9 -f server.cjs || true && sleep 2 && export PATH=/opt/alt/alt-nodejs20/root/usr/bin/:\$PATH && npm install --production && nohup node server.cjs > server.log 2>&1 &"

echo ======================================================
echo ✅ SUCCESS! The system is updated and LIVE.
echo URL: https://plum-cheetah-602338.hostingersite.com/
echo ======================================================
del deploy.tar.gz
pause
