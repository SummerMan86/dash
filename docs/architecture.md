# Architecture: Repository Foundation

Canonical repo-wide architecture doc. Current-state only.

## Scope
- Covers: system topology, package map, import rules, deployment, shared infrastructure
- Does not cover: BI-specific execution paths (see architecture_dashboard_bi.md), EMIS-specific operational paths (see architecture_emis.md)

## 1. Architectural Principles

Three models define the system at different levels:

- **Repo/app level: Package-first modular SvelteKit architecture.** Reusable logic lives in `packages/*`. `apps/web` is a leaf composition shell — it owns routes, page composition, and server transport, but not domain logic or reusable contracts.

- **App-local `src/lib` organization: FSD-inspired UI composition layers.** `shared → entities → features → widgets` provide a one-way dependency order for app-local UI code. This is an organizational convention, not the governing architecture — the real reusable logic lives in packages. The canonical FSD model is adapted: `entities/` is mostly empty (contracts moved to packages), `widgets/` is thin glue, routes own significant page/transport composition (SvelteKit-native, not pure FSD).

- **Server pattern: BFF transport over package-owned services.** SvelteKit routes (`+server.ts`, `+page.server.ts`) are thin HTTP transport. Business logic, SQL, and domain rules live in `packages/emis-server`, `packages/platform-datasets`, etc. Routes parse HTTP, validate, delegate to package entrypoints, and map errors.

### 1.1. Data Flow

- **Canonical paths are part of the architecture.** BI reads go `widget → fetchDataset → /api/datasets/:id → compileDataset → DatasetIr → Provider.execute`. EMIS operational flows go `route → emis-server module → parameterized SQL`. This separation exists so analytical reads and operational writes evolve independently. *In practice:* dashboard code must not call `emis-server/modules/*`; EMIS BI only consumes published read models/views.

- **Transport is never the domain.** Routes may parse HTTP, validate input, derive server context, and shape responses — but SQL, PostGIS logic, and business rules live in packages or `src/lib/server/*`. *In practice:* SQL in route files and HTTP objects in services/repositories are forbidden.

### 1.2. Boundary Discipline

- **`packages/*` own reusable logic; `apps/web` is a leaf composition shell.** This keeps the deployable app thin and makes domain logic portable. *In practice:* nobody imports from `apps/web`; new reusable code goes into packages first.

- **Boundaries are one-way and enforced, not advisory.** `platform-*` stays domain-agnostic, `emis-server` never imports UI, client layers never import server code, BI never crosses into EMIS operational internals. *In practice:* violating the ESLint boundary graph is an architectural error, not a style issue.

### 1.3. Contract Model

- **External communication happens through explicit contracts.** `DatasetQuery`/`DatasetResponse`, `FilterSpec`, Zod request/response schemas, and `RUNTIME_CONTRACT` are the surfaces teams code against. `DatasetIr` and provider ports stay server-internal. *In practice:* UI talks `DatasetQuery`, not IR or SQL.

- **Contracts must be honest about capabilities.** A contract may only expose features that the execution path can actually honor. *In practice:* unsupported IR features, undocumented response shapes, and silent behavioral drift are treated as migration debt immediately.

### 1.4. State Management

- **Server is the source of truth for business data; client state drives interaction.** Client stores hold filters, view state, and request orchestration — not authoritative domain records. *In practice:* widgets derive data from fetch/load/API calls, not long-lived client-side copies.

- **Client state is scoped explicitly and derived whenever possible.** The filter runtime models `shared`, `workspace`, and `owner` scopes. *In practice:* duplicated state blobs, hidden cross-page globals, and ad-hoc store coupling are forbidden.

### 1.5. Extension Model

- **Extend by adding registrations and bounded modules, not by poking holes through layers.** New datasets add definition modules and provider mappings; new domains follow the `contracts → server → ui → routes → read-model` pattern. *In practice:* "just add a special case in the route" is the wrong default.

- **Composition is static, not plugin-driven at runtime.** The system is designed for build-time known modules and explicit registration because the runtime is a single constrained process. *In practice:* dynamic provider discovery and runtime plugin loading are out of bounds.

### 1.6. Error & Resilience

- **Failures must be explicit, typed, and correlatable.** All endpoints return stable `{ error, code }`, EMIS routes propagate `x-request-id`. *In practice:* thrown raw errors at the HTTP boundary are forbidden.

- **Degradation is allowed only when documented and safe.** Missing schema, missing `DATABASE_URL`, auth fallback, scheduler disablement — each is an explicit mode. *In practice:* if a component cannot meet its contract, it returns a clear error, not guessed data.

### 1.7. Security Model

- **Auth and authorization are server gates, never client conventions.** Identity, role, and actor attribution come from session/cookies resolved on the server. *In practice:* every EMIS write path calls `assertWriteContext()` before mutation.

- **Validation and SQL safety happen at ingress and execution boundaries.** Payloads parsed by Zod, SQL parameterized, identifiers allowlisted by `isSafeIdent()`. *In practice:* raw SQL fragments from request data are forbidden.

### 1.8. Testing Philosophy

- **Test the decision points, not just the screens.** Pure planners, compilers, registries, and contract parsers carry architectural behavior. *In practice:* `planFiltersForDataset`, dataset compilation, param parsing, and write-policy logic are covered before cosmetic component tests.

- **Use smoke tests for cross-layer confidence.** Important failures are usually at boundaries: auth, schema readiness, read models, route contracts. *In practice:* boundary lint, type/build checks, and EMIS smoke suites are mandatory verification for architectural work.

### 1.9. Deployment & Runtime

- **Design for one deployable process on a small box.** The system runs as a single SvelteKit/Node app with one PostgreSQL pool and limited memory (~1 GB). *In practice:* avoid per-request heavy caches, uncontrolled background workers, and behaviors that assume microservice isolation.

- **Runtime must stay deterministic and bootstrap-safe.** Long-lived services start in controlled places (`hooks.server.ts`), features must not depend on "eventually initialized" side effects. *In practice:* background schedulers, cleanup loops, and startup probes are single-entry and gracefully stoppable.

### 1.10. Naming & Conventions

- **Names reveal boundary and role.** Package names (`platform-*`, `emis-*`), module names (`queries.ts`, `repository.ts`, `service.ts`), route namespaces (`/api/emis/*`, `/dashboard/*`) show where logic belongs. *In practice:* new files fit the existing architectural vocabulary instead of inventing parallel structures.

- **URL, JSON, and dataset naming are contracts, not preferences.** Operational APIs use kebab-case paths and camelCase payload names. Dataset rows mirror SQL/read-model names in snake_case. *In practice:* do not normalize one side into the other unless the contract says so.

### Known Architectural Debt

Three items violate these principles today and are tracked for migration (see `architecture_dashboard_bi_target.md`):

1. Legacy filter merging in `fetchDataset.ts` — violates "contracts must be honest"
2. Prefix-based provider selection in `/api/datasets/[id]/+server.ts` — violates "extend by registration"
3. `SelectIr` exposes `groupBy`/`call()` that `postgresProvider` throws on — violates "honest capabilities"

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

### App-local UI layers (FSD-inspired, not strict FSD)

Inside `apps/web/src/lib/`, unidirectional dependency order for UI composition:

```
shared -> entities -> features -> widgets -> routes
```

| Layer | Path | Alias | Contains | Status |
|---|---|---|---|---|
| `shared` | `src/lib/shared/` | `$shared` | API facades (`fetchDataset`), UI kit re-exports, fixtures | Active, thin glue |
| `entities` | `src/lib/entities/` | `$entities` | Re-exports from packages | Mostly empty — contracts live in packages |
| `features` | `src/lib/features/` | `$features` | User-facing features (dashboard-edit, emis-manual-entry) | Active; `dashboard-edit` is the strongest FSD-like slice |
| `widgets` | `src/lib/widgets/` | `$widgets` | Composite UI blocks (filters, emis-drawer, stock-alerts) | Thin glue; reusable widgets migrated to packages |
| `routes` | `src/routes/` | -- | Pages, API endpoints, layouts | SvelteKit-native; routes own page/transport composition |
| `server` | `src/lib/server/` | -- | BFF: datasets, providers, alerts, strategy | Server-only; never imported from client |

**How this differs from canonical FSD:**
- Real reusable logic lives in `packages/*`, not in app-local layers
- `entities/` and `widgets/` are mostly migration shims, not active business slices
- Routes own significant composition logic (SvelteKit file-based routing is first-class architecture)
- `server/` layer has no FSD equivalent — it's SvelteKit BFF, orthogonal to UI layers

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
