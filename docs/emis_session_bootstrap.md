# EMIS Session Bootstrap

Это master doc по EMIS.
Он владеет текущим состоянием репозитория, doc map и рекомендуемым reading order.

## 1. Канонический старт

- Чтобы понять current architecture и placement rules:
  - [EMIS Architecture Baseline](./emis_architecture_baseline.md)
  - [EMIS Working Contract](./emis_working_contract.md)
  - [EMIS Runtime Contract](../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md)
- Чтобы понять product scope, invariants и acceptance:
  - [EMIS MVE TZ v2](./emis_mve_tz_v_2.md)
- Чтобы понять future structural migration:
  - [Monorepo Target Layout](./emis_monorepo_target_layout.md)
- Чтобы понять retained implementation decisions и historical rollout context:
  - [EMIS Implementation Spec v1](./emis_implementation_spec_v1.md)
- Чтобы проверить frozen decisions, которые не нужно переоткрывать:
  - [EMIS Freeze Note](./emis_freeze_note.md)

## 2. Что считать текущим состоянием на 4 апреля 2026

### Архитектурная рамка

- EMIS развивается внутри текущего SvelteKit-приложения как `single deployable app`.
- Базовый стиль: `modular monolith`.
- Архитектура читается через три контура:
  - `platform/shared`
  - `EMIS operational`
  - `EMIS BI/read-side`
- Canonical reusable EMIS ownership уже в packages:
  - `packages/emis-contracts/`
  - `packages/emis-server/`
  - `packages/emis-ui/`
- App-level ownership остается в:
  - `apps/web/src/lib/server/emis/infra/http.ts`
  - `apps/web/src/routes/api/emis/*`
  - `apps/web/src/routes/emis/*`
  - `apps/web/src/routes/dashboard/emis/*`
  - `apps/web/src/lib/features/emis-manual-entry/`
  - `apps/web/src/lib/widgets/emis-drawer/`
- Compatibility shims на старых app-paths остаются временным слоем и не считаются ownership truth.
- Для EMIS operational flows default path:
  `routes/api/emis/* -> packages/emis-server/src/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`
- Dataset/IR abstraction сохраняется для BI/read-side и стабильных read-model contracts.

### Что уже реально есть в коде

- `/emis` уже рабочий workspace, а не foundation page.
- Map/list используют общий filter runtime и shared filters.
- Search transports уже есть:
  - `GET /api/emis/search/objects`
  - `GET /api/emis/search/news`
- Catalogs/detail routes для objects и news уже есть.
- Manual create/edit entry points для objects и news уже есть, вместе с production-shaped inline validation и pending states.
- Ship-route slice уже встроен в `/emis`:
  - `GET /api/emis/ship-routes/vessels` (с поддержкой `q` для поиска)
  - `GET /api/emis/ship-routes/points`
  - `GET /api/emis/ship-routes/segments`
  - `shipHbkId` живет в workspace runtime и синхронизируется с URL
  - route UX уже включает `routeMode=points|segments|both` и deep-link на выбранный контекст
- Vessel current positions slice уже встроен в `/emis`:
  - `GET /api/emis/map/vessels?bbox=...&q=...&limit=...` — GeoJSON FeatureCollection текущих позиций из `mart.emis_ship_route_vessels`
  - `/emis?layer=vessels` — отдельный UI-режим с каталогом судов в правой колонке и vessel layer на карте
  - Map widget: vessel source/layer, click/hover/popup, selection highlight
  - Фильтры: `layer='vessels'`, `q` привязан к `mapVessels` target
  - Historical track не загружается автоматически в vessel mode — планируется как следующая волна
- Write-side audit hooks и actor attribution уже подключены для objects, news и news-object links.
- BI/read-side уже выведен в route-level slices:
  - `/dashboard/emis`
  - `/dashboard/emis/ship-routes`
  - `/dashboard/emis/provenance`
  - `/dashboard/emis/vessel-positions`

### Что уже считать фактом в БД

- Локальный PostGIS runtime работает через Docker Compose на `localhost:5435`.
- Repo ведется в snapshot-first режиме: текущий source of truth по active DB structure находится в `db/current_schema.sql`.
- `db/schema_catalog.md` - короткий каталог рабочих app schemas и published SQL contracts.
- Исторический EMIS foundation archive по migrations покрывает wave `001-011`, но это уже не основной navigation layer.
- Snapshot baseline включает `emis`, `stg_emis`, `mart_emis`, `mart` и фиксирует:
  - identity/provenance foundation;
  - append-only `emis.audit_log`;
  - `mart.emis_*` BI contracts;
  - `mart.emis_ship_route_vessels`.

### Что уже закрыто как рабочие slice'ы

- Query/runtime hardening закрыт:
  list meta, strict params, stable `{ error, code }`, dataset meta/sort conventions.
- `pnpm emis:smoke` закрепляет read-side и runtime contract, включая vessel current positions.
- `pnpm emis:write-smoke` закрыт как repeatable write-side smoke:
  6/6 checks, полный `audit_log` verification.
- Offline/maps core implementation закрыта:
  `online | offline | auto`, PMTiles assets, spike route, automated `pnpm emis:offline-smoke` (9/9).
- `/emis` UX edge-case polish закрыт:
  skeleton loaders, map spinner, route truncation badge, layer filter disabled states.
- BI convention audit закрыт (clean):
  meta/sort/error shape coverage verified, DATASETS registry актуален.
- Vessel current positions v1 закрыт:
  map entity contracts, GeoJSON endpoint, vessel layer на карте, vessel mode в `/emis`, catalog search.
  Historical track остаётся как следующая волна.

### Что остается в практическом фокусе

- MVE closeout / contract hardening:
  - минимальная operating model фиксация для `viewer` / `editor` / `admin` → `emis_access_model.md`
  - centralized write guardrails для production-shaped EMIS writes → `emis_access_model.md`
  - dictionary/admin scope decision: seed-managed vs narrow CRUD
  - health/readiness contract и centralized API error logging → `emis_observability_contract.md`
- Post-MVE next wave:
  - vessel historical track integration:
    - опциональная загрузка track при выборе судна из vessel catalog
    - flyTo на выбранное судно из каталога
    - viewport-synced vessel search (сейчас каталог глобальный)
  - production ops hardening для offline maps:
    - Range support verification в `adapter-node`
    - asset update pipeline для новых регионов

## 3. Обязательные EMIS conventions

- Canonical identity должна доходить до DB constraints / partial unique indexes.
- Soft delete semantics должны быть едиными для API, views и recreate/restore flows.
- Audit trail, actor attribution и provenance входят в target contract.
- FK behavior и vocabulary boundaries фиксируются явно.
- Новый EMIS UI писать на Svelte 5 runes.
- Для новых `entities/features/widgets` по умолчанию использовать плоский namespace `emis-*`.

## 4. Doc Map

- `emis_session_bootstrap.md`
  Текущее состояние, reading order и doc ownership.
- `emis_architecture_baseline.md`
  Canonical boundary map: platform vs EMIS operational vs EMIS BI.
- `emis_working_contract.md`
  Short operational rules: placement, non-negotiables, review triggers, DoD.
- `emis_access_model.md`
  Viewer/editor/admin и write guardrails (где enforce, что считать non-negotiable).
- `emis_observability_contract.md`
  Readiness/health endpoints, error logging и request correlation.
- `emis_read_models_contract.md`
  Published read-models (views/marts), datasets и BI route contract (как добавлять новый BI slice).
- `emis_mve_tz_v_2.md`
  Что и зачем делаем: scope, invariants, acceptance.
- `emis_monorepo_target_layout.md`
  Future target layout и migration policy. Не current-state ownership map.
- `emis_implementation_spec_v1.md`
  Retained implementation decisions, API/data rules и historical rollout context. Не current ownership map.
- `emis_freeze_note.md`
  Frozen decisions и conventions, которые не нужно переоткрывать. Не current ownership map.
- `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
  Runtime/API conventions: API design rules, audit contract, error/meta shape.
- `../packages/emis-contracts/AGENTS.md`
  Package-local navigation для canonical entity contracts, DTO и Zod schemas.
- `../packages/emis-server/AGENTS.md`
  Package-local navigation для canonical infra helpers и backend modules.
- `../packages/emis-ui/AGENTS.md`
  Package-local navigation для canonical map/status UI exports.
- `emis_architecture_review.md`
  Approve checklist, mandatory review cases и финальный verdict format.
- `agents/templates.md`
  Current canonical communication templates for plan, worker handoff, report and review request/result.
- `agents/workflow.md`
  Current canonical workflow, review gate and handoff process.
- `emis_offline_maps_ops.md`
  Ops/runbook по MapTiler, PMTiles и production caveats.
- `emis_next_tasks_2026_03_22.md`
  Активный backlog, разбитый на MVE closeout и post-MVE tracks.
- `../apps/web/src/routes/emis/AGENTS.md`
  Workspace route contract для `/emis` UI/orchestration layer.
- `../apps/web/src/routes/dashboard/emis/AGENTS.md`
  BI/read-side route contract для dashboard slices.
- `archive/emis/*`
  Исторические snapshots и завершенные wave notes. Не source of truth и не место для новых обновлений.
- `archive/agents/*`
  Historical agent-model and handoff notes. Читать только если нужен historical context по старому process pack.

## 5. Reading Order по сценариям

### Новый диалог или новый агент

1. Этот bootstrap
2. `emis_architecture_baseline.md`
3. `emis_working_contract.md`
4. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
5. `emis_mve_tz_v_2.md` — если нужен product scope
6. `emis_monorepo_target_layout.md` — если задача про structural migration
7. `emis_implementation_spec_v1.md` — если нужен rollout/history context
8. `emis_freeze_note.md` — если нужно проверить frozen decisions

### Задача по API / service / audit

1. Этот bootstrap
2. `emis_access_model.md` — если change про writes/guardrails/roles
3. `emis_observability_contract.md` — если change про readiness/error logging
4. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — error shape/codes, meta shape, limits/sorts
5. `../packages/emis-contracts/AGENTS.md`
6. `../packages/emis-server/AGENTS.md`
7. `../apps/web/src/routes/api/emis/AGENTS.md`

### Задача по offline maps

1. Этот bootstrap
2. `emis_offline_maps_ops.md`
3. `archive/emis/emis_pmtiles_validation_wave.md`

### Задача по agent workflow / review ownership

1. Этот bootstrap
2. `agents/workflow.md` — процесс, инварианты, review gate
3. `agents/roles.md` — роли агентов
4. `agents/templates.md` — шаблоны коммуникации
5. `emis_architecture_review.md`
6. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`

### Задача по parallel agent work / local Git orchestration

1. Этот bootstrap
2. `agents/workflow.md` — секции 3, 7
3. `agents/templates.md` — шаблоны задач и handoff

### Задача по `/emis` workspace UI

1. Этот bootstrap
2. `../apps/web/src/routes/emis/AGENTS.md`
3. `../packages/emis-ui/AGENTS.md` - если change касается map/status package
4. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`

### Задача по EMIS BI routes

1. Этот bootstrap
2. `emis_read_models_contract.md`
3. `../apps/web/src/routes/dashboard/emis/AGENTS.md`
4. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
5. `../apps/web/src/lib/server/datasets/AGENTS.md`

### Нужен только исторический контекст

Сначала прочитать этот bootstrap, и только потом:

- `archive/emis/emis_handoff_2026_03_17.md`
- `archive/emis/emis_pmtiles_validation_wave.md`

## 6. Локальный smoke path

- `pnpm emis:smoke` - read-side и runtime contract
- `pnpm emis:write-smoke` - write-side + audit verification
- `pnpm emis:offline-smoke` - offline basemap smoke

На shared-folder mounts использовать:

- `CHOKIDAR_USEPOLLING=1 pnpm emis:smoke`
- `CHOKIDAR_USEPOLLING=1 pnpm emis:write-smoke`
- `CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke`
