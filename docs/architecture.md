# Architecture: Repository Foundation

Canonical repo-wide architecture doc. Current-state only.

## Scope
- Covers: system topology, package map, import rules, deployment, shared infrastructure
- Does not cover: BI-specific execution paths (see architecture_dashboard_bi.md), EMIS-specific operational paths (see architecture_emis.md)

## 1. Architectural Principles

Three architecture lenses define the system at different levels:

- **Repo/app level: Package-first modular SvelteKit architecture.** Reusable logic lives in `packages/*`. `apps/web` is a leaf composition shell — it owns routes, page composition, and server transport, but not domain logic or reusable contracts.

- **App composition model: route-first UI + package-first reusable logic.** Routes own page/workspace composition and page-local BI state. Packages own reusable contracts, data execution, and server logic. This is the governing architecture for active development.

- **Legacy app-local folders: secondary organization, not architectural authority.** Old `src/lib/shared`, `features`, and `widgets` folders still exist in parts of the app as migration residue and thin glue. `entities/` has already been removed. These names may help local navigation, but they are migration debt and must not drive new placement or naming decisions.

- **Server pattern: BFF transport over package-owned services.** SvelteKit routes (`+server.ts`, `+page.server.ts`) are thin HTTP transport. Business logic, SQL, and domain rules live in `packages/emis-server`, `packages/platform-datasets`, etc. Routes parse HTTP, validate, delegate to package entrypoints, and map errors.

### 1.1. Data Flow

- **Canonical paths are part of the architecture.** BI reads go `widget → fetchDataset → /api/datasets/:id → compileDataset → DatasetIr → Provider.execute`. EMIS operational flows go `route → emis-server module → parameterized SQL`. This separation exists so analytical reads and operational writes evolve independently. *In practice:* dashboard code must not call `emis-server/modules/*`; EMIS analytics pages only consume published read models/views.

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

### Known Transitional Debt

Two BI transition seams still remain and should be treated as migration debt, not as durable architecture:

1. Legacy filter merging still exists in the compatibility path of `fetchDataset.ts`, and some custom dataset definitions still read `query.filters` instead of the flat canonical `query.params`.
2. `packages/platform-datasets/src/server/compile.ts` still acts as a family-switch compiler beside the registry, so dataset identity lives in both the registry and the legacy compiler until the remaining custom compile cases are absorbed cleanly.

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

## 3. Package Map

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

## 4. Domain Contours

### Platform / shared

Foundation packages consumed by all domains: `platform-core`, `platform-ui`, `platform-datasets`, `platform-filters`, `db`. No business logic. No EMIS or Wildberries awareness.

### BI / read-side

Analytical dashboards and KPI pages. Three active domain slices:

- **Wildberries** (`/dashboard/wildberries/`): office-day stock, product analytics, stock alerts. Data from `mart_marketplace` (external DWH).
- **Strategy / BSC** (`/dashboard/strategy/`): entity overview, cascade, scorecard, performance. Data from `mart_strategy` (external DWH wrappers).
- **EMIS analytics** (`/dashboard/emis/`): news provenance, ship routes, vessel positions, objects dim. Data from `mart.emis_*` and `mart_emis.*` views (app-owned).

All BI slices share the same execution path (see [architecture_dashboard_bi.md](./architecture_dashboard_bi.md)).

> **Boundary note.** "EMIS analytics" pages are part of the **BI platform**, not part of the EMIS module. They consume EMIS data exclusively through published mart views and use BI infrastructure (datasets, providers, filters). They do not import from `emis-server/modules/*`. If EMIS is extracted into a separate repository, these BI pages remain in dashboard-builder.

### EMIS operational

Operational CRUD workspace: object/news catalogs, search, map, dictionaries, manual entry, ship routes, vessel tracking, ingestion pipeline. Lives under `/emis/` (pages) and `/api/emis/` (transport). Packages: `emis-contracts`, `emis-server`, `emis-ui`.

Session-based auth with role hierarchy (viewer/editor/admin), enforced in `hooks.server.ts`.

> **Module boundary.** EMIS is a self-contained domain module (contracts + server + UI + operational routes) that may be extracted into a separate repository. Analytical dashboards that visualize EMIS data (`/dashboard/emis/`) are **not** part of this module — they belong to the BI platform (see above).

See [architecture_emis.md](./architecture_emis.md) for execution paths.

### Alerts / ops

Server-side alert scheduler: evaluates SQL conditions against mart data, sends Telegram notifications, keeps history. App-local in `apps/web/src/lib/server/alerts/`. Started by `hooks.server.ts` on boot.

See [architecture_dashboard_bi.md](./architecture_dashboard_bi.md) for the scheduler path.

## 5. Import and Dependency Rules

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

### App-Local Structure (Current State + Target Policy)

The app still contains historical `src/lib/` folders from an earlier FSD-like organization. They are not the governing architecture model anymore.

For active development, placement is decided by responsibility first:

- Page/workspace composition belongs to `src/routes/...`
- Reusable contracts, data execution, and server logic belong to `packages/*`
- Thin app-local glue may stay in `src/lib/*` when it is neither page-local nor package-worthy

| Layer | Path | Alias | Contains | Status |
|---|---|---|---|---|
| `shared` | `src/lib/shared/` | `$shared` | Transitional bucket: BI facade (`fetchDataset`), styles docs/tokens, fixtures | Migration residue only; not a target home for new naming |
| `entities` | `src/lib/entities/` | `$entities` | Removed in TD-2 | Deleted; do not recreate |
| `features` | `src/lib/features/` | `$features` | Transitional bucket for remaining app-local workflows/editors (`dashboard-edit`, `emis-manual-entry`) | Limited active use, not the default target home |
| `widgets` | `src/lib/widgets/` | `$widgets` | Transitional bucket for app-local composite UI glue (`stock-alerts`, `emis-drawer`) | Thin glue / migration structure |
| `routes` | `src/routes/` | -- | Pages, API endpoints, layouts | Canonical home for UI composition |
| `server` | `src/lib/server/` | -- | BFF: datasets, providers, alerts, strategy | Server-only; never imported from client |

**Placement guidance for new code:**
- New page-scoped BI UI goes into route-local files under `src/routes/dashboard/<domain>/...`
- New reusable logic, contracts, and data execution go into `packages/*`
- Existing `entities/features/widgets/shared` folders may host compatibility code or thin app-local glue, but they are not a required layering model for new work
- Clear import boundaries still matter even if the structure already hints at them; “obvious from folders” is not a substitute for boundary discipline

**Target non-EMIS app-local shape:**

```txt
src/lib/
  server/              # server-only boundary
  api/                 # client API / transport facades
  fixtures/            # mock, demo, and test data
  styles/              # app-level design system: tokens, global CSS, style docs
  dashboard-edit/      # app-local module
  <module>/            # each additional app-local module is a first-level peer
```

Rules for this shape:
- Flat by module, not layered by type
- Do not introduce new top-level `shared`, `entities`, `features`, or `widgets` folders under `src/lib/`
- Each first-level module under `src/lib/` is an app-local unit with an explicit responsibility
- Keep `server/` as-is; it is already semantic and accurate
- If a folder mixes unrelated responsibilities, split it by responsibility instead of renaming one catch-all bucket into another catch-all bucket

**Decision tree for new code:**
- Reusable across domains/projects -> `packages/*`
- Used by exactly one page/workspace -> route-local files under `src/routes/...`
- Used by multiple routes but still app-specific -> `src/lib/<module-name>/`
- Thin client facade to HTTP/BFF -> `src/lib/api/`
- Server-only logic -> `src/lib/server/`

**Module lifecycle:**
1. Route-local: code lives next to the page/workspace that owns it
2. App-local module: once the code is used by 2+ routes and is still app-specific, promote it to `src/lib/<module-name>/`
3. Package: once the module grows broader contracts, related submodules, or cross-domain/project reuse, promote it to `packages/<name>/`

Each promotion is a response to actual growth, not speculative pre-design.

**Grouping and scaling model:**
- `packages/*` is the primary grouping and scaling mechanism for the repository
- New domains normally appear as new packages (`{domain}-contracts`, `{domain}-server`, `{domain}-ui`, or additions to existing platform packages)
- `apps/web/src/routes/*` owns page composition and route-local code
- `apps/web/src/lib/*` stays intentionally thin: `server/`, `api/`, `fixtures/`, `styles/`, and a small number of app-local peer modules
- Do not introduce extra grouping layers inside `src/lib/` to simulate package boundaries; if grouping pressure appears, that is usually the signal to extract a package

**Design-system split:**
- `@dashboard-builder/platform-ui` owns reusable UI primitives, chart presets, and generic component-level styling contracts
- `src/lib/styles/` owns the app-level design system assets that are specific to this SvelteKit app shell: global token CSS, typography utility classes, `app.css` wiring, and the design-system guide
- Promote design-system pieces from `src/lib/styles/` into `platform-ui` only when they become package-worthy and reusable beyond this app shell
- Route and app-local code should consume the design system through reusable components from `@dashboard-builder/platform-ui` plus tokenized styles from `src/lib/styles/`; avoid hardcoded visual values when a token or shared primitive already exists

**Alias policy for the target shape:**
- Keep `$lib`
- Deprecate `$shared`, `$features`, `$widgets`, and `$entities`
- Prefer explicit imports such as `$lib/api/fetchDataset`, `$lib/styles/...`, `$lib/fixtures/...`, `$lib/dashboard-edit`

**Compact boundary rules:**
- Routes own page/workspace composition
- Route-local `components/`, `view-model.ts`, and `filters.ts` are page-scoped and should not become cross-route shared modules
- Packages own reusable contracts, data execution, and server/domain logic
- App-local shared UI primitives may live in neutral folders such as `src/lib/components/` or in `platform-ui`, but they must not know about concrete pages
- `packages/*` must not import app code
- Routes and app-local UI must not reach into package-private server internals; they use public package entrypoints and documented route/BFF seams
- App-local peer modules under `src/lib/<module>/` should not import each other; if two modules need shared code, that code belongs either in `packages/*` or in a narrower route-local shared home

**Server boundary and transport policy:**
- `src/lib/server/**` is a formal server-only boundary. Allowed consumers: `src/routes/api/**`, `+page.server.ts`, `+layout.server.ts`, `hooks.server.ts`, and other `src/lib/server/**` modules.
- `src/lib/server/**` may import server-safe packages (`@dashboard-builder/*/server`, `@dashboard-builder/db`), `@sveltejs/kit` transport APIs, and server-safe shared utilities. It must not import `widgets`, `features`, `.svelte` components, `platform-ui`, `emis-ui`, or Svelte client runtime/store modules.
- `routes/api/**/+server.ts` and server load files stay thin adapters: parse request/params/session, derive context, call package or server entrypoints, map result/error to HTTP or load output.
- Put code into `packages/*` when it is reusable, contract-bearing, or domain logic. Put code into `src/lib/server/**` only for app-owned server concerns and glue (`alerts`, mock provider, EMIS SvelteKit transport helpers).
- BI dataset definitions executed at runtime live in `packages/platform-datasets/src/server/definitions/*`. `apps/web/src/lib/server/datasets/definitions/*` are migration copies/reference only and are not the runtime source of truth for `/api/datasets/:id`.

**`src/lib/` dependency rules:**
- `src/lib/server/**` may import packages and server-safe utilities; it must not import `src/lib/api/**` or app-local UI modules
- `src/lib/api/**` may import packages and client-safe transport utilities; it must not import `src/lib/server/**` or peer app-local modules
- `src/lib/styles/**` is for tokens, CSS, and style docs only; no business logic
- `src/lib/<module>/**` may import packages, `src/lib/api/**`, and `src/lib/styles/**`; it should not import other peer app-local modules

## 6. Deployment Model

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

## 7. Documentation Taxonomy

### Canonical (current-state truth)

| Document | Owns |
|---|---|
| `docs/architecture.md` (this file) | Repo-wide foundation architecture |
| `docs/architecture_dashboard_bi.md` | BI vertical architecture |
| `docs/architecture_emis.md` | EMIS vertical architecture |
| `docs/emis_session_bootstrap.md` | EMIS current state and reading order |
| `docs/emis_working_contract.md` | EMIS working rules and decision discipline |
| `db/schema_catalog.md` | App DB schema catalog |
| `db/current_schema.sql` | Active DDL snapshot |
| `packages/*/AGENTS.md` | Package-local navigation and rules |
| `apps/web/src/routes/dashboard/strategy/AGENTS.md` | Strategy dashboard contract |
| `apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md` | Wildberries DWH contract |
| `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | EMIS API runtime conventions |

### Domain overlays (active supporting docs)

`emis_access_model.md`, `emis_observability_contract.md`, `emis_read_models_contract.md`, `emis_mve_product_contract.md`, `emis_offline_maps_ops.md`, `emis_monorepo_target_layout.md`, `emis_next_tasks_2026_03_22.md`.

### Archive

`docs/archive/bi/*`, `docs/archive/emis/*`, `docs/archive/platform/*`, `docs/archive/strategy-v1/*`, `docs/archive/agents/*` -- historical context only.

## 8. Verification Hooks

| Command | What it checks |
|---|---|
| `pnpm check` | `svelte-kit sync` + `svelte-check` -- type and parse verification across all Svelte/TS files |
| `pnpm check:packages` | Per-package type checking (`tsc --noEmit` for TS, `svelte-check` for Svelte packages) |
| `pnpm build` | Full production build via `vite build`. Catches import errors, missing modules, build-time failures |
| `pnpm lint:boundaries` | Runs ESLint on packages and app layers, reports only `no-restricted-imports` violations. Enforces package dependency graph |
| `pnpm lint:eslint` | Full ESLint semantic lint (unused vars, type safety, Svelte best practices). Not boundary-only |
| `pnpm lint:format` | Prettier formatting check |
| `pnpm lint` | Aggregate: `lint:format` + `lint:eslint` |
| `pnpm test` | Vitest (`packages/*/src/**/*.test.ts`). 127 tests across 10 files (registry, executeDatasetQuery, genericCompile, providerCache, contract, client, schema). `passWithNoTests: true` for packages without tests |
| `pnpm emis:smoke` | 40-check read-side and runtime contract verification |
| `pnpm emis:write-smoke` | 7-flow write-side + audit verification |
| `pnpm emis:offline-smoke` | 9-check offline basemap smoke test |
| `pnpm emis:auth-smoke` | 10-check auth flow verification (login, RBAC, change-password, redirect) |

### 8.1. Lint Governance Policy

**Mandatory per-slice checks** (must pass for every architectural slice):

| Check | Required state |
|---|---|
| `pnpm check` | 0 errors |
| `pnpm build` | success |
| `pnpm lint:boundaries` | 0 violations |
| `pnpm test` | all green, ≥ baseline count |

**Monitored checks** (explicit baseline, "don't worsen touched files"):

| Check | Policy |
|---|---|
| `pnpm lint:eslint` | Errors in touched files must not increase. Warnings are informational — fix when convenient |
| `pnpm lint:format` | Not mandatory per-slice; run before integration merge |

**Rule severity tiers in `eslint.config.js`:**

| Tier | Severity | Examples | Policy |
|---|---|---|---|
| Boundary / safety | `error` | `no-restricted-imports`, `no-unused-vars`, `no-explicit-any` | Blocking. Fix in touched files |
| Svelte 5 migration | `warn` | `require-each-key`, `no-navigation-without-resolve`, `prefer-svelte-reactivity` | Informational. Fix opportunistically when touching the file |

**Baseline (captured 2026-04-11):** 46 errors, 187 warnings. Errors are real issues (unused vars, explicit any); warnings are Svelte 5 migration debt.

**Growth rule:** new ESLint rules are added only through the docs-first rule-introduction policy documented in `docs/agents/invariants.md` §10.

## 9. New Domain Overlay Pattern

Pattern for adding a new domain (like EMIS was added):

1. `packages/{domain}-contracts/` for types and validation
2. `packages/{domain}-server/` for server modules
3. `packages/{domain}-ui/` for reusable UI (if needed)
4. Route layer in `apps/web/src/routes/{domain}/` and `apps/web/src/routes/api/{domain}/`
5. BI integration through published DB views consumed via dataset definitions
6. Domain invariants overlay: `docs/agents/invariants-{domain}.md`
7. Architecture vertical doc: `docs/architecture_{domain}.md`

## 10. Read Next

| If your task involves... | Read |
|---|---|
| BI datasets, providers, filters, DWH integrations, extension points | [architecture_dashboard_bi.md](./architecture_dashboard_bi.md) |
| EMIS operational paths, contracts, ingestion, PostGIS, auth | [architecture_emis.md](./architecture_emis.md) |
| Both BI and EMIS | Read both vertical docs; shared rules are in this file |
