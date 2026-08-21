#!/usr/bin/env bash
# ============================================================
# إصلاح كامل: wpp.northelite0.com (بروكسي + SSL)
# شغّل على السيرفر:
#   bash vps-fix-wpp-complete.sh moahmed7412@gmail.com
# ============================================================

set -euo pipefail

DOMAIN="wpp.northelite0.com"
EMAIL="${1:-moahmed7412@gmail.com}"
LSWS="/usr/local/lsws"
HTTPD_CONF="$LSWS/conf/httpd_config.conf"
VHOST_DIR="$LSWS/conf/vhosts/$DOMAIN"
VHOST_CONF="$VHOST_DIR/vhost.conf"
WEB_PROXY="/var/www/wpp-proxy"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
UPSTREAM="127.0.0.1:3001"

echo ""
echo "=========================================="
echo "  Fix $DOMAIN (proxy + SSL)"
echo "=========================================="
echo ""

echo "[1/7] Check WhatsApp backend on :3001..."
if ! curl -sf "http://$UPSTREAM/status" >/dev/null; then
  echo "       ERROR: nothing on port 3001"
  echo "       Run: cd /opt/wppconnect && pm2 restart wppconnect"
  exit 1
fi
echo "       OK: $(curl -s http://$UPSTREAM/status)"

echo "[2/7] Prepare web root for ACME..."
mkdir -p "$WEB_PROXY/.well-known/acme-challenge" "$VHOST_DIR/logs"
chmod -R a+rX "$WEB_PROXY"

echo "[3/7] Write vhost config (reverse proxy)..."
cat > "$VHOST_CONF" <<EOF
docRoot                   $WEB_PROXY
indexFiles                index.html
enableScript              0

extprocessor wpp_node {
  type                    proxy
  address                 $UPSTREAM
  maxConns                50
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer                0
}

context /.well-known/acme-challenge/ {
  allowBrowse             1
  location                $WEB_PROXY/.well-known/acme-challenge/
}

context / {
  type                    proxy
  handler                 wpp_node
  addDefaultCharset       off
}
EOF

echo "[4/7] Register vhost + HTTP/HTTPS maps..."
python3 <<PY
import re
from pathlib import Path

domain = "$DOMAIN"
web = "$WEB_PROXY"
cert = "$CERT_DIR"
path = Path("$HTTPD_CONF")
text = path.read_text()
backup = path.with_suffix(".conf.bak.wpp")
backup.write_text(text)

vh = f"""
virtualhost {domain} {{
  vhRoot                  {web}
  configFile              conf/vhosts/{domain}/vhost.conf
  allowSymbolLink         1
  enableScript            0
  restrained              0
}}
"""
if f"virtualhost {domain}" not in text:
    text += vh

def ensure_map(block, domain):
    if f"map                     {domain}" in block:
        return block
    return block.rstrip() + f"\n  map                     {domain} {domain}\n"

# HTTP listener (port 80)
for name in ["Default", "HTTP"]:
    m = re.search(rf"listener\s+{name}\s*\{{([^}}]*)\}}", text, re.S)
    if m and ":80" in m.group(1) or name == "Default":
        body = ensure_map(m.group(1), domain)
        text = text[:m.start()] + f"listener {name} {{{body}}}" + text[m.end():]
        break
else:
    m = re.search(r"listener\s+(\S+)\s*\{([^}]*address\s+\*:80[^}]*)\}", text, re.S)
    if m:
        body = ensure_map(m.group(2), domain)
        text = text[:m.start()] + f"listener {m.group(1)} {{{body}}}" + text[m.end():]

# HTTPS listener — replace or append
ssl_block = f"""
listener HTTPS_{domain.replace('.', '_')} {{
  address                 *:443
  secure                  1
  keyFile                 {cert}/privkey.pem
  certFile                {cert}/fullchain.pem
  certChain               1
  map                     {domain} {domain}
}}
"""
text = re.sub(r"\nlistener HTTPS_wpp_northelite0_com \{.*?\n\}\n", "\n", text, flags=re.S)
if Path("$CERT_DIR/fullchain.pem").exists():
    if not re.search(rf"map\s+{re.escape(domain)}\s+{re.escape(domain)}", text):
        text += ssl_block
else:
    # cert not yet — still map on any existing :443 listener
    m = re.search(r"listener\s+(\S+)\s*\{([^}]*address\s+\*:443[^}]*)\}", text, re.S)
    if m:
        body = ensure_map(m.group(2), domain)
        text = text[:m.start()] + f"listener {m.group(1)} {{{body}}}" + text[m.end():]

path.write_text(text)
print("       Patched", path)
PY

echo "[5/7] Issue SSL certificate (apex only)..."
apt-get install -y -qq certbot 2>/dev/null || true
if certbot certonly --webroot -w "$WEB_PROXY" -d "$DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL" --force-renewal 2>/dev/null \
  || certbot certonly --webroot -w "$WEB_PROXY" -d "$DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL"; then
  echo "       OK: $CERT_DIR"
else
  echo "       WARN: certbot failed — check DNS A record for $DOMAIN -> this server IP"
fi

if [[ -f "$CERT_DIR/fullchain.pem" ]]; then
  if ! grep -q '^vhssl' "$VHOST_CONF"; then
    cat >> "$VHOST_CONF" <<EOF

vhssl  {
  keyFile                 $CERT_DIR/privkey.pem
  certFile                $CERT_DIR/fullchain.pem
  certChain               1
}
EOF
  fi
  # Re-run python to add HTTPS listener with cert paths
  python3 <<PY
from pathlib import Path
import re
domain = "$DOMAIN"
cert = "$CERT_DIR"
p = Path("$HTTPD_CONF")
t = p.read_text()
block = f"""
listener HTTPS_wpp {{
  address                 *:443
  secure                  1
  keyFile                 {cert}/privkey.pem
  certFile                {cert}/fullchain.pem
  certChain               1
  map                     {domain} {domain}
}}
"""
t = re.sub(r"\nlistener HTTPS_wpp \{.*?\n\}\n", "\n", t, flags=re.S)
if f"map                     {domain} {domain}" not in t or "HTTPS_wpp" not in t:
    t += block
p.write_text(t)
PY
fi

echo "[6/7] Restart OpenLiteSpeed..."
/usr/local/lsws/bin/lswsctrl restart

echo "[7/7] Tests..."
echo "       Backend:  $(curl -s http://127.0.0.1:3001/status)"
echo "       HTTP proxy:"
curl -sI -H "Host: $DOMAIN" http://127.0.0.1/qr | head -3 || true
echo "       HTTPS proxy:"
curl -skI "https://127.0.0.1/qr" -H "Host: $DOMAIN" | head -3 || true

echo ""
echo "=========================================="
echo "  Open: https://$DOMAIN/qr"
echo "  Status: https://$DOMAIN/status"
echo ""
echo "  If still 404: DNS for $DOMAIN must point to this server."
echo "  Check: dig +short $DOMAIN"
echo "=========================================="
echo ""
