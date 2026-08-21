# Upload updated whatsapp-server.js to VPS and restart
# Remote path: /opt/wppconnect/whatsapp-server.js

$ErrorActionPreference = "Stop"
$LocalFile = Join-Path $PSScriptRoot "wppconnect-master\whatsapp-server.js"
$Server = "root@72.62.178.181"
$RemoteFile = "/opt/wppconnect/whatsapp-server.js"
$RemoteTarget = "${Server}:${RemoteFile}"

if (-not (Test-Path $LocalFile)) {
  Write-Error "File not found: $LocalFile"
}

Write-Host "Uploading to $RemoteTarget ..."
scp $LocalFile $RemoteTarget

Write-Host "Restarting WhatsApp server on VPS ..."
ssh $Server "cd /opt/wppconnect && pm2 restart all && sleep 3 && curl -s http://127.0.0.1:3001/status"

Write-Host ""
Write-Host "Done. Open https://wpp.northelite0.com/status"
Write-Host "Expected: version 2 and connected true"
Write-Host "If connecting: scan QR at https://wpp.northelite0.com/qr"
