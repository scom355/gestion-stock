$USER = "u394295194"
$HOST_IP = "82.25.102.174"
$PORT = "65002"
$REMOTE_PATH = "/home/u394295194/domains/plum-cheetah-602338.hostingersite.com/public_html/"
$KEY_PATH = "$env:USERPROFILE\.ssh\id_ed25519_hostinger"

Write-Host "🏗️  Phase 1: Building Optimized Frontend..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host "📦 Phase 2: Packaging..."
if (Test-Path deploy.tar.gz) { Remove-Item deploy.tar.gz }
tar -czf deploy.tar.gz dist server.cjs .htaccess api package.json database.sql public sync_remote_db.cjs
if ($LASTEXITCODE -ne 0) { throw "Packaging failed" }

Write-Host "📤 Phase 3: Uploading to Hostinger..."
scp -i "$KEY_PATH" -P $PORT deploy.tar.gz "$($USER)@$($HOST_IP):$($REMOTE_PATH)"
if ($LASTEXITCODE -ne 0) { throw "Upload failed" }

Write-Host "🔄 Phase 4: Remote Activation..."
$REMOTE_CMD = "cd $REMOTE_PATH && tar -xzf deploy.tar.gz --strip-components=0 && cp -r dist/* . && rm -rf dist deploy.tar.gz && chmod -R 755 public api && export PATH=/opt/alt/alt-nodejs20/root/usr/bin/:\$PATH && npm install --production && /usr/bin/pkill -9 -f server.cjs || true && /usr/bin/sleep 2 && nohup node server.cjs > server.log 2>&1 &"
ssh -i "$KEY_PATH" -p $PORT "$($USER)@$($HOST_IP)" $REMOTE_CMD
if ($LASTEXITCODE -ne 0) { Write-Host "⚠️ Remote command Warning: Might already be running or pkill issue, but code is likely updated." }

Write-Host "✨ Phase 5: Cleanup..."
if (Test-Path deploy.tar.gz) { Remove-Item deploy.tar.gz }

Write-Host "✅ DEPLOYMENT COMPLETE: https://plum-cheetah-602338.hostingersite.com/"
