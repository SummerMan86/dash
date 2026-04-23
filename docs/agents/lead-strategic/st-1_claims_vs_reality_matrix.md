# ST-1 Audit: Claims vs Reality Matrix

## Status

- Date: `2026-04-22`
- Scope: `docs/architecture.md`, `docs/bi/architecture.md`, `docs/emis/architecture.md`
- Execution mode: paired cross-model per `current_plan.md` §Operating Principle — Codex fresh contour audits (`core` / `bi` / `emis`) + Claude Opus `architecture-reviewer` subagents (`core` / `bi` / `emis`), per-direction subagents for context isolation
- Cross-model status: `paired` (Codex + Claude Opus). Findings unioned; stricter severity wins per item. Items tagged `[C]` are Codex-only, `[O]` are Claude Opus–only, untagged items were raised by both lanes.

## Overall Verdict

| Doc | Verdict | Why |
| --- | --- | --- |
| `docs/architecture.md` | `DOCS FIRST` | Root narrative still overstates BI convergence and contains package-graph drift. |
| `docs/bi/architecture.md` | `DOCS FIRST` | Current-state BI narrative mixes live runtime truth with target-state/debt language. |
| `docs/emis/architecture.md` | `DOCS FIRST` | EMIS BI bridge wording and read-model source-of-truth pointers lag the live registry-based runtime. |

## Freeze Result

- `docs/architecture.md = DOCS FIRST` activates the root freeze rule.
- `ST-3` must run before `ST-4` and `ST-5`.
- `docs/bi/architecture.md = DOCS FIRST` and `docs/emis/architecture.md = DOCS FIRST` keep both vertical refreshes first in the apply queue after topology lock and root refresh.

## Foundation / `docs/architecture.md`

### Accurate

- The repo is still one deployable `SvelteKit` app in a pnpm workspace monorepo, with `apps/web` as the only deployable and `packages/*` as the reusable layer.
- The dataset route is a thin transport shell and delegates to package-owned BI runtime entrypoints.
- EMIS operational routes stay thin and delegate into `@dashboard-builder/emis-server`, with app-owned transport glue kept in `$lib/server/emis/infra/http.ts`.
- Alerts remain app-local and bootstrap from `hooks.server.ts`.
- App-local `src/lib/*` is flat by peer module and legacy FSD buckets are still removed.

### Needs Correction

- The BI execution path in the foundation doc should be stated as the canonical/default path, not as if every active BI page already uses only flat `params`. The deprecated `filterContext` compatibility path is still live in active strategy and EMIS BI routes via [fetchDataset.ts](../../../apps/web/src/lib/api/fetchDataset.ts).
- The package map and dependency graph are no longer exact:
  - `platform-filters` currently depends on `platform-datasets` and `platform-ui`, not `platform-core`; see [packages/platform-filters/package.json](../../../packages/platform-filters/package.json).
  - `emis-contracts` currently depends on `zod` and type deps, not `platform-core`; see [packages/emis-contracts/package.json](../../../packages/emis-contracts/package.json).
  - `emis-server` currently depends on `db` and `emis-contracts`, not `platform-core` or `platform-datasets`; see [packages/emis-server/package.json](../../../packages/emis-server/package.json).
  - `emis-ui` currently depends on `emis-contracts`, `platform-core`, and `platform-ui`, not `platform-filters`; see [packages/emis-ui/package.json](../../../packages/emis-ui/package.json).
- The cross-cutting backlog link points to a missing file. The draft backlog lives in [docs/archive/architecture_improvements_backlog.md](../../archive/architecture_improvements_backlog.md), not `docs/architecture_improvements_backlog.md`. `[C]`
- `[O]` §4.2 lists `wildberries` under `/dashboard/wildberries/` as an active BI slice, but the directory has no `+page.svelte` / `+layout.svelte` / `filters.ts` — it is an empty route shell. Either annotate as "under construction" or remove from the active-slices list until pages exist. Severity: WARNING.
- `[O]` §5.2 ESLint boundary config in `eslint.config.js:231-251` does not ban `platform-datasets` / `platform-core` imports from `emis-server`, even though the doc-level dep graph excludes them. Consequence: boundary lint does not fully enforce §5.2 once §3 is corrected. Severity: INFO (dependent on §3/§5.2 correction landing first).

### Needs Decision

- Whether the root architecture doc should explicitly name the live BI compatibility seam (`filterContext` / top-level `filters`) as transitional repo-wide debt, or keep that detail only in the BI vertical doc and debt register.
- Whether `§3`/`§5` should document the exact current manifest/import graph or a looser allowed-edges topology. For ST-1 the safer default is exact current graph.

### Evidence

- Topology and deployable shape: [pnpm-workspace.yaml](../../../pnpm-workspace.yaml), [apps/web/package.json](../../../apps/web/package.json), [docs/architecture.md](../../architecture.md)
- Thin BI route and package runtime: [apps/web/src/routes/api/datasets/[id]/+server.ts](../../../apps/web/src/routes/api/datasets/[id]/+server.ts), [packages/platform-datasets/src/server/executeDatasetQuery.ts](../../../packages/platform-datasets/src/server/executeDatasetQuery.ts)
- EMIS transport split: [apps/web/src/routes/api/emis/news/+server.ts](../../../apps/web/src/routes/api/emis/news/+server.ts), [apps/web/src/lib/server/emis/infra/http.ts](../../../apps/web/src/lib/server/emis/infra/http.ts)
- Alert bootstrap: [apps/web/src/hooks.server.ts](../../../apps/web/src/hooks.server.ts)

## BI / `docs/bi/architecture.md`

### Accurate

- `/api/datasets/:id` is a thin adapter that validates the transport contract, derives server context, and delegates to `executeDatasetQuery()`.
- `packages/platform-datasets/src/server/registry/index.ts` is the runtime source of truth for dataset ids, source descriptors, fields, params schemas, and compile/queryBindings metadata.
- `SelectIr` is honest as implemented: `select`, `where`, `orderBy`, `limit`, `offset`; providers stay column-only for `SELECT` and `ORDER BY`.
- Package-owned providers (`postgres`, `oracle`, `clickhouse`) auto-register in the package runtime; the app adds only `mock`.
- Canonical flat-params pages already exist in active code, for example Wildberries `office-day` and `strategy/scorecard`.

### Needs Correction

- The main narrative overstates `DatasetQuery.params` as the only live input bag. The live contract still contains deprecated top-level `filters`, and `executeDatasetQuery()` still merges `{ ...query.filters, ...query.params }`; see [contract.ts](../../../packages/platform-datasets/src/model/contract.ts) and [executeDatasetQuery.ts](../../../packages/platform-datasets/src/server/executeDatasetQuery.ts).
- The canonical flat-params path is not yet universal. Active strategy and EMIS BI pages still pass deprecated `filterContext` into [fetchDataset.ts](../../../apps/web/src/lib/api/fetchDataset.ts).
- Planner naming is internally inconsistent for current-state docs. The live exports are:
  - `planFiltersForTarget()` as the primitive
  - `planFiltersForTargets()` as the ergonomic batch helper
  - `planFiltersForDataset()` as a compatibility helper still used by route code
- The supported scope/apply section understates live runtime behavior. `shared` scope is active in current Wildberries and EMIS routes, and `hybrid` remains a supported planner/runtime mode even if it is not the preferred current-state narrative.
- The schema introspection section describes a richer current contract than is actually implemented. Today `GET /api/datasets/:id/schema` returns fields plus source kind; it does not return `paramsSchemaJsonSchema`.
- The dataset access section describes active enforcement, but access checks are still placeholders in both `executeDatasetQuery()` and `getDatasetSchema()`.
- Cache-key prose should match the implementation precisely: current key is `datasetId + tenantId + deterministic params`, with `requestId` excluded; no broader scope-marker set currently participates.
- `[O]` §8 literal cache-key example is `{datasetId}\0{params}\0{tenantId}`; actual construction in [providerCache.ts](../../../packages/platform-datasets/src/server/providerCache.ts):33 is `${datasetId}\0${tenantId}\0${sortedParams}`. Severity: INFO (functional behavior is deterministic; the doc example is just in the wrong order).
- `[O]` §8 and §9 debt #1 state "4 of 17 datasets use explicit schemas (`strategy.*`). The remaining 13 use `looseParams`." Live count in [registry/index.ts](../../../packages/platform-datasets/src/server/registry/index.ts): 18 total datasets, 14 explicit (WB, payment, IFTS, strategy), 4 using `emisLooseParams` (all EMIS). Severity: WARNING — the debt register materially misrepresents schema coverage.
- `[O]` §1 "Package Entrypoint" pseudocode shows 6 steps; implementation header in [executeDatasetQuery.ts](../../../packages/platform-datasets/src/server/executeDatasetQuery.ts) documents 8 steps (adds pre-compile cache check and post-execute cache populate). Severity: INFO.
- `[O]` §4 "Current implementation" paragraph says "Oracle provider (`oracleProvider.ts`) is the first adopter" of `providerCache`. Reality: the cache is a module-level singleton owned by `executeDatasetQuery.ts` (lines 23, 29, 153–170, 216–218); `oracleProvider.ts` does not import `providerCache`. Oracle IFTS registry entries are the first to set `cache.ttlMs`, which activates the orchestration-layer cache. Severity: WARNING — "provider-owned" characterization is inaccurate; cache ownership is package-orchestration, not provider-internal.

### Needs Decision

- Which planner API name becomes canonical in prose: keep `Target` vocabulary as the formal primitive, or standardize on the `Dataset` helper that most routes still call today.
- How much legacy transport detail (`DatasetQuery.filters`, `fetchDataset.filterContext`) stays in the main contract narrative versus moving entirely into the migration debt register.
- Whether schema introspection should remain minimal in current-state docs or explicitly reopen a future richer contract as follow-up only.
- Whether `shared` and `hybrid` should be described as active supported current-state runtime surface, or as compatibility surface outside the durable default.

### Evidence

- Thin route: [apps/web/src/routes/api/datasets/[id]/+server.ts](../../../apps/web/src/routes/api/datasets/[id]/+server.ts)
- Runtime orchestration: [packages/platform-datasets/src/server/executeDatasetQuery.ts](../../../packages/platform-datasets/src/server/executeDatasetQuery.ts)
- Live query contract: [packages/platform-datasets/src/model/contract.ts](../../../packages/platform-datasets/src/model/contract.ts)
- Honest IR: [packages/platform-datasets/src/model/ir.ts](../../../packages/platform-datasets/src/model/ir.ts)
- Planner API: [packages/platform-filters/src/model/planner.ts](../../../packages/platform-filters/src/model/planner.ts)
- Schema introspection: [packages/platform-datasets/src/server/getDatasetSchema.ts](../../../packages/platform-datasets/src/server/getDatasetSchema.ts), [apps/web/src/routes/api/datasets/[id]/schema/+server.ts](../../../apps/web/src/routes/api/datasets/[id]/schema/+server.ts)
- Canonical flat-params callers: [apps/web/src/routes/dashboard/wildberries/office-day/+page.svelte](../../../apps/web/src/routes/dashboard/wildberries/office-day/+page.svelte), [apps/web/src/routes/dashboard/strategy/scorecard/+page.svelte](../../../apps/web/src/routes/dashboard/strategy/scorecard/+page.svelte)
- Legacy compatibility callers: [apps/web/src/routes/dashboard/strategy/overview/+page.svelte](../../../apps/web/src/routes/dashboard/strategy/overview/+page.svelte), [apps/web/src/routes/dashboard/strategy/performance/+page.svelte](../../../apps/web/src/routes/dashboard/strategy/performance/+page.svelte), [apps/web/src/routes/dashboard/strategy/cascade/+page.svelte](../../../apps/web/src/routes/dashboard/strategy/cascade/+page.svelte), [apps/web/src/routes/dashboard/strategy/scorecard_v2/+page.svelte](../../../apps/web/src/routes/dashboard/strategy/scorecard_v2/+page.svelte), [apps/web/src/routes/dashboard/emis/+page.svelte](../../../apps/web/src/routes/dashboard/emis/+page.svelte)

## EMIS / `docs/emis/architecture.md`

### Accurate

- `packages/emis-contracts` remains contract-only: DTOs, entity types, and Zod schemas.
- `/api/emis/*` is a thin HTTP transport surface that delegates into `@dashboard-builder/emis-server`.
- `packages/emis-server` owns read/write logic, uses parameterized SQL, and wraps writes with transaction plus audit semantics.
- `/dashboard/emis/*` is still BI/read-side, not EMIS operational, and it consumes `emis.*` datasets backed by published read models.
- Snapshot-first DB truth is still anchored in `db/current_schema.sql`, `db/schema_catalog.md`, `db/applied_changes.md`, with readiness checks aligned to those schemas/views.

### Needs Correction

- The BI bridge wording should acknowledge the live compatibility seam: current `/dashboard/emis/*` pages still use the deprecated `filterContext` path inside the shared BI runtime.
- The read-model contract surface should explicitly name the package registry as the live runtime source of truth for `emis.*` datasets. App-local dataset definition copies under `apps/web/src/lib/server/datasets/definitions/*` are legacy/reference only.
- The current “dataset definitions plus DB views” phrasing is too loose for current-state docs. The live runtime path is `dataset registry -> compile -> provider -> published mart/view contract`.
- `[O]` §1 "Inside EMIS" location list omits `apps/web/src/lib/emis-manual-entry/*`, which is an active app-local EMIS module per `architecture.md:217` ("Active app-local module") and `docs/emis/structural_migration.md:49` ("stays in apps/web"). Severity: WARNING — module boundary inventory is incomplete.
- `[O]` §5 Rule 1 allows publishing SQL contracts in "`mart` or `mart_emis`". All four current EMIS published datasets live in `mart`. `mart_emis` in `db/schema_catalog.md:69-76` holds operational ship-route derived reads (`vsl_route_point_hist`, `vsl_route_segment_hist`) that are NOT registered as BI datasets. `bi/architecture.md §6` names only `mart` as the BI-facing published schema. Severity: WARNING — rule 1 can mislead a developer into publishing a new BI read-model to `mart_emis`. (See D-7.)
- `[O]` §1/§3 package-map claim (via foundation doc §3): `emis-contracts` depends on `platform-core`. Actual [emis-contracts/package.json](../../../packages/emis-contracts/package.json) lists only `zod` and `@types/geojson` — no `platform-core`. Severity: WARNING (duplicate of foundation doc finding; both docs need aligned correction).

### Needs Decision

- Whether the EMIS vertical should explicitly document that the current BI bridge still rides the deprecated `filterContext` compatibility path until ST-5 cleanup.
- Whether the EMIS doc should name [packages/platform-datasets/src/server/registry/index.ts](../../../packages/platform-datasets/src/server/registry/index.ts) as the authoritative read-side registry and demote the app-local EMIS dataset copies to legacy-only status.
- Whether the app-local EMIS dataset definition copies should remain as bounded compatibility baggage or be scheduled for removal after BI route migration.
- Whether the EMIS vertical should explicitly list the shared BI vocabulary surfaces (`fetchDataset`, `/api/datasets/:id`, `executeDatasetQuery`, planner helpers) or continue delegating that detail entirely to `docs/bi/architecture.md`.

### Evidence

- Contract-only package: [packages/emis-contracts/package.json](../../../packages/emis-contracts/package.json)
- Thin transport + app-owned glue: [apps/web/src/routes/api/emis/news/+server.ts](../../../apps/web/src/routes/api/emis/news/+server.ts), [apps/web/src/lib/server/emis/infra/http.ts](../../../apps/web/src/lib/server/emis/infra/http.ts)
- Package-owned EMIS logic: [packages/emis-server/src/modules/news/queries.ts](../../../packages/emis-server/src/modules/news/queries.ts), [packages/emis-server/src/modules/objects/service.ts](../../../packages/emis-server/src/modules/objects/service.ts)
- EMIS BI callers on compatibility path: [apps/web/src/routes/dashboard/emis/+page.svelte](../../../apps/web/src/routes/dashboard/emis/+page.svelte), [apps/web/src/routes/dashboard/emis/provenance/+page.svelte](../../../apps/web/src/routes/dashboard/emis/provenance/+page.svelte), [apps/web/src/routes/dashboard/emis/ship-routes/+page.svelte](../../../apps/web/src/routes/dashboard/emis/ship-routes/+page.svelte)
- Live EMIS dataset registry: [packages/platform-datasets/src/server/registry/index.ts](../../../packages/platform-datasets/src/server/registry/index.ts)
- Legacy app-local EMIS dataset copy: [apps/web/src/lib/server/datasets/definitions/emisMart.ts](../../../apps/web/src/lib/server/datasets/definitions/emisMart.ts)
- DB truth and readiness: [db/current_schema.sql](../../../db/current_schema.sql), [apps/web/src/routes/api/emis/readyz/+server.ts](../../../apps/web/src/routes/api/emis/readyz/+server.ts)

## Named Decisions Reduced From Mixed Notes

- `D-1` Foundation BI path must be documented as canonical/default with an explicit live compatibility exception until route migration completes.
- `D-2` Foundation package graph must be rewritten to match actual manifests/imports, not historical intended edges.
- `D-3` BI planner vocabulary must be normalized around one named primitive and one named ergonomic helper; `planFiltersForDataset()` is currently a compatibility alias and should be documented as such if retained.
- `D-4` BI doc must separate current live contract from migration debt for `DatasetQuery.filters`, `fetchDataset.filterContext`, access enforcement, and schema introspection.
- `D-5` EMIS doc must point to the package registry as the runtime source of truth for `emis.*` read-side datasets and mark app-local dataset copies as legacy-only.
- `D-6` Backlog/recommendation material remains out of apply scope unless it directly resolves a verified ST-1 drift item.
- `D-7` EMIS doc §5 must either scope "published SQL contract home" to `mart` only (operational `mart_emis` reads stay outside BI registry), or explicitly add a rationale for allowing `mart_emis` as a BI-published home when it is. Current state: only `mart` is used for BI; rule 1 is wider than reality.
- `D-8` Foundation doc §4.2 BI slices list must be resolved for `wildberries`: remove from "active slices", mark as stub/under-construction, or document the actual page inventory at the paired `/dashboard/wildberries/*` sub-routes that are active (e.g. `office-day`, `product-analytics`, `stock-alerts`).

## Draft-Input Triage

- [docs/archive/architecture_improvements_backlog.md](../../archive/architecture_improvements_backlog.md) contains useful follow-up ideas (`system summary`, `TOC`, external dependencies catalog, verification-table cleanup), but those are not ST-1 findings by themselves.
- [docs/archive/bi_architecture_final_recommendations.md](../../archive/bi_architecture_final_recommendations.md) is directionally aligned with the audit: keep the BI runtime core, fix docs drift first, and treat governance/ops work as follow-up after current-state docs are coherent.
- For this wave, only items backed by the findings above should enter `ST-3`/`ST-4`/`ST-5`.
