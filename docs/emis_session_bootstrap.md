# EMIS Session Bootstrap

Стартовая current-state страница для EMIS.

Этот документ отвечает только на три вопроса:

- где EMIS находится сейчас;
- какие cross-cutting правила нельзя нарушать;
- что читать дальше по типу задачи.

Полный каталог документации и ownership навигации живет в [docs/AGENTS.md](./AGENTS.md).

## 1. Current State

Статус на `2026-04-05`:

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

- Baseline: `Green / baseline closed`.
- Last full verification pass: `2026-04-05` (DF-5 governance closure, Phase 4 MVE deferrals resolved).
- All 6 canonical checks green:
  - `pnpm check` — 0 errors, 0 warnings
  - `pnpm build` — success
  - `pnpm lint:boundaries` — no violations
  - `pnpm emis:smoke` — 38/38 checks pass
  - `pnpm emis:offline-smoke` — 9/9 checks pass
  - `pnpm emis:write-smoke` — 7/7 flows pass (object, news, link, write-policy)

## 5. Non-Negotiables

- Canonical identity должна доходить до DB constraints / partial unique indexes.
- Soft delete semantics должны быть едиными для API, views и recreate/restore flows.
- Audit trail, actor attribution и provenance входят в обязательный EMIS contract.
- FK behavior и vocabulary boundaries должны быть задокументированы явно.
- Compatibility shims не считаются ownership truth.
- Новый EMIS UI писать на Svelte 5 runes.
- Для новых `entities/features/widgets` по умолчанию использовать плоский namespace `emis-*`.

## 6. Current Focus

### MVE status

MVE has been **accepted, no remaining deferrals** as of `2026-04-05`.

Acceptance audit completed against [docs/emis_mve_product_contract.md](./emis_mve_product_contract.md).
All acceptance criteria from section 7 are met. All explicit deferrals have been resolved in Phase 4 (DF-1 through DF-5).

### Explicit deferrals (all resolved)

- ~~Full auth / sessions / RBAC~~ -- implemented in DF-3: session-based auth, login page, role enforcement
- ~~Admin CRUD for dictionaries~~ -- implemented in DF-2: `/emis/admin/dictionaries` with full CRUD for 3 tables
- ~~Admin role enforcement~~ -- implemented in DF-3: admin routes protected, role hierarchy enforced
- ~~Soft-delete of news/objects~~ -- implemented in DF-1: delete buttons with confirmation dialog on detail pages
- AIS/track data as MVE requirement: not required (already present as bonus)

### Post-MVE completed waves

- `P1` — vessel historical track integration (completed 2026-04-04)
- `P2` — offline maps ops hardening (completed 2026-04-05)
- `Phase 3` — tech debt cleanup and final stabilization (completed 2026-04-05)
  - TD-1: `+page.svelte` decomposed (799 -> 639 lines)
  - TD-2: 72 MIGRATION re-export shims removed (-3280 lines)
  - TD-3: stock-alerts boundary violation fixed
  - TD-4: Prettier drift fixed
  - TD-5: Final baseline verdict — Green / baseline closed
- `Phase 4` — MVE deferrals implementation (completed 2026-04-05)
  - DF-1: Soft-delete UI buttons for objects and news detail pages
  - DF-2: Admin CRUD for dictionaries (countries, object_types, sources)
  - DF-3: Session-based auth with role enforcement (login, RBAC, admin protection)
  - DF-5: Governance closure — all deferrals resolved, baseline Green

Live backlog: [docs/emis_next_tasks_2026_03_22.md](./emis_next_tasks_2026_03_22.md).

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
