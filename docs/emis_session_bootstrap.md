# EMIS Session Bootstrap

Это master doc по EMIS.
Он владеет текущим состоянием репозитория, doc map и рекомендуемым reading order.

## 1. Канонический старт

- Архитектурная рамка и boundary map для новых задач:
  [EMIS Architecture Baseline](./emis_architecture_baseline.md)
- Canonical target layout, zone mapping, import/alias/migration rules:
  [Monorepo Target Layout](./emis_monorepo_target_layout.md)
- Короткий рабочий контракт для placement и decision path:
  [EMIS Working Contract](./emis_working_contract.md)
- Source of truth по scope, invariants и acceptance:
  [EMIS MVE TZ v2](./emis_mve_tz_v_2.md)
- Source of truth по implementation decisions и rollout order:
  [EMIS Implementation Spec v1](./emis_implementation_spec_v1.md)
- Frozen decisions и conventions, которые не нужно заново открывать:
  [EMIS Freeze Note](./emis_freeze_note.md)
- Runtime/API contract:
  [EMIS Runtime Contract](../src/lib/server/emis/infra/RUNTIME_CONTRACT.md)

## 2. Что считать текущим состоянием на 1 апреля 2026

### Архитектурная рамка

- EMIS развивается внутри текущего SvelteKit-приложения как `single deployable app`.
- Базовый стиль: modular monolith с monorepo-ready границами.
- Для EMIS operational flows default path:
  `routes/api/emis/* -> server/emis/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`
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
- BI/read-side уже выведен в три route-level slice:
  - `/dashboard/emis`
  - `/dashboard/emis/ship-routes`
  - `/dashboard/emis/provenance`

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
  - минимальная operating model фиксация для `viewer` / `editor` / `admin`
  - centralized write guardrails для production-shaped EMIS writes
  - dictionary/admin scope decision: seed-managed vs narrow CRUD
  - health/readiness contract и centralized API error logging
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
- `emis_monorepo_target_layout.md`
  Canonical target layout, zone mapping, import direction rules, alias policy, migration policy.
- `emis_working_contract.md`
  Short operational rules: placement, non-negotiables, review triggers, DoD.
- `emis_mve_tz_v_2.md`
  Что и зачем делаем: scope, invariants, acceptance.
- `emis_implementation_spec_v1.md`
  Как делаем: структура кода, API, rollout order, DoD.
- `emis_freeze_note.md`
  Какие решения уже заморожены и не требуют нового обсуждения.
- `../src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
  Runtime/API conventions, audit contract, error/meta shape.
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
- `../src/routes/emis/AGENTS.md`
  Workspace route contract для `/emis` UI/orchestration layer.
- `../src/lib/widgets/emis-map/AGENTS.md`
  Map runtime boundaries, extraction rules и widget ownership.
- `../src/routes/dashboard/emis/AGENTS.md`
  BI/read-side route contract для dashboard slices.
- `archive/emis/*`
  Исторические snapshots и завершенные wave notes. Не source of truth и не место для новых обновлений.
- `archive/agents/*`
  Historical agent-model and handoff notes. Читать только если нужен historical context по старому process pack.

## 5. Reading Order по сценариям

### Новый диалог или новый агент

1. Этот bootstrap
2. `emis_architecture_baseline.md`
3. `emis_monorepo_target_layout.md`
4. `emis_working_contract.md`
5. `emis_mve_tz_v_2.md`
6. `emis_implementation_spec_v1.md`
7. `emis_freeze_note.md`

### Задача по API / service / audit

1. Этот bootstrap
2. `../src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
3. `src/lib/server/emis/AGENTS.md`
4. `src/routes/api/emis/AGENTS.md`

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
6. `../src/lib/server/emis/infra/RUNTIME_CONTRACT.md`

### Задача по parallel agent work / local Git orchestration

1. Этот bootstrap
2. `agents/workflow.md` — секции 3, 7
3. `agents/templates.md` — шаблоны задач и handoff

### Задача по `/emis` workspace UI

1. Этот bootstrap
2. `../src/routes/emis/AGENTS.md`
3. `../src/lib/widgets/emis-map/AGENTS.md` - если change касается map layer
4. `../src/lib/server/emis/infra/RUNTIME_CONTRACT.md`

### Задача по EMIS BI routes

1. Этот bootstrap
2. `../src/routes/dashboard/emis/AGENTS.md`
3. `../src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
4. `../src/lib/server/datasets/AGENTS.md`

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
