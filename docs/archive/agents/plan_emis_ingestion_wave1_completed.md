# Plan: EMIS External Object Ingestion, Wave 1

## Цель

Добавить в EMIS generic ingestion contour для внешних объектов с активными source adapters только для `osm` и `gem`, сохранив строгую границу между:

- `stg_emis` как raw truth и run state
- `emis.objects` как curated operational truth
- `mart.emis_objects_dim` как BI/read-side truth поверх curated objects

Результат wave:

- внешние объекты можно подтягивать в staging, дедуплицировать, публиковать в curated слой и ревьюить через минимальный EMIS UI
- low-confidence duplicates и invalid/unmapped cases не публикуются автоматически
- imported objects поддерживают full geometry end-to-end

## Operating Mode

- `high-risk iterative / unstable wave`

Почему:

- меняется DB schema
- меняются runtime contracts
- расширяется object geometry contract
- появляется новый server module + API namespace
- добавляется review UI
- порядок slices зависит от фактического результата предыдущих этапов

## Canonical Decisions

- active sources этой волны: `osm`, `gem`
- `wikimapia` явно вне scope этой волны до отдельного source-validation/legal-ops pass
- `emis.objects.external_id` остаётся только compatibility field
- canonical multi-source identity живёт в `emis.object_source_refs`
- source winner определяется type-based policy, без field-level merge heuristics в wave 1
- full geometry входит в wave 1:
  - `Point`
  - `LineString`
  - `Polygon`
  - `Multi*` variants
- manual create/edit может оставаться point-first, но non-point imported objects должны быть защищены от порчи текущим lat/lon flow
- wave 1 не вводит отдельный background runtime, scheduler или queue; ingestion запускается из текущего app runtime по admin trigger

## Подзадачи

### ING-1: Contract Freeze and Execution Alignment

- scope:
  - `docs/plans/emis_external_object_ingestion.md`
  - `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
  - `docs/agents/lead-strategic/current_plan.md`
- depends on: —
- размер: S
- acceptance:
  - frozen API namespace: `trigger / batches / conflicts`
  - frozen DB names: `obj_import_run`, `obj_import_candidate`, `obj_candidate_match`, `object_source_refs`
  - frozen resolution outcomes and source-priority policy
  - frozen rule for non-point imported objects in point-first manual edit flow

### ING-2: DB Foundation

- scope:
  - `db/current_schema.sql`
  - `db/pending_changes.sql`
  - `db/applied_changes.md`
  - `db/schema_catalog.md`
  - reference seeds/dictionaries if needed
- depends on: ING-1
- размер: M
- acceptance:
  - staging tables and `emis.object_source_refs` exist
  - DB uniqueness enforces source-scoped identity
  - counters/status/error fields support batch tracking
  - reference rows for active sources and missing object types are present truthfully

### ING-3: Geometry Broadening and Curated Object Contract Upgrade

- scope:
  - `packages/emis-contracts/src/emis-geo/*`
  - `packages/emis-contracts/src/emis-object/*`
  - curated object queries/routes/UI that expose geometry
- depends on: ING-1
- размер: M
- acceptance:
  - `EmisObject*` contracts support full geometry safely
  - object list/detail surfaces expose `geometryType`, `sourceOrigin`, and primary source-ref metadata where needed
  - point, line, polygon, and relevant multi-geometries read correctly through API and UI
  - non-point imported objects are not corruptible through current manual edit entry points

### ING-4: Ingestion Contracts and Query/Repository Layer

- scope:
  - `packages/emis-contracts/src/emis-ingestion/*`
  - `packages/emis-server/src/modules/ingestion/repository.ts`
  - `packages/emis-server/src/modules/ingestion/queries.ts`
- depends on: ING-2, ING-3
- размер: M
- acceptance:
  - typed contracts exist for batches, imported candidates, matches, trigger/list/resolve inputs
  - repository/query layer covers staging persistence and review reads
  - package boundaries remain clean

### ING-5: Source Adapters and Registry

- scope:
  - `packages/emis-server/src/modules/ingestion/adapters/*`
- depends on: ING-4
- размер: M
- acceptance:
  - generic adapter interface exists
  - source registry/config is isolated from fetchers
  - OSM and GEM normalize into one candidate contract
  - mapping rules are isolated from transport/fetch code
  - no Wikimapia code lands in this wave

### ING-6: Resolution Engine and Curated Publication

- scope:
  - `packages/emis-server/src/modules/ingestion/service.ts`
  - `packages/emis-server/src/modules/ingestion/matchEngine.ts`
  - publication bridge into `emis.objects` + `emis.object_source_refs`
- depends on: ING-4, ING-5
- размер: L
- acceptance:
  - `unique` publishes a new curated object
  - `duplicate_with_clear_winner` updates the existing curated object and refreshes source refs
  - `possible_duplicate_low_confidence` remains unpublished in staging
  - `invalid_or_unmapped` remains unpublished with stable review/error state
  - source-priority policy is enforced by object type

### ING-7: API Transport

- scope:
  - `apps/web/src/routes/api/emis/ingestion/*`
- depends on: ING-4, ING-6
- размер: M
- acceptance:
  - trigger/batches/conflicts endpoints are implemented as thin transport
  - admin-only trigger/resolve and viewer+ diagnostics are enforced
  - stable `{ error, code }` contract exists for resolve flows

### ING-8: Review UI

- scope:
  - `apps/web/src/routes/emis/objects/+page.*`
  - `apps/web/src/routes/emis/objects/imported/[id]/*`
  - route-local helpers/components as needed
- depends on: ING-3, ING-7
- размер: M
- acceptance:
  - `/emis/objects` has import/review mode with filters by source, status, geometry type, mapped/unmapped
  - `/emis/objects/imported/[id]` shows raw payload, match candidates, winner rule, and resolve actions
  - `/emis/objects/[id]` stays curated operational detail only

### ING-9: Verification and Governance Closure

- scope:
  - docs/contracts/smoke coverage for the full wave
- depends on: ING-2, ING-3, ING-6, ING-7, ING-8
- размер: M
- acceptance:
  - DB docs and `RUNTIME_CONTRACT.md` are updated
  - verification covers DB constraints, source-priority winners, unpublished staging conflicts, geometry variants, curated publication, and mart separation
  - tactical report can truthfully declare readiness state

## Ограничения

- не писать SQL в `apps/web/src/routes/api/emis/*`
- не писать HTTP-логику в `packages/emis-server/src/modules/*`
- не пускать BI/read-side напрямую в `stg_emis`
- не смешивать structural migration и domain rewrite вне scope этой wave
- не расширять scope волны до Wikimapia, background runtime, scheduler или queue
- не ломать curated `/api/emis/objects` и `/emis/objects/[id]` ради staging concerns

## Ожидаемый результат

- в EMIS появляется reusable ingestion contour в `packages/emis-server` и `packages/emis-contracts`
- OSM и GEM можно подтянуть в staging, сопоставить с curated objects и безопасно опубликовать
- ambiguous/import-invalid cases видны в review UI и не загрязняют curated слой
- full geometry поддерживается на imported object path end-to-end
- `mart.emis_objects_dim` продолжает отражать только curated результат

## Recommended Handoff To Lead-Tactical

Начинать с:

1. `ING-1`
2. `ING-2`
3. `ING-3`

Затем:

4. `ING-4` и `ING-5`
5. `ING-6`
6. `ING-7`
7. `ING-8`
8. `ING-9`

Подробный design reference:

- `docs/plans/emis_external_object_ingestion.md`
