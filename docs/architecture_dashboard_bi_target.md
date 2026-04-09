# Architecture: Dashboard / BI Vertical -- Target State

Target-state architecture for the BI vertical. This is a design doc, not current state.
For current state see [architecture_dashboard_bi.md](./architecture_dashboard_bi.md).

## Scope

- Covers: target provider model, target filter contract, IR capability policy, Oracle/CubeJS extension path, client-side integration
- Does not cover: EMIS operational paths, repo-wide rules, implementation timeline

---

## 1. Target Provider Model

### Problem (current state)

- `compile.ts` is a manual switch over dataset family enums -- adding a dataset family requires editing the central switch.
- `+server.ts` routes to providers by prefix (`wildberries.*` / `emis.*` / `strategy.*` -> postgres, everything else -> mock).
- `postgresProvider` contains both the SQL builder AND the full dataset catalog (`DATASETS` record with ~300 lines of column mappings).

### Target: Dataset Registry with Static Provider Model

Provider selection moves from ad-hoc prefix checks to a **dataset registry** -- a static lookup table where each dataset declares its compiler, backend, source descriptor, and capability profile.

```
DatasetRegistryEntry = {
  datasetId:          DatasetId
  compile:            (query: DatasetQuery) => DatasetIr
  backendKind:        'postgres' | 'oracle' | 'cube' | 'mock'
  sourceDescriptor:   PostgresSource | CubeSource | MockSource
  capabilityProfile:  CapabilityProfile
}

// Backend-specific source descriptors (union, owned by each backend)
PostgresSource = { kind: 'postgres'; schema: string; table: string; columns: Record<string, ColumnType> }
CubeSource     = { kind: 'cube';     cubeName: string; measures: string[]; dimensions: string[] }
MockSource     = { kind: 'mock';     fixtureId: string }
```

`CapabilityProfile` declares what IR features a provider supports for this dataset:

```
CapabilityProfile = {
  supportsOrderBy:   boolean
  supportsLimit:     boolean
  maxLimit?:         number
}
```

**Provider interface stays unchanged**: `Provider.execute(ir, ctx) -> DatasetResponse`. The change is in where orchestration lives.

**Orchestration lives in `platform-datasets`, not in the route handler.** The package exports a single entrypoint:

```
executeDatasetQuery(datasetId, query, ctx) -> DatasetResponse
  1. entry = registry.get(datasetId)       // O(1) lookup
  2. ir = entry.compile(query)             // dataset-specific compiler
  3. validate ir against entry.capabilityProfile
  4. provider = providers[entry.backendKind]
  5. return provider.execute(ir, ctx)
```

**Route handler stays thin** -- parse HTTP, derive context, delegate, map errors:

```
POST /api/datasets/:id
  1. parse & validate request body
  2. ctx = deriveServerContext(event)
  3. response = executeDatasetQuery(datasetId, query, ctx)
  4. return json(response)              // or mapErrorToHttp(e)
```

**Registration is static code** -- each dataset family has a definition module that exports its entries, and the registry is assembled at import time (no dynamic discovery, no runtime plugin loading).

**Error contract** (stable `{ error, code }` shape per principle 1.6):

- Unknown dataset: `{ error: 'Dataset not found', code: 'DATASET_NOT_FOUND' }`
- Unsupported backend: `{ error: 'Backend not available', code: 'UNSUPPORTED_BACKEND' }`
- Capability mismatch: `{ error: 'IR feature not supported by provider', code: 'CAPABILITY_MISMATCH' }`

All errors are returned by `executeDatasetQuery`; the route handler maps them to the appropriate HTTP status.

---

## 2. Target Filter Contract

### Problem (current state)

- `fetchDataset` merges three filter sources: legacy `getFilterSnapshot()`, planner-produced `serverParams`, and explicit `args.filters` overrides -- layered with spread semantics.
- `DatasetQuery` carries both `.filters` and `.params`, with no clear boundary between planner-produced server params and legacy filter state.
- Compilers receive ad-hoc string keys from the merged bag, not typed params.

### Target: One Canonical Wire Contract

**Canonical path**:

```
FilterSpec
  -> planFiltersForDataset(datasetId, filterValues, runtimeCtx)
  -> FilterPlan { serverParams, clientFilterFn }
  -> serverParams become DatasetQuery.params entries
```

**Rules**:

- `fetchDataset` sends ONLY planner-produced `serverParams` plus widget-specific `params`. No implicit legacy merge.
- `DatasetQuery.params` is the single canonical input bag. Target end-state has no `.filters` field on `DatasetQuery`.
- Compilers receive clean, typed params -- date ranges as `{ dateFrom: string, dateTo: string }`, multi-selects as `string[]`, etc.
- Legacy `FilterState` adapter: allowed as a thin wrapper OUTSIDE the canonical path (e.g. in old widgets that haven't migrated) -- it calls `planFiltersForDataset` internally and produces the same `serverParams`.

> **Migration note:** `DatasetQuery.filters` exists in current state. During migration it is kept for backward compat but ignored by new compilers. It is removed entirely once all consumers migrate to `.params`.

---

## 3. IR Capability Policy

### Problem (current state)

- `SelectIr` declares `groupBy` and `call()` in its type, but `postgresProvider` throws on both.
- This creates false promises: a definition module can compile IR that no provider can execute.

### Target: Read-Model Fetch Contract

`SelectIr` stays as the **read-model fetch contract**: SELECT columns FROM source WHERE filters ORDER BY limit.

- `groupBy` and `call()` are removed from `SelectIr`. They are not part of the read-model contract.
- Client-side reshaping (aggregation, pivoting, computed columns) is the BI widget's responsibility for the current generation.
- Aggregation is NOT part of `SelectIr` or `CapabilityProfile`. If needed in the future, it belongs to a separate analytical IR type and execution path.

**Future analytical query layer** (if needed):

- Separate IR type (`AnalyticalIr` or similar) with its own execution path.
- NOT an extension of `SelectIr` -- a distinct contract with distinct providers.
- Decision rationale: keeping `SelectIr` honest prevents false promises to new providers and keeps compilers simple.

---

## 4. Oracle / CubeJS Extension Path

All extension follows **static code registration**, not a runtime plugin system.

### Adding a new provider (e.g. Oracle)

1. Implement the `Provider` interface (`execute(ir, ctx) -> DatasetResponse`).
2. Handle its own SQL dialect inside the provider (Oracle SQL builder, bind variables, connection pooling).
3. Register the provider under a `backendKind` key (e.g. `'oracle'`).

### Adding a new dataset family

1. Create a definition module exporting `DatasetRegistryEntry[]`.
2. Each entry declares `backendKind`, `sourceDescriptor`, `capabilityProfile`, and a `compile` function.
3. Import and spread entries into the central registry at build time.

### CubeJS path

Two distinct modes with different IR requirements:

- **Cube as read-model backend** (SQL views / pre-aggregated tables): Cube exposes flat read models. Definition modules compile to `SelectIr` as usual. Cube provider translates `SelectIr` into Cube REST/SQL queries, returns `DatasetResponse`. Registered under `backendKind: 'cube'`. This path uses the standard registry/provider interface.
- **Cube semantic / measure mode** (Cube owns query semantics): Cube dimensions and measures are NOT expressible through `SelectIr`. This mode requires a separate analytical IR type (future `AnalyticalIr`) and a distinct execution path -- it must NOT be forced through `SelectIr`. Until `AnalyticalIr` exists, this mode is out of scope.

### No dynamic loading

- No plugin discovery at runtime.
- No dynamic `import()` of providers.
- Registration happens at module import time -- the registry is fully known at build.

---

## 5. Client-Side Architecture

### Core principle: route-first UI composition + package-first data execution

Pages own UI composition and page-local state. Packages own dataset execution, filter planning, and provider orchestration. No dashboard framework, no generic DashboardService.

### Page model: workspace → page → section

```
apps/web/src/routes/dashboard/<domain>/
  +layout.svelte               # workspace chrome, nav
  pages.ts                     # static page metadata for nav/admin
  filters.ts                   # workspace-shared filter specs
  <page>/
    +page.svelte               # composition owner: filters + datasets + local state
    +page.ts | +page.server.ts # bootstrap only (auth context, map config, static options)
    filters.ts                 # owner-only filters (if page needs extra beyond workspace)
    view-model.ts              # heavy reshaping (pure, testable, separate from component)
    components/                # page-local presentational sections
```

### Data fetching

- **Default for interactive BI**: client-side `fetchDataset()` + `useFilterWorkspace()`. Filter changes trigger re-fetch without full page navigation.
- **SvelteKit `load()` / `+page.server.ts`**: used selectively for bootstrap-only concerns — auth-derived defaults, feature flags, map config, slow static option catalogs. NOT the main mechanism for live filter changes.
- **SvelteKit form actions**: used for state mutations when needed (save filter preset, export request). Not for dataset reads.

### Data flow

```
Filter stores (shared/workspace/owner)
  → planFiltersForDataset(datasetId, effectiveFilters, ctx)
  → FilterPlan { serverParams, clientFilterFn }
  → fetchDataset(datasetId, { params: serverParams })
  → POST /api/datasets/:id → executeDatasetQuery → Provider → DatasetResponse
  → clientFilterFn applied client-side (if any)
  → view-model.ts transforms rows → page sections render
```

### Filter architecture

- **Workspace-level filter specs** in `<domain>/filters.ts` — shared across all pages in the domain (e.g. date range, department). Registered once per workspace.
- **Page-level (owner) filters** in `<page>/filters.ts` — only when a page needs extra filters beyond workspace scope.
- **Filter state survives navigation** within a workspace (query-string preservation). Navigating `/wildberries/office-day` → `/wildberries/product-analytics` keeps shared filter values.
- **Scoped stores**: `shared` (rare, cross-workspace) → `workspace` (default) → `owner` (page-local). Derived via `$derived` into effective filters.

### State management

- **Dataset results**: page-local state or page-local `.svelte.ts` helper. NOT in global stores.
- **View state** (sort, selected row, chart mode, tabs): page-local.
- **If a page grows large**: extract `state.svelte.ts` with pure reactive state. Don't jump to global stores.
- **Reshaping/aggregation**: extract to `view-model.ts` — pure functions, testable without components.

### Component model

- **Section components are presentational**: receive rows/view-models/chart options as props. Don't call `fetchDataset()` themselves.
- **Shared visual primitives** stay in `platform-ui`: `Chart`, `DataTable`, `StatCard`, `MetricCard`, inputs, cards.
- **Domain-specific composites** stay in workspace `components/` until they have 3+ consumers AND are domain-agnostic. Then migrate to `platform-ui`.

### What this is NOT

- Not strict FSD — `entities/` and `widgets/` are legacy shims, not target homes for new code
- Not a dashboard framework — no page registry DSL, no widget config, no drag-and-drop grid as default
- Not React patterns — no effect chains, no context providers for data, no HOC wrapping
- Not global-store-first — page data lives with the page

---

## 6. Developer Workflows (cookie-cutter)

### Add a new dashboard page

1. Create `apps/web/src/routes/dashboard/<domain>/<page>/+page.svelte`
2. Reuse `<domain>/filters.ts` for workspace filters; add `<page>/filters.ts` only for owner-scope extras
3. Add page entry to `<domain>/pages.ts` for nav/admin
4. Extract heavy reshaping to `<page>/view-model.ts` (pure, testable)
5. Add `+page.server.ts` only if bootstrap data needed (auth context, config)

### Add a new dataset

1. Add a registry entry in `packages/platform-datasets/src/server/definitions/<family>.ts`
2. Each entry: `datasetId`, `compile`, `backendKind`, `sourceDescriptor`, `capabilityProfile`
3. Export from family index
4. Test compile behavior and provider execution
5. Pages consume via `fetchDataset(datasetId, ...)` — no page changes needed

### Add a new provider

1. Implement `Provider.execute(ir, ctx) → DatasetResponse` in `packages/platform-datasets/src/server/providers/<kind>/`
2. Register `backendKind` in provider map
3. Add backend-specific `sourceDescriptor` type to the union
4. Add integration test with a sample dataset
5. Existing pages: zero changes (provider selected by registry, not by page)

---

## 7. Migration Strategy (high-level)

Incremental path from current state to target, each step additive:

1. **Introduce dataset registry alongside `compile.ts`** — new `DatasetRegistry` module, existing datasets registered. `compile.ts` delegates to registry, falls back to current switch for unregistered.
2. **Migrate dataset families one by one** — paymentAnalytics, wildberriesOfficeDay, wildberriesProductPeriod, emisMart, strategyMart into registry entries. Each migration = standalone commit.
3. **Move SQL mappings out of `postgresProvider`** — `sourceDescriptor` lives in registry entries. Provider receives metadata, doesn't own catalog.
4. **Change route handler to use `executeDatasetQuery`** — replace prefix check and inline orchestration with package-owned entrypoint. Route = parse/context/delegate/map-errors.
5. **Remove legacy filter merge from `fetchDataset`** — drop `getFilterSnapshot()`, send only planner-produced params. Remove `DatasetQuery.filters` field.
6. **Narrow IR** — remove `groupBy` and `call()` from `SelectIr` type. Hard removal, no capability gate.
7. **Add first non-Postgres provider** — Oracle or CubeJS, proving registry + provider interface end-to-end.

---

## 8. Read Next

- [architecture_dashboard_bi.md](./architecture_dashboard_bi.md) -- current state
- [architecture.md](./architecture.md) -- repo-wide foundation
