# Strategy Dashboard Navigation

`src/routes/dashboard/strategy/` - текущий strategy/BSC workspace внутри `dashboard-builder`.

Этот контур уже не placeholder: здесь лежат первые MVE-страницы, общие filters и
рабочий contract для последующих serious dashboards.

## С чего начинать

1. `docs/BI strategy`
2. `../AGENTS.md`
3. `constants.ts`
4. `filters.ts`
5. нужный `+page.svelte`

Если задача упирается в новый dataset grain или SQL contract, затем читать:

6. `../../../lib/server/datasets/AGENTS.md`
7. `../../../lib/server/datasets/definitions/AGENTS.md`
8. `../../../lib/server/providers/AGENTS.md`

## Текущий workspace contract

- workspace id: `dashboard-strategy`
- dataset ids:
  - `strategy.entity_overview`
  - `strategy.scorecard_overview`
  - `strategy.performance_detail`
  - `strategy.cascade_detail`
- текущие страницы:
  - `overview/` - registry-object overview, cascade coverage and gaps
  - `cascade/` - path-level drill-through from object to goal/task/KPI
  - `scorecard/` - department-centric weighted scorecard
  - `performance/` - KPI plan-vs-actual detail

Текущий temporary perimeter published views:

- strategy workspace пока читает только core registry perimeter;
- practically это значит: `mart_strategy.slobi_*` ограничены документами, попавшими в `stg_strategy.strategy_registry_overlay_raw` и сопоставленными через `mart_strategy.strategy_core_documents`;
- исчезновение части intake-derived KPI/doc rows после 23 марта 2026 здесь считается ожидаемым поведением, а не UI-bug.

## Filter contract

Сквозные strategy filters живут на `workspace` scope:

- `perspectiveCode`
- `horizonCode`
- `departmentCode`

Page-local filters:

- `overview`:
  - `entitySearch`
  - `onlyWeak`
- `performance`:
  - `entitySearch`
  - `statusSearch`

Правило:

- shared filters между разными strategy pages делаем через `workspace`, не через global app `shared`;
- фильтр оставляем page-local, если grain не conformed или он искажает семантику страницы.

## Grain rules

Это главный architectural invariant для strategy dashboards.

- `overview` = `one row = one strategy entity`
- practically in business language: one row = one registry object (`Стратегия` / `План` / `Программа` / `Стратегический документ`)
- `scorecard` = `department × perspective × horizon`
- `performance` = `one row = one performance_entity_key`
- `cascade` = `one row = one path_id`

Что это означает на практике:

- нельзя лечить grain mismatch client-side суммированием mixed-grain rows;
- если новая страница требует другой grain, сначала публикуем новый `mart_strategy.slobi_*` view;
- только потом добавляем новый `strategy.*` dataset id и route page.

## Важные правила для serious dashboards

- Heavy aggregation держим в SQL/view, не в Svelte.
- `overview` должен оставаться легким entity-level read model.
- Weighted score и weight diagnostics не перетаскиваем обратно в `overview`; они принадлежат `scorecard`.
- Если UI начинает повторно агрегировать тысячи строк, это сигнал, что read-side contract выбран неправильно.
- Drill-through лучше строить через URL params и явные keys, а не через одну универсальную mega-view.

## File map

- `constants.ts` - dataset ids, nav, filter groups, static options
- `filters.ts` - `FilterSpec[]` и bindings на strategy datasets
- `StrategyNav.svelte` - workspace nav между strategy pages
- `overview/+page.svelte` - registry-object overview and gap summary
- `cascade/+page.svelte` - path-level cascade investigation and drill-through
- `scorecard/+page.svelte` - department-centric scorecard page
- `performance/+page.svelte` - KPI detail page

## Как расширять этот контур

Если нужен новый serious dashboard:

1. Зафиксировать grain страницы.
2. Проверить, не покрывает ли его уже один из существующих `strategy.*` datasets.
3. Если не покрывает - опубликовать новый `mart_strategy.slobi_*` view.
4. Добавить dataset id в `strategyMart.ts`, mapping в `postgresProvider.ts` и route page.
5. Привязать только честные filters для этого grain.

Если новая страница начинает просить "все фильтры для всего":

- сначала проверить, conformed ли измерение между pages;
- если нет, не делать псевдо-сквозной фильтр ценой ложных totals и дублирования строк.
