#!/bin/bash
set -euo pipefail

DOMAIN="${1:?Usage: ./deploy/setup.sh your-domain.com db-password}"
DB_PASSWORD="${2:?Usage: ./deploy/setup.sh your-domain.com db-password}"

echo "=== Setting up dashboard on $DOMAIN ==="

if [[ ! "$DB_PASSWORD" =~ ^[A-Za-z0-9._~-]{16,128}$ ]]; then
  echo "[error] DB password must be 16-128 chars and use only: A-Z a-z 0-9 . _ ~ -"
  exit 1
fi

# ── 0. Pre-flight: upsert .env.production ──
# Managed keys are overwritten; custom keys (WB_API_TOKEN, EMIS_MAPTILER_KEY, etc.) are preserved
MANAGED_ENV_KEYS='^(POSTGRES_HOST|POSTGRES_PORT|POSTGRES_DB|POSTGRES_USER|POSTGRES_PASSWORD|DATABASE_URL|HOST|PORT|ORIGIN|ENABLE_ALERT_SCHEDULER)='
TMP_ENV="$(mktemp)"

if [ -f .env.production ]; then
  grep -Ev "$MANAGED_ENV_KEYS" .env.production > "$TMP_ENV" || true
else
  : > "$TMP_ENV"
fi

cat >> "$TMP_ENV" <<ENV
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=dashboard
POSTGRES_USER=dashboard
POSTGRES_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://dashboard:${DB_PASSWORD}@127.0.0.1:5432/dashboard
HOST=127.0.0.1
PORT=3000
ORIGIN=https://${DOMAIN}
ENABLE_ALERT_SCHEDULER=false
ENV

mv "$TMP_ENV" .env.production
chmod 600 .env.production
echo "[ok] .env.production upserted (custom keys preserved)"

# ── 1. Docker Engine (idempotent) ──
if ! command -v docker &>/dev/null; then
  apt update
  apt install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt update
  apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  echo "[ok] Docker installed"
else
  echo "[skip] Docker already installed"
fi

# ── 2. Swap (idempotent) ──
if [ ! -f /swapfile ]; then
  fallocate -l 512M /swapfile && chmod 600 /swapfile
  mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "[ok] Swap 512M created"
else
  echo "[skip] Swap already exists"
fi

# ── 3. PostgreSQL 16 + PostGIS (idempotent) ──
# Check for our specific PG 16 install, not just any psql on PATH
if ! dpkg -l postgresql-16 &>/dev/null; then
  apt update
  apt install -y curl gnupg2 lsb-release
  echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
  apt update
  apt install -y postgresql-16 postgresql-16-postgis-3
  echo "[ok] PostgreSQL 16 + PostGIS installed"
else
  echo "[skip] PostgreSQL 16 already installed"
fi

# Verify the cluster we expect actually exists
PG_CONF_DIR="/etc/postgresql/16/main"
if [ ! -d "$PG_CONF_DIR" ]; then
  echo "[error] PostgreSQL 16 package is installed but cluster dir $PG_CONF_DIR is missing."
  echo "        Run: pg_createcluster 16 main --start"
  exit 1
fi

# PostgreSQL tuning (idempotent — overwrite file)
mkdir -p "$PG_CONF_DIR/conf.d"
cat > "$PG_CONF_DIR/conf.d/tuning.conf" <<PGCONF
shared_buffers = 128MB
work_mem = 4MB
effective_cache_size = 256MB
max_connections = 20
PGCONF

# Create DB and user (idempotent; password is enforced on every run)
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dashboard') THEN
    CREATE ROLE dashboard WITH LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE dashboard WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE dashboard OWNER dashboard'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dashboard')\gexec
\c dashboard
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL

systemctl restart postgresql
echo "[ok] PostgreSQL configured"

DB_INIT_REQUIRED="$(sudo -u postgres psql -d dashboard -tAc "SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'emis') THEN 0 ELSE 1 END")"

if [ "$DB_INIT_REQUIRED" = "1" ]; then
  echo "[ok] Database schema is not initialized yet; bootstrap is required"
else
  echo "[skip] Database schema already initialized; existing data will be preserved"
fi

# ── 4. Nginx + certbot (idempotent) ──
apt install -y nginx certbot python3-certbot-nginx

sed "s/DOMAIN/$DOMAIN/g" deploy/nginx.conf > /etc/nginx/sites-available/dashboard
ln -sf /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
echo "[ok] Nginx + SSL configured"

# ── 5. Pull & start app container ──
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
echo "[ok] App container started"

# ── 6. Init database on first run only ──
if [ "$DB_INIT_REQUIRED" = "1" ]; then
  docker compose -f docker-compose.prod.yml exec -T app node scripts/db.mjs reset
  docker compose -f docker-compose.prod.yml exec -T app node scripts/db.mjs demo
  echo "[ok] Database initialized with demo data"
else
  echo "[skip] DB init skipped; app is reusing existing database"
fi

echo ""
echo "=== Done! ==="
echo "EMIS:        https://$DOMAIN/emis/"
echo "Wildberries: https://$DOMAIN/dashboard/wildberries/"
