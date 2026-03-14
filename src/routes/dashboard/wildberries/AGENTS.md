# Wildberries Routes Navigation

`src/routes/dashboard/wildberries/` - самый прикладной и показательный кусок текущего UI.

Если хочется понять, как проект выглядит не как demo, а как аналитическое приложение, начинать стоит отсюда.

## Модули

### `office-day/`

Простейший, но очень полезный маршрут для понимания data pipeline:

- регистрирует filters
- вызывает `fetchDataset`
- показывает таблицу
- работает с PostgreSQL dataset напрямую

Хорошая первая точка чтения.

### `product-analytics/`

Самый насыщенный аналитический маршрут:

- filters
- derived calculations
- рекомендации
- charts
- таблицы
- action через `/api/wb/prices`

Хорошо показывает, как shared/ui, dataset layer и page-level business logic собираются вместе.

### `stock-alerts/`

Маршрут с агрегацией, сценарными параметрами и прикладными widgets.

Показывает:

- local + global filters
- derived KPI
- custom widgets
- operational analysis view

## Порядок чтения

1. `office-day/+page.svelte`
2. `stock-alerts/+page.svelte`
3. `product-analytics/+page.svelte`

## На что обращать внимание

- page-level вычисления лежат прямо рядом с route (`aggregation.ts`, `utils.ts`, `filters.ts`);
- это хороший reference для будущих доменных модулей, но не идеальная конечная архитектура;
- при развитии EMIS стоит брать отсюда паттерны, а не копировать структуру один в один.
