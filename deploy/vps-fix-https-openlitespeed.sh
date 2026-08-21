#!/usr/bin/env bash
# ============================================================
# إصلاح HTTPS — ربط المنفذ 443 بموقع northelite.tech (وليس Node.js)
# شغّل على السيرفر: bash vps-fix-https-openlitespeed.sh
# ============================================================

set -euo pipefail

DOMAIN="northelite.tech"
WEB_ROOT="/var/www/northelite.tech"
LSWS="/usr/local/lsws"
HTTPD_CONF="$LSWS/conf/httpd_config.conf"
VHOST_CONF="$LSWS/conf/vhosts/$DOMAIN/vhost.conf"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
BACKUP="$HTTPD_CONF.bak.$(date +%Y%m%d%H%M%S)"

echo ""
echo "=========================================="
echo "  Fix HTTPS mapping — $DOMAIN"
echo "=========================================="
echo ""

if [[ ! -f "$CERT_DIR/fullchain.pem" ]]; then
  echo "Error: SSL cert missing at $CERT_DIR — run certbot first."
  exit 1
fi

if [[ ! -f "$VHOST_CONF" ]]; then
  echo "Error: vhost missing — run vps-setup-openlitespeed.sh first."
  exit 1
fi

cp "$HTTPD_CONF" "$BACKUP"
echo "[1/4] Backup: $BACKUP"

echo "[2/4] Updating vhost SSL block..."
sed -i '/^vhssl/,/^}/d' "$VHOST_CONF" 2>/dev/null || true
cat >> "$VHOST_CONF" <<EOF

vhssl  {
  keyFile                 $CERT_DIR/privkey.pem
  certFile                $CERT_DIR/fullchain.pem
  certChain               1
}
EOF

echo "[3/4] Fixing listener on port 443..."

# Remove broken SSL listener block we may have appended earlier (optional duplicate)
# Safer: patch existing *:443 listener maps via temp file

python3 <<'PY'
import re
from pathlib import Path

domain = "northelite.tech"
cert_dir = "/etc/letsencrypt/live/northelite.tech"
path = Path("/usr/local/lsws/conf/httpd_config.conf")
text = path.read_text()

# Ensure virtualhost exists (name must match map target)
if f"virtualhost {domain}" not in text:
    text += f"""

virtualhost {domain} {{
  vhRoot                  /var/www/northelite.tech
  configFile              conf/vhosts/{domain}/vhost.conf
  allowSymbolLink         1
  enableScript            0
  restrained              0
}}
"""

ssl_block = f"""
listener HTTPS {{
  address                 *:443
  secure                  1
  keyFile                 {cert_dir}/privkey.pem
  certFile                {cert_dir}/fullchain.pem
  certChain               1
  map                     {domain} {domain}
}}
"""

# Remove our old listener SSL / HTTPS blocks to avoid duplicates
text = re.sub(r"\nlistener SSL \{.*?\n\}\n", "\n", text, flags=re.S)
text = re.sub(r"\nlistener HTTPS \{.*?\n\}\n", "\n", text, flags=re.S)

# If any listener already uses :443, replace its body maps
m = re.search(r"listener\s+(\S+)\s*\{([^}]*address\s+\*:443[^}]*)\}", text, re.S)
if m:
    name = m.group(1)
    body = m.group(2)
    # strip old map lines
    body = re.sub(r"\n\s*map\s+.*", "", body)
    new_body = body.rstrip() + f"\n  map                     {domain} {domain}\n"
    text = text[:m.start()] + f"listener {name} {{{new_body}}}" + text[m.end():]
    # ensure secure + cert paths in that listener
    if "secure" not in new_body:
        pass
else:
    text += ssl_block

# HTTP listener: map domain to our vhost (port 80)
m80 = re.search(r"listener\s+Default\s*\{([^}]*)\}", text, re.S)
if m80:
    body = m80.group(1)
    if domain not in body:
        body = body.rstrip() + f"\n  map                     {domain} {domain}\n"
        text = re.sub(r"listener\s+Default\s*\{[^}]*\}", f"listener Default {{{body}}}", text, count=1, flags=re.S)

path.write_text(text)
print("       Patched httpd_config.conf")
PY

echo "[4/4] Restarting OpenLiteSpeed..."
/usr/local/lsws/bin/lswsctrl restart

echo ""
echo "Testing..."
curl -skI -H "Host: $DOMAIN" https://127.0.0.1/login | head -5 || true
echo ""
BODY=$(curl -sk -H "Host: $DOMAIN" https://127.0.0.1/login | head -1)
echo "Body: $BODY"
echo ""
if echo "$BODY" | grep -qi "hello world"; then
  echo "Still Node.js on HTTPS — open WebAdmin :7080 > Listeners > *:443 > map $DOMAIN -> $DOMAIN"
else
  echo "OK — HTTPS should show the React app now."
  echo "Open: https://$DOMAIN/login"
fi
echo ""
