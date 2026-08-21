#!/bin/bash
# One-time VPS setup for northelite.tech
# Run on VPS: bash vps-setup.sh

set -euo pipefail

DOMAIN="northelite.tech"
WEB_ROOT="/var/www/northelite.tech"
NGINX_SITE="/etc/nginx/sites-available/northelite.tech"

echo "==> Installing nginx + certbot (if missing)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

echo "==> Creating web root ${WEB_ROOT}..."
mkdir -p "$WEB_ROOT"
chown -R www-data:www-data "$WEB_ROOT"

if [ -f "nginx-northelite.tech.conf" ]; then
  cp nginx-northelite.tech.conf "$NGINX_SITE"
else
  echo "Place nginx-northelite.tech.conf next to this script, or copy manually."
  exit 1
fi

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/northelite.tech
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl enable nginx
systemctl reload nginx

echo ""
echo "==> DNS check: northelite.tech must point to this server's IP before SSL."
echo "    Current server IP: $(curl -s ifconfig.me || hostname -I | awk '{print $1}')"
echo ""
echo "==> After DNS propagates, run:"
echo "    certbot --nginx -d northelite.tech -d www.northelite.tech --non-interactive --agree-tos -m YOUR_EMAIL"
echo ""
echo "==> Then upload dist/ from your PC with deploy-northelite.ps1"
