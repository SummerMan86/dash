# Handoff: EMIS External Object Ingestion, Wave 1

## Что это

Execution-ready handoff для `lead-tactical` по новой active wave:

- plan owner: `lead-strategic`
- canonical plan: `docs/agents/lead-strategic/current_plan.md`
- detailed design reference: `docs/archive/emis/emis_external_object_ingestion.md`

## Operating Mode

- `high-risk iterative / unstable wave`

Default cadence:

- идти slice-by-slice
- после каждого принятого slice возвращаться в strategic loop
- не запускать dependent slices до acceptance предыдущего contract-sensitive этапа

## Что уже зафиксировано и не нужно переоткрывать

- active sources wave 1: `osm`, `gem`
- `wikimapia` вне scope этой волны
- canonical bridge table: `emis.object_source_refs`
- `emis.objects.external_id` остаётся compatibility-only
- full geometry входит в wave 1
- wave 1 не вводит отдельный background runtime / scheduler / queue
- API namespace wave 1:
  - `POST /api/emis/ingestion/trigger`
  - `GET /api/emis/ingestion/batches`
  - `GET /api/emis/ingestion/batches/:id`
  - `GET /api/emis/ingestion/batches/:id/objects`
  - `GET /api/emis/ingestion/conflicts`
  - `POST /api/emis/ingestion/conflicts/:id/resolve`

## Первый bounded slice

Исполнять сначала `ING-1`.

### Recommended execution mode

- direct by `lead-tactical`

Причина:

- docs/contracts-only alignment
- это blocking slice для DB/contracts/UI
- scope маленький и semantic, его невыгодно отдавать worker'у

### Task: ING-1 Contract Freeze and Execution Alignment

## Что сделать

- Прочитать:
  - `docs/agents/lead-strategic/current_plan.md`
  - `docs/archive/emis/emis_external_object_ingestion.md`
  - `docs/emis_session_bootstrap.md`
  - `docs/emis_working_contract.md`
  - `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
  - локальные `AGENTS.md` для:
    - `db/`
    - `packages/emis-contracts/`
    - `packages/emis-server/`
    - `apps/web/src/routes/api/emis/`
    - `apps/web/src/routes/emis/`
- Выравнять active contracts/docs так, чтобы tactical execution дальше не спорил о naming/scope.
- Зафиксировать в runtime/docs только то, что уже заморожено strategic plan'ом:
  - API namespace `trigger / batches / conflicts`
  - table names `obj_import_run`, `obj_import_candidate`, `obj_candidate_match`, `object_source_refs`
  - full geometry support in wave 1
  - minimal review UI in wave 1
  - non-point imported object guard in current manual edit flow
  - `wikimapia` explicit deferral

## Scope

- файлы:
  - `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
  - при необходимости related active docs, если там есть явное противоречие новому wave-1 plan
- НЕ трогать:
  - DB schema
  - runtime code
  - routes/services/contracts implementation
  - `current_plan.md` semantics без Plan Change Request

## Acceptance

- runtime/doc surface больше не противоречит strategic plan
- в active docs нет stale API naming из старого ingestion draft
- явно отражено, что:
  - imported objects use full geometry
  - curated object surfaces stay canonical for `/api/emis/objects` and `/emis/objects/[id]`
  - staging is not BI truth
  - ambiguous candidates stay unpublished

## Checks

- docs-only consistency review
- если меняется active contract doc:
  - `docs-reviewer`
  - `architecture-reviewer` only if placement/boundary wording changed materially

## Expected handoff/result

- краткий summary, какие active docs были выровнены
- truthful `review disposition`
- явное подтверждение, что `ING-2` теперь можно открывать без contract ambiguity

## Следующие slices после ING-1

Не запускать раньше strategic acceptance `ING-1`:

1. `ING-2` — DB foundation
2. `ING-3` — geometry broadening and curated object contract upgrade

После них можно открывать:

3. `ING-4` and `ING-5` — ingestion contracts/repository + source adapters (parallelizable)
4. `ING-6` — resolution engine and curated publication
5. `ING-7` — API transport
6. `ING-8` — review UI
7. `ING-9` — verification and governance closure

## Tactical risk notes

- The biggest live risk is not fetch logic but contract drift between DB-ready geometry and point-only runtime contracts.
- The second risk is accidental scope expansion into background-job architecture. Do not solve that in this wave.
- The third risk is corrupting imported non-point geometry through the existing point-only manual editor. This must be guarded explicitly before UI integration is accepted.
