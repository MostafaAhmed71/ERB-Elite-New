#!/usr/bin/env bash
# ============================================================
# استعادة northelite.tech بعد إعادة تشغيل السيرفر
# شغّل على السيرفر: bash vps-recover-after-reboot.sh
# ============================================================

set -euo pipefail

DOMAIN="northelite.tech"
WEB_ROOT="/var/www/northelite.tech"
LSWS="/usr/local/lsws"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "=========================================="
echo "  ERB Elite — Recover after reboot"
echo "=========================================="
echo ""

echo "[1/6] Checking site files..."
if [[ -f "$WEB_ROOT/index.html" ]]; then
  echo "       OK: $WEB_ROOT/index.html exists"
  ls -la "$WEB_ROOT/index.html"
else
  echo "       MISSING: $WEB_ROOT/index.html"
  echo "       Run update-server.sh from your PC first."
  exit 1
fi

echo ""
echo "[2/6] What is listening on port 80?"
ss -tlnp | grep ':80 ' || netstat -tlnp 2>/dev/null | grep ':80 ' || echo "       (could not detect)"

echo ""
echo "[3/6] Web server status..."
for svc in lshttpd openlitespeed nginx caddy; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    echo "       ACTIVE: $svc"
  fi
done
if [[ -x "$LSWS/bin/lswsctrl" ]]; then
  echo "       OpenLiteSpeed binary: $LSWS/bin/lswsctrl"
fi

echo ""
echo "[4/6] Re-applying OpenLiteSpeed vhost (static SPA, no Node.js)..."
if [[ -f "$SCRIPT_DIR/vps-setup-openlitespeed.sh" ]]; then
  bash "$SCRIPT_DIR/vps-setup-openlitespeed.sh"
else
  echo "       vps-setup-openlitespeed.sh not found — run from deploy/ folder"
  exit 1
fi

echo ""
echo "[5/6] Fixing permissions..."
chown -R lsadm:nogroup "$WEB_ROOT" 2>/dev/null \
  || chown -R nobody:nogroup "$WEB_ROOT" 2>/dev/null \
  || chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null \
  || true
chmod -R a+rX "$WEB_ROOT"

echo ""
echo "[6/6] Quick HTTP test..."
if command -v curl >/dev/null; then
  echo "       Local:"
  curl -sI -H "Host: $DOMAIN" http://127.0.0.1/ | head -5 || true
  echo ""
  echo "       Body preview:"
  curl -s -H "Host: $DOMAIN" http://127.0.0.1/ | head -3 || true
else
  echo "       curl not installed — skip"
fi

echo ""
echo "=========================================="
echo "  Done. Open: https://$DOMAIN"
echo "  Hard refresh: Ctrl+Shift+R"
echo ""
echo "  SSL error (NET::ERR_CERT_AUTHORITY_INVALID)?"
echo "  Run: bash vps-setup-ssl-openlitespeed.sh your@email.com"
echo ""
echo "  If still 'Hello World NodeJS':"
echo "  - Hostinger panel > Website > remove Node.js app"
echo "  - Set document root to $WEB_ROOT"
echo "=========================================="
echo ""
