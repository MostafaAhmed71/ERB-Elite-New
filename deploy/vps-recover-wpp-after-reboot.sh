#!/usr/bin/env bash
# استعادة خادم واتساب بعد إعادة تشغيل السيرفر
set -euo pipefail

WPP_DIR="/opt/wppconnect"
DOMAIN="wpp.northelite0.com"

echo "==> Recover WhatsApp server ($DOMAIN)"

if [[ ! -d "$WPP_DIR" ]]; then
  echo "Error: $WPP_DIR not found"
  exit 1
fi

cd "$WPP_DIR"

echo "[1/4] Starting pm2..."
if command -v pm2 >/dev/null; then
  pm2 resurrect 2>/dev/null || true
  pm2 start whatsapp-server.js --name wppconnect 2>/dev/null || pm2 restart wppconnect 2>/dev/null || pm2 restart all
  pm2 save
else
  echo "pm2 not found — start manually: cd $WPP_DIR && node whatsapp-server.js"
fi

sleep 3

echo "[2/4] Local status (port 3001)..."
curl -s http://127.0.0.1:3001/status || echo "       NOT RUNNING on :3001"

echo ""
echo "[3/4] Re-apply OpenLiteSpeed proxy (if deploy scripts present)..."
if [[ -f /root/northelite-deploy/vps-setup-wpp-openlitespeed.sh ]]; then
  bash /root/northelite-deploy/vps-setup-wpp-openlitespeed.sh
elif [[ -f ./vps-setup-wpp-openlitespeed.sh ]]; then
  bash ./vps-setup-wpp-openlitespeed.sh
else
  echo "       Skip — upload deploy/vps-setup-wpp-openlitespeed.sh"
fi

echo ""
echo "[4/4] Public test..."
curl -skI "https://$DOMAIN/status" 2>/dev/null | head -3 || curl -sI "http://$DOMAIN/status" | head -3 || true

echo ""
echo "Open: https://$DOMAIN/qr"
echo ""
