#!/usr/bin/env bash
# رفع مجدول التذكيرات التلقائية وإعادة تشغيل pm2
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_DIR="$ROOT/scripts/reminder-scheduler"
SERVER="root@72.62.178.181"
REMOTE="/opt/academic-reminder-scheduler"

[[ -f "$LOCAL_DIR/reminder-scheduler.mjs" ]] || { echo "Missing scheduler file"; exit 1; }

echo "Uploading scheduler..."
ssh "$SERVER" "mkdir -p $REMOTE"
scp "$LOCAL_DIR/package.json" "$LOCAL_DIR/reminder-scheduler.mjs" "${SERVER}:${REMOTE}/"

if [[ -f "$LOCAL_DIR/.env" ]]; then
  echo "Uploading .env..."
  scp "$LOCAL_DIR/.env" "${SERVER}:${REMOTE}/.env"
else
  echo "Warning: no local .env — keep existing VPS .env"
fi

echo "Installing deps + restart pm2..."
ssh "$SERVER" "cd $REMOTE && npm install --omit=dev && pm2 delete academic-reminders 2>/dev/null || true && pm2 start reminder-scheduler.mjs --name academic-reminders && pm2 save && sleep 2 && pm2 logs academic-reminders --lines 25 --nostream"

echo ""
echo "Done. Test: ssh $SERVER 'cd $REMOTE && node reminder-scheduler.mjs --once --slot=status'"
echo "Force send homework now: ssh $SERVER 'cd $REMOTE && node reminder-scheduler.mjs --once --slot=hw --force'"
