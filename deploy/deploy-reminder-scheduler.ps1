# Deploy academic reminder scheduler to VPS (pm2)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$SchedulerDir = Join-Path $Root "scripts\reminder-scheduler"
$Server = "root@72.62.178.181"
$RemoteDir = "/opt/academic-reminder-scheduler"

if (-not (Test-Path $SchedulerDir)) {
  Write-Error "Scheduler folder not found: $SchedulerDir"
}

Write-Host "Uploading scheduler to $Server ..."
ssh $Server "mkdir -p $RemoteDir"
scp "$SchedulerDir\package.json" "$SchedulerDir\reminder-scheduler.mjs" "${Server}:${RemoteDir}/"

$LocalEnv = Join-Path $SchedulerDir ".env"
if (Test-Path $LocalEnv) {
  Write-Host "Uploading .env ..."
  scp $LocalEnv "${Server}:${RemoteDir}/.env"
} else {
  Write-Warning "No scripts/reminder-scheduler/.env - create it on VPS manually"
}

Write-Host "Installing dependencies ..."
ssh $Server "cd $RemoteDir && npm install --omit=dev"

Write-Host "Starting pm2 ..."
ssh $Server "cd $RemoteDir && pm2 delete academic-reminders; exit 0"
ssh $Server "cd $RemoteDir && pm2 start reminder-scheduler.mjs --name academic-reminders"
ssh $Server "pm2 save && pm2 list"

Write-Host ""
Write-Host "Done."
Write-Host "Logs: ssh $Server pm2 logs academic-reminders"
