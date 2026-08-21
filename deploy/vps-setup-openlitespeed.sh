#!/bin/bash
# إعداد northelite.tech على OpenLiteSpeed — ملفات ثابتة (بدون Node.js)
# شغّل على السيرفر من مجلد deploy:
#   bash vps-setup-openlitespeed.sh

set -euo pipefail

DOMAIN="northelite.tech"
WEB_ROOT="/var/www/northelite.tech"
LSWS="/usr/local/lsws"
VHOST_DIR="$LSWS/conf/vhosts/$DOMAIN"
VHOST_CONF="$VHOST_DIR/vhost.conf"
HTTPD_CONF="$LSWS/conf/httpd_config.conf"

echo "==> ERB Elite — OpenLiteSpeed setup for $DOMAIN"
echo ""

if [[ ! -d "$LSWS" ]]; then
  echo "Error: OpenLiteSpeed not found at $LSWS"
  exit 1
fi

echo "[1/5] Creating web root $WEB_ROOT ..."
mkdir -p "$WEB_ROOT"
chown -R lsadm:nogroup "$WEB_ROOT" 2>/dev/null || chown -R nobody:nogroup "$WEB_ROOT" 2>/dev/null || true
chmod -R a+rX "$WEB_ROOT"

echo "[2/5] Installing vhost config ..."
mkdir -p "$VHOST_DIR/logs"
if [[ -f "openlitespeed-vhost-northelite.tech.conf" ]]; then
  cp "openlitespeed-vhost-northelite.tech.conf" "$VHOST_CONF"
else
  echo "Error: openlitespeed-vhost-northelite.tech.conf not found in current directory"
  exit 1
fi

echo "[3/5] Registering virtual host in httpd_config.conf ..."
if ! grep -q "virtualhost $DOMAIN" "$HTTPD_CONF" 2>/dev/null; then
  cat >> "$HTTPD_CONF" <<EOF

virtualhost $DOMAIN {
  vhRoot                  $WEB_ROOT
  configFile              conf/vhosts/$DOMAIN/vhost.conf
  allowSymbolLink         1
  enableScript            0
  restrained              0
}

listener Default {
  map                     $DOMAIN $DOMAIN
  map                     www.$DOMAIN $DOMAIN
}
EOF
  echo "       Added virtualhost block (review $HTTPD_CONF if listener already exists)"
else
  echo "       Virtual host already registered"
fi

echo "[4/5] Removing Node.js script handler for this domain (if any) ..."
# تعطيل أي ربط Node افتراضي على هذا الـ vhost
sed -i 's/enableScript.*/enableScript              0/' "$VHOST_CONF" 2>/dev/null || true

echo "[5/5] Restarting OpenLiteSpeed ..."
if [[ -x "$LSWS/bin/lswsctrl" ]]; then
  "$LSWS/bin/lswsctrl" restart
elif systemctl is-active --quiet lshttpd 2>/dev/null; then
  systemctl restart lshttpd
elif systemctl is-active --quiet openlitespeed 2>/dev/null; then
  systemctl restart openlitespeed
else
  echo "Warning: could not auto-restart — run: $LSWS/bin/lswsctrl restart"
fi

echo ""
echo "Done. Upload dist with update-server.sh then open:"
echo "  https://$DOMAIN"
echo ""
echo "If you still see 'Hello World NodeJS':"
echo "  1. Open LiteSpeed WebAdmin (port 7080)"
echo "  2. Virtual Hosts > $DOMAIN > Script Handler"
echo "  3. Remove any Node.js / external app mapping"
echo "  4. Set Document Root to $WEB_ROOT"
echo "  5. Graceful Restart"
echo ""
