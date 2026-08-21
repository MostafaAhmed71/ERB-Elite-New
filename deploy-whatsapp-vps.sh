#!/usr/bin/env bash
# رفع whatsapp-server.js وإعادة تشغيل pm2
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL="$ROOT/wppconnect-master/whatsapp-server.js"
SERVER="root@72.62.178.181"
REMOTE="/opt/wppconnect/whatsapp-server.js"

[[ -f "$LOCAL" ]] || { echo "Missing: $LOCAL"; exit 1; }

echo "Uploading..."
scp "$LOCAL" "${SERVER}:${REMOTE}"

echo "Restarting pm2..."
ssh "$SERVER" "cd /opt/wppconnect && pm2 restart all && sleep 3 && curl -s http://127.0.0.1:3001/status"

echo ""
echo "Done: https://wpp.northelite0.com/status"
echo "QR:   https://wpp.northelite0.com/qr"
