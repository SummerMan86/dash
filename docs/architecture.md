# Architecture: Repository Foundation

Canonical repo-wide foundation architecture doc. Current-state only.

## Scope

- Covers: system shape, topology, package map, dependency and placement rules, deployment model, documentation ownership, verification hooks
- Does not cover: BI runtime specifics (see `bi/architecture.md`), EMIS operational module specifics (see `emis/architecture.md`), historical rollout notes

## 1. Foundation Decisions

### 1.1. System Shape

- One deployable `SvelteKit 2` application in a pnpm workspace monorepo.
- `apps/web` is the only deployable. It is a leaf composition shell: routes, page composition, HTTP transport, startup glue.
- Reusable logic lives in `packages/*`.
- The system is a modular monolith. It is not a microservice split and not a runtime-plugin system.
- **Monorepo stance.** The system is one deployable SvelteKit app in a pnpm workspace monorepo; package boundaries are monorepo-ready code boundaries, not a commitment to a physical split in this wave.
- **Package extraction rule.** Promote code to `packages/*` when it owns a reusable contract, execution boundary, or cross-route/domain capability that should remain app-independent; number of subfolders is never a packaging criterion.

### 1.2. Canonical Execution Paths

- BI / read-side:
  `page or widget -> fetchDataset() -> /api/datasets/:id -> executeDatasetQuery() -> compile to SelectIr -> Provider.execute() -> DatasetResponse`
- EMIS operational:
  `route or page -> app-owned auth and transport glue -> packages/emis-server/src/modules/* -> parameterized SQL -> PostgreSQL / PostGIS`
- Alerts / ops:
  `hooks.server.ts -> app-local scheduler or service -> pg and external channels`

These paths are architectural boundaries, not implementation trivia. BI pages do not call EMIS operational modules directly. EMIS operational routes do not embed BI dataset logic.

- **Transitional BI compatibility surface.** The `filterContext` path is non-target and scheduled for rework. Canonical flat-params reference callers are `strategy/scorecard` and `wildberries/office-day`.
- Current non-target callers scheduled for rework: `strategy/overview`, `strategy/performance`, `strategy/cascade`, `strategy/scorecard_v2`, and EMIS BI read-side. BI runtime maturity means migrating `strategy.*` pages from the `filterContext` path to the flat-params path; EMIS BI is a separate, later migration track.

### 1.3. Contract Model

- External surfaces are explicit contracts: `DatasetQuery`, `DatasetResponse`, `FilterSpec`, Zod request and response schemas, EMIS runtime conventions.
- IRs, provider ports, repositories, and SQL are execution internals, not UI contracts.
- A contract may expose only what the execution path can actually honor.

### 1.4. Boundary and Dependency Discipline

- `packages/*` own reusable logic. `apps/web` may consume packages; packages never import from `apps/web`.
- `platform-*` stays domain-agnostic.
- Client layers do not import server-only code.
- `emis-server` never imports UI.
- BI reads EMIS data only through published DB contracts and BI runtime seams.

Boundary violations are architectural errors, not style issues.

### 1.5. State and Runtime Discipline

- Server is the source of truth for business data.
- Client state owns interaction: filters, view state, async orchestration, local presentation state.
- Filter planning and dataset transport use one shared platform mechanism. Vertical docs own the exact current server contract and supported combinations for that mechanism.
- Long-lived services start in controlled bootstrap points and must remain deterministic and stoppable.
- Single-process constraints are real: bounded caches, one PG pool, and predictable memory use are defaults.

### 1.6. Security, Resilience, and Validation

- Auth and authorization are server gates, never client conventions.
- Payload validation happens at ingress. SQL stays parameterized. Identifiers stay allowlisted.
- HTTP boundaries return typed, stable error shapes and correlation identifiers when available.
- Explicit degraded modes are allowed only when documented and safe.

### 1.7. Testing and Verification

- Test decision points: planners, compilers, registries, parsers, providers, write-policy logic.
- Use smoke tests for cross-layer confidence at auth, route, schema, and read-model boundaries.
- Architectural work is not complete without verification against the hooks in §8.

### Known Transitional Debt

- BI-specific migration debt lives in [docs/bi/architecture.md §9](./bi/architecture.md#9-migration-debt-register).
- EMIS-specific architectural debt lives inline in [docs/emis/architecture.md](./emis/architecture.md).
- Cross-cutting repo debt drafts live in [docs/archive/architecture_improvements_backlog.md](./archive/architecture_improvements_backlog.md) (archive; not canonical).

## 2. System Topology

Single-deployable SvelteKit application built as a pnpm workspace monorepo.

```txt
dashboard-builder/            (workspace root)
  apps/web/                   (SvelteKit app -- the only deployable)
  packages/
    platform-core/            (leaf foundation: format, types, utils)
    platform-ui/              (UI primitives, ECharts presets, design tokens)
    platform-datasets/        (DatasetQuery/Response, registry, executeDatasetQuery, SelectIr-based compiler, providers)
    platform-filters/         (filter store, planner, widgets)
    db/                       (PG pool via pg, leaf foundation)
    emis-contracts/           (EMIS entity types, Zod schemas, DTOs)
    emis-server/              (EMIS server infra + domain modules)
    emis-ui/                  (EMIS map and status UI)
  db/                         (schema snapshots, catalog, applied changes)
  scripts/                    (smoke tests, DB tooling, boundary lint)
  docs/                       (architecture, contracts, plans, runbooks)
```

One runtime process. One build. No microservice decomposition.

## 3. Package Map

| Package             | npm name                               | Purpose                                                                                                           | Key deps                                                                                                         |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `platform-core`     | `@dashboard-builder/platform-core`     | Format helpers, shared TS types, `useDebouncedLoader`                                                             | Svelte (peer)                                                                                                    |
| `platform-ui`       | `@dashboard-builder/platform-ui`       | UI primitives, ECharts presets, design tokens                                                                     | `platform-core`, `echarts`, Svelte (peer)                                                                        |
| `platform-datasets` | `@dashboard-builder/platform-datasets` | `DatasetQuery`/`DatasetResponse`, dataset registry, `executeDatasetQuery()`, `SelectIr`-based compiler, providers | `platform-core`, `db`, `pg`                                                                                      |
| `platform-filters`  | `@dashboard-builder/platform-filters`  | Filter store, filter planner, widgets, `FilterSpec`/`FilterPlan`                                                  | `platform-ui`, `platform-datasets`, Svelte (peer)                                                                |
| `db`                | `@dashboard-builder/db`                | `getPgPool()` and shared PG infra                                                                                 | `pg`                                                                                                             |
| `emis-contracts`    | `@dashboard-builder/emis-contracts`    | EMIS DTOs, entity types, Zod validation schemas                                                                   | `zod`, `@types/geojson`                                                                                          |
| `emis-server`       | `@dashboard-builder/emis-server`       | EMIS server infra and domain modules                                                                              | `emis-contracts`, `db`, `zod`, `bcryptjs`, `pg` (peer)                                                           |
| `emis-ui`           | `@dashboard-builder/emis-ui`           | `EmisMap`, layer config, popup renderers, status bar                                                              | `emis-contracts`, `platform-core`, `platform-ui`, `maplibre-gl`, `pmtiles`, `@protomaps/basemaps`, Svelte (peer) |

Canonical home rule: new reusable code goes into `packages/*`. App-specific composition stays in `apps/web`.

## 4. Domain Contours

### 4.1. Platform / Shared

Foundation packages consumed by multiple domains: `platform-core`, `platform-ui`, `platform-datasets`, `platform-filters`, `db`.

Rules:

- no business-specific EMIS or Wildberries behavior
- no route ownership
- no app-specific page composition

### 4.2. BI / Read-Side

Analytical dashboards and KPI pages.

Active slices:

- `wildberries`: `/dashboard/wildberries/office-day`, `/dashboard/wildberries/product-analytics`, `/dashboard/wildberries/stock-alerts`
- `strategy` under `/dashboard/strategy/`
- `emis` analytics under `/dashboard/emis/`

All BI slices use the BI runtime owned by [docs/bi/architecture.md](./bi/architecture.md).

Boundary note:

- EMIS analytics pages are part of the BI platform, not part of the EMIS operational module
- they consume EMIS data only through published read-models and the shared dataset runtime
- if EMIS is extracted later, these BI pages remain in dashboard-builder

### 4.3. EMIS Operational

Operational workspace under `/emis/*` and `/api/emis/*`.

Owned packages and app seams:

- `packages/emis-contracts`
- `packages/emis-server`
- `packages/emis-ui`
- `apps/web/src/routes/emis/*`
- `apps/web/src/routes/api/emis/*`
- `apps/web/src/lib/server/emis/infra/*`

See [docs/emis/architecture.md](./emis/architecture.md) for the vertical contract.

### 4.4. Alerts / Ops

Server-side alert scheduler and related operational transport stay app-local in `apps/web/src/lib/server/alerts/*`.

Rules:

- scheduler bootstraps from `hooks.server.ts`
- BI pages may consume alert outputs, but the scheduler itself is not part of the dataset runtime
- the owning vertical description lives in [docs/bi/architecture.md](./bi/architecture.md#5-bi-adjacent-operational-paths)

## 5. Import, Placement, and App-Local Rules

### 5.1. Package Dependency Graph

Allowed internal dependencies:

- Leaves: `platform-core`, `db`, `emis-contracts`
- Platform tier:
  - `platform-ui` -> `platform-core`
  - `platform-datasets` -> `platform-core`, `db`
  - `platform-filters` -> `platform-ui`, `platform-datasets`
- EMIS tier:
  - `emis-server` -> `emis-contracts`, `db`
  - `emis-ui` -> `emis-contracts`, `platform-core`, `platform-ui`
- App tier:
  - `apps/web` may import packages
  - no package imports from `apps/web`

### 5.2. Explicit Package Rules

| Package             | Can import from                                  | Cannot import from                                         |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `platform-core`     | (leaf)                                           | everything else                                            |
| `db`                | (leaf)                                           | everything else                                            |
| `platform-ui`       | `platform-core`                                  | emis-\*, datasets, filters, db, apps                       |
| `platform-datasets` | `platform-core`, `db`                            | emis-\*, platform-ui, apps                                 |
| `platform-filters`  | `platform-ui`, `platform-datasets`               | platform-core, emis-\*, db, apps                           |
| `emis-contracts`    | (leaf)                                           | platform-\*, db, emis-server, emis-ui, apps                |
| `emis-server`       | `emis-contracts`, `db`                           | platform-\*, emis-ui, apps                                 |
| `emis-ui`           | `emis-contracts`, `platform-core`, `platform-ui` | platform-datasets, platform-filters, emis-server, db, apps |
| `apps/web`          | all packages                                     | nobody imports from app                                    |

### 5.3. Non-Negotiable Boundaries

1. `platform-*` never imports from `emis-*`.
2. BI routes never import EMIS operational modules. EMIS data enters BI through published DB contracts and BI runtime seams.
3. `emis-server` never imports from `emis-ui`.
4. Packages never import from `apps/web`.

### 5.4. App-Local Structure

The app-local `src/lib/` layer is flat by responsibility. Historical FSD-like buckets are removed and must not return as the governing model.

| Layer                                          | Path                         | Contains                                                    | Status                      |
| ---------------------------------------------- | ---------------------------- | ----------------------------------------------------------- | --------------------------- |
| `api`                                          | `src/lib/api/`               | App-local client transport facades such as `fetchDataset()` | Active                      |
| `fixtures`                                     | `src/lib/fixtures/`          | Mock, demo, and test data                                   | Active                      |
| `styles`                                       | `src/lib/styles/`            | App-level tokens, global CSS, style docs                    | Active                      |
| `dashboard-edit`                               | `src/lib/dashboard-edit/`    | Dashboard editor                                            | Active app-local module     |
| `emis-manual-entry`                            | `src/lib/emis-manual-entry/` | EMIS manual-entry forms                                     | Active app-local module     |
| `server`                                       | `src/lib/server/`            | App-owned server glue and operational helpers               | Formal server-only boundary |
| `entities` / `shared` / `features` / `widgets` | `src/lib/*`                  | Legacy placeholders                                         | Deleted; do not recreate    |

Placement rules:

- page or workspace composition -> `src/routes/...`
- reusable contracts, execution logic, and domain logic -> `packages/*`
- app-specific cross-route glue -> `src/lib/<module>/`
- client transport facades -> `src/lib/api/`
- server-only glue -> `src/lib/server/`

Scaling rules:

- keep `src/lib/` flat by module, not by type
- do not introduce new top-level `shared`, `entities`, `features`, or `widgets`
- if two app-local peer modules need shared logic, promote that logic into `packages/*` or move it into a narrower route-local home

### 5.5. Design-System Split

- `@dashboard-builder/platform-ui` owns reusable UI primitives, chart presets, and generic styling contracts
- `src/lib/styles/` owns app-shell-specific tokens, global CSS, typography utilities, and style docs
- promote from `src/lib/styles/` to `platform-ui` only when the piece becomes package-worthy and reusable beyond the current app shell

### 5.6. Alias and Server Boundary Policy

- keep `$lib`
- do not reintroduce `$shared`, `$features`, `$widgets`, or `$entities`
- prefer explicit imports such as `$lib/api/fetchDataset`, `$lib/styles/...`, `$lib/fixtures/...`

Server boundary rules:

- `src/lib/server/**` is a formal server-only boundary
- allowed consumers: `src/routes/api/**`, `+page.server.ts`, `+layout.server.ts`, `hooks.server.ts`, other `src/lib/server/**`
- `src/lib/server/**` must not import app-local UI modules, `.svelte` components, `platform-ui`, `emis-ui`, or client runtime/store modules
- route handlers stay thin adapters: parse transport input, derive context, call package or server entrypoints, map result or error

`src/lib/` dependency rules:

- `src/lib/server/**` may import server-safe packages; it must not import `src/lib/api/**` or app-local UI peer modules
- `src/lib/api/**` may import client-safe packages and transport utilities; it must not import `src/lib/server/**`
- `src/lib/styles/**` is for styles and tokens only
- `src/lib/<module>/**` may import packages, `src/lib/api/**`, and `src/lib/styles/**`; it should not import other peer app-local modules

### 5.7. Naming Conventions

- Route and URL segments use kebab-case, for example `/dashboard/wildberries/office-day`, `/dashboard/wildberries/stock-alerts`, `/api/datasets/:id`.
- Workspace packages use domain-prefixed kebab-case names under `@dashboard-builder/*`, for example `@dashboard-builder/platform-datasets` and `@dashboard-builder/emis-server`.
- App-local peer modules stay flat under `src/lib/<module>/` and use kebab-case names such as `api`, `dashboard-edit`, `emis-manual-entry`, `server`, `styles`.
- Runtime type and schema names use PascalCase (`DatasetQuery`, `DatasetResponse`, `FilterSpec`); JSON and transport keys use camelCase (`contractVersion`, `requestId`, `datasetId`, `tenantId`, `sourceKind`).
- Dataset ids are dotted runtime identifiers such as `strategy.scorecard_overview`; they are runtime names, not folder-naming conventions.

## 6. Deployment Model

Production deployment: `labinsight.ru` on Beget Cloud VPS.

```txt
Internet -> nginx (443/SSL, certbot) -> Node.js app (127.0.0.1:3000) -> PostgreSQL 16 + PostGIS 3.4
```

Current deployment defaults:

- PostgreSQL: native apt install
- Node.js app: Docker container with `@sveltejs/adapter-node`
- nginx: native reverse proxy with Let's Encrypt SSL
- build: produced on the dev machine, then transferred to the VPS

Key files:

- `Dockerfile`
- `docker-compose.prod.yml`
- `deploy/nginx.conf`
- `deploy/setup.sh`
- `deploy/push.sh`

The runtime is sized for one constrained node. Memory budget and startup behavior must stay compatible with that assumption.

## 7. Documentation Ownership

### 7.1. Canonical Current-State Docs

| Document                                                 | Owns                                     |
| -------------------------------------------------------- | ---------------------------------------- |
| `docs/architecture.md`                                   | repo-wide foundation architecture        |
| `docs/bi/architecture.md`                                | BI vertical architecture                 |
| `docs/emis/architecture.md`                              | EMIS vertical architecture               |
| `docs/emis/README.md`                                    | EMIS entry point and doc map             |
| `docs/emis/change_policy.md`                             | EMIS working rules, review triggers, DoD |
| `db/schema_catalog.md`                                   | app DB schema catalog                    |
| `db/current_schema.sql`                                  | active DDL snapshot                      |
| `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | EMIS API runtime conventions             |

### 7.2. Active Supporting Docs

- `docs/emis/access_model.md`
- `docs/emis/operations.md`
- `docs/emis/product_scope.md`
- `docs/emis/structural_migration.md`

### 7.3. Archive

`docs/archive/bi/*`, `docs/archive/emis/*`, `docs/archive/platform/*`, `docs/archive/strategy-v1/*`, `docs/archive/agents/*` are historical context only.

## 8. Verification Hooks

| Command                   | What it checks                                                       |
| ------------------------- | -------------------------------------------------------------------- |
| `pnpm check`              | `svelte-kit sync` plus `svelte-check` across all Svelte and TS files |
| `pnpm check:packages`     | per-package type checking                                            |
| `pnpm build`              | full production build                                                |
| `pnpm lint:boundaries`    | package and app boundary enforcement                                 |
| `pnpm lint:eslint`        | semantic ESLint checks                                               |
| `pnpm lint:format`        | Prettier formatting check                                            |
| `pnpm lint`               | aggregate format plus ESLint                                         |
| `pnpm test`               | Vitest package tests                                                 |
| `pnpm emis:smoke`         | EMIS read-side and runtime contract smoke suite                      |
| `pnpm emis:write-smoke`   | EMIS write-side and audit smoke suite                                |
| `pnpm emis:offline-smoke` | offline basemap smoke suite                                          |
| `pnpm emis:auth-smoke`    | auth flow smoke suite                                                |

### 8.1. Lint Governance Policy

Mandatory per-slice checks:

| Check                  | Required state                        |
| ---------------------- | ------------------------------------- |
| `pnpm check`           | 0 errors                              |
| `pnpm build`           | success                               |
| `pnpm lint:boundaries` | 0 violations                          |
| `pnpm test`            | all green, at or above baseline count |

Monitored checks:

| Check              | Policy                                    |
| ------------------ | ----------------------------------------- |
| `pnpm lint:eslint` | errors in touched files must not increase |
| `pnpm lint:format` | run before integration merge              |

Rule severity tiers in `eslint.config.js`:

| Tier               | Severity | Examples                                                                        | Policy                               |
| ------------------ | -------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| Boundary / safety  | `error`  | `no-restricted-imports`, `no-unused-vars`, `no-explicit-any`                    | blocking in touched files            |
| Svelte 5 migration | `warn`   | `require-each-key`, `no-navigation-without-resolve`, `prefer-svelte-reactivity` | informational; fix opportunistically |

Baseline captured on 2026-04-11: 46 errors, 187 warnings.

## 9. Adding a New Vertical

Use this pattern for new domains:

1. `packages/<domain>-contracts/` for types and validation
2. `packages/<domain>-server/` for server modules
3. `packages/<domain>-ui/` for reusable UI if needed
4. route layer in `apps/web/src/routes/<domain>/` and `apps/web/src/routes/api/<domain>/`
5. BI integration through published DB views or read-models consumed through the shared dataset registry/runtime
6. invariants overlay in `docs/agents/invariants-<domain>.md` when needed
7. vertical architecture doc at `docs/<domain>/architecture.md`

Favor folder-based vertical docs for new and updated architecture documents.

## 10. Read Next

| If your task involves...                                            | Read                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| BI datasets, providers, filters, DWH integrations, extension points | [docs/bi/architecture.md](./bi/architecture.md)         |
| EMIS operational paths, contracts, ingestion, PostGIS, auth         | [docs/emis/architecture.md](./emis/architecture.md)     |
| Both BI and EMIS                                                    | read both vertical docs; shared rules stay in this file |
