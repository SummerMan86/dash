# Providers Navigation

`src/lib/server/providers/` - исполнители `DatasetIr`.

Это bridge между абстрактным dataset contract и конкретным backend.

## Что здесь важно

- `mockProvider.ts` - demo/mock execution
- `postgresProvider.ts` - реальный Postgres executor

## Что важно

Current runtime provider path включает новый strategy/BSC slice:

- `strategy.entity_overview`
- `strategy.scorecard_overview`
- `strategy.performance_detail`
- `strategy.cascade_detail`

Все они маппятся на `mart_strategy.slobi_*` в `postgresProvider.ts`.

## Практические правила

- provider layer не должен знать BI-семантику страниц;
- здесь держим только relation mapping, column typing и generic SQL execution;
- если published view меняет колонки, mapping в `postgresProvider.ts` меняется в том же change set;
- если view участвует в `/api/datasets/:id`, его app-side mapping должен обновляться одновременно с DWH contract.
