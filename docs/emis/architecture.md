# Architecture: EMIS Vertical

Canonical EMIS vertical architecture doc. Current-state only.
Canonical repo-wide foundation: [docs/architecture.md](../architecture.md).
BI runtime reference for `/dashboard/emis/*`: [docs/bi/architecture.md](../bi/architecture.md).

## Scope

- Covers: EMIS module boundary, operational execution path, storage ownership, contract surfaces, published read-model bridge to BI, extension points, fixed defaults
- Does not cover: repo-wide topology and dependency rules, generic BI dataset runtime details, historical rollout notes, step-by-step runbooks
- `/dashboard/emis/*` analytics pages use the BI runtime and shared filter mechanism defined in `docs/bi/architecture.md`; this document owns the operational side and the bridge points only

## 1. Module Boundary

EMIS is a self-contained domain inside one deployable application.

Inside the EMIS module:

- `packages/emis-contracts/` for DTOs, entity types, and Zod schemas
- `packages/emis-server/` for backend and domain services
- `packages/emis-ui/` for reusable EMIS UI slices
- `apps/web/src/routes/emis/*` for workspace composition
- `apps/web/src/lib/emis-manual-entry/*` for app-local EMIS manual-entry forms
- `apps/web/src/routes/api/emis/*` for thin HTTP transport
- `apps/web/src/lib/server/emis/infra/*` for app-owned EMIS transport and runtime glue

Outside the EMIS operational module:

- `/dashboard/emis/*` analytics pages
- BI dataset definitions and providers that serve EMIS read-models
- repo-wide topology, package graph, deployment, and verification rules

Boundary note:

- `/dashboard/emis/*` belongs to the BI platform layer, not to EMIS operational
- those pages consume EMIS data through published read-models and BI runtime seams
- they do not import `packages/emis-server/src/modules/*`

## 2. Canonical Execution Paths

### 2.1. Operational Path

```txt
/emis/* or /api/emis/*
  -> SvelteKit route handler or page
  -> app-owned auth and transport glue
  -> packages/emis-server/src/modules/*
  -> parameterized SQL via pg
  -> PostgreSQL / PostGIS
```

Rules:

- route handlers stay thin transport
- business logic lives in `emis-server`
- SQL does not live in route files
- SvelteKit-specific auth and transport glue stays in the app layer

### 2.2. BI / Read-Side Bridge

This section documents the current EMIS BI overlay only. It is a non-target compatibility
surface scheduled for rework; the BI runtime rules and migration queue for EMIS callers
live in [docs/bi/architecture.md §9](../bi/architecture.md#9-migration-debt-register).

```txt
/dashboard/emis/*
  -> shared BI runtime (see docs/bi/architecture.md)
  -> `emis.*` dataset registry entry
  -> published `mart` contract
```

Rules:

- `/dashboard/emis/*` belongs to the BI platform layer, not EMIS operational
- current `/dashboard/emis/*` BI callers still pass `filterContext` through `fetchDataset()`
  on the compatibility path tracked in `docs/bi/architecture.md §9`
- BI does not call EMIS operational SQL directly
- the EMIS-specific bridge contract is the `emis.*` dataset registration plus the published
  SQL contract behind it
- published read-models are a separate contract from operational tables and services

### 2.3. Structural Migration Path

```txt
current zone
  -> target package or target app seam
  -> temporary compatibility shim
  -> shim removal
```

Structural moves are described in `structural_migration.md`. They should not be mixed with domain-behavior rewrites.

## 3. Storage Ownership

### 3.1. App-Owned Schemas

| Schema      | Purpose                                                            | Example objects                                                                                                                               |
| ----------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `emis`      | write-side operational tables                                      | `objects`, `news_items`, `news_object_links`, `audit_log`, `countries`, `object_types`, `sources`, `users`, `sessions`, `object_source_refs`  |
| `stg_emis`  | staging for ingestion                                              | `vsl_load_batch`, `vsl_position_raw`, `vsl_position_latest`, `vsl_ships_hbk`, `obj_import_run`, `obj_import_candidate`, `obj_candidate_match` |
| `mart_emis` | operational-derived ship-route read models outside the BI registry | `vsl_route_point_hist`, `vsl_route_segment_hist`                                                                                              |

Ownership note:

- `mart` is the BI-published SQL contract home for current `emis.*` datasets
- `mart_emis` remains an operational-derived schema and not a BI-registered dataset home by default

### 3.2. DB Truth

Active DDL truth remains snapshot-first:

- `db/current_schema.sql`
- `db/schema_catalog.md`
- `db/applied_changes.md`
- `db/pending_changes.sql` only as a temporary live delta when needed

This document does not duplicate full DDL. It records semantic ownership and architectural boundaries.

## 4. Contract Surfaces

| Surface                            | Where it lives                                                                     | Purpose                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| EMIS Zod schemas and DTOs          | `packages/emis-contracts/src/*`                                                    | request and response validation, shared domain DTOs                                                           |
| EMIS runtime and API conventions   | `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`                           | error shape, list meta, audit, correlation conventions                                                        |
| EMIS HTTP transport boundary       | `apps/web/src/routes/api/emis/*`                                                   | thin HTTP transport without business logic                                                                    |
| Published BI read-model contracts  | `packages/platform-datasets/src/server/registry/index.ts` + published `mart` views | current-state runtime source of truth for `emis.*` datasets and their BI SQL contracts                        |
| Legacy app-local EMIS dataset copy | `apps/web/src/lib/server/datasets/definitions/emisMart.ts`                         | legacy / reference-only compatibility artifact; not the runtime source of truth                               |
| BI dataset and filter runtime      | `docs/bi/architecture.md`                                                          | authoritative BI runtime rules for `/dashboard/emis/*`; this document records EMIS-specific bridge facts only |

## 5. Published Read-Models and Datasets

This section documents the current EMIS BI overlay only. It is a migration-queue caller
scheduled for rework, not a canonical BI reference implementation; see
[docs/bi/architecture.md §9](../bi/architecture.md#9-migration-debt-register).

Current app-facing dataset ids are registered in
`packages/platform-datasets/src/server/registry/index.ts` and map to these published
`mart` contracts:

| Dataset id                | SQL contract                   |
| ------------------------- | ------------------------------ |
| `emis.news_flat`          | `mart.emis_news_flat`          |
| `emis.object_news_facts`  | `mart.emis_object_news_facts`  |
| `emis.objects_dim`        | `mart.emis_objects_dim`        |
| `emis.ship_route_vessels` | `mart.emis_ship_route_vessels` |

Rules for new EMIS read-side slices:

1. Publish the BI SQL contract in `mart`
2. Treat `mart_emis` as an operational-derived surface outside the BI dataset registry by default; any future BI use requires an explicit exception with rationale
3. Update snapshot-first DB docs
4. Update the `emis.*` registry entry in `packages/platform-datasets/src/server/registry/index.ts`; `apps/web/src/lib/server/datasets/definitions/emisMart.ts` stays legacy / reference-only
5. Build the BI route under `/dashboard/emis/*`
6. Update `README.md` if the discoverability map changed

Breaking changes to published read-models require an explicit migration plan when they change:

- column names or column removal
- dataset grain or semantics
- sort and filter behavior that breaks the dataset contract

## 6. Extension Points

### 6.1. Ingestion Adapters

`packages/emis-server/src/modules/ingestion/adapters/` uses a registry pattern.

Adding a new source means:

- add a new adapter
- register it in the ingestion registry

### 6.2. Auth Integration

Auth remains app-integrated, but EMIS-owned:

- primary mode is session-based
- session storage lives in `emis.sessions`
- user store lives in `emis.users` with transition fallback where still needed
- route and page enforcement stays in the app layer
- actor attribution and audit stay mandatory

See `access_model.md` for detailed access rules.

### 6.3. Maps

Supported basemap modes:

- `online`
- `offline`
- `auto`

The offline path is built around the PMTiles bundle. Runtime and ops details live in `operations.md`.

## 7. Fixed Architectural Defaults

These defaults are current decisions, not open questions:

- EMIS stays inside the current SvelteKit application
- the high-level style remains a modular monolith
- reusable EMIS code lives in `packages/*`; app composition lives in `apps/web`
- BI consumes EMIS through published read-models only
- `PostgreSQL + PostGIS` is the default storage foundation
- `packages/emis-server` does not import UI
- `packages/emis-ui` does not import server code
- `apps/web` remains a leaf consumer and not a library

## 8. Boundary Rules

- `apps/web/src/routes/api/emis/*` is transport only
- `packages/emis-server/*` contains no HTTP logic and no client or UI code
- `packages/emis-ui/*` contains reusable UI and no server imports
- `platform-*` does not know about `emis-*`
- BI read-side code does not import EMIS operational modules; the connection goes through DB contracts and BI runtime seams
- compatibility shims are temporary and never become ownership truth

## 9. What Stays Out of This Document

Do not turn this file into a mixed backlog, runbook, and architecture note again.

Keep these elsewhere:

- rollout waves and status-closure notes
- review-process details
- auth flow pseudocode
- offline maps operational runbooks
- feature-specific frozen behavior contracts
