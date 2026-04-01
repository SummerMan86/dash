#!/bin/bash
set -euo pipefail

VPS="${1:-root@155.212.137.153}"

echo "=== Restoring labinsight.ru from maintenance mode ==="

ssh "$VPS" bash -s <<'REMOTE'
set -euo pipefail

NGINX_CONF="/etc/nginx/sites-available/dashboard"
BACKUP="${NGINX_CONF}.pre-maintenance"

if [ ! -f "$BACKUP" ]; then
  echo "[error] No backup found at $BACKUP — cannot restore"
  exit 1
fi

cp "$BACKUP" "$NGINX_CONF"
nginx -t && nginx -s reload
echo "[ok] Restored original nginx config — site is live"

# Keep backup for safety (remove manually if you want)
echo "[info] Backup kept at $BACKUP"
REMOTE

echo ""
echo "Done. labinsight.ru is back online."
