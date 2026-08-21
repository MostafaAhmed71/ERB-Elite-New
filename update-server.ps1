# ============================================================
# ERB Elite — رفع التحديث إلى السيرفر (northelite.tech)
# الاستخدام:
#   .\update-server.ps1
#   .\update-server.ps1 -SkipBuild
# ============================================================

param(
  [switch]$SkipBuild,
  [string]$Server = "root@72.62.178.181",
  [string]$RemoteDir = "/var/www/northelite.tech",
  [string]$SiteUrl = "https://northelite.tech"
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Archive = Join-Path $env:TEMP "northelite-dist.tar.gz"

Set-Location $Root

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ERB Elite - Deploy Update" -ForegroundColor Cyan
Write-Host "  Server: $Server" -ForegroundColor Cyan
Write-Host "  Target: $RemoteDir" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env")) {
  Write-Warning ".env not found - build may miss VITE_* variables"
}

if (-not $SkipBuild) {
  Write-Host "[1/4] Building..." -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "[1/4] Skipping build (-SkipBuild)" -ForegroundColor DarkYellow
}

if (-not (Test-Path "dist\index.html")) {
  Write-Error "dist\index.html not found. Run without -SkipBuild first."
}

Write-Host "[2/4] Packaging dist..." -ForegroundColor Yellow
if (Test-Path $Archive) { Remove-Item $Archive -Force }
tar -czf $Archive -C dist .
$sizeMb = [math]::Round((Get-Item $Archive).Length / 1MB, 2)
Write-Host "       Archive: $sizeMb MB" -ForegroundColor DarkGray

Write-Host "[3/4] Uploading..." -ForegroundColor Yellow
ssh $Server "mkdir -p $RemoteDir"
scp $Archive "${Server}:/tmp/northelite-dist.tar.gz"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Upload failed. Check SSH access." -ForegroundColor Red
  exit 1
}

Write-Host "[4/4] Extracting on VPS..." -ForegroundColor Yellow
$remoteCmd = @"
set -e
cd $RemoteDir
tar -xzf /tmp/northelite-dist.tar.gz
rm -f /tmp/northelite-dist.tar.gz
chmod -R a+rX $RemoteDir
if systemctl is-active --quiet caddy 2>/dev/null; then
  systemctl reload caddy && echo 'Reloaded caddy'
elif systemctl is-active --quiet nginx 2>/dev/null; then
  systemctl reload nginx && echo 'Reloaded nginx'
elif systemctl is-active --quiet lshttpd 2>/dev/null || systemctl is-active --quiet openlitespeed 2>/dev/null; then
  if [ -x /usr/local/lsws/bin/lswsctrl ]; then
    /usr/local/lsws/bin/lswsctrl restart && echo 'Restarted OpenLiteSpeed'
  else
    systemctl restart lshttpd 2>/dev/null || systemctl restart openlitespeed
    echo 'Restarted OpenLiteSpeed (systemd)'
  fi
else
  echo 'Warning: files updated but no active web server service found to reload'
fi
echo OK
"@
ssh $Server $remoteCmd
if ($LASTEXITCODE -ne 0) {
  Write-Host "Remote extract failed." -ForegroundColor Red
  exit 1
}

Remove-Item $Archive -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deploy complete!" -ForegroundColor Green
Write-Host "Site: $SiteUrl" -ForegroundColor Green
Write-Host "Tip: hard refresh Ctrl+Shift+R if old version shows" -ForegroundColor DarkGray
Write-Host ""
