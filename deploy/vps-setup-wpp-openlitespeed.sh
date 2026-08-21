#!/usr/bin/env bash
# إعداد wpp.northelite0.com — بروكسي لخادم واتساب على المنفذ 3001
set -euo pipefail

DOMAIN="wpp.northelite0.com"
LSWS="/usr/local/lsws"
VHOST_DIR="$LSWS/conf/vhosts/$DOMAIN"
VHOST_CONF="$VHOST_DIR/vhost.conf"
HTTPD_CONF="$LSWS/conf/httpd_config.conf"
WEB_PROXY="/var/www/wpp-proxy"

echo "==> Setup $DOMAIN -> 127.0.0.1:3001"

mkdir -p "$WEB_PROXY/.well-known/acme-challenge" "$VHOST_DIR/logs"
chmod -R a+rX "$WEB_PROXY"

cp openlitespeed-vhost-wpp.northelite0.com.conf "$VHOST_CONF"

if ! grep -q "virtualhost $DOMAIN" "$HTTPD_CONF" 2>/dev/null; then
  cat >> "$HTTPD_CONF" <<EOF

virtualhost $DOMAIN {
  vhRoot                  $WEB_PROXY
  configFile              conf/vhosts/$DOMAIN/vhost.conf
  allowSymbolLink         1
  enableScript            0
  restrained              0
}
EOF
fi

# Map on default HTTP listener
if grep -q 'listener Default' "$HTTPD_CONF" && ! grep -q "map.*$DOMAIN" "$HTTPD_CONF"; then
  sed -i "/listener Default {/,/}/ s/}/  map                     $DOMAIN $DOMAIN\n}/" "$HTTPD_CONF" || true
fi

# Map on HTTPS listener if exists
if grep -q 'address.*:443' "$HTTPD_CONF" && ! grep -q "map.*$DOMAIN.*$DOMAIN" "$HTTPD_CONF"; then
  python3 <<PY
from pathlib import Path
import re
p = Path("$HTTPD_CONF")
t = p.read_text()
m = re.search(r'(listener\s+\S+\s*\{[^}]*address\s+\*:443[^}]*)\}', t, re.S)
if m and "$DOMAIN" not in m.group(0):
    block = m.group(1).rstrip() + f"\n  map                     $DOMAIN $DOMAIN\n}}"
    t = t[:m.start()] + block + t[m.end():]
    p.write_text(t)
PY
fi

/usr/local/lsws/bin/lswsctrl restart
echo "Done. Test: curl -s http://127.0.0.1:3001/status"
echo "Then: https://$DOMAIN/status and https://$DOMAIN/qr"
