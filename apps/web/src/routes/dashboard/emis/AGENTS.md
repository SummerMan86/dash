# EMIS BI Routes Navigation

Этот файл описывает правила для `src/routes/dashboard/emis/*`.
Это BI/read-side route layer поверх published datasets, а не operational EMIS write/query layer.

## 1. Scope

Здесь живут:

- route-level BI pages
- dataset-driven charts, tables and KPI blocks
- filter runtime wiring for dashboard routes
- page-local view-model shaping поверх `DatasetResponse`
- narrow server-assisted map runtime config load via `@dashboard-builder/emis-server/infra/mapConfig` where already documented

Ключевые routes:

- `+page.svelte` - overview dashboard
- `ship-routes/+page.svelte` - BI page по route data
- `provenance/+page.svelte` - BI page по provenance
- `vessel-positions/+page.server.ts` + `+page.svelte` - BI slice с server-assisted page load

## 2. Canonical path

Для BI pages canonical path остается таким:

`fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`

Если нужен новый BI slice, сначала проверяем:

- можно ли выразить его existing dataset contract
- нужен ли новый published view / dataset id
- не пытаемся ли мы протащить operational query logic прямо в route

## 3. What is allowed in route layer

- chart config assembly
- formatting and presentation mapping
- route-local aggregation над `DatasetResponse`
- filter-to-query wiring for dataset calls

## 4. What must not stay here

- raw SQL
- direct imports from `$lib/server/*` into client route code
- ad-hoc operational fetches to bypass dataset layer without clear reason
- reusable business calculations duplicated across multiple BI pages

## 5. Extraction rules

Оставляем в route:

- page composition
- page-specific chart options
- small view-model helpers

Выносим в helper/model file, если logic:

- reused across multiple BI routes
- grows into substantial transformation pipeline
- mixes formatting with business semantics and becomes hard to review

## 6. Review cues

При review смотреть:

- BI route не обходит dataset contract
- route не превращается в hidden data-service layer
- filters map cleanly onto dataset params
- new published views / dataset ids reflected in docs and DB catalog when needed

## 7. Reading order

1. `../../../../docs/emis/README.md`
2. `../../../../docs/agents/workflow.md`
3. `../../../../docs/agents/templates.md`
4. `../../../../docs/emis/architecture.md`
5. `../../../../src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
6. `../../../../src/lib/server/datasets/AGENTS.md` - если change касается dataset runtime
