# Architecture: Repository Foundation

Canonical repo-wide architecture doc. Current-state only.

## Scope
- Covers: system topology, package map, import rules, deployment, shared infrastructure
- Does not cover: BI-specific execution paths (see architecture_dashboard_bi.md), EMIS-specific operational paths (see architecture_emis.md)

## 1. Architectural Principles

Two foundational models define the system:

- **Server-side: Modular monolith.** One deployable process, but domain logic is isolated in reusable packages (`packages/*`). Packages own contracts, queries, services; the app (`apps/web`) is a thin transport/orchestration shell. Cross-domain imports go through explicit package boundaries, not internal module paths.

- **Client-side: FSD (Feature-Sliced Design) adapted for Svelte.** App-local code in `apps/web/src/lib/` follows a layered model: `shared → entities → features → widgets → routes`. Each layer can import only from layers below it. This is a UI organization convention, not a governing architecture model — the real reusable logic lives in `packages/*`.

## 2. System Topology

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

All BI slices share the same execution path (see [architecture_dashboard_bi.md](./architecture_dashboard_bi.md)).

### EMIS operational

Operational CRUD workspace: object/news catalogs, search, map, dictionaries, manual entry, ship routes, vessel tracking, ingestion pipeline. Lives under `/emis/` (pages) and `/api/emis/` (transport).

Session-based auth with role hierarchy (viewer/editor/admin), enforced in `hooks.server.ts`.

See [architecture_emis.md](./architecture_emis.md) for execution paths.

### Alerts / ops

Server-side alert scheduler: evaluates SQL conditions against mart data, sends Telegram notifications, keeps history. App-local in `apps/web/src/lib/server/alerts/`. Started by `hooks.server.ts` on boot.

See [architecture_dashboard_bi.md](./architecture_dashboard_bi.md) for the scheduler path.

## 4. Import and Dependency Rules

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

## 5. Deployment Model

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

## 6. Documentation Taxonomy

### Canonical (current-state truth)

| Document | Owns |
|---|---|
| `docs/architecture.md` (this file) | Repo-wide foundation architecture |
| `docs/architecture_dashboard_bi.md` | BI vertical architecture |
| `docs/architecture_emis.md` | EMIS vertical architecture |
| `docs/architecture_dashboard_bi_target.md` | BI target-state architecture |
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

## 7. Verification Hooks

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

## 8. New Domain Overlay Pattern

Pattern for adding a new domain (like EMIS was added):

1. `packages/{domain}-contracts/` for types and validation
2. `packages/{domain}-server/` for server modules
3. `packages/{domain}-ui/` for reusable UI (if needed)
4. Route layer in `apps/web/src/routes/{domain}/` and `apps/web/src/routes/api/{domain}/`
5. BI integration through published DB views consumed via dataset definitions
6. Domain invariants overlay: `docs/agents/invariants-{domain}.md`
7. Architecture vertical doc: `docs/architecture_{domain}.md`

## 9. Read Next

| If your task involves... | Read |
|---|---|
| BI datasets, providers, filters, DWH integrations, extension points | [architecture_dashboard_bi.md](./architecture_dashboard_bi.md) |
| EMIS operational paths, contracts, ingestion, PostGIS, auth | [architecture_emis.md](./architecture_emis.md) |
| Both BI and EMIS | Read both vertical docs; shared rules are in this file |
