# Dataset Definitions Navigation

`src/lib/server/datasets/definitions/` - набор domain-specific dataset compilers.

Каждый файл описывает, как конкретный namespace датасетов переводится в `DatasetIr`.

## Что важно

Актуальные compilers сейчас:

- `wildberriesOfficeDay.ts`
- `wildberriesProductPeriod.ts`
- `emisMart.ts`
- `strategyMart.ts`

Для strategy важно:

- `strategyMart.ts` владеет только app-facing `strategy.*` datasets;
- он не собирает бизнес-логику из raw facts, а лишь описывает select/filter/order для уже опубликованных views;
- mapping на physical relation живет не здесь, а в `providers/postgresProvider.ts`.

Current strategy contract:

- `strategy.entity_overview` -> `mart_strategy.slobi_entity_overview`
- `strategy.scorecard_overview` -> `mart_strategy.slobi_scorecard_overview`
- `strategy.performance_detail` -> `mart_strategy.slobi_performance_detail`
- `strategy.cascade_detail` -> `mart_strategy.slobi_cascade_detail`

Правило расширения:

- новый strategy dataset добавляем только под новый устойчивый grain;
- если страница требует тяжелой client-side агрегации, значит нужен новый published view, а не усложнение compiler-а.
