# EMIS Observability & Readiness Contract

Этот документ фиксирует минимальные договоренности по observability для EMIS: readiness/health endpoints, error logging, request correlation.
Цель: чтобы при стабилизации и дальнейших больших разработках incidents/debugging не превращались в "ручной археологический поиск по коду".

## 1. Текущее состояние (на 4 апреля 2026)

- Есть `GET /api/emis/health` (file-level "snapshot-first readiness"): наличие `db/current_schema.sql`, `db/schema_catalog.md`, `db/applied_changes.md`, seed files и ссылки на доки.
- Есть `GET /api/emis/readyz` (DB-backed runtime readiness): DATABASE_URL, PG connectivity, required schemas, published views.
- Все EMIS API routes используют единый error shape `{ error, code }` и `handleEmisRoute()` error boundary.
- `handleEmisRoute()` provides centralized structured error logging: every 4xx/5xx emits a JSON log entry with `service`, `requestId`, `method`, `path`, `status`, `code`, `durationMs`, and optional `actorId`.
- Request correlation (`x-request-id`) is implemented: accepted from incoming request headers, generated if missing, always returned in response headers.

## 2. Цели стабилизации

- У каждого запроса есть correlation id (request id) и он виден в логах.
- Любая 4xx/5xx ошибка по EMIS пишет structured log с `code`, `status`, `route`, `durationMs`.
- Health/readiness разделены на:
  - "repo/snapshot readiness" (файлы и контракт)
  - "runtime readiness" (DB connectivity + required schemas/views)

## 3. Endpoints contract

### 3.1. `GET /api/emis/health`

Назначение: быстрый "is repo wiring sane" без подключения к БД.

Должен оставаться:

- без обращения к Postgres
- быстрым (файловые проверки, doc links)
- стабильным по shape (используется как smoke marker)

### 3.2. `GET /api/emis/readyz`

**Status:** implemented (NW-4, 2026-04-04).

Назначение: "готов ли runtime обслуживать EMIS".

Проверки (все выполняются):

- `DATABASE_URL` задан
- есть подключение к Postgres
- доступны схемы `emis`, `stg_emis`, `mart_emis`, `mart`
- доступны published contracts, которые читает UI/BI:
  - `mart.emis_news_flat`, `mart.emis_objects_dim`, `mart.emis_object_news_facts`, `mart.emis_ship_route_vessels`
  - `mart_emis.ship_route_points`, `mart_emis.ship_route_segments`

Response shape:

```json
// 200 — all checks pass
{
  "status": "ready",
  "checks": {
    "database_url": { "ok": true },
    "pg_connectivity": { "ok": true },
    "schema:emis": { "ok": true },
    "view:mart.emis_news_flat": { "ok": true }
    // ...
  },
  "durationMs": 42
}

// 503 — any check fails
{
  "status": "not_ready",
  "checks": { /* same structure */ },
  "failures": ["schema:stg_emis", "view:mart.emis_news_flat"],
  "durationMs": 15
}
```

Route: `apps/web/src/routes/api/emis/readyz/+server.ts`. DB-backed check for deployment readiness.

## 4. Error logging contract

**Status:** implemented (NW-4, 2026-04-04).

### 4.1. Correlation id

- Вход: принимает `x-request-id` из incoming request header.
- Если не пришел: генерирует UUID на сервере (`crypto.randomUUID()`).
- Выход: всегда возвращает `x-request-id` в response headers (и на success, и на error).

### 4.2. Что логируем

Structured JSON log на каждый error (4xx/5xx):

- `service: 'emis'`
- `level: 'error' | 'warn'` (5xx = error, 4xx = warn)
- `requestId`
- `method`
- `path`
- `status`
- `code` (машиночитаемый код из `{ error, code }`)
- `durationMs`
- `actorId` (если есть; только для tracing, не для auth)
- `message` (если есть; human-readable error message)

Output: `console.error` for 5xx, `console.warn` for 4xx.

Не логируем:

- request body (кроме safe/summarized shape)
- персональные данные (если появятся)
- большие GeoJSON payloads

### 4.3. Где это живет

Единая точка: app-owned transport glue `$lib/server/emis/infra/http.ts` (внутри `handleEmisRoute()`):

- логирование прозрачно для route handler-ов;
- SvelteKit/runtime deps не попадают в `@dashboard-builder/emis-server`.

## 5. Verification contract

- Любое изменение runtime behavior должно быть закреплено минимум одной проверкой:
  - `pnpm emis:smoke` для read-side
  - `pnpm emis:write-smoke` для write-side + audit
  - `pnpm emis:offline-smoke` для offline maps

## 6. Связанные документы

- Runtime/API conventions: `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- Access model и write guardrails: `docs/emis_access_model.md`
- Offline maps ops runbook: `docs/emis_offline_maps_ops.md`
