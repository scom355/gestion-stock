# 🚀 SSH Deployment Script for Hostinger
# Usage: .\deploy.ps1

$USER = "u394295194"
$HOST_IP = "82.25.102.174"
$PORT = "65002"
$REMOTE_PATH = "/home/u394295194/domains/plum-cheetah-602338.hostingersite.com/public_html/"
$KEY_PATH = "$HOME\.ssh\id_ed25519_hostinger"

Write-Host "--- 🏗️ Building Project ---" -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Aborting deployment." -ForegroundColor Red
    exit
}

Write-Host "--- 📤 Uploading Frontend (dist) ---" -ForegroundColor Cyan
scp -i $KEY_PATH -P $PORT -r dist/* "${USER}@${HOST_IP}:${REMOTE_PATH}"

Write-Host "--- 📤 Uploading Backend (server.cjs) ---" -ForegroundColor Cyan
scp -i $KEY_PATH -P $PORT server.cjs "${USER}@${HOST_IP}:${REMOTE_PATH}"

Write-Host "--- 📤 Uploading Configuration (.htaccess) ---" -ForegroundColor Cyan
scp -i $KEY_PATH -P $PORT .htaccess "${USER}@${HOST_IP}:${REMOTE_PATH}"

Write-Host "--- 🔄 Restarting Node Server ---" -ForegroundColor Cyan
# Using a single-quoted string to prevent PS from parsing special characters like &
$cmdRestart = 'pkill -f node; export PATH=/opt/alt/alt-nodejs20/root/usr/bin/:$PATH; cd ' + $REMOTE_PATH + '; nohup node server.cjs > server.log 2>&1 &'
ssh -i $KEY_PATH -p $PORT "${USER}@${HOST_IP}" $cmdRestart

Write-Host "--- ✅ Deployment Complete! ---" -ForegroundColor Green
Write-Host "Live URL: https://plum-cheetah-602338.hostingersite.com/" -ForegroundColor Yellow
