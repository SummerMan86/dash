# EMIS Session Bootstrap

Стартовая current-state страница для EMIS.

Этот документ отвечает только на три вопроса:

- где EMIS находится сейчас;
- какие cross-cutting правила нельзя нарушать;
- что читать дальше по типу задачи.

Полный каталог документации и ownership навигации живет в [docs/AGENTS.md](./AGENTS.md).

## 1. Current State

Статус на `2026-04-04`:

- EMIS развивается внутри текущего `SvelteKit` приложения как `single deployable app`.
- High-level framing: `modular monolith` с тремя контурами:
  - `platform/shared`
  - `EMIS operational`
  - `EMIS BI/read-side`
- Reusable EMIS ownership уже в packages:
  - `packages/emis-contracts/`
  - `packages/emis-server/`
  - `packages/emis-ui/`
- App-level ownership остается в:
  - `apps/web/src/routes/api/emis/*`
  - `apps/web/src/routes/emis/*`
  - `apps/web/src/routes/dashboard/emis/*`
  - `apps/web/src/lib/server/emis/infra/http.ts`
  - `apps/web/src/lib/features/emis-manual-entry/`
  - `apps/web/src/lib/widgets/emis-drawer/`
- Operational path:
  `routes/api/emis/* -> packages/emis-server/src/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`
- BI/read-side path:
  `fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`

## 2. What Is Live

- `/emis` уже рабочий workspace, а не foundation page.
- Objects/news catalogs, detail pages, search transports и manual create/edit entry points уже есть.
- Ship-routes и vessel current positions уже встроены в `/emis`.
- Write-side audit hooks и actor attribution уже подключены для objects, news и links.
- BI/read-side уже выведен в route-level slices:
  - `/dashboard/emis`
  - `/dashboard/emis/ship-routes`
  - `/dashboard/emis/provenance`
  - `/dashboard/emis/vessel-positions`

## 3. DB Truth

- Локальный PostGIS runtime работает через Docker Compose на `localhost:5435`.
- Active DB truth читается snapshot-first:
  - `db/current_schema.sql`
  - `db/schema_catalog.md`
  - `db/applied_changes.md`
  - `db/pending_changes.sql` при необходимости live delta
- Snapshot baseline покрывает `emis`, `stg_emis`, `mart_emis`, `mart`.

## 4. Current Verification Status

- Post-freeze baseline считается `Green / baseline closed`.
- Canonical routine на текущем baseline:
  - `pnpm check`
  - `pnpm build`
  - `pnpm lint:boundaries`
  - `pnpm emis:smoke`
  - `pnpm emis:offline-smoke`
  - `pnpm emis:write-smoke` when write-side relevant

## 5. Non-Negotiables

- Canonical identity должна доходить до DB constraints / partial unique indexes.
- Soft delete semantics должны быть едиными для API, views и recreate/restore flows.
- Audit trail, actor attribution и provenance входят в обязательный EMIS contract.
- FK behavior и vocabulary boundaries должны быть задокументированы явно.
- Compatibility shims не считаются ownership truth.
- Новый EMIS UI писать на Svelte 5 runes.
- Для новых `entities/features/widgets` по умолчанию использовать плоский namespace `emis-*`.

## 6. Current Focus

### MVE closeout

- health/readiness contract и centralized API error logging:
  [docs/emis_observability_contract.md](./emis_observability_contract.md)
- после этого:
  acceptance audit against [docs/emis_mve_product_contract.md](./emis_mve_product_contract.md)

### Post-MVE next wave

- vessel historical track integration
- offline maps ops hardening

Live backlog читать в [docs/emis_next_tasks_2026_03_22.md](./emis_next_tasks_2026_03_22.md).

## 7. Read Next

- Если нужны repo-wide boundaries и current EMIS placement truth:
  [docs/architecture.md](./architecture.md)
- Если нужна краткая рабочая decision discipline:
  [docs/emis_working_contract.md](./emis_working_contract.md)
- Если задача про runtime/API behavior:
  [RUNTIME_CONTRACT.md](../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md)
- Если задача про product scope / invariants / acceptance:
  [docs/emis_mve_product_contract.md](./emis_mve_product_contract.md)
- Если задача про writes / actor policy / role semantics:
  [docs/emis_access_model.md](./emis_access_model.md)
- Если задача про readiness / health / error logging:
  [docs/emis_observability_contract.md](./emis_observability_contract.md)
- Если задача про BI/read-models/datasets:
  [docs/emis_read_models_contract.md](./emis_read_models_contract.md)
- Если задача про structural migration:
  [docs/emis_monorepo_target_layout.md](./emis_monorepo_target_layout.md)
- Если задача про `/emis` workspace:
  [apps/web/src/routes/emis/AGENTS.md](../apps/web/src/routes/emis/AGENTS.md)
- Если задача про EMIS BI routes:
  [apps/web/src/routes/dashboard/emis/AGENTS.md](../apps/web/src/routes/dashboard/emis/AGENTS.md)
- Если задача про contracts/server/ui packages:
  [packages/emis-contracts/AGENTS.md](../packages/emis-contracts/AGENTS.md),
  [packages/emis-server/AGENTS.md](../packages/emis-server/AGENTS.md),
  [packages/emis-ui/AGENTS.md](../packages/emis-ui/AGENTS.md)

## 8. Local Verification

- `pnpm emis:smoke` — read-side и runtime contract
- `pnpm emis:write-smoke` — write-side + audit verification
- `pnpm emis:offline-smoke` — offline basemap smoke

На shared-folder mounts использовать:

- `CHOKIDAR_USEPOLLING=1 pnpm emis:smoke`
- `CHOKIDAR_USEPOLLING=1 pnpm emis:write-smoke`
- `CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke`

## 9. Historical Context Only

Подключать только если без этого нельзя понять старое решение:

- [docs/archive/emis/emis_implementation_reference_v1.md](./archive/emis/emis_implementation_reference_v1.md)
- [docs/emis_freeze_note.md](./emis_freeze_note.md)
- `docs/archive/emis/*`
