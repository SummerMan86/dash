# Providers Navigation

`src/lib/server/providers/` - исполнители `DatasetIr`.

Это bridge между абстрактным dataset contract и конкретным backend.

## Что здесь важно

- `mockProvider.ts` - demo/mock execution for non-Postgres datasets

Canonical PostgreSQL provider implementation and dataset-to-relation mapping live in:

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
- здесь в app-side держим только `mockProvider`;
- relation mapping, column typing и generic SQL execution живут в `packages/platform-datasets`;
- если published view меняет колонки, mapping меняется в том же change set (канонически в `packages/platform-datasets/src/server/providers/postgresProvider.ts`);
- если view участвует в `/api/datasets/:id`, route should continue importing `postgresProvider` directly from `@dashboard-builder/platform-datasets/server`.
