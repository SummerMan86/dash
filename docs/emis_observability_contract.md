# EMIS Observability & Readiness Contract

Этот документ фиксирует минимальные договоренности по observability для EMIS: readiness/health endpoints, error logging, request correlation.
Цель: чтобы при стабилизации и дальнейших больших разработках incidents/debugging не превращались в "ручной археологический поиск по коду".

## 1. Текущее состояние (на 4 апреля 2026)

- Есть `GET /api/emis/health` (file-level "snapshot-first readiness"): наличие `db/current_schema.sql`, `db/schema_catalog.md`, `db/applied_changes.md`, seed files и ссылки на доки.
- Все EMIS API routes используют единый error shape `{ error, code }` и `handleEmisRoute()` error boundary.
- Централизованного error logging для EMIS сейчас нет (SvelteKit `handle` middleware не логирует, `handleEmisRoute` не делает structured logs).
- Request correlation (`x-request-id`) не закреплен как контракт.

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

### 3.2. `GET /api/emis/readyz` (рекомендуемый endpoint)

Назначение: "готов ли runtime обслуживать EMIS".

Рекомендуемые проверки:

- `DATABASE_URL` задан
- есть подключение к Postgres
- доступны схемы `emis`, `stg_emis`, `mart_emis`, `mart`
- доступны published contracts, которые читает UI/BI:
  - `mart.emis_*` views, используемые dataset layer
  - `mart_emis.*` views, используемые ship-routes

Это должен быть DB-backed check, который можно использовать для deployment readiness.

## 4. Error logging contract

### 4.1. Correlation id

- Вход: принимать `x-request-id` (если пришел).
- Если не пришел: генерировать `requestId` на сервере.
- Выход: всегда возвращать `x-request-id` в response headers.

### 4.2. Что логируем

Минимальный structured log на error:

- `service: 'emis'`
- `requestId`
- `method`
- `path`
- `status`
- `code` (машиночитаемый код из `{ error, code }`)
- `durationMs`
- `actorId` (если есть; только для tracing, не для auth)

Не логируем:

- request body (кроме safe/summarized shape)
- персональные данные (если появятся)
- большие GeoJSON payloads

### 4.3. Где это должно жить

Единая точка по умолчанию: app-owned transport glue `$lib/server/emis/infra/http.ts` (внутри `handleEmisRoute()`), чтобы:

- не размазывать логирование по каждому route handler;
- не тянуть SvelteKit/runtime deps в `@dashboard-builder/emis-server`.

## 5. Verification contract

- Любое изменение runtime behavior должно быть закреплено минимум одной проверкой:
  - `pnpm emis:smoke` для read-side
  - `pnpm emis:write-smoke` для write-side + audit
  - `pnpm emis:offline-smoke` для offline maps

## 6. Связанные документы

- Runtime/API conventions: `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- Access model и write guardrails: `docs/emis_access_model.md`
- Offline maps ops runbook: `docs/emis_offline_maps_ops.md`
