# Appliance Mode: Self-Contained VM Deployment with ClickHouse

> Status: **draft, revised** | Created: 2026-04-11

## Purpose

Этот документ фиксирует корректированный план для customer-facing "appliance" deployment:
отдельный Docker Compose стек, который клиент разворачивает на своей VM и получает
полностью рабочее приложение.

Это **supporting execution plan**, а не замена current-state deployment docs.
Текущий production contract для `labinsight.ru` остаётся описан в
`docs/architecture.md` и `docs/ops/beget_deployment_plan.md` до фактического
внедрения appliance path.

## Scope

### In scope

- отдельный `docker-compose.appliance.yml`
- containerized `nginx`
- app + PostgreSQL + ClickHouse на internal Docker network
- bootstrap/update/watchdog runbooks
- автоматизация SSL для appliance path
- systemd units/timers на VM
- опциональная загрузка demo-данных

### Out of scope

- ClickHouse provider в `platform-datasets`
- app-level использование ClickHouse
- Prometheus/Grafana, Telegram alerts, external monitoring
- Packer/OVA/QCOW2 image build
- UI updater в админке

## Current Constraints

- Текущий production deployment на малой VPS использует **host-native nginx + host-native PostgreSQL**
  и отдельный app container. Это current-state, не target для appliance.
- В текущем приложении `GET /api/emis/health` проверяет только repo/snapshot readiness,
  не реальную доступность runtime и БД.
- Для runtime readiness уже реализован `GET /api/emis/readyz`; именно он должен быть
  canonical health endpoint для app container и watchdog.
- Текущий `deploy/setup.sh` полезен как reference по idempotent bootstrap, но его
  host-native `nginx + certbot --nginx` flow **нельзя переносить 1:1** в appliance,
  потому что в appliance nginx работает в контейнере.

## Target VM Profile

### Minimum supported profile for v1

- Ubuntu 24.04 LTS
- 2 vCPU
- 4 GB RAM
- 40 GB SSD/NVMe

### Recommended profile for future ClickHouse-heavy use

- 4 vCPU
- 8 GB RAM
- 80 GB SSD/NVMe

План должен использовать **консервативные default tuning values**, пригодные для 4 GB VM.
Более агрессивный tuning разрешён только как operator override через `.env.appliance`.

## Target Architecture

```text
VM (Ubuntu 24.04)
  :80/:443 ──► nginx (container)
                 └── http://app:3000

               app (existing Docker image, SvelteKit)
                 ├── DATABASE_URL -> postgres:5432
                 └── /api/emis/readyz for runtime health

               postgres (postgis/postgis:16-3.4)

               clickhouse (clickhouse-server:24.3-alpine)
                 └── provisioned now, app provider is out of scope

               certbot (compose helper, on-demand / timer-driven)

  systemd: dashboard-appliance.service
  systemd: dashboard-watchdog.timer
  systemd: dashboard-certbot-renew.timer
```

Все контейнеры работают на bridge-сети `appliance-net`.

- наружу публикуются только `80` и `443` на nginx
- PostgreSQL и ClickHouse **не публикуют host ports**
- certbot не является long-running service; это helper-контейнер, запускаемый через
  `docker compose run --rm`

## Key Design Decisions

### 1. Отдельный compose-файл

`docker-compose.appliance.yml` остаётся полностью изолирован от `docker-compose.yml`
и `docker-compose.prod.yml`. Appliance не должен ломать dev/prod paths.

### 2. nginx остаётся в контейнере, но SSL automation тоже становится appliance-local

Если appliance заявлен как self-contained, нельзя полагаться на host-native
`certbot --nginx`. Для appliance path нужен `webroot`-based flow:

- nginx контейнер обслуживает `/.well-known/acme-challenge/`
- certbot helper-контейнер пишет challenge/certs в shared volumes
- renew выполняется systemd timer'ом на VM через `docker compose run --rm certbot renew`

### 3. App health = `/api/emis/readyz`, не `/api/emis/health`

`/api/emis/health` в текущем репозитории отражает только snapshot/file readiness.
Для deployment health, watchdog и startup sequencing использовать только:

- app container healthcheck -> `GET /api/emis/readyz`
- watchdog HTTP check -> `GET /api/emis/readyz`
- `/api/emis/health` оставить как диагностический repo-level endpoint

### 4. DB bootstrap и migrations запускаются только внутри app container

Appliance VM не должна требовать host-side Node runtime для `scripts/db.mjs`.
Все шаги DB lifecycle должны идти через контейнер app:

- first bootstrap -> `docker compose exec -T app node scripts/db.mjs reset`
- optional demo -> `docker compose exec -T app node scripts/db.mjs demo`
- update path -> `docker compose exec -T app node scripts/db.mjs apply`

Это соответствует текущему deploy pattern и не создаёт второго application runtime на host.

### 5. Demo-данные должны быть явным opt-in

Для customer VM bootstrap по умолчанию должен поднимать **empty but initialized**
schema state. Demo fixtures допустимы только через явный флаг:

- `APPLIANCE_LOAD_DEMO=false` по умолчанию
- если `true`, setup выполняет дополнительный `db.mjs demo`

### 6. Secrets не передаются через CLI positional args

`setup.sh` должен читать `.env.appliance`, а не принимать DB/CH passwords как позиционные
аргументы. Это уменьшает риск утечки секретов в shell history/process list.

### 7. Conservative tuning defaults

Значения по умолчанию должны подходить для 4 GB VM:

- PostgreSQL: `shared_buffers=256MB`, `work_mem=8MB`, `effective_cache_size=1GB`
- ClickHouse: `max_memory_usage=1GB`, `max_threads=2`

Любые более тяжёлые defaults нужно обосновывать отдельным target hardware contract.

### 8. Update path всегда делает backup before mutate

- PostgreSQL: `pg_dump --format=custom`
- ClickHouse: DDL backup / metadata export
- rotation: keep last 5 backups

## Files to Create / Update

| Path | Type | Purpose |
| --- | --- | --- |
| `.env.appliance.example` | new | appliance env template |
| `docker-compose.appliance.yml` | new | compose topology for appliance |
| `deploy/appliance/nginx.conf` | new | reverse proxy + ACME webroot + health |
| `deploy/appliance/clickhouse/config.xml` | new | ClickHouse server config |
| `deploy/appliance/clickhouse/users.xml` | new | ClickHouse users/profiles via `from_env` |
| `deploy/appliance/clickhouse/init-db.sh` | new | create `analytics` DB on first boot |
| `deploy/appliance/dashboard-appliance.service` | new | compose stack systemd unit |
| `deploy/appliance/dashboard-watchdog.service` | new | oneshot health monitor |
| `deploy/appliance/dashboard-watchdog.timer` | new | watchdog cadence |
| `deploy/appliance/dashboard-certbot-renew.service` | new | certbot renew oneshot |
| `deploy/appliance/dashboard-certbot-renew.timer` | new | SSL renew cadence |
| `deploy/appliance/watchdog.sh` | new | container + HTTP + disk checks |
| `deploy/appliance/setup.sh` | new | first-time bootstrap |
| `deploy/appliance/update.sh` | new | safe update with backup |
| `.gitignore` | tiny edit | add `!.env.appliance.example` |

## Environment Contract

`.env.appliance.example` должен использовать реальные runtime/env names приложения.

```bash
# Appliance identity
APP_DOMAIN=dashboard.example.com
ORIGIN=https://dashboard.example.com

# App runtime
APP_VERSION=latest
HOST=0.0.0.0
PORT=3000
ENABLE_ALERT_SCHEDULER=false
APPLIANCE_LOAD_DEMO=false

# PostgreSQL
POSTGRES_DB=dashboard
POSTGRES_USER=dashboard
POSTGRES_PASSWORD=CHANGE_ME_MIN_16_CHARS
DATABASE_URL=postgresql://dashboard:CHANGE_ME_MIN_16_CHARS@postgres:5432/dashboard

# PostgreSQL tuning
PG_SHARED_BUFFERS=256MB
PG_WORK_MEM=8MB
PG_EFFECTIVE_CACHE_SIZE=1GB
PG_MAX_CONNECTIONS=30

# ClickHouse
CLICKHOUSE_DB=analytics
CLICKHOUSE_USER=dashboard
CLICKHOUSE_PASSWORD=CHANGE_ME_MIN_16_CHARS
CLICKHOUSE_PASSWORD_SHA256=

# ClickHouse tuning
CH_MAX_MEMORY_USAGE=1073741824
CH_MAX_THREADS=2

# SSL
SSL_MODE=certbot          # certbot | manual | none
CERTBOT_EMAIL=ops@example.com
```

Notes:

- `APP_DOMAIN` используется setup/nginx/certbot tooling
- `ORIGIN` используется самим SvelteKit runtime
- `APP_ORIGIN` не вводится, чтобы не дублировать уже существующий `ORIGIN`
- `CLICKHOUSE_PASSWORD_SHA256` генерируется `setup.sh`; руками не редактируется

## docker-compose.appliance.yml

### Runtime services

| Service | Image | Ports | Depends on | Healthcheck |
| --- | --- | --- | --- | --- |
| `nginx` | `nginx:1.27-alpine` | `80:80`, `443:443` | `app` healthy | `curl -sf http://127.0.0.1/nginx-health` |
| `app` | `docker.io/s67918470/dashboard-builder:${APP_VERSION:-latest}` | none | `postgres` healthy | `node -e "fetch('http://127.0.0.1:3000/api/emis/readyz').then(...)"` |
| `postgres` | `postgis/postgis:16-3.4` | none | — | `pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB` |
| `clickhouse` | `clickhouse/clickhouse-server:24.3-alpine` | none | — | `clickhouse-client --query "SELECT 1"` |

### Helper service

| Service | Purpose |
| --- | --- |
| `certbot` | one-shot `certonly` / `renew` via shared webroot + cert volumes |

### Volumes

- `appliance-pg-data`
- `appliance-ch-data`
- `appliance-ch-logs`
- `appliance-certbot-conf`
- `appliance-certbot-www`

## nginx Contract

`deploy/appliance/nginx.conf` должен содержать:

- upstream `app:3000`
- `/.well-known/acme-challenge/` -> shared webroot volume
- `/nginx-health` -> lightweight `200 ok`
- reverse-proxy headers из текущего `deploy/nginx.conf`
- gzip для `text/css application/javascript application/json image/svg+xml`
- static cache для `.js|.css|.png|.jpg|.svg|.ico|.woff2` -> 7 days
- HTTP -> HTTPS redirect только когда `SSL_MODE=certbot|manual`

## Bootstrap Flow

### `deploy/appliance/setup.sh`

Usage target:

```bash
./deploy/appliance/setup.sh --env .env.appliance
```

High-level sequence:

1. validate root privileges, OS, Docker availability
2. validate `.env.appliance`
3. reject weak/default passwords and missing `ORIGIN` / `APP_DOMAIN`
4. generate `CLICKHOUSE_PASSWORD_SHA256` into `.env.appliance`
5. install Docker Engine + compose plugin if missing
6. create swap file if missing
7. optionally configure UFW: allow SSH + 80/tcp + 443/tcp
8. render nginx config from template
9. `docker compose pull`
10. start `postgres`, `clickhouse`, `app`
11. wait until `postgres` and `clickhouse` are healthy
12. if first boot: run `docker compose exec -T app node scripts/db.mjs reset`
13. if `APPLIANCE_LOAD_DEMO=true`: run `docker compose exec -T app node scripts/db.mjs demo`
14. wait until `app` returns `200` on `/api/emis/readyz`
15. start `nginx`
16. if `SSL_MODE=certbot`: run certbot helper with `webroot` mode, then reload nginx
17. install and enable:
    - `dashboard-appliance.service`
    - `dashboard-watchdog.timer`
    - `dashboard-certbot-renew.timer`
18. print summary: URLs, health commands, backup path

Important:

- `db.mjs reset` already applies snapshot + seeds; do not duplicate that logic on host
- nginx must not be considered ready before app `readyz` passes
- first-boot detection should rely on live DB state, not only on presence of volume directory

## Update Flow

### `deploy/appliance/update.sh`

Sequence:

1. `pg_dump` -> `/var/backups/dashboard-appliance/pg_YYYYMMDD_HHMMSS.dump`
2. export ClickHouse DDL / metadata snapshot
3. `docker compose pull`
4. recreate `postgres`, `clickhouse`, `app`
5. run `docker compose exec -T app node scripts/db.mjs apply`
6. wait for `app` `/api/emis/readyz`
7. ensure nginx healthy
8. cleanup old backups, keep last 5
9. print result + rollback notes

`db.mjs apply` may be a no-op when `db/pending_changes.sql` is empty; это штатное поведение.

## Watchdog Contract

### `deploy/appliance/watchdog.sh`

Every 60 seconds:

- inspect Docker health for `postgres`, `clickhouse`, `app`, `nginx`
- call app `GET /api/emis/readyz`
- call nginx `GET /nginx-health`
- warn on disk usage `> 90%`
- optionally restart only the unhealthy runtime container
- write structured logs to journald

Watchdog **must not** use `/api/emis/health` as a deep check.

## Security

| Measure | Detail |
| --- | --- |
| No default passwords | `.env.appliance.example` ships only `CHANGE_ME` placeholders |
| No CLI secrets | setup/update read `.env.appliance`, do not accept DB password positional args |
| Internal-only databases | PostgreSQL and ClickHouse have no published host ports |
| File permissions | `.env.appliance` -> `chmod 600` |
| ClickHouse password hashing | XML receives only `CLICKHOUSE_PASSWORD_SHA256` |
| No Docker socket in containers | watchdog and renew run from host systemd |
| Firewall | if UFW enabled, allow only SSH, 80, 443 |

## Verification

### Local / CI-level verification

1. `docker compose -f docker-compose.appliance.yml config`
2. `shellcheck deploy/appliance/*.sh`
3. `docker compose -f docker-compose.appliance.yml up -d postgres clickhouse app`
4. `docker compose -f docker-compose.appliance.yml exec -T app node scripts/db.mjs reset`
5. `curl -sf http://127.0.0.1:3000/api/emis/readyz`
6. `docker compose -f docker-compose.appliance.yml up -d nginx`
7. `curl -sf http://127.0.0.1/nginx-health`

### VM acceptance verification

1. clean Ubuntu 24.04 VM
2. prepare `.env.appliance` with `SSL_MODE=none` or reachable ACME domain
3. run `./deploy/appliance/setup.sh --env .env.appliance`
4. verify all runtime services are healthy
5. verify `GET /api/emis/readyz` returns `200`
6. run `./deploy/appliance/update.sh`
7. verify service health again after update

## Execution Strategy: Agent Workflow

Implementation should run through the canonical agent model in
`docs/agents/workflow.md` and `docs/agents/review-gate.md`.

### Recommended operating mode

- `high-risk iterative / unstable wave`

Rationale:

- deployment topology changes
- new SSL automation path
- DB bootstrap/update logic
- secrets + security surface
- multi-file ops/doc/runtime change set

### Slices

| Slice | Scope | Acceptance | Mandatory reviews |
| --- | --- | --- | --- |
| 1 | docs alignment + env/runtime contract | plan and env contract have no contradictions with current repo behavior | `docs-reviewer`, `architecture-reviewer` |
| 2 | compose + nginx + ClickHouse + certbot topology | stack topology is internally consistent and health model uses `readyz` | `architecture-reviewer`, `security-reviewer`, `docs-reviewer` |
| 3 | setup/update/watchdog/systemd | bootstrap/update/renew flows are idempotent and do not require host Node runtime | `code-reviewer`, `security-reviewer`, `docs-reviewer` |
| 4 | verification on clean VM + closeout docs | fresh evidence exists for setup, readyz, update, and rollback notes | `docs-reviewer`, integration review |

### Workflow expectations

- `lead-strategic` owns the plan and any reframe
- `orchestrator` executes slice-by-slice
- after each slice: self-check -> slice review -> report -> reframe
- before implementation: bounded architecture readiness check
- before merge: integration review with docs/security/architecture coverage

## Critical Existing References

- `docker-compose.prod.yml` — current app container pattern
- `docker-compose.yml` — PostgreSQL healthcheck pattern
- `deploy/setup.sh` — reference for idempotent bootstrap steps only
- `deploy/nginx.conf` — proxy headers and caching baseline
- `apps/web/src/routes/api/emis/health/+server.ts` — snapshot-only diagnostic endpoint
- `apps/web/src/routes/api/emis/readyz/+server.ts` — runtime readiness endpoint
- `scripts/db.mjs` — canonical snapshot-first DB tooling

## Future Work

- ClickHouse provider in `platform-datasets`
- telemetry / monitoring integration
- Packer or image-builder automation
- admin-driven update UX
