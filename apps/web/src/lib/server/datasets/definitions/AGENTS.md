# Dataset Definitions Navigation

`src/lib/server/datasets/definitions/` - legacy copies of dataset definitions kept during migration.

Canonical dataset compilers now live in:

- `packages/platform-datasets/src/server/definitions/*`

New/active dataset definitions should be added in the package, because the runtime `compileDataset()` is imported from `@dashboard-builder/platform-datasets/server`.

## Что важно

Dataset compilers (зеркалятся в пакете с теми же именами файлов):

- `wildberriesOfficeDay.ts`
- `wildberriesProductPeriod.ts`
- `emisMart.ts`
- `strategyMart.ts`
- `paymentAnalytics.ts`

Для strategy важно:

- `strategyMart.ts` владеет только app-facing `strategy.*` datasets;
- он не собирает бизнес-логику из raw facts, а лишь описывает select/filter/order для уже опубликованных views;
- relation mapping и column typing живут в `packages/platform-datasets/src/server/providers/postgresProvider.ts`.

Current strategy contract:

- `strategy.entity_overview` -> `mart_strategy.slobi_entity_overview`
- `strategy.scorecard_overview` -> `mart_strategy.slobi_scorecard_overview`
- `strategy.performance_detail` -> `mart_strategy.slobi_performance_detail`
- `strategy.cascade_detail` -> `mart_strategy.slobi_cascade_detail`

Правило расширения:

- новый strategy dataset добавляем только под новый устойчивый grain;
- если страница требует тяжелой client-side агрегации, значит нужен новый published view, а не усложнение compiler-а.
