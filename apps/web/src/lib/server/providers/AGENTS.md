# Providers Navigation

`src/lib/server/providers/` - исполнители `DatasetIr`.

Это bridge между абстрактным dataset contract и конкретным backend.

## Что здесь важно

- `mockProvider.ts` - demo/mock execution
- `postgresProvider.ts` - `// MIGRATION` shim, re-export из `@dashboard-builder/platform-datasets/server`

Canonical provider implementation and dataset-to-relation mapping now live in:

- `packages/platform-datasets/src/server/providers/postgresProvider.ts`

## Что важно

Current runtime provider path включает новый strategy/BSC slice:

- `strategy.entity_overview`
- `strategy.scorecard_overview`
- `strategy.performance_detail`
- `strategy.cascade_detail`

Все они маппятся на `mart_strategy.slobi_*` в `packages/platform-datasets/src/server/providers/postgresProvider.ts`.

## Практические правила

- provider layer не должен знать BI-семантику страниц;
- здесь держим только relation mapping, column typing и generic SQL execution;
- если published view меняет колонки, mapping меняется в том же change set (канонически в `packages/platform-datasets/src/server/providers/postgresProvider.ts`);
- если view участвует в `/api/datasets/:id`, его app-side mapping должен обновляться одновременно с DWH contract.
