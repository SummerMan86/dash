# Strategy Drive Route Navigation

`src/routes/dashboard/strategy-drive/` - прикладной маршрут для стратегического DWH.

Это основной UI-вход в `strategy`-срез.

## Что делает маршрут

Страница показывает:

- overview KPI;
- BSC score;
- planning footprint;
- planning cascade `LT -> MT -> ST -> OT`;
- numeric gap analysis;
- source coverage;
- extracted evidence из документов.

## Какие данные использует

Маршрут читает только через `fetchDataset(...)` и `strategy.*` dataset ids:

- `strategy.documents_dim`
- `strategy.metric_detail`
- `strategy.cascade_coverage`
- `strategy.gap_overview`
- `strategy.bsc_overview`
- `strategy.source_coverage`

## Как читать этот модуль

1. `../../../../docs/strategy_session_bootstrap.md`
2. `../../../../docs/strategy_dwh_v1.md`
3. `+page.svelte`

## Важные UI-инварианты

- сначала executive summary, потом проблемы, потом evidence/data quality;
- OT нельзя показывать как “готово”, если реального operational source еще нет;
- если на странице не хватает поля, сначала проверить `mart`, а не вычислять его только на клиенте;
- route должен оставаться витриной поверх DWH, а не превращаться в отдельный слой бизнес-логики.

## Что менять вместе

Если меняется data contract для страницы, обычно затрагиваются сразу несколько мест:

- `db/migrations/012_strategy_dwh_v1.sql` или `013_strategy_auto_extracted_support.sql`
- `scripts/strategy-load.mjs`
- `src/lib/server/datasets/definitions/strategyMart.ts`
- `src/lib/server/providers/postgresProvider.ts`
- `src/routes/dashboard/strategy-drive/+page.svelte`

## На что смотреть в первую очередь

- на порядок блоков страницы;
- на фильтры и derived summary;
- на то, что визуалы опираются на реальные `strategy.*` данные, а не на demo fixtures.
