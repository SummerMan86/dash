# Architecture: dashboard-builder

Canonical whole-repo architecture document.
Current-state only. No target-state migration material.

## 1. System Topology

Single-deployable SvelteKit 2 application built as a pnpm workspace monorepo.

```
dashboard-builder/            (workspace root)
  apps/web/                   (SvelteKit app -- the only deployable)
  packages/
    platform-core/            (leaf foundation: format, types, utils)
    platform-ui/              (UI primitives, ECharts presets, design tokens)
    platform-datasets/        (DatasetQuery/Response/IR, compiler, providers)
    platform-filters/         (filter store, planner, widgets)
    db/                       (PG pool via pg, leaf foundation)
    emis-contracts/           (EMIS entity types, Zod schemas, DTOs)
    emis-server/              (EMIS server infra + domain modules)
    emis-ui/                  (EMIS map/status UI: MapLibre, PMTiles)
  db/                         (schema snapshots, catalog, applied changes)
  scripts/                    (smoke tests, DB tooling, boundary lint)
  docs/                       (architecture, contracts, plans)
```

One runtime process. One build (`vite build` via `@sveltejs/adapter-node`). No microservices.

## 2. Package Map

| Package | npm name | Purpose | Key deps |
|---|---|---|---|
| `platform-core` | `@dashboard-builder/platform-core` | Format helpers, shared TS types (`JsonPrimitive`, `JsonValue`), `useDebouncedLoader` | Svelte (peer) |
| `platform-ui` | `@dashboard-builder/platform-ui` | UI primitives, ECharts chart presets, TailwindCSS design tokens, `clsx`/`tailwind-merge` | `platform-core`, `echarts`, Svelte (peer) |
| `platform-datasets` | `@dashboard-builder/platform-datasets` | `DatasetQuery`/`DatasetResponse` contract, `DatasetIr` AST, `compileDataset` router, `postgresProvider` | `platform-core`, `db`, `pg` |
| `platform-filters` | `@dashboard-builder/platform-filters` | Filter store (Svelte stores + runes), `FilterSpec`/`FilterPlan` types, `planFiltersForDataset`, filter widgets | `platform-core`, `platform-ui`, `platform-datasets`, Svelte (peer) |
| `db` | `@dashboard-builder/db` | `getPgPool()` -- single PG connection pool factory | `pg` |
| `emis-contracts` | `@dashboard-builder/emis-contracts` | EMIS entity types and Zod validation schemas. Subpath exports per domain: `emis-geo`, `emis-dictionary`, `emis-news`, `emis-object`, `emis-link`, `emis-ship-route`, `emis-map`, `emis-user`, `emis-ingestion` | `zod` |
| `emis-server` | `@dashboard-builder/emis-server` | Server-only EMIS infra (`getDb`, `EmisError`, audit, map config, PMTiles) and domain modules (news, objects, links, dictionaries, map, ship-routes, sessions, users, ingestion). Pattern: queries/repository/service per module | `emis-contracts`, `db`, `zod`, `bcryptjs`, `pg` (peer) |
| `emis-ui` | `@dashboard-builder/emis-ui` | `EmisMap` (MapLibre GL JS + PMTiles), layer config, popup renderers, feature normalizers, `EmisStatusBar` | `emis-contracts`, `platform-core`, `platform-ui`, `maplibre-gl`, `pmtiles`, Svelte (peer) |

Canonical home rules: new reusable code goes into `packages/*`. App-specific composition (routes, lifecycle, glue) stays in `apps/web`. Nobody imports from `apps/web`.

## 3. Domain Contours

### Platform / shared

Foundation packages consumed by all domains: `platform-core`, `platform-ui`, `platform-datasets`, `platform-filters`, `db`. No business logic. No EMIS or Wildberries awareness.

### BI / read-side

Analytical dashboards and KPI pages. Three active domain slices:

- **Wildberries** (`/dashboard/wildberries/`): office-day stock, product analytics, stock alerts. Data from `mart_marketplace` (external DWH).
- **Strategy / BSC** (`/dashboard/strategy/`): entity overview, cascade, scorecard, performance. Data from `mart_strategy` (external DWH wrappers).
- **EMIS BI** (`/dashboard/emis/`): news provenance, ship routes, vessel positions, objects dim. Data from `mart.emis_*` and `mart_emis.*` views (app-owned).

All BI slices share the same execution path (section 4.1).

### EMIS operational

Operational CRUD workspace: object/news catalogs, search, map, dictionaries, manual entry, ship routes, vessel tracking, ingestion pipeline. Lives under `/emis/` (pages) and `/api/emis/` (transport).

Session-based auth with role hierarchy (viewer/editor/admin), enforced in `hooks.server.ts`.

### Alerts / ops

Server-side alert scheduler: evaluates SQL conditions against mart data, sends Telegram notifications, keeps history. App-local in `apps/web/src/lib/server/alerts/`. Started by `hooks.server.ts` on boot.

## 4. Canonical Execution Paths

### 4.1 BI dataset path

```
Widget
  -> fetchDataset({ id, params })          [client: $shared/api/fetchDataset.ts]
  -> POST /api/datasets/:id                [route: apps/web/src/routes/api/datasets/[id]/+server.ts]
  -> compileDataset(datasetId, query)       [packages/platform-datasets/src/server/compile.ts]
  -> DatasetIr                              [typed AST, packages/platform-datasets/src/model/ir.ts]
  -> Provider.execute(ir, ctx)              [postgresProvider or mockProvider]
  -> DatasetResponse                        [returned to widget as JSON]
```

Provider routing: `wildberries.*`, `emis.*`, `strategy.*` prefixes route to `postgresProvider`. Everything else routes to `mockProvider` (fixtures in `$shared/fixtures/`).

Filter integration: `fetchDataset` calls `planFiltersForDataset()` to split filters into server params (become WHERE clauses via IR) and client-side matchers (applied post-fetch).

Dataset compiler routing in `compile.ts` dispatches to domain-specific definition modules: `paymentAnalytics`, `wildberriesOfficeDay`, `wildberriesProductPeriod`, `emisMart`, `strategyMart`.

### 4.2 EMIS operational path

```
/emis/* (page) or /api/emis/* (API)
  -> SvelteKit route handler                [thin HTTP transport, apps/web/src/routes/api/emis/]
  -> emis-server service/repository         [packages/emis-server/src/modules/*]
  -> parameterized SQL via pg               [queries.ts / repository.ts]
  -> PostgreSQL / PostGIS                   [schemas: emis, stg_emis]
```

SQL never appears in route handlers. Route handlers are thin HTTP transport calling into `emis-server` modules. SvelteKit-specific HTTP glue (`handleEmisRoute`, `jsonEmisList`) lives in `apps/web/src/lib/server/emis/infra/http.ts`.

Operational API namespaces: `/api/emis/objects`, `/api/emis/news`, `/api/emis/map`, `/api/emis/search`, `/api/emis/ship-routes`, `/api/emis/dictionaries`, `/api/emis/health`, `/api/emis/readyz`, `/api/emis/auth`, `/api/emis/admin`, `/api/emis/ingestion`, `/api/emis/map-config`.

### 4.3 Alert / scheduler path

```
hooks.server.ts (on boot)
  -> startAlertScheduler()                  [apps/web/src/lib/server/alerts/services/alertScheduler.ts]
  -> node-cron job (configurable schedule)
  -> processAlerts()                        [alertProcessor.ts]
  -> conditionEvaluator: SQL condition -> pg
  -> telegramChannel: send notification
  -> alertHistoryRepository: record result
```

Distributed lock via `alerts.scheduler_locks` prevents duplicate runs across instances. Scheduler disables itself gracefully if the alerts schema is not applied.

### 4.4 Wildberries price proxy

```
Client
  -> POST /api/wb/prices                    [apps/web/src/routes/api/wb/prices/+server.ts]
  -> server-side fetch to WB Prices API     [discounts-prices.wb.ru]
  -> proxied response
```

Keeps `WB_API_TOKEN` server-side. No dataset/IR involvement.

## 5. Data / Storage Ownership

### App-owned schemas (managed by this repo)

| Schema | Purpose | Key objects |
|---|---|---|
| `emis` | Write-side operational tables | `objects`, `news_items`, `news_object_links`, `audit_log`, `countries`, `object_types`, `sources`, `users`, `sessions`, `object_source_refs` |
| `stg_emis` | Ingestion staging | `vsl_load_batch`, `vsl_position_raw`, `vsl_position_latest`, `vsl_ships_hbk`, `obj_import_run`, `obj_import_candidate`, `obj_candidate_match` |
| `mart_emis` | Derived ship-route read models | `vsl_route_point_hist`, `vsl_route_segment_hist` |
| `mart` | Published BI-facing views | `emis_news_flat`, `emis_object_news_facts`, `emis_objects_dim`, `emis_ship_route_vessels` |
| `alerts` | Alert rules, recipients, history, locks | `rules`, `recipients`, `rule_recipients`, `history`, `scheduler_locks` |

Snapshot-first management: `db/current_schema.sql` is the active DDL truth; changes tracked in `db/applied_changes.md`; live deltas in `db/pending_changes.sql`.

### External: Wildberries DWH (`mart_marketplace`)

Managed by external DWH team. Tables: `fact_product_office_day`, `fact_product_day`. View: `v_product_office_day`. Consumed via `postgresProvider` mappings. DDL contract in `dwh_for_wildberries_requirements.md`.

### External: Strategy DWH (`mart_strategy`)

Published views (`slobi_*`) managed by external `agent_pack`. App reads through `postgresProvider` dataset definitions. Local app does not own DDL.

## 6. Import and Dependency Rules

### Package dependency graph

```
                       apps/web  (leaf consumer, imports everything)
                          |
        +-----------------+-----------------+
        |                 |                 |
     emis-ui         emis-server      platform-filters
        |                 |                 |
        v                 v          +------+------+
  emis-contracts    emis-contracts   |             |
        |                 |       platform-ui  platform-datasets
        v                 v          |             |
  platform-core      db, platform-core   platform-core, db
```

### Explicit package rules

| Package | Can import from | Cannot import from |
|---|---|---|
| `platform-core` | (leaf) | everything else |
| `db` | (leaf) | everything else |
| `platform-ui` | `platform-core` | emis-*, datasets, filters, db, apps |
| `platform-datasets` | `platform-core`, `db` | emis-*, platform-ui, apps |
| `platform-filters` | `platform-core`, `platform-ui`, `platform-datasets` | emis-*, apps |
| `emis-contracts` | `platform-core` (types only) | emis-server, emis-ui, apps |
| `emis-server` | `emis-contracts`, `platform-core`, `platform-datasets`, `db` | emis-ui, apps |
| `emis-ui` | `emis-contracts`, `platform-core`, `platform-ui`, `platform-filters` | emis-server, apps |
| `apps/web` | all packages | (nobody imports from app) |

### Non-negotiable boundaries

1. `platform-*` never imports from `emis-*`.
2. BI routes never import EMIS operational modules (`emis-server/modules/*`). EMIS data enters BI only through published DB views.
3. `emis-server` never imports from `emis-ui`.
4. Nobody imports from `apps/web`.

### App-local FSD-inspired layers

Inside `apps/web/src/lib/`, unidirectional dependency order:

```
shared -> entities -> features -> widgets -> routes
```

| Layer | Path | Alias | Contains |
|---|---|---|---|
| `shared` | `src/lib/shared/` | `$shared` | API facades (`fetchDataset`), UI kit re-exports, fixtures |
| `entities` | `src/lib/entities/` | `$entities` | Contracts, types, re-exports from packages |
| `features` | `src/lib/features/` | `$features` | User-facing features (dashboard-edit, emis-manual-entry) |
| `widgets` | `src/lib/widgets/` | `$widgets` | Composite UI blocks (filters, emis-drawer, stock-alerts) |
| `routes` | `src/routes/` | -- | Pages, API endpoints, layouts |
| `server` | `src/lib/server/` | -- | BFF: datasets, providers, alerts, strategy. Server-only |

`server/` is never imported from client code. Most `entities/` and `widgets/` files are MIGRATION re-export shims from packages.

## 7. Client/Server Contract Surfaces

| Contract | Location | Direction | Purpose |
|---|---|---|---|
| `DatasetQuery` / `DatasetResponse` | `platform-datasets/src/model/contract.ts` | Client -> Server -> Client | Versioned BI data contract. UI sends query, server returns typed rows |
| `DatasetIr` (`SelectIr`) | `platform-datasets/src/model/ir.ts` | Server-internal | Typed relational AST: select, where, groupBy, orderBy, limit. Never crosses HTTP boundary |
| `Provider` interface | `platform-datasets/src/model/ports.ts` | Server-internal | `execute(ir, ctx) -> DatasetResponse`. Adapters: `postgresProvider`, `mockProvider` |
| `ServerContext` | `platform-datasets/src/model/ports.ts` | Server-internal | `tenantId`, `userId`, `scopes`. Derived from auth, not from client |
| `FilterSpec` / `FilterPlan` | `platform-filters/src/model/types.ts`, `planner.ts` | Client + Server | Declarative filter definitions. Planner splits into server params + client matchers |
| EMIS Zod schemas | `emis-contracts/src/emis-*/` | Shared validation | Request/response validation for all EMIS API endpoints |
| EMIS RUNTIME_CONTRACT | `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | Server | API conventions: error shape, list meta, audit, request correlation |
| Route/BFF boundary | `apps/web/src/routes/api/` | HTTP | Routes are thin transport. Business logic lives in packages or `src/lib/server/` |

## 8. Extension Points

### Provider interface

`Provider.execute(ir, ctx)` is the primary extension point for new data backends. Current implementations: `postgresProvider` (production), `mockProvider` (fixtures). The interface supports Oracle, CubeJS, or any backend that can interpret `DatasetIr`.

### IR capability policy

`DatasetIr` currently supports: `select`, `where` (with `col`, `lit`, `bin`, `and`, `or`, `not`, `call`), `groupBy`, `orderBy`, `limit`. Known limitation: `call()` aggregations and `groupBy` throw in `postgresProvider` (MVP limitation). New IR node kinds can be added to `IrExpr` union.

### Dataset definitions

New dataset: add a definition module in `platform-datasets/src/server/definitions/`, register in `compile.ts`, add relation mapping in `postgresProvider`.

### New domain overlay

Pattern for adding a new domain (like EMIS was added):
1. `packages/{domain}-contracts/` for types and validation
2. `packages/{domain}-server/` for server modules
3. `packages/{domain}-ui/` for reusable UI
4. Route layer in `apps/web/src/routes/{domain}/` and `apps/web/src/routes/api/{domain}/`
5. BI integration through published DB views consumed via dataset definitions

### Ingestion adapters

`emis-server/modules/ingestion/adapters/` provides a registry pattern for external data source adapters (currently: OSM, GEM). New source: implement adapter interface, register in adapter registry.

## 9. Deployment Model

Production deployment: **labinsight.ru** on Beget Cloud VPS (1 vCPU, 1 GB RAM, Ubuntu 24.04).

```
Internet -> nginx (443/SSL, certbot) -> Node.js app (127.0.0.1:3000) -> PostgreSQL 16 + PostGIS 3.4
```

- **PostgreSQL**: native apt install (no Docker overhead on constrained RAM).
- **Node.js app**: Docker container (`@sveltejs/adapter-node` build), `network_mode: host`.
- **Nginx**: native reverse proxy + Let's Encrypt SSL.
- **Build**: performed on dev machine (OOM risk on 1 GB VPS), image transferred via `docker save | gzip | ssh`.

Key files: `Dockerfile` (multi-stage, node:20-alpine, pnpm@10), `docker-compose.prod.yml`, `deploy/nginx.conf`, `deploy/setup.sh`, `deploy/push.sh`.

Memory budget: ~590 MB used (OS + PG + Docker + Node + nginx), ~410 MB free + 512 MB swap.

## 10. Documentation Taxonomy

### Canonical (current-state truth)

| Document | Owns |
|---|---|
| `docs/architecture_dashboard_builder.md` (this file) | Whole-repo architecture |
| `docs/architecture.md` | Compatibility wrapper, points here |
| `docs/emis_session_bootstrap.md` | EMIS current state and reading order |
| `docs/emis_working_contract.md` | EMIS working rules and decision discipline |
| `db/schema_catalog.md` | App DB schema catalog |
| `db/current_schema.sql` | Active DDL snapshot |
| `packages/*/AGENTS.md` | Package-local navigation and rules |
| `apps/web/src/routes/dashboard/strategy/AGENTS.md` | Strategy dashboard contract |
| `apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md` | Wildberries DWH contract |
| `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | EMIS API runtime conventions |

### Domain overlays (active supporting docs)

`emis_access_model.md`, `emis_observability_contract.md`, `emis_read_models_contract.md`, `emis_mve_product_contract.md`, `emis_offline_maps_ops.md`, `plans/emis_external_object_ingestion.md`.

### Archive

`docs/archive/emis/*`, `docs/archive/strategy-v1/*`, `docs/archive/agents/*` -- historical context only.

## 11. Verification Hooks

| Command | What it checks |
|---|---|
| `pnpm check` | `svelte-kit sync` + `svelte-check` -- type and parse verification across all Svelte/TS files |
| `pnpm build` | Full production build via `vite build`. Catches import errors, missing modules, build-time failures |
| `pnpm lint:boundaries` | Runs ESLint on packages and app layers, reports only `no-restricted-imports` violations. Enforces package dependency graph |
| `pnpm test` | Vitest (`packages/*/src/**/*.test.ts`). Currently `passWithNoTests: true` -- no tests exist yet |
| `pnpm emis:smoke` | 40-check read-side and runtime contract verification |
| `pnpm emis:write-smoke` | 7-flow write-side + audit verification |
| `pnpm emis:offline-smoke` | 9-check offline basemap smoke test |
| `pnpm emis:auth-smoke` | 10-check auth flow verification (login, RBAC, change-password, redirect) |
| `pnpm lint` | Prettier format check + ESLint (full rules, not boundary-only) |
