# EMIS External Object Ingestion, Wave 1

## Purpose

Wave 1 adds a generic external-object ingestion contour for EMIS with active adapters only for:

- OSM Overpass
- GEM

Canonical publication flow:

```text
source pull
  -> stg_emis raw/import tables
  -> dedup + source-priority resolution
  -> emis.objects
  -> mart.emis_objects_dim
```

The goal of the wave is not "import everything automatically", but to make ingestion operationally safe:

- `stg_emis` keeps raw source truth and run state
- `emis.objects` stays curated operational truth
- `mart.emis_objects_dim` stays downstream of curated objects only
- low-confidence duplicates never auto-publish
- ambiguous or invalid candidates remain in staging until review

## Current-State Analysis

What already exists in the repo:

- `emis.objects` already stores `geometry(Geometry,4326)` plus derived centroid in DB
- `mart.emis_objects_dim` is already built from `emis.objects`
- `stg_emis` already exists and is used as a staging contour for ship-route ingestion
- `packages/emis-contracts` and `packages/emis-server` already provide the correct canonical home for new EMIS contracts/server modules
- `/emis/objects` and `/api/emis/objects` already exist as curated object surfaces

Current gaps that this wave must close:

- runtime contracts still model objects as point-only even though DB geometry is generic
- object list/detail contracts do not expose source/ref metadata needed for curated imported objects
- no generic ingestion module exists in `packages/emis-server`
- no source-scoped identity bridge exists for multi-source curated objects
- current manual object editor is latitude/longitude-only and would corrupt imported non-point geometry unless guarded explicitly
- `docs/archive/emis/emis_external_object_ingestion.md` previously described a different API/UI scope and stale naming

## Canonical Decisions Frozen Before Execution

### 1. Truth boundaries

- `stg_emis` is raw truth for external-object ingestion
- `emis.objects` is curated operational truth for `/emis` and `/api/emis/objects`
- `mart.*` remains BI truth and must not read directly from `stg_emis`

### 2. Active source scope

Wave 1 active adapters:

- `osm`
- `gem`

Deferred explicitly:

- `wikimapia`

Wikimapia is not a hidden omission. It is out of scope until a separate source-validation and legal/ops pass is approved.

### 3. Execution model

Wave 1 does **not** introduce a separate ingestion runtime, queue, or scheduler.

Canonical execution model:

- admin triggers ingestion through EMIS API
- service creates a batch row in `stg_emis.obj_import_run`
- fetch/normalize/match/publish runs through `packages/emis-server/src/modules/ingestion/*`
- batch status and counters remain persisted in staging

This keeps the wave inside the current modular-monolith runtime. A separate background runtime is a future wave if import volume or operational pressure requires it.

### 4. Multi-source identity

`emis.objects.external_id` remains as a compatibility field only.

Canonical multi-source identity moves to:

- `emis.object_source_refs`

Rules:

- one curated object may have many source refs
- `(source_code, source_ref)` must be unique in DB
- source refs remain the canonical dedup identity, not `external_id`
- soft-delete/recreate flows must not silently reuse another object's source identity

### 5. Resolution policy

Canonical resolution outcomes:

- `unique`
  - publish as new curated object
- `duplicate_with_clear_winner`
  - update existing curated object and attach/refresh source ref
- `possible_duplicate_low_confidence`
  - hold in staging, no publish
- `invalid_or_unmapped`
  - hold in staging with review/error status

Source winner is resolved by object-type policy:

- `gem` wins by default for:
  - `power_plant`
  - `coal_mine`
  - `gas_pipeline`
  - `oil_pipeline`
- `osm` wins by default for:
  - `port`
  - `terminal`
  - `storage`
  - `substation`

If this policy does not produce a clear winner, the candidate stays unresolved in staging.

Wave 1 uses object-level winner semantics, not field-level merge heuristics:

- the winning source refreshes the curated non-system payload for the object
- no per-field source arbitration in this wave

### 6. Geometry contract

Wave 1 upgrades imported objects to full geometry support end-to-end:

- `Point`
- `LineString`
- `Polygon`
- `MultiPoint`
- `MultiLineString`
- `MultiPolygon`

Operational rules:

- imported objects must round-trip through contracts, server queries, API responses, and EMIS UI safely
- `emis.objects` remains `geometry(Geometry,4326)` with derived centroid
- manual create/edit may stay point-first
- manual edit for non-point imported objects must be explicitly guarded so current lat/lon forms do not corrupt geometry

### 7. API/UI scope

Wave 1 includes minimal review UI. This is not API-only.

Canonical API namespace:

- `POST /api/emis/ingestion/trigger`
- `GET /api/emis/ingestion/batches`
- `GET /api/emis/ingestion/batches/:id`
- `GET /api/emis/ingestion/batches/:id/objects`
- `GET /api/emis/ingestion/conflicts`
- `POST /api/emis/ingestion/conflicts/:id/resolve`

Access:

- trigger/resolve: admin-only
- diagnostics/read queues: viewer+

Canonical UI scope:

- `/emis/objects`
  - import/review mode
  - filters by source, status, geometry type, mapped/unmapped
- `/emis/objects/imported/[id]`
  - candidate detail
  - raw payload preview
  - candidate matches
  - winner rule explanation
  - resolve actions

`/emis/objects/[id]` stays curated operational detail only.

## Canonical Data Model

### `stg_emis.obj_import_run`

Purpose:

- one ingestion batch/run
- source, params, status, counters, actor, timings, error summary

Minimum fields:

- `id`
- `source_code`
- `params jsonb`
- `status`
- `started_at`
- `finished_at`
- counters for fetched/candidates/published/held/errors
- `actor_id`
- `error_summary jsonb`

### `stg_emis.obj_import_candidate`

Purpose:

- raw imported candidate as normalized reviewable staging row

Minimum fields:

- batch/run linkage
- source identity
- raw payload
- normalized preview fields
- mapped object type
- full geometry + centroid
- lifecycle/review status
- promoted object id when published
- reviewer metadata

### `stg_emis.obj_candidate_match`

Purpose:

- candidate-to-curated-object match suggestions and evidence

Minimum fields:

- `candidate_id`
- `matched_object_id`
- score/confidence
- match kind
- match details JSON

### `emis.object_source_refs`

Purpose:

- source-scoped identity bridge for curated objects

Minimum fields:

- `id`
- `object_id`
- `source_code`
- `source_ref`
- timestamps / optional primary-marker metadata if needed by runtime

### Curated publication rules

- low-confidence duplicates do not reach `emis.objects`
- invalid/unmapped candidates do not reach `emis.objects`
- curated publication always creates or refreshes `emis.object_source_refs`
- `mart.emis_objects_dim` continues to read from curated objects only

## Package and Ownership Placement

Canonical homes:

- `packages/emis-contracts/src/emis-geo/*`
  - broaden geometry schemas/types
- `packages/emis-contracts/src/emis-object/*`
  - object contract upgrades for geometry/source metadata
- `packages/emis-contracts/src/emis-ingestion/*`
  - new ingestion DTO/Zod surface
- `packages/emis-server/src/modules/ingestion/*`
  - adapters, queries, repository, service, resolution engine
- `apps/web/src/routes/api/emis/ingestion/*`
  - thin HTTP transport only
- `apps/web/src/routes/emis/objects/*`
  - curated catalog and imported-review UI

Non-negotiables:

- no SQL in `routes/api/emis/*`
- no HTTP logic in `packages/emis-server/*`
- no BI path backdoor into staging
- no new reusable contracts in route files
- do not treat compatibility shims as canonical homes

## Strategic Gaps Closed In This Plan

These points were ambiguous before and are now fixed for execution:

- the wave includes minimal review UI, not API-only scope
- the canonical bridge table name is `emis.object_source_refs`
- API naming is `trigger / batches / conflicts`, not `runs / candidates`
- full geometry support is part of wave 1, not deferred
- manual point editor remains allowed, but non-point imported objects require safe guard behavior
- no separate background ingestion runtime is introduced in this wave

## Proposed Execution Slices

### ING-1: Contract freeze and detailed design alignment

- scope:
  - `docs/archive/emis/emis_external_object_ingestion.md`
  - `docs/agents/lead-strategic/current_plan.md`
  - `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- acceptance:
  - canonical API namespace, DB names, status model, and wave boundaries are frozen
  - geometry and manual-edit guard behavior are explicitly documented
  - Wikimapia deferral is recorded explicitly

### ING-2: DB foundation

- scope:
  - `db/current_schema.sql`
  - `db/pending_changes.sql`
  - `db/applied_changes.md`
  - `db/schema_catalog.md`
  - seeds/reference rows as needed
- acceptance:
  - staging tables and `emis.object_source_refs` exist
  - source-identity uniqueness is enforced in DB
  - required source/type reference rows exist for active adapters
  - audit/entity-type impact is resolved truthfully

### ING-3: Geometry broadening and curated object contract upgrade

- scope:
  - `packages/emis-contracts/src/emis-geo/*`
  - `packages/emis-contracts/src/emis-object/*`
  - curated object queries/services/routes/UI that read geometry
- acceptance:
  - imported objects support point/line/polygon/multi* through contracts and read APIs
  - object summaries/details expose `geometryType`, `sourceOrigin`, and primary source-ref metadata where needed
  - non-point imported objects are safe against corruption by the current manual edit flow

### ING-4: Ingestion contracts and query/repository foundation

- scope:
  - `packages/emis-contracts/src/emis-ingestion/*`
  - `packages/emis-server/src/modules/ingestion/repository.ts`
  - `packages/emis-server/src/modules/ingestion/queries.ts`
- acceptance:
  - typed batch/candidate/conflict contracts exist
  - repository/query layer covers staging persistence and review reads
  - package boundaries stay clean

### ING-5: Source adapters and registry

- scope:
  - `packages/emis-server/src/modules/ingestion/adapters/*`
- acceptance:
  - generic adapter interface exists
  - source registry/config is isolated from mapping logic
  - OSM and GEM adapters both normalize into the same candidate contract
  - no Wikimapia implementation appears in this wave

### ING-6: Resolution engine and curated publication

- scope:
  - `packages/emis-server/src/modules/ingestion/service.ts`
  - `packages/emis-server/src/modules/ingestion/matchEngine.ts`
  - object publication bridge into `emis.objects`
- acceptance:
  - `unique` publishes a new object
  - `duplicate_with_clear_winner` refreshes the winning curated object + source ref
  - `possible_duplicate_low_confidence` stays unpublished in staging
  - `invalid_or_unmapped` stays unpublished with stable review/error state

### ING-7: API transport

- scope:
  - `apps/web/src/routes/api/emis/ingestion/*`
- acceptance:
  - trigger/batches/conflicts endpoints work with documented auth
  - read diagnostics are viewer+
  - resolve path supports existing object, new object, and reject outcomes with stable `{ error, code }`

### ING-8: Review UI

- scope:
  - `apps/web/src/routes/emis/objects/+page.*`
  - `apps/web/src/routes/emis/objects/imported/[id]/*`
  - route-local helpers/components as needed
- acceptance:
  - `/emis/objects` can switch into import/review mode
  - filters include source, status, geometry type, mapped/unmapped
  - candidate detail shows raw payload, match candidates, winner rule, and resolve actions
  - curated object detail route remains curated-only

### ING-9: Verification and governance closure

- scope:
  - docs/contracts/smoke coverage for the full wave
- acceptance:
  - DB docs and runtime contract are updated
  - verification covers publication, unresolved staging, geometry variants, and curated/mart separation
  - final report can truthfully state whether ingestion readiness is green or still bounded

## Test/Verification Targets

- schema creates staging tables and `emis.object_source_refs`
- source identity uniqueness is enforced in DB
- `gem` wins for configured energy-asset conflicts
- `osm` wins for configured port/terminal/storage/substation conflicts
- low-confidence duplicate remains unpublished in staging
- point, line, polygon, and relevant multi-geometry imports survive end-to-end
- curated objects appear through `/api/emis/objects` and `/emis/objects`
- `mart.emis_objects_dim` reflects curated result only
- resolve flow supports:
  - link to existing object
  - create new curated object
  - reject candidate
- resolve errors stay stable as `{ error, code }`

## Recommended Strategic Mode

- `high-risk iterative / unstable wave`

Rationale:

- schema changes
- runtime contract changes
- new package/module surface
- full-geometry contract broadening
- new API namespace
- new review UI
- plan-sensitive sequencing between DB, contracts, engine, and UI

## Recommended First Handoff To Lead-Tactical

Start with:

1. `ING-1` — freeze contracts and edge-case rules
2. `ING-2` — DB foundation
3. `ING-3` — geometry broadening before ingestion transport/UI depend on it

Only after that open:

4. `ING-4` and `ING-5` in parallel where possible
5. `ING-6`
6. `ING-7`
7. `ING-8`
8. `ING-9`
