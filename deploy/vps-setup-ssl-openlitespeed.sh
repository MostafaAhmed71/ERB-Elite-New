#!/usr/bin/env bash
# ============================================================
# إصدار/تجديد SSL لـ northelite.tech على OpenLiteSpeed
# شغّل على السيرفر:
#   bash vps-setup-ssl-openlitespeed.sh your@email.com
#   bash vps-setup-ssl-openlitespeed.sh your@email.com --apex-only
# ============================================================

set -euo pipefail

DOMAIN="northelite.tech"
WEB_ROOT="/var/www/northelite.tech"
EMAIL="${1:-}"
APEX_ONLY=0
LSWS="/usr/local/lsws"
VHOST_CONF="$LSWS/conf/vhosts/$DOMAIN/vhost.conf"
HTTPD_CONF="$LSWS/conf/httpd_config.conf"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

for arg in "$@"; do
  [[ "$arg" == "--apex-only" ]] && APEX_ONLY=1
done

echo ""
echo "=========================================="
echo "  SSL setup — $DOMAIN"
echo "=========================================="
echo ""

if [[ -z "$EMAIL" ]]; then
  echo "Usage: bash vps-setup-ssl-openlitespeed.sh your@email.com [--apex-only]"
  exit 1
fi

if [[ ! -f "$WEB_ROOT/index.html" ]]; then
  echo "Error: $WEB_ROOT/index.html not found — deploy site first."
  exit 1
fi

issue_cert() {
  local domains=("$@")
  local d_args=()
  for d in "${domains[@]}"; do
    d_args+=(-d "$d")
  done
  certbot certonly --webroot \
    -w "$WEB_ROOT" \
    "${d_args[@]}" \
    --non-interactive \
    --agree-tos \
    -m "$EMAIL" \
    --force-renewal
}

echo "[1/6] Installing certbot (if needed)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot 2>/dev/null || true

echo "[2/6] Preparing ACME challenge folder..."
mkdir -p "$WEB_ROOT/.well-known/acme-challenge"
chmod -R a+rX "$WEB_ROOT/.well-known"

echo "[3/6] Issuing Let's Encrypt certificate..."
CERT_OK=0
if [[ "$APEX_ONLY" -eq 1 ]]; then
  echo "       Mode: apex only ($DOMAIN)"
  if issue_cert "$DOMAIN"; then CERT_OK=1; fi
else
  echo "       Trying: $DOMAIN + www.$DOMAIN"
  if issue_cert "$DOMAIN" "www.$DOMAIN"; then
    CERT_OK=1
  else
    echo ""
    echo "       www.$DOMAIN failed (DNS may point elsewhere)."
    echo "       Retrying apex only: $DOMAIN"
    echo ""
    if issue_cert "$DOMAIN"; then CERT_OK=1; fi
  fi
fi

if [[ "$CERT_OK" -ne 1 ]] || [[ ! -f "$CERT_DIR/fullchain.pem" ]]; then
  echo ""
  echo "Error: could not issue certificate."
  echo "Check DNS: $DOMAIN must point to this server IP."
  echo "For www: add CNAME www -> $DOMAIN or A record to VPS IP."
  exit 1
fi
echo "       OK: $CERT_DIR/fullchain.pem"

echo "[4/6] Updating virtual host SSL..."
mkdir -p "$(dirname "$VHOST_CONF")"
if [[ ! -f "$VHOST_CONF" ]]; then
  echo "Error: $VHOST_CONF missing — run vps-setup-openlitespeed.sh first"
  exit 1
fi

sed -i '/^vhssl/,/^}/d' "$VHOST_CONF" 2>/dev/null || true

cat >> "$VHOST_CONF" <<EOF

vhssl  {
  keyFile                 $CERT_DIR/privkey.pem
  certFile                $CERT_DIR/fullchain.pem
  certChain               1
}
EOF

echo "[5/6] Ensuring HTTPS listener (port 443)..."
if ! grep -q 'address.*:443' "$HTTPD_CONF" 2>/dev/null; then
  cat >> "$HTTPD_CONF" <<EOF

listener SSL {
  address                 *:443
  secure                  1
  keyFile                 $CERT_DIR/privkey.pem
  certFile                $CERT_DIR/fullchain.pem
  certChain               1
  map                     $DOMAIN $DOMAIN
  map                     www.$DOMAIN $DOMAIN
}
EOF
  echo "       Added SSL listener on 443"
else
  echo "       SSL listener already exists"
fi

echo "[6/6] Restarting OpenLiteSpeed..."
if [[ -x "$LSWS/bin/lswsctrl" ]]; then
  "$LSWS/bin/lswsctrl" restart
fi

echo ""
echo "=========================================="
echo "  SSL ready: https://$DOMAIN"
echo ""
if [[ "$APEX_ONLY" -eq 1 ]] || ! certbot certificates 2>/dev/null | grep -q "www.$DOMAIN"; then
  echo "  Note: www.$DOMAIN not in certificate."
  echo "  Fix DNS for www, then re-run without --apex-only."
fi
echo "=========================================="
echo ""
