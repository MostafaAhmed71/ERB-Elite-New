#!/usr/bin/env bash
# ============================================================
# ERB Elite — رفع التحديث إلى السيرفر (northelite.tech)
# الاستخدام:
#   ./update-server.sh
#   ./update-server.sh --skip-build
# ============================================================

set -euo pipefail

SKIP_BUILD=0
SERVER="root@72.62.178.181"
REMOTE_DIR="/var/www/northelite.tech"
SITE_URL="https://northelite.tech"
ARCHIVE="${TMPDIR:-/tmp}/northelite-dist.tar.gz"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build|-SkipBuild) SKIP_BUILD=1; shift ;;
    --server) SERVER="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo ""
echo "========================================"
echo "  ERB Elite - Deploy Update"
echo "  Server: $SERVER"
echo "  Target: $REMOTE_DIR"
echo "========================================"
echo ""

if [[ ! -f .env ]]; then
  echo "Warning: .env not found - build may miss VITE_* variables"
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "[1/4] Building..."
  npm run build
else
  echo "[1/4] Skipping build (--skip-build)"
fi

if [[ ! -f dist/index.html ]]; then
  echo "Error: dist/index.html not found. Run without --skip-build first." >&2
  exit 1
fi

echo "[2/4] Packaging dist..."
rm -f "$ARCHIVE"
tar -czf "$ARCHIVE" -C dist .
SIZE_MB=$(du -m "$ARCHIVE" | cut -f1)
echo "       Archive: ${SIZE_MB} MB"

echo "[3/4] Uploading..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR"
scp "$ARCHIVE" "${SERVER}:/tmp/northelite-dist.tar.gz"

echo "[4/4] Extracting on VPS..."
REMOTE_CMD="set -e
cd $REMOTE_DIR
tar -xzf /tmp/northelite-dist.tar.gz
rm -f /tmp/northelite-dist.tar.gz
chmod -R a+rX $REMOTE_DIR
if systemctl is-active --quiet caddy 2>/dev/null; then
  systemctl reload caddy && echo 'Reloaded caddy'
elif systemctl is-active --quiet nginx 2>/dev/null; then
  systemctl reload nginx && echo 'Reloaded nginx'
elif systemctl is-active --quiet lshttpd 2>/dev/null || systemctl is-active --quiet openlitespeed 2>/dev/null; then
  if [ -x /usr/local/lsws/bin/lswsctrl ]; then
    /usr/local/lsws/bin/lswsctrl restart && echo 'Restarted OpenLiteSpeed'
  else
    systemctl restart lshttpd 2>/dev/null || systemctl restart openlitespeed
    echo 'Restarted OpenLiteSpeed (systemd)'
  fi
else
  echo 'Warning: files updated but no active web server service found to reload'
fi
echo OK"
ssh "$SERVER" "$REMOTE_CMD"

rm -f "$ARCHIVE"

echo ""
echo "Deploy complete!"
echo "Site: $SITE_URL"
echo "Tip: hard refresh Ctrl+Shift+R if old version shows"
echo ""
