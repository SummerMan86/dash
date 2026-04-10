# BI Refactor Rollout

Execution-oriented companion to [architecture_dashboard_bi_target.md](../architecture_dashboard_bi_target.md).

This document is intentionally not an architecture spec.
It owns rollout defaults, slice order, acceptance criteria, and context-light execution rules for the BI refactor.

## Scope

- Covers: first-wave rollout for non-EMIS BI refactor
- Does not cover: EMIS operational refactor, final production runbooks, long-form architecture rationale

## Status

Current phase: **Wave 1 complete** (BR-1..BR-10 merged to main).

Use this document when the task is:

- planning the next BI refactor slice
- executing a concrete BI refactor step
- deciding what is in or out of first wave

Use [architecture_dashboard_bi_target.md](../architecture_dashboard_bi_target.md) when the task is:

- deciding target contracts
- checking placement and ownership rules
- checking what the final BI architecture should look like

## Frozen Defaults for First Wave

These defaults should not be reopened in every task unless a slice proves they are wrong:

- no EMIS refactor in the first BI wave
- no `TanStack Query` in the first wave; keep `fetchDataset` as the main client facade
- no `genericCompile()` in BR-1; introduce the runtime structure first, then add the generic compiler when the registry contract is stable
- first Oracle slice should use one flat read-model dataset with pagination
- Oracle provider should use bounded server-side cache with short TTL
- schema introspection endpoint should ship early, but not before the core registry/runtime contract exists
- checkpoints after every completed architectural slice

## Default Technical Assumptions

Unless a specific task says otherwise, assume:

- Oracle uses `node-oracledb` Thin mode
- Oracle real-time datasets get short TTL cache, roughly `10-15s`
- Oracle dataset timeouts start in the `5-10s` range
- Postgres remains the reference provider during migration
- ClickHouse is deferred until the core multi-provider contract is already stable

## Out of Scope for First Wave

Do not expand the first wave with these items unless explicitly promoted:

- EMIS BI migration
- analytical IR / ad-hoc aggregation path
- semantic layer for measures/dimensions
- runtime plugin loading
- broad app-wide query manager migration
- generic dashboard framework / widget registry DSL
- broad folder churn that does not improve ownership clarity

## Dependency Graph

After BR-3, the chain fans out. Linear execution is fine for a single worker, but the dependency graph allows parallelism:

```
BR-1 → BR-2 → BR-3 ─┬─ BR-4 (schema introspection)
                      ├─ BR-5 (filters) → BR-6 (client state) ─┐
                      └─ BR-7 (Oracle provider) ────────────────┼─→ BR-8 (first migration)
                                                                     │
                                                                     ↓
                                                                   BR-9 → BR-10
```

BR-4, BR-5, and BR-7 are technically independent after BR-3. BR-8 is the convergence point requiring BR-6 and BR-7.

## Slice Order

Keep slices narrow. One slice should change one architectural seam.

### BR-1: Dataset Runtime Contracts

Goal:

- introduce the final contract shapes in `platform-datasets`

Main outputs:

- `DatasetRegistryEntry`
- `SourceDescriptor`
- `DatasetFieldDef`
- `DatasetFilterBinding`
- `DatasetAccess`
- flat `DatasetQuery.params`
- `DatasetError` with `retryable`
- `SelectIr.offset`
- `ContractVersion` strategy decision (additive `'v1'` extensions or explicit `'v2'`)
- `@deprecated` JSDoc on `groupBy` and `call()` in `SelectIr`

Acceptance:

- types compile
- no route behavior changed yet
- current runtime can coexist with new types

### BR-2: Package-Orchestrated Execution

Goal:

- move orchestration from route-level code into `executeDatasetQuery()`

Main outputs:

- `executeDatasetQuery(datasetId, query, ctx)`
- thin `/api/datasets/[id]/+server.ts`
- typed error mapping
- entry-level access check before compile/execute

Acceptance:

- route no longer selects provider by prefix
- route only parses, derives context, delegates, maps errors
- dataset access is enforced in package orchestration, not ad hoc in routes
- existing dataset calls still work

### BR-3: Registry Extraction from Postgres Provider

Goal:

- move dataset metadata ownership out of `postgresProvider`

Main outputs:

- first registry entries for existing datasets
- `postgresProvider` consumes registry-owned `entry`
- provider no longer owns the canonical dataset catalog

Acceptance:

- provider execution still works for migrated datasets
- field metadata comes from registry entry, not provider-local catalog

Notes:

- EMIS datasets (`emis.*`) currently in `postgresProvider` are extracted into the registry mechanically (entry + source descriptor) without page migration — so the provider stops owning the catalog entirely
- mock-backed datasets (payment analytics, etc.) also get registry entries with `source.kind: 'mock'`

### BR-4: Schema Introspection

Goal:

- expose dataset schema without executing data queries

Main outputs:

- `getDatasetSchema(datasetId)`
- `GET /api/datasets/:id/schema`
- JSON Schema export from Zod params schemas

Acceptance:

- fields and params schema can be fetched without running dataset query
- route remains thin
- schema endpoint uses the same dataset access policy as query execution

### BR-5: Flat Filter Contract Migration

Goal:

- move transport to canonical flat params contract

Main outputs:

- flat `DatasetQuery.params`
- `planFiltersForTargets(...)`
- updated `fetchDataset`

Acceptance:

- no implicit legacy filter merge on migrated path
- planner output and widget/page params are merged explicitly before transport
- route receives one flat params bag
- planner API aligned to target naming: `planFiltersForTarget()` (renamed from `planFiltersForDataset()`), batch `planFiltersForTargets()`

### BR-6: Client Query State Alignment

Goal:

- standardize page-local query state and refresh behavior

Main outputs:

- common `AsyncState<T>`
- typed client error normalization
- keep-previous-data refresh UX on migrated pages

Acceptance:

- pages own loading/error/data state
- section components remain presentational
- duplicate requests are deduplicated client-side

### BR-7: Oracle Provider

Goal:

- validate the architecture against the first real-time Oracle-backed dataset

Main outputs:

- Oracle provider
- lazy Oracle pool/client lifecycle
- bounded provider-owned server-side cache
- one simple Oracle dataset with pagination

Acceptance:

- one Oracle dataset is callable through the standard dataset route and returns correct data (route/provider proof, not full page migration)
- cache key uses normalized params and relevant server context
- timeout and retryable error behavior are explicit

Note: this slice proves the provider/runtime path only. Full route-local page migration with flat params, page-local query state, and no legacy filter merge belongs to BR-8.

### BR-8: First Dashboard Migration

Goal:

- migrate one real BI page end-to-end to the new contract

Main outputs:

- one route-local page using new params contract
- new query state shape
- no legacy filter merge on that page

Acceptance:

- page works through target dataset runtime
- no page-specific provider branching
- page can serve as the reference slice for later migrations

### BR-9: Generic Compiler

Goal:

- add declarative dataset mode only after registry/runtime contracts are proven

Main outputs:

- `genericCompile(entry, typedParams)`
- support for simple read-model datasets without custom compile functions

Acceptance:

- at least one dataset uses declarative mode end-to-end with explicit query bindings
- custom compile remains supported

### BR-10: Further Providers

Goal:

- add ClickHouse or other backends only after the Oracle and core runtime path are stable

Acceptance:

- no changes to route contract
- no reintroduction of fake capability layers

## Cross-Slice Quality Gates

Every slice should satisfy all of the following:

- no EMIS spillover
- no route-level SQL
- no provider selection in route code
- no dataset/schema access bypasses
- no app imports from packages reversed
- no hidden new global stores for dataset state
- minimal structured query telemetry exists at the changed runtime boundary
- verification exists at the changed boundary
- one local checkpoint commit after the slice is stable

## Verification Matrix

Use the smallest test shape that proves the changed seam.

- contracts / schemas: unit tests
- compile / genericCompile: unit tests
- planner: unit tests
- providers: integration tests
- route transport: smoke/contract tests
- page migration: focused UI smoke or E2E only where it adds signal

## Execution Model

This wave uses the agent workflow defined in `docs/agents/workflow.md`. The autonomous execution protocol and structural reframe checkpoints are in `docs/agents/lead-strategic/current_plan.md` §Autonomous Execution Protocol.

Key rules for future task dialogs:

- agents auto-continue between slices unless escalation triggers fire
- structural reframe after BR-3, BR-7, and BR-8 (not just next-slice reframe)
- parallel dispatch of BR-4/BR-5/BR-7 is allowed after BR-3 acceptance
- user pauses only on: CRITICAL findings, scope changes, final wave merge

## Context-Light Reading Order for Future Tasks

To keep future dialogs small, read only:

1. [architecture.md](../architecture.md)
2. [architecture_dashboard_bi_target.md](../architecture_dashboard_bi_target.md)
3. this document
4. package-local `AGENTS.md` for the slice being edited

Only add extra docs if the task truly needs them.

## Task Template for Future Dialogs

When opening the next implementation task, the minimal brief should include:

- target slice number and name
- files/packages expected to change
- what is explicitly out of scope
- required verification for the slice

Example:

```txt
Implement BI refactor BR-2: Package-Orchestrated Execution.
Scope: platform-datasets orchestration + /api/datasets/[id]/+server.ts only.
Out of scope: filters, Oracle provider, page migrations.
Verification: typecheck + targeted tests for route error mapping and executeDatasetQuery.
```
