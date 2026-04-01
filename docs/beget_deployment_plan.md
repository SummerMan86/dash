# Production Deployment: labinsight.ru

Deployed: 2026-03-27

## Infrastructure

| Parameter   | Value                                  |
| ----------- | -------------------------------------- |
| **Hosting** | Beget.com Cloud VPS                    |
| **Plan**    | Simple (1 vCPU, 1 GB RAM, 10 GB NVMe)  |
| **OS**      | Ubuntu 24.04 (clean install)           |
| **Domain**  | labinsight.ru                          |
| **IP**      | 155.212.137.153                        |
| **SSL**     | Let's Encrypt (auto-renew via certbot) |
| **Scope**   | EMIS + Wildberries (без strategy)      |

## Architecture

```
Internet → nginx (443/SSL) → Node.js app (127.0.0.1:3000) → PostgreSQL (127.0.0.1:5432)
```

- **PostgreSQL 16 + PostGIS 3.4** — нативно (apt), без Docker overhead
- **Node.js app** — Docker-контейнер (`s67918470/dashboard-builder`), `network_mode: host`
- **Nginx** — нативно, reverse proxy + SSL (certbot)

Почему PG нативно: на 1 GB RAM экономим ~100 MB overhead. Прямой I/O к NVMe.

Почему билд не на VPS: `pnpm install` + `vite build` потребляют 500-800 MB RAM — OOM-риск на 1 GB. Образ собирается на dev-машине, передаётся через SSH (`docker save | gzip | ssh`).

## Files

| File                      | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `Dockerfile`              | Multi-stage build: node:20-alpine, pnpm@10       |
| `.dockerignore`           | Exclude node_modules, .svelte-kit, .env\*, docs  |
| `docker-compose.prod.yml` | App service, network_mode: host, healthcheck     |
| `deploy/nginx.conf`       | Reverse proxy template (DOMAIN placeholder)      |
| `deploy/setup.sh`         | Idempotent server setup (Docker, PG, nginx, SSL) |
| `deploy/push.sh`          | Build + push image (run on dev machine)          |
| `.env.production.example` | Env template for production                      |
| `deploy/.env.prod`        | VPS/Docker Hub credentials (gitignored)          |

## Memory budget

| Component         | Estimate    |
| ----------------- | ----------- |
| OS + systemd      | ~100 MB     |
| PostgreSQL native | ~250 MB     |
| Docker daemon     | ~80 MB      |
| Node.js app       | ~150 MB     |
| Nginx             | ~10 MB      |
| **Total**         | **~590 MB** |
| Free              | ~410 MB     |
| Swap (safety net) | 512 MB      |

## Deploy: first time

### 1. Build image (dev machine)

```bash
cd /path/to/dashboard-builder
docker build --network=host -t s67918470/dashboard-builder:latest .
```

### 2. Transfer to VPS

Docker Hub недоступен из текущей сети — используем прямую передачу:

```bash
docker save s67918470/dashboard-builder:latest | gzip | \
  ssh root@155.212.137.153 "cat > /tmp/dashboard.tar.gz && \
  gunzip -c /tmp/dashboard.tar.gz | docker load && \
  rm /tmp/dashboard.tar.gz"
```

Если Docker Hub доступен:

```bash
docker login -u s67918470
docker push s67918470/dashboard-builder:latest
# На VPS: docker pull s67918470/dashboard-builder:latest
```

### 3. Copy deploy files to VPS

```bash
ssh root@155.212.137.153 "mkdir -p /opt/dashboard/deploy /opt/dashboard/db /opt/dashboard/scripts"
scp docker-compose.prod.yml .env.production.example root@155.212.137.153:/opt/dashboard/
scp deploy/setup.sh deploy/nginx.conf root@155.212.137.153:/opt/dashboard/deploy/
scp scripts/db.mjs root@155.212.137.153:/opt/dashboard/scripts/
scp -r db/current_schema.sql db/seeds db/demo-fixtures root@155.212.137.153:/opt/dashboard/db/
```

### 4. Run setup on VPS

```bash
ssh root@155.212.137.153
cd /opt/dashboard
bash deploy/setup.sh labinsight.ru "YourSecurePassword_2026"
```

Setup выполняет: .env.production → Docker install → swap → PostgreSQL + PostGIS → nginx + SSL → docker compose up → db init.

## Deploy: updates

### On dev machine

```bash
docker build --network=host -t s67918470/dashboard-builder:latest .
docker save s67918470/dashboard-builder:latest | gzip | \
  ssh root@155.212.137.153 "cat > /tmp/dashboard.tar.gz && \
  gunzip -c /tmp/dashboard.tar.gz | docker load && \
  rm /tmp/dashboard.tar.gz"
```

### On VPS

```bash
cd /opt/dashboard
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### If deploy files changed

```bash
scp docker-compose.prod.yml root@155.212.137.153:/opt/dashboard/
scp deploy/setup.sh deploy/nginx.conf root@155.212.137.153:/opt/dashboard/deploy/
# Re-run setup if needed:
# ssh root@155.212.137.153 "cd /opt/dashboard && bash deploy/setup.sh labinsight.ru 'password'"
```

## DB management

### Schema reset (destroys data)

```bash
ssh root@155.212.137.153 "cd /opt/dashboard && \
  docker compose -f docker-compose.prod.yml exec -T app node scripts/db.mjs reset"
```

### Load demo data

```bash
ssh root@155.212.137.153 "cd /opt/dashboard && \
  docker compose -f docker-compose.prod.yml exec -T app node scripts/db.mjs demo"
```

### Apply pending changes

```bash
scp db/pending_changes.sql root@155.212.137.153:/opt/dashboard/db/
ssh root@155.212.137.153 "cd /opt/dashboard && \
  docker compose -f docker-compose.prod.yml exec -T app node scripts/db.mjs apply"
```

## Backups

Setup (one-time on VPS):

```bash
mkdir -p /opt/backups
```

Add to `crontab -e`:

```cron
0 3 * * * sudo -u postgres pg_dump dashboard | gzip > /opt/backups/dashboard_$(date +\%F).sql.gz
10 3 * * * find /opt/backups -name "*.sql.gz" -mtime +7 -delete
```

## SSH access

Dev machine SSH key is authorized on VPS (`/root/.ssh/authorized_keys`).
Key: `/home/orl/.ssh/id_ed25519`

## Verification checklist

```bash
# App healthy
docker compose -f docker-compose.prod.yml ps

# PostgreSQL running
systemctl status postgresql

# Health endpoint
curl http://localhost:3000/api/emis/health

# Port not exposed externally
ss -ltnp | grep :3000
# Expected: 127.0.0.1:3000, NOT 0.0.0.0:3000

# SSL working
curl -sI https://labinsight.ru | head -3
```

URLs:

- https://labinsight.ru/emis/ — EMIS (карта, объекты, новости)
- https://labinsight.ru/dashboard/wildberries/ — WB дашборды
- https://labinsight.ru/ — главная

## Lessons learned

1. **Docker Hub недоступен** из текущей сети → используем `docker save/load` через SSH
2. **`dotenv` — devDependency**, но `scripts/db.mjs` его импортирует → добавлен `pnpm add dotenv` в Dockerfile после prune
3. **`sshpass` не работает** с Beget VPS (keyboard-interactive auth) → используем SSH-ключи
4. **`corepack prepare`** не работает внутри Docker build (DNS) → заменён на `npm install -g pnpm@10`
5. **`--network=host`** нужен для `docker build` чтобы обойти DNS-проблемы в Docker

## Strategy routes

Маршруты `/dashboard/strategy/` остаются в билде, но без `STRATEGY_DOCUMENT_BASE_URL` не показывают данные. Вырезать не нужно.
