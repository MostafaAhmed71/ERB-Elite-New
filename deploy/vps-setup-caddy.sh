#!/bin/bash
# One-time setup when Caddy already runs on port 80 (do NOT install nginx/certbot)
set -euo pipefail

WEB_ROOT="/var/www/northelite.tech"
CADDYFILE="/etc/caddy/Caddyfile"
SNIPPET="/etc/caddy/northelite.tech.caddy"

mkdir -p "$WEB_ROOT"
chown -R caddy:caddy "$WEB_ROOT" 2>/dev/null || chown -R root:root "$WEB_ROOT"
chmod -R a+rX "$WEB_ROOT"

if [ -f "Caddyfile-northelite.tech" ]; then
  cp Caddyfile-northelite.tech "$SNIPPET"
else
  echo "Missing Caddyfile-northelite.tech"
  exit 1
fi

if ! grep -q 'northelite.tech' "$CADDYFILE" 2>/dev/null; then
  echo "" >> "$CADDYFILE"
  cat "$SNIPPET" >> "$CADDYFILE"
  echo "Appended northelite.tech block to $CADDYFILE"
else
  echo "northelite.tech already in $CADDYFILE — update manually if needed"
fi

caddy validate --config "$CADDYFILE"
systemctl reload caddy
echo "Caddy reloaded. SSL will be issued automatically on first HTTPS request."
