# Architecture: Dashboard / BI Vertical

Canonical BI architecture doc. Current-state only.
Wave 1 (BR-1..BR-10) is implemented and merged; the stable core described here is the active BI architecture.
Canonical repo-wide foundation: [architecture.md](../architecture.md).
Historical BI context: [archive/bi/architecture_dashboard_bi.md](../archive/bi/architecture_dashboard_bi.md) and [archive/bi/bi_refactor_rollout.md](../archive/bi/bi_refactor_rollout.md).

## Scope

- Covers: dataset runtime, shared filter wire contract, IR policy, client-side query model, BI-adjacent operational paths, BI-relevant storage ownership, provider extension path, schema introspection
- Does not cover: repo-wide topology and dependency rules, EMIS operational module internals, detailed rollout timeline
- Owns the dataset and filter runtime used by BI pages and EMIS read-side datasets under `/dashboard/emis/*`
- `emis.*` read-model datasets are part of the BI dataset registry and execution pipeline; EMIS operational paths remain separate
- EMIS operational routes, auth, ingestion, and map runtime stay in [docs/emis/architecture.md](../emis/architecture.md)

## High-Level Model

The BI architecture is built on two organizing principles:

**Route-first UI composition.** Each BI page owns its layout, filter wiring, async query state, and presentation reshaping. Pages are self-contained: they do not depend on global dataset stores or a central dashboard framework. Reusable visual primitives live in packages; page-specific orchestration stays route-local.

**Package-first data execution.** All dataset logic — contracts, registry, compilation, provider dispatch, access policy — lives in `platform-datasets`. The route handler is a thin adapter: parse request, derive server context, call `executeDatasetQuery()`, map errors to HTTP. Routes never select providers, contain SQL, or know provider internals.

These two principles meet at one narrow interface:

```
Page → fetchDataset(datasetId, { params }) → POST /api/datasets/:id
  → executeDatasetQuery(datasetId, query, ctx)
    → registry lookup → access check → params parse → compile → provider.execute
  → DatasetResponse
```

Every dataset is described by one `DatasetRegistryEntry`: source descriptor, field catalog, Zod params schema, optional custom compile. Most datasets use declarative mode with explicit query bindings; custom compile is an escape hatch, not the norm.

Flat `DatasetQuery.params` is the canonical caller shape. The planner resolves filter specs into per-target server params client-side; new pages and migrated pages send only `params`. The live server contract still accepts deprecated top-level `DatasetQuery.filters` for non-target migration callers, and those remaining surfaces are tracked in §9.

`SelectIr` is an honest read-model fetch contract: select, where, order, limit, offset. No groupBy, no aggregation calls. Analytical workloads belong in published backend views or a future separate `AnalyticalIr` path.

Providers implement one method: `execute(ir, entry, ctx) → DatasetResponse`. Backend-specific concerns (connection pools, dialect differences, backend execution semantics) stay inside the provider. Server-side cache orchestration is package-owned in `executeDatasetQuery()` and driven by `entry.cache`; the architecture extends by adding registry entries and provider implementations, not by modifying central routers or capability matrices.

---

## Status

**Wave 1 (BR-1..BR-10) is complete and merged.** The stable core below is now implemented, not just designed. Reference migration: `/dashboard/strategy/scorecard/`.

This document is the BI source of truth for active read-side work. Historical rationale stays in archive docs; current-state contracts stay here.

### Stable core

The following decisions should be treated as the durable foundation unless there is an explicit architectural reason to reopen them:

- route-first BI UI composition with page-local state by default
- package-first ownership for reusable logic, contracts, and data execution
- low-ops first-wave delivery by default: bounded in-process cache and app-owned PostgreSQL persistence remain the baseline, while external analytical layers stay optional
- registry-first dataset execution
- explicit Zod-based params normalization per dataset
- flat `DatasetQuery.params` as the canonical caller contract, with deprecated top-level `filters` still live during migration
- one canonical `DatasetRegistryEntry` per dataset
- minimal `source` descriptor that says where data lives, not full provider-owned catalogs
- explicit query bindings for declarative generic compilation
- standard pagination/sort conventions for read-model datasets
- declarative dataset definitions by default, custom compile only as an escape hatch
- honest, read-model-focused `SelectIr`
- thin route / package-owned orchestration
- registry-owned coarse-grained dataset access placeholder
- minimal BI query observability
- registry-owned cache hints with package-orchestrated server-side caching, plus client-side request dedup for UX
- page-owned async query state, not global dataset stores
- static code registration, not runtime plugin loading
- flat app-local `src/lib/*` peer modules plus route-local ownership are secondary organization only; package-first placement rules still govern BI architecture

### Evolving parts

The following parts are intentionally open for refinement as the application and provider set grow:

- how strict `rowSchema` validation should be in production vs dev/test
- future analytical query path beyond read-model fetches
- Oracle and ClickHouse adaptation details
- optional app-layer query manager such as TanStack Query
- optional SQL builder tooling such as Kysely for the Postgres provider

---

## 1. Dataset Runtime

### Historical Problems This Architecture Closed

- `compile.ts` is a manual switch over dataset family enums, so every new family touches a central router
- `/api/datasets/:id` selects providers by dataset id prefix
- `postgresProvider` owns both SQL execution and the full source catalog / column metadata
- dataset params are not normalized by a single explicit per-dataset schema before compile
- `SelectIr` currently exposes nodes that production providers do not execute
- server-side cache requirements for real-time backends are not part of the core target contract

### Durable Model: One Canonical `DatasetRegistryEntry`

The current model is intentionally simple:

- one registry entry per dataset
- one minimal source descriptor inside the entry
- one explicit field catalog inside the entry
- one explicit Zod schema for params
- optional custom `compile`
- otherwise a default generic compiler

Runtime source of truth:

- `/api/datasets/:id` imports `executeDatasetQuery()` from `@dashboard-builder/platform-datasets/server`
- package-owned compile/registry code imports definitions from `packages/platform-datasets/src/server/definitions/*`
- `apps/web/src/lib/server/datasets/definitions/*` are legacy migration copies/reference only; they are not the runtime source of truth and must not receive new canonical dataset work

```ts
import { z } from 'zod';

type DatasetFieldDef = DatasetField & {
	filterable?: boolean;
	sortable?: boolean;
	hidden?: boolean;
};

type DatasetFilterBinding = {
	param: string;
	field: string;
	op: 'eq' | 'gte' | 'lte' | 'in' | 'like';
};

type DatasetRegistryEntry<TParams, TRow = Record<string, JsonValue>> = {
	datasetId: DatasetId;
	source: SourceDescriptor;
	fields: DatasetFieldDef[];
	paramsSchema: z.ZodType<TParams>;
	queryBindings?: {
		filters?: DatasetFilterBinding[];
	};
	compile?: (datasetId: DatasetId, params: TParams) => SelectIr;
	rowSchema?: z.ZodType<TRow>;
	access?: {
		requiredScopes?: string[];
	};
	cache?: {
		ttlMs: number;
		refreshIntervalMs?: number;
		staleWhileRevalidate?: boolean;
	};
	execution?: {
		defaultLimit?: number;
		maxLimit?: number;
		timeoutMs?: number;
	};
};
```

`SourceDescriptor` describes only where the data lives:

```ts
type SourceDescriptor =
	| {
			kind: 'postgres';
			schema: string;
			table: string;
	  }
	| {
			kind: 'oracle';
			connectionName: string;
			schema: string;
			table: string;
	  }
	| {
			kind: 'clickhouse';
			database: string;
			table: string;
	  }
	| {
			kind: 'cube';
			cubeName: string;
	  }
	| {
			kind: 'mock';
			fixtureId: string;
	  };
```

`cube` is an explicit source kind when Cube owns the served read model, freshness policy, or failure surface for a dataset.
The first-wave descriptor stays intentionally minimal: cube member catalogs, measures, dimensions, and time-dimension semantics are not promoted into `SourceDescriptor`.
If a dataset needs the app itself to compose analytical measures/dimensions/time windows dynamically, that belongs to a future `AnalyticalIr` path, not to the first-wave read-model contract.

Important ownership rules:

- `source` answers "where data lives"
- `fields` are the canonical source of truth for dataset fields, response metadata, and dynamic UI
- `paramsSchema` validates and normalizes canonical wire params
- `queryBindings` are the canonical source of param-to-field mapping for `genericCompile()`
- `compile` exists only when declarative mode is insufficient
- `access` defines the coarse-grained dataset visibility contract at the registry/orchestration layer; current enforcement is still placeholder-only
- `cache` defines package-orchestrated server-side cache hints and refresh behavior
- `execution` contains dataset-level limits/timeouts, not generic backend capabilities

### No `CapabilityProfile` in First-Wave Target

`CapabilityProfile` is intentionally removed from the first-wave target.

Reason:

- for Postgres, Oracle, and ClickHouse, the first-wave common contract is still the same basic read-model `SelectIr`
- real divergence lives in provider implementation details, SQL dialect, connection handling, and backend-specific failure modes
- a boolean capability matrix adds code faster than it adds signal

If backend divergence later becomes large enough, provider capability assertions may return as:

- provider-specific diagnostics
- dev/test assertions
- a future explicit `ProviderCapabilities` surface

They are not part of the target runtime for the first BI refactor wave.

### Declarative by Default, Custom When Needed

There are two supported authoring modes:

#### Mode 1: Declarative dataset definition

Used for the majority of read-model datasets.

```ts
{
  datasetId: 'payments.transactions_live',
  source: {
    kind: 'oracle',
    connectionName: 'payments-prod',
    schema: 'PAYMENTS',
    table: 'V_TX_LIVE'
  },
  fields: [
    { name: 'tx_id', type: 'string' },
    { name: 'amount', type: 'number' },
    { name: 'status', type: 'string', filterable: true, sortable: true },
    { name: 'created_at', type: 'datetime', filterable: true, sortable: true }
  ],
  paramsSchema: z.object({
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sortBy: z.enum(['status', 'created_at']).optional(),
    sortDir: z.enum(['asc', 'desc']).default('asc'),
    status: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  }),
  queryBindings: {
    filters: [
      { param: 'status', field: 'status', op: 'eq' },
      { param: 'dateFrom', field: 'created_at', op: 'gte' },
      { param: 'dateTo', field: 'created_at', op: 'lte' }
    ]
  },
  cache: { ttlMs: 15_000 }
}
```

If `compile` is omitted, the runtime uses a generic compiler that:

- selects visible fields by default
- applies `WHERE` only from explicit `queryBindings.filters`
- applies `ORDER BY`, `LIMIT`, and `OFFSET` from standard normalized params
- rejects unknown sort fields instead of guessing
- stays inside the read-model `SelectIr` contract

#### Mode 2: Custom compile

Used for datasets with custom conditions, aliases, or non-trivial shaping rules.

```ts
{
  datasetId: 'strategy.cascade_detail',
  source: {
    kind: 'postgres',
    schema: 'mart_strategy',
    table: 'slobi_cascade_detail'
  },
  fields: [...],
  paramsSchema: z.object({
    entityId: z.string(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional()
  }),
  compile: (params) => { /* custom SelectIr */ }
}
```

### Provider Contract

The target provider interface is intentionally simple:

```ts
Provider.execute(ir, entry, ctx) -> DatasetResponse
```

Reason:

- dropping `CapabilityProfile` removes one layer
- provider still needs more than bare `source` because it may use `fields`, `cache`, `rowSchema`, or execution hints
- passing `entry` is simpler than inventing a thin wrapper object too early

If provider input later grows into a materially different execution contract, a dedicated plan object can be introduced then.

### Package Entrypoint

Orchestration lives in `platform-datasets`, not in the route handler.

```ts
executeDatasetQuery(datasetId, query, ctx) -> DatasetResponse
  1. entry = registry.get(datasetId)
  2. assertDatasetAccess(entry, ctx)
  3. typedParams = entry.paramsSchema.parse({ ...query.filters, ...query.params })
  4. cache hit check (when entry.cache.ttlMs > 0)
  5. ir = entry.compile
       ? entry.compile(datasetId, typedParams)
       : genericCompile(entry, typedParams)
  6. provider = providers[entry.source.kind]
  7. response = provider.execute(ir, entry, ctx) + populate cache on success
  8. return response
```

This keeps the first-wave flow small while matching the live package entrypoint:

- lookup
- access check
- parse merged params
- cache lookup
- compile
- provider resolve
- execute
- cache populate
- return

### Server Context

`ctx` is server-derived execution context, not part of `DatasetQuery`:

```ts
type ServerContext = {
	tenantId: string;
	userId?: string;
	scopes?: string[];
	requestId?: string;
	locale?: string;
	timezone?: string;
};
```

Rules:

- `ServerContext` carries identity, scope, locale, and correlation metadata
- `requestId` is for tracing/correlation and may be echoed back, but it must not affect cache identity
- `ServerContext` must not carry HTTP objects, DB connections, or framework request wrappers
- provider infrastructure remains backend-owned

### Dataset Access Policy

Registry entries may declare coarse-grained read access:

```ts
type DatasetAccess = {
	requiredScopes?: string[];
};
```

Rules:

- `access` lives on the registry entry and the intended gate location is `executeDatasetQuery()` before compile/execute
- `/api/datasets/:id/schema` is intended to use the same gate position as `/api/datasets/:id`
- dataset access is coarse-grained only; row-level security stays in published read models or provider/query logic
- current implementation keeps both gates as placeholders/comments; the contract shape exists, but enforcement is not active yet

### Dataset ID Convention

Dataset ids follow `{domain}.{entity}`.

Examples:

- `wildberries.fact_product_period`
- `strategy.scorecard_overview`
- `payments.transactions_live`
- `ifts.system_parameters`
- `ifts.payment_stats`
- `ifts.message_stats`
- `ifts.operday_state`

The target direction is to keep ids:

- readable
- globally unique
- domain-scoped

Template-literal TypeScript unions per family may be added later, but they are not required to begin the refactor.

### Schema Introspection

The registry supports schema lookup without executing a query:

```ts
getDatasetSchema(datasetId) -> {
  datasetId: DatasetId;
  fields: DatasetSchemaField[];
  source: { kind: SourceDescriptor['kind'] };
}
```

Current delivery path:

- server-side lookup first
- HTTP endpoint for dynamic UI:

```txt
GET /api/datasets/:id/schema
  -> { datasetId, fields, source: { kind } }
```

This supports:

- auto-generated column pickers
- admin/debug tooling
- dynamic UI that needs to know fields and backend kind before the first query executes

This is the current contract for an embedded query builder in low-ops deployments.
It operates only over registered datasets and declared public fields; it is not a home for arbitrary SQL authoring.

Schema introspection must not bypass access policy:

- unauthorized datasets (access check fails) must not expose their schema through `/api/datasets/:id/schema`
- fields with `hidden: true` are suppressed from the schema response; this is field-level visibility, not dataset-level
- dataset-level visibility is governed solely by the `access` gate (`requiredScopes`); there is no separate dataset-level `hidden` / `discoverable` flag in the first-wave contract
- introspection exports minimal public dataset metadata, not internal transformed compiler state

### Route Handler Contract

The route stays thin:

```ts
POST /api/datasets/:id
  1. parse and validate the transport contract
  2. derive ServerContext from auth/session/request
  3. response = executeDatasetQuery(datasetId, query, ctx)
  4. return json(response) or mapErrorToHttp(error)
```

Route code must not:

- select providers by prefix
- contain SQL
- know provider internals
- implement dataset-specific business rules

Placement rule:

- if logic is reusable or defines BI runtime behavior, it belongs in `packages/platform-datasets/*`
- `src/lib/server/*` is reserved for app-owned server glue such as `mockProvider`, alerts, and thin transport helpers; it is not a second canonical home for dataset compilation

### Error Contract

Stable JSON error shape:

```ts
type DatasetError = {
	error: string;
	code:
		| 'DATASET_NOT_FOUND'
		| 'DATASET_ACCESS_DENIED'
		| 'DATASET_INVALID_PARAMS'
		| 'UNSUPPORTED_BACKEND'
		| 'DATASET_EXECUTION_FAILED'
		| 'DATASET_TIMEOUT'
		| 'DATASET_CONNECTION_ERROR';
	retryable: boolean;
	requestId?: string;
};
```

Guidance:

- `DATASET_NOT_FOUND`, `DATASET_ACCESS_DENIED`, `DATASET_INVALID_PARAMS`, `UNSUPPORTED_BACKEND` -> `retryable: false`
- `DATASET_ACCESS_DENIED` -> HTTP 403; for internal BI, explicit denial is preferred over hiding dataset existence behind 404
- `DATASET_EXECUTION_FAILED` -> usually `retryable: false`
- `DATASET_TIMEOUT`, `DATASET_CONNECTION_ERROR` -> `retryable: true`

Transport-level errors may exist around this flow:

- `DATASET_ID_MISSING`
- `DATASET_INVALID_JSON`
- `DATASET_INVALID_QUERY`
- `DATASET_UNSUPPORTED_CONTRACT_VERSION`

The route maps package errors to HTTP status. Raw thrown errors must not cross the HTTP boundary.

### Query Observability

The BI runtime must emit one minimal structured signal per query completion or failure.
The exact sink is implementation detail; package code stays framework-agnostic.

Minimum fields:

- `datasetId`
- `provider`
- `sourceKind`
- `requestId`
- `compileMs`
- `executeMs`
- `totalMs`
- `rowCount`
- `cacheHit`
- `cacheAgeMs`
- `errorCode`

Rules:

- success and failure both emit a signal
- `sourceKind` reflects the backend that actually served the response (`oracle`, `cube`, `clickhouse`, etc.), even if several systems sit behind one provider implementation
- `cacheAgeMs` is `0` or omitted for uncached/fresh responses and populated when a bounded stale value was served
- logs/metrics must not include full params or row payloads by default
- `/schema` requests may use lighter telemetry, but access denials and execution failures must still be visible

---

## 2. Filter Wire Contract

This section defines the shared dataset-facing filter contract for BI pages and EMIS read-side datasets. EMIS operational CRUD paths do not introduce a separate filter transport contract.

### Historical Problems This Contract Closed

- `fetchDataset` merges legacy filter snapshots, planner-produced params, and explicit overrides with spread semantics
- `DatasetQuery` currently carries both `.filters` and `.params`
- a page with multiple datasets repeats per-dataset planning boilerplate
- current planner supports more scope/apply combinations than the current BI contract actually needs

### Durable Contract: One Canonical Wire Contract

The canonical wire contract stays flat, but the live transport shape still carries one deprecated compatibility field during migration:

```ts
type DatasetQuery = {
	contractVersion: ContractVersion;
	requestId?: string;
	filters?: Record<string, JsonValue>; // deprecated top-level compatibility bag
	params?: Record<string, JsonValue>;
};
```

Rules:

- planner-owned server filters and page/widget-owned input are merged client-side before transport on the canonical path
- target end-state is `params`-only; current runtime still accepts top-level `.filters` as a transitional compatibility bag
- planner provenance stays in UI/planner code, not in the server contract
- transport helpers must not hide merge precedence; the live merge rule is `{ ...query.filters, ...query.params }`, so `params` wins on collision
- new datasets and migrated pages target flat `params` directly

### Canonical Planning Path

```txt
FilterSpec
  -> planFiltersForTarget(targetId, filterValues, runtimeCtx)
  -> or planFiltersForTargets(targetIds, filterValues, runtimeCtx)
  -> FilterPlan or Map<TargetId, FilterPlan>
  -> dataset-specific plan.serverParams
  -> page-local dataset input
  -> explicit merge into flat DatasetQuery.params
```

The package surface should be described with one canonical primitive, one ergonomic batch helper, and one compatibility alias:

```ts
planFiltersForTarget(targetId, values, ctx) -> FilterPlan
planFiltersForTargets(targetIds, values, ctx) -> Map<TargetId, FilterPlan>
planFiltersForDataset(datasetId, values, ctx) -> FilterPlan
```

Guidance:

- `planFiltersForTarget()` is the primitive
- `planFiltersForTargets()` is the ergonomic helper pages/workspaces should normally use when several datasets share the same effective filters
- `planFiltersForDataset()` is a compatibility alias for dataset-centric route callers; document it as alias, not as a peer canonical primitive
- use `targetId`, not only `datasetId`, because the planner can also address semantic targets beyond datasets
- planner output and page-local input should use distinct param names by default; intentional overrides must be explicit in caller code

### Supported Scope / Apply Combinations

The current runtime supports a wider surface than the default narrative for new BI work.

Canonical defaults for new BI work:

- `workspace + server`
- `owner + server`
- `workspace + client`

Supported live runtime surface:

- `shared + server` remains active in current Wildberries and EMIS routes
- `shared + client` remains supported when a workspace shares the same effective filter state
- `hybrid` remains a supported planner/runtime mode; it is not the default direction for new pages, but it is not legacy-only either

The contract guidance is therefore:

- new BI work should prefer the canonical defaults above
- current runtime behavior still includes `shared` scope and `hybrid` apply, so docs must describe them as supported live surface rather than deferred fiction

### Dataset-Level Input Parsing

Each dataset entry owns a Zod schema for its canonical input shape.
That schema parses the flat wire contract into typed compiler input.

Example:

```ts
const paramsSchema = z.object({
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	status: z.string().optional(),
	limit: z.coerce.number().int().positive().optional(),
	offset: z.coerce.number().int().min(0).optional(),
	sortBy: z.enum(['status', 'created_at']).optional(),
	sortDir: z.enum(['asc', 'desc']).default('asc')
});
```

This is where date coercion, enum parsing, defaults, pagination, and multi-select normalization belong.

### Standard Pagination and Sort Params

Read-model datasets should reuse standard helper schemas for common query controls.

```ts
const paginationParamsSchema = z.object({
	limit: z.coerce.number().int().positive().max(10_000).default(100),
	offset: z.coerce.number().int().min(0).default(0)
});

const createSortParamsSchema = <TField extends string>(sortableFields: [TField, ...TField[]]) =>
	z.object({
		sortBy: z.enum(sortableFields).optional(),
		sortDir: z.enum(['asc', 'desc']).default('asc')
	});
```

Rules:

- canonical pagination params are `limit` and `offset`
- canonical sort params are `sortBy` and `sortDir`
- `sortBy` must resolve only to registry-declared sortable fields
- `genericCompile()` understands these standard params automatically
- responses may include `meta.totalCount` when a backend can provide it cheaply; if omitted, UI must treat the total as unknown rather than zero

### Migration Note

During migration:

- `DatasetQuery.filters` may temporarily exist for backward compatibility
- `fetchDataset({ filterContext })` remains a transitional compatibility seam for non-target callers
- legacy filter bags may temporarily be adapted into flat `params` before parse or merged into deprecated top-level `filters` on the compatibility path
- legacy `FilterState` wrappers may call `planFiltersForDataset()` as a compatibility alias and then merge planner output into the legacy request shape

But new datasets and migrated pages should target the flat `params` contract directly.

---

## 3. IR Policy: Honest Read-Model Fetch Contract

### Historical Problems This Policy Closed

- `SelectIr` declares `groupBy` and `call()`, but current providers throw on both
- the current target mentions `limit`, but not `offset`, which is required for large real-time or detailed table views

### Current Contract

`SelectIr` stays the read-model fetch contract:

```ts
type SelectIr = {
	kind: 'select';
	from: DatasetSource;
	select: IrSelectItem[];
	where?: IrExpr;
	orderBy?: IrOrderBy[];
	limit?: number;
	offset?: number;
};
```

Contract rules:

- remove `groupBy` and `call()` from `SelectIr`
- add `offset`
- canonical pagination params are `limit` and `offset`
- keep `compile()` pure and read-model-oriented
- provider differences stay inside providers, not in IR booleans

### Client-Side Reshaping Policy

Client-side reshaping is allowed only for presentation-level work:

- chart series reshaping
- small-table pivots
- computed labels
- UI-only grouping for already fetched bounded result sets

It is not the right home for:

- heavy aggregations over large datasets
- semantic metrics
- reusable analytical query logic

If those appear, they belong either in:

- a published read model / view in the backend, or
- a future separate `AnalyticalIr` execution path

`AnalyticalIr` must be a distinct contract, not an extension of `SelectIr`.

### Analytical Workloads and Real-Time BI

For metrics such as counts, sums, averages, rejection rates, or participant/service groupings, the current BI contract does not compile raw-table aggregation into `SelectIr`.

Supported target homes:

- published backend views or read models in Oracle, Postgres, or ClickHouse
- Cube as an explicit analytical source for published or pre-aggregated read models
- a future `AnalyticalIr` path for app-composed measures, dimensions, and time windows

For IFTS-like real-time BI, this means the app should read already-shaped aggregate results.
`SelectIr` fetches those results; it does not define `GROUP BY`, metric formulas, or backend analytical semantics over raw transactional tables.

---

## 4. Client-Side Architecture

### Core Principle

Route-first UI composition + package-first data execution.

Pages own:

- UI composition
- page-local async query state
- page/workspace-local filter wiring
- presentation reshaping in `view-model.ts`

Packages own:

- dataset contracts
- dataset execution
- provider orchestration
- filter planning primitives
- reusable visual primitives

The post-wave app-local layout under `src/lib/` is flat by module and does not define where new BI code should live.

For non-EMIS BI work, do not recreate `shared`, `entities`, `features`, or `widgets` folders as if they were canonical architecture layers.
If app-local cross-route code is still needed, use flat first-level modules under `src/lib/` (`api/`, `fixtures/`, `styles/`, `<module>/`) or keep the code route-local.
Current example: `apps/web/src/routes/dashboard/wildberries/stock-alerts/*` stays route-local because one dashboard route owns the implementation.

### Page Model

```txt
apps/web/src/routes/dashboard/<domain>/
  +layout.svelte               # workspace chrome, nav
  pages.ts                     # static page metadata for nav/admin
  filters.ts                   # workspace-shared filter specs
  _shared/                     # domain-shared helpers/components, optional
  <page>/
    +page.svelte               # composition owner: filters + datasets + local state
    +page.ts | +page.server.ts # bootstrap only
    filters.ts                 # owner-only filters when needed
    view-model.ts              # pure transformations
    components/                # page-local presentation sections
```

Guidance:

- route-local files are the default home for page-scoped BI code
- `_shared/` is allowed for reuse inside one BI workspace/domain
- move to `platform-ui` only when something becomes truly reusable and domain-agnostic

### Data Flow

```txt
Filter stores (workspace/owner)
  -> planFiltersForTargets(targetIds, effectiveFilters, ctx)
  -> per-target FilterPlan
  -> build flat DatasetQuery.params
  -> fetchDataset(datasetId, query)
  -> POST /api/datasets/:id
  -> executeDatasetQuery
  -> DatasetResponse
  -> page AsyncState
  -> view-model.ts
  -> presentational sections
```

### Standard Query State

All dataset consumers should use a common page-level async state shape:

```ts
type AsyncState<T> =
	| { status: 'idle' | 'loading' }
	| { status: 'ok'; data: T; refreshing?: boolean }
	| { status: 'error'; error: DatasetClientError; data?: T };

type DatasetClientError = {
	code: string;
	message: string;
	retryable: boolean;
	requestId?: string;
};
```

Rules:

- `fetchDataset()` remains a transport/data facade returning a promise
- pages or page-local state modules own `AsyncState`
- section components receive ready data or explicit loading/error props
- dataset results do not live in global stores

### Multi-Dataset Pages

Most BI pages coordinate several datasets.
The target pattern is page-local orchestration, not a global dataset state layer.

Recommended patterns:

- use one page-local loader plus `Promise.all(...)` when several datasets form one coherent block and should refresh together
- use per-dataset state or `Promise.allSettled(...)` when partial results are acceptable
- keep async state per dataset or per coherent block; the page decides the overall loading/error presentation
- route-local helpers are fine when one workspace repeats the same orchestration pattern; do not promote them into a platform package too early

### Refresh UX Pattern

The target UX pattern for filter changes is:

1. keep previous data visible
2. mark the query as refreshing
3. replace the data seamlessly when the new response arrives

This can be implemented with a custom page-local state model or later with an app-layer query manager. It is a UI pattern, not a provider concern.

### Real-Time Refresh Model

For datasets with aggressive freshness requirements, pages may layer managed refresh on top of the normal `fetchDataset()` contract.

Recommended first-wave pattern:

- page-local auto-refresh helper or state module (`useAutoRefresh(...)`-style), not a global subscription runtime
- polling by `fetchDataset()` on a bounded interval for dashboards that refresh every 10-30 seconds
- keep previous data visible and mark state as `refreshing`
- use `entry.cache.refreshIntervalMs` as a hint when present, but let the page own the final cadence

Future optimization path:

- SSE endpoint such as `GET /api/datasets/:id/stream` that pushes invalidation or fresh `DatasetResponse` payloads when a cache entry refreshes
- WebSocket/subscription transport only if page-local polling becomes too expensive or latency-sensitive

This does not change the core request-response dataset contract.
It is a page-owned UX model on top of `fetchDataset()`, not a second global execution path.

### `fetchDataset()` Responsibilities

The BI facade should own:

- transport request construction
- planner integration
- in-flight deduplication for identical queries
- request cancellation / stale-request handling
- normalization of server errors into a typed client error shape

The facade must not own:

- server-side provider caches
- page-level loading state
- shared global data stores
- dataset-specific view-model logic

Current caller split:

- canonical callers use `fetchDataset({ id, params })`
- `fetchDataset({ filterContext })` is transitional compatibility only for the non-target migration queue in §9

### Cache Strategy

Caching exists at two layers with different ownership:

#### Server-side app cache

- package-orchestrated
- driven by `entry.cache`
- bounded in-memory TTL cache inside the app process is the default first-wave implementation for single-node / low-ops deployments
- especially relevant for Oracle real-time datasets
- `ttlMs` is the normal freshness budget for cached reads
- `refreshIntervalMs` may be used for proactive refresh/pre-warm behavior and may also inform page auto-refresh defaults
- `staleWhileRevalidate` allows bounded stale reads while a background refresh is in progress
- implementation must be bounded by TTL and memory budget

**Current implementation** (OC wave, 2026-04-10):

Shared LRU cache helper at `packages/platform-datasets/src/server/providerCache.ts` (internal, not in the public `./server` export). See [`packages/platform-datasets/AGENTS.md`](../../packages/platform-datasets/AGENTS.md) for file map.

- `createProviderCache({ maxEntries })` — factory; default 200 entries, true LRU eviction via `lru-cache` v11
- `buildCacheKey(datasetId, params, tenantId)` — deterministic key; segments separated by `\0`; `requestId` excluded
- TTL enforced per-entry via `Date.now()` comparison on read; expired entries evicted lazily on next `get()`
- `structuredClone` on both set and get — callers cannot mutate cached data
- `meta.cacheAgeMs` derived from `cachedAt` timestamp stored alongside each entry

The live cache instance is a package-level singleton owned by `executeDatasetQuery.ts`, not a provider-internal cache. Oracle IFTS datasets are the first registry entries that activate it by declaring `cache.ttlMs`; Postgres and future backends can reuse the same package helper when they need server-side caching. Routes, UI, and `fetchDataset()` do not interact with it directly.

#### Client-side request dedup

- facade-owned inside `fetchDataset()`
- required for UX and duplicate-click / rapid-filter protection
- may include a tiny optional in-memory TTL, but it is not the canonical freshness mechanism when server-side provider cache exists

Minimum contract:

- identical in-flight requests are deduplicated inside `fetchDataset()`
- when `staleWhileRevalidate` is enabled, providers may serve cached data immediately and refresh in the background, but they must not leave stale entries alive indefinitely without a refresh budget
- current package cache key is `{datasetId}\0{tenantId}\0{sortedParams}`
- current cache identity uses the dataset id, tenant id, and deterministic sorted params; `requestId` is excluded and no additional scope markers participate today
- `requestId` does not participate in cache identity

### Output Typing

Target direction:

```ts
type DatasetResponse<TRow = Record<string, JsonValue>> = {
	contractVersion: ContractVersion;
	datasetId: DatasetId;
	requestId?: string;
	fields: DatasetField[];
	rows: TRow[];
	meta?: Record<string, JsonValue> & {
		totalCount?: number;
		sourceKind?: string;
		cacheAgeMs?: number;
	};
};
```

Practical guidance:

- transport may stay structurally generic at runtime
- stronger typing should come from explicit dataset-owned `rowSchema` / row types, not from trying to infer row shape from arbitrary IR
- when end-user freshness matters, datasets may surface `meta.sourceKind` and `meta.cacheAgeMs` so the page can show provenance/staleness explicitly
- until typed dataset wrappers are in place, `view-model.ts` is the only allowed narrowing boundary for raw rows

### State Placement Rules

- filter and sort state that must survive reload/navigation belongs in the URL
- dataset data and selection state stay page-local
- `+page.server.ts` / `load()` are for bootstrap data only, not the main live BI fetch path
- avoid side effects inside `load()`

### What This Is Not

- not FSD as a governing architecture model
- not “FSD folders with new disclaimers”
- not a dashboard framework or page registry DSL
- not global-store-first BI state
- not provider logic hidden inside pages

---

## 5. BI-Adjacent Operational Paths

These flows are adjacent to the BI contour and stay active, but they do not go through the dataset runtime contract above.

### Alert / Scheduler Path

```txt
hooks.server.ts (on boot)
  -> startAlertScheduler()                  [apps/web/src/lib/server/alerts/services/alertScheduler.ts]
  -> node-cron job (configurable schedule)
  -> processAlerts()                        [alertProcessor.ts]
  -> conditionEvaluator: SQL condition -> pg
  -> telegramChannel: send notification
  -> alertHistoryRepository: record result
```

Rules:

- distributed lock via `alerts.scheduler_locks` prevents duplicate runs across instances
- scheduler disables itself gracefully if the `alerts` schema is not applied
- canonical home for this subsystem remains app-local: `apps/web/src/lib/server/alerts/`

### Wildberries Price Proxy

```txt
Client
  -> POST /api/wb/prices                    [apps/web/src/routes/api/wb/prices/+server.ts]
  -> server-side fetch to WB Prices API     [discounts-prices.wb.ru]
  -> proxied response
```

Rules:

- `WB_API_TOKEN` stays server-side
- this path is operational transport, not dataset/runtime execution
- changes to this proxy should not be modeled as BI dataset work unless the endpoint is actually replaced by a published read model

## 6. Data / Storage Ownership (BI-relevant)

### App-owned schemas

| Schema   | Purpose                                 | Key objects                                                                               |
| -------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `mart`   | Published BI-facing views               | `emis_news_flat`, `emis_object_news_facts`, `emis_objects_dim`, `emis_ship_route_vessels` |
| `alerts` | Alert rules, recipients, history, locks | `rules`, `recipients`, `rule_recipients`, `history`, `scheduler_locks`                    |

Snapshot-first management: `db/current_schema.sql` is the active DDL truth; changes are tracked in `db/applied_changes.md`; live deltas go to `db/pending_changes.sql`.

### External: Wildberries DWH (`mart_marketplace`)

Managed by an external DWH team. Main read-side objects:

- `fact_product_office_day`
- `fact_product_day`
- `v_product_office_day`

The app consumes these through published provider mappings and the Wildberries DWH contract at `apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md`.

### External: Strategy DWH (`mart_strategy`)

Published `slobi_*` views are managed by external `agent_pack`. The app reads them through registered dataset definitions; local app code does not own their DDL.

## 7. Provider and Backend Extension Path

All extension follows static code registration, not runtime plugin loading.

### Extension Pattern

Adding a new dataset means:

- add a `DatasetRegistryEntry`
- define minimal `source`
- define canonical `fields`
- define Zod `paramsSchema`
- choose declarative mode or custom `compile`

Adding a new provider means:

- implement `Provider.execute(ir, entry, ctx) -> DatasetResponse`
- handle backend-specific query execution inside the provider
- respect `entry.cache` and `entry.execution` where meaningful

### Timeout and Cancellation Contract

`entry.execution.timeoutMs` is the dataset-level execution budget.
Providers must enforce it best-effort at the backend/client level, not only at the HTTP layer.

On timeout, a provider must:

- attempt to cancel the in-flight statement/query if the client library supports it
- release the connection or client resource back to the pool cleanly
- return `DATASET_TIMEOUT` with `retryable: true`
- avoid leaving pinned, poisoned, or leaked connections behind after cancellation

### Provider Lifecycle

Provider infrastructure should follow these rules:

- lazy initialize pools/clients on first real use
- do not create Oracle or ClickHouse clients if no active dataset requires them
- shut down gracefully on process termination
- keep caches bounded and backend-specific

### Cube / ClickHouse / Oracle Notes

- Oracle provider in the first wave should prefer `node-oracledb` Thin mode; the target architecture must not assume external Oracle Client libraries on the app host
- Oracle timeout handling should use best-effort statement cancellation and must not leave the pool holding a blocked connection after `timeoutMs` expiry
- Cube should be modeled as explicit `source.kind: 'cube'` when it is the analytical serving layer; hiding Cube behind `oracle` or `clickhouse` obscures observability, caching, and failure semantics
- the first-wave Cube path covers published/pre-aggregated read models; full Cube measure/dimension/time-dimension query composition remains future `AnalyticalIr`
- Oracle and ClickHouse fit the first-wave model as provider implementations behind the same read-model `SelectIr`
- ClickHouse analytical / ad-hoc semantics beyond read-model fetches still require a future analytical query path
- no backend should force the read-model contract to grow fake capabilities

### No Dynamic Loading

- no runtime plugin discovery
- no dynamic `import()` as the provider model
- registries are assembled statically at module import time

### Verification Principle

The architecture must stay testable by construction:

- params normalization is testable without routes
- `compile()` / `genericCompile()` are testable without providers
- providers are testable against backend behavior
- view-model reshaping is testable without pages

---

## 8. BI Code Quality Guardrails

Rules that govern BI page and feature code quality. Violations are flagged in code review and agent acceptance.

### Page Decomposition

BI pages must not become god components. A single `+page.svelte` should own **one coherent responsibility set**: data loading, filter wiring, derived state, and presentation for one analytical workflow.

Rules:

- **Separate operational features from analytics.** Operational workflows (price management, order submission, CRUD) must not live in the same component as analytical dashboards. Extract them into dedicated components or features.
- **Extract reusable data pipelines.** Aggregation, KPI calculation, and view-model transformations must live in route-local `.ts` modules (`aggregation.ts`, `view-model.ts`), not inline in `<script>`.
- **Pre-compute expensive derived values.** Functions called per-row inside `{#each}` must be memoized or pre-computed in `$derived`. Calling `analyzeProduct(product)` on every row on every render is a performance bug — compute once in the derived chain and store results in a `Map`.
- **Complexity limits from `invariants.md` apply.** 500–700 lines → discuss decomposition. 700–900 → mandatory review. 900+ → decompose by default.

### `paramsSchema` Must Be Explicit

The stable core declares "explicit Zod-based params normalization per dataset" as a durable principle. In practice, this means:

- **New datasets must use explicit `paramsSchema`**, not `z.record(z.unknown())` (`looseParams`).
- Existing datasets using `looseParams` are migration debt. When a dataset is touched for any reason, upgrading to an explicit schema is expected.
- `looseParams` is acceptable only as a temporary compatibility shim during migration, not as a permanent state.
- Explicit schemas enable contract-level validation: bad params are caught at step 3 (`paramsSchema.parse`) before compile/execute, not at SQL execution time.

Current status: 18 datasets are registered. 14 use explicit schemas (`wildberries` 2, `strategy` 4, `payment` 4, `ifts` 4). The remaining 4 EMIS datasets use `emisLooseParams`.

### `fetchDataset()` Canonical Path

The canonical data-fetching path is the default: call `fetchDataset()` **without** `filterContext`, providing all params explicitly.

Rules for new pages:

- **New BI pages must not pass `filterContext`.** No legacy filter merge, no `getFilterSnapshot()` side-effect.
- Pages call `planFiltersForTarget()` or `planFiltersForTargets()` directly, merge `plan.serverParams` + page-local params into `params`, and pass to `fetchDataset({ id, params })`.
- `planFiltersForDataset()` may still appear in compatibility callers, but it is an alias around `planFiltersForTarget()`, not the canonical primitive.
- Canonical reference callers in active docs: `strategy/scorecard` and `wildberries/office-day`.

Current status: the canonical flat-params path is the default for new BI work. The legacy path (deprecated, gated by `filterContext`) remains only in the migration queue tracked in §9.

The legacy path will be removed after the migration queue closes. It is not a supported pattern for new work.

### Provider Caching Symmetry

Server-side caching must be provider-agnostic:

- The `providerCache.ts` helper is available to all providers, not only Oracle.
- The live cache is owned by package orchestration in `executeDatasetQuery.ts`; providers participate through `entry.cache`, not by owning separate cache infrastructure.
- When Postgres datasets need caching (e.g., heavy mart views), they must use the same helper, not a custom implementation.
- Cache key must be stable and deterministic. Current key is `{datasetId}\0{tenantId}\0{sortedParams}` and must exclude `requestId`.

### Chart Configuration

Chart options (ECharts) should be built through preset functions, not assembled inline:

- Use `lineChartPreset`, `getLineSeries()`, and palette helpers from `platform-ui`.
- When a chart configuration is reused across pages, extract it into a factory function in `view-model.ts` or `_shared/`.
- Inline chart options are acceptable for one-off visualizations but should not exceed ~30 lines.

---

## 9. Migration Debt Register

Tracked migration debts in the BI vertical. Each entry has a trigger for when it should be resolved.

Migration queue framing:

- `filterContext` and top-level `DatasetQuery.filters` are transitional compatibility surfaces, not a supported dual path
- non-target callers still on that seam:
  - `strategy/overview`
  - `strategy/performance`
  - `strategy/cascade`
  - `strategy/scorecard_v2`
  - EMIS BI read-side under `/dashboard/emis/*` — separate, later migration track
- BI runtime maturity is reached when the `strategy.*` compatibility pages move to the flat-params path
- EMIS BI migration does not block that BI maturity call-out; it is a separate domain track

| #   | Debt                                                                       | Current State                                                                                                                                                                                               | Trigger for Resolution                                                                                                   | Durable Target                                                                              |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 1   | `emisLooseParams` on 4/18 datasets                                         | 14 datasets already use explicit schemas; all remaining loose schemas belong to EMIS datasets                                                                                                               | When an EMIS dataset is touched for any change                                                                           | Explicit Zod schema per EMIS dataset                                                        |
| 2   | Legacy filter path in `fetchDataset.ts`                                    | Canonical flat-params is default; `filterContext` remains only for the non-target migration queue (`strategy/overview`, `strategy/performance`, `strategy/cascade`, `strategy/scorecard_v2`; EMIS BI later) | BI maturity: when the `strategy.*` compatibility pages migrate to flat params. EMIS BI follows on a separate later track | Remove deprecated `filterContext` path and legacy imports                                   |
| 3   | `DatasetQuery.filters` field                                               | Deprecated; still populated on legacy path. Custom compiles use `{ ...filters, ...params }` merge                                                                                                           | After all pages migrate to flat params                                                                                   | Remove from wire contract                                                                   |
| 4   | `product-analytics/+page.svelte` ~~god component~~                         | **Resolved (CA-1):** 778→256 lines. PriceEditor, ProductTable, ProductDetail extracted. PriceEditor (operational) co-located — waiver                                                                       | If PriceEditor moves to dedicated route                                                                                  | Relocate PriceEditor to non-analytics scope                                                 |
| 5   | Dataset access enforcement placeholder                                     | `entry.access.requiredScopes` exists as contract shape, but both query and schema paths still keep the gate as a placeholder                                                                                | When multi-tenant or role-based access is needed                                                                         | Enforce `entry.access.requiredScopes` consistently in query and schema paths                |
| 6   | Shared cache helper is activated only where datasets declare `entry.cache` | Package-level cache exists today; Oracle IFTS entries are the first live adopters                                                                                                                           | When a Postgres or other dataset needs bounded server-side caching                                                       | Reuse the shared `providerCache` helper through `entry.cache`, not a backend-specific cache |
| 7   | Dataset definitions duplicated                                             | Compile functions in both `packages/platform-datasets/src/server/definitions/` and `apps/web/src/lib/server/datasets/definitions/`                                                                          | Next cleanup pass                                                                                                        | Single canonical location in package                                                        |
| 8   | `DatasetQuery.filters` merge inside `executeDatasetQuery`                  | Deprecated top-level `filters` is still merged into flat params before parse; compile functions never see `query.filters` directly                                                                          | After all compatibility callers leave the legacy path                                                                    | Remove legacy merge and make the runtime `params`-only                                      |
