#!/bin/bash
set -euo pipefail

VPS="${1:-root@155.212.137.153}"
NGINX_CONF="/etc/nginx/sites-available/dashboard"

echo "=== Switching labinsight.ru to maintenance mode ==="

ssh "$VPS" bash -s <<'REMOTE'
set -euo pipefail

NGINX_CONF="/etc/nginx/sites-available/dashboard"

# 1. Back up current config (skip if backup already exists)
if [ ! -f "${NGINX_CONF}.pre-maintenance" ]; then
  cp "$NGINX_CONF" "${NGINX_CONF}.pre-maintenance"
  echo "[ok] Backed up nginx config to ${NGINX_CONF}.pre-maintenance"
else
  echo "[skip] Backup already exists — not overwriting"
fi

# 2. Write maintenance config
cat > "$NGINX_CONF" << 'NGINX'
server {
    listen 80;
    server_name labinsight.ru;

    # Let certbot/SSL still work
    location /.well-known/ {
        root /var/www/html;
    }

    location / {
        default_type text/html;
        return 503 '<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>labinsight.ru — обслуживание</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0;
           background: #0f172a; color: #e2e8f0; }
    .card { text-align: center; max-width: 480px; padding: 3rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p  { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Сайт на обслуживании</h1>
    <p>Проводим плановые работы. Скоро вернёмся.</p>
  </div>
</body>
</html>';
    }
}
NGINX

# 3. Test and reload
nginx -t && nginx -s reload
echo "[ok] Maintenance mode ON — labinsight.ru returns 503"
REMOTE

echo ""
echo "Done. To restore: ./deploy/maintenance-off.sh"
