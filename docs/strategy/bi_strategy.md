# BI Strategy

Дата: 2026-03-23

Статус: proposed MVE architecture for strategy/BSC dashboards inside `dashboard-builder`

## 1. Короткое решение

Для `dashboard-builder` не стоит делать:

- одну универсальную mega-view на все страницы;
- отдельную витрину под каждый визуал.

Рекомендуемый компромисс для MVE:

- 4 read-side витрины по устойчивым grain;
- общие фильтры держать сквозными на уровне `workspace`, а не `shared` на все приложение;
- page-specific фильтры делать локальными;
- UI-страницы читать только dashboard-ready layer, а не напрямую базовые `mart_strategy.bsc_*` и `mart_strategy.strategy_entity_*`.

Итоговая идея:

- минимум витрин;
- максимум сквозных фильтров там, где grain реально совместим;
- честные ограничения там, где grain разный.

## 2. Почему это подходит текущему проекту

Это решение хорошо совпадает с текущим устройством `dashboard-builder`:

- dataset layer уже ожидает flat/filterable datasets;
- `postgresProvider` лучше всего работает с готовыми relation/view и простыми `where/order/limit`;
- filter runtime уже умеет вести один набор фильтров и прикладывать его к разным dataset ids через `bindings`;
- объем данных в strategy/BSC pilot умеренный, значит denormalized read-side views здесь нормальны.

Главный практический вывод:

- сквозные фильтры в этом проекте не требуют одной физической витрины;
- они достигаются через `workspace` runtime + `bindings` на несколько datasets.

## 3. Источник данных и boundary

В external BI-постановке встречается `mart_strategy.*`.
Исторически часть strategy/BSC SQL жила в `dashboard-builder`, но текущий snapshot-first source of truth по strategy-контуру теперь находится во внешнем `agent_pack`:

- `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/dwh/current_schema.sql`
- `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/dwh/schema_catalog.md`
- `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/dwh/applied_changes.md`

Рабочие схемы strategy-контура там:

- `stg_strategy`
- `mart_strategy`

Для `dashboard-builder` стоит принять следующий contract:

- canonical app-facing layer = отдельные dashboard-ready views в `mart_strategy` с префиксом `slobi_`;
- SQL/view changes для strategy/BSC делаются во внешнем `agent_pack/dwh/*`, а не в `dashboard-builder/db/*`;
- `dashboard-builder` владеет только app-side integration: dataset ids, filter bindings, routes и UI;
- UI и dataset compilers не ходят напрямую в raw base facts без отдельного read-side contract.

Практически это означает:

- DWH публикует стабильные `mart_strategy.slobi_*` views;
- `dashboard-builder` подключает их через dataset layer как `strategy.*` datasets;
- локальный `db/current_schema.sql` этого репозитория не расширяется под `mart_strategy`, потому что это другой ownership boundary.

Временное perimeter-правило для текущего pilot:

- published `mart_strategy.slobi_*` пока сознательно ограничены документами, попавшими в `stg_strategy.strategy_registry_overlay_raw`;
- practically это реализуется через `mart_strategy.strategy_core_documents` / document xwalk, а не через весь intake-контур;
- если позже понадобится расширить perimeter обратно до всего intake, это должно быть отдельным осознанным решением на стороне DWH.

Для strategy DWH рекомендуемый naming:

- schema: `mart_strategy`
- prefix: `slobi_*`

Примеры:

- `mart_strategy.slobi_entity_overview`
- `mart_strategy.slobi_scorecard_overview`
- `mart_strategy.slobi_performance_detail`
- `mart_strategy.slobi_cascade_detail`

Отдельное ТЗ на этот внешний DWH slice зафиксировано в:

- `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/dashboard_builder_strategy_read_side_tz_2026_03_23.md`

## 4. Минимальный набор витрин

### 4.1. `strategy.entity_overview`

Relation:

- `mart_strategy.slobi_entity_overview`

Grain:

- `strategy_entity_id × department_code × perspective_code × horizon_code`

Основные источники:

- `mart_strategy.strategy_entity_dim`
- `mart_strategy.bsc_entity_summary`
- `mart_strategy.bsc_entity_scorecard_summary`

Зачем нужна:

- landing page по сущностям;
- coverage, evidence и score overview;
- top entities / weak entities;
- стартовая точка drill-through в performance и cascade.

Обязательные поля:

- `strategy_entity_id`
- `entity_name`
- `entity_semantics`
- `entity_origin`
- `active_flag`
- `department_code`
- `perspective_code`
- `horizon_code`
- `has_confirmed_evidence_flag`
- `has_derived_only_flag`
- `multi_perspective_flag`
- `document_count`
- `goal_count`
- `task_count`
- `kpi_count`
- `gap_count`
- `total_kpi_count`
- `kpi_with_target`
- `kpi_with_actual`
- `avg_achievement_pct`
- `weighted_score`

Полезные derived-поля прямо во view:

- `coverage_items_total = goal_count + task_count + kpi_count`
- `weak_entity_flag`
- `score_band`

### 4.2. `strategy.scorecard_overview`

Relation:

- `mart_strategy.slobi_scorecard_overview`

Grain:

- `department_code × perspective_code × horizon_code`

Основные источники:

- `mart_strategy.bsc_scorecard_summary`
- `mart_strategy.bsc_scorecard_total_summary`
- при необходимости dims для label enrichment

Зачем нужна:

- отдельная department-centric scorecard page;
- матрица `department × perspective`;
- total cards по горизонтам;
- контроль missing weights.

Обязательные поля:

- `department_code`
- `perspective_code`
- `horizon_code`
- `weighted_score`
- `weighted_score_total`
- `weight_pct`
- `weight_missing_flag`
- `missing_weight_rows`
- `weight_as_of_date`
- `total_kpi_count`
- `kpi_with_target`
- `kpi_with_actual`
- `avg_achievement_pct`
- `goal_count`
- `task_count`
- `gap_count`

Важное правило:

- `strategy_entity_id` сюда не денормализуем только ради сквозного фильтра;
- scorecard page остается честно department-centric.

### 4.3. `strategy.performance_detail`

Relation:

- `mart_strategy.slobi_performance_detail`

Grain:

- одна KPI/performance строка на `performance_entity_key`

Основные источники:

- `mart_strategy.bsc_performance_pivot`
- `mart_strategy.bsc_performance_fact_bridge`
- `mart_strategy.strategy_entity_dim`

Зачем нужна:

- KPI Performance page;
- детальная таблица;
- top deviations;
- drill-through из entity overview и scorecard.

Обязательные поля:

- `performance_entity_key`
- `strategy_entity_id`
- `entity_name`
- `department_code`
- `perspective_code`
- `horizon_code`
- `status_label`
- `year_num`
- `period_label`
- `fact_id`
- `fact_name`
- `metric_code`
- `target_value`
- `actual_value`
- `forecast_value`
- `threshold_value`
- `achievement_pct`
- `deviation_abs`

Полезные derived-поля:

- `has_target_flag`
- `has_actual_flag`
- `deviation_band`

### 4.4. `strategy.cascade_detail`

Relation:

- `mart_strategy.slobi_cascade_detail`

Grain:

- одна path row на `path_id`

Основные источники:

- `mart_strategy.bsc_alignment_path_enriched`
- `mart_strategy.bsc_cascade_completeness`

Зачем нужна:

- Cascade & Alignment page;
- path explorer;
- path status distribution;
- completeness matrix.

Обязательные поля:

- `path_id`
- `strategy_entity_id`
- `entity_name`
- `department_code`
- `perspective_code`
- `horizon_code`
- `path_status`
- `cycle_flag`
- `orphan_flag`
- `cascade_group_key`
- `completeness_status`
- `root_fact_id`
- `root_fact_name`
- `task_fact_id`
- `task_fact_name`
- `kpi_fact_id`
- `kpi_fact_name`
- `doc_id`
- `document_full_name`
- `path_depth`

## 5. Что не включать в минимальный contract

Чтобы не расползтись на старте, в MVE не нужно сразу делать отдельные datasets для всего подряд.

### Пока не обязательно:

- отдельная `gap_detail` витрина;
- отдельная `coverage_qa` витрина;
- отдельные helper datasets только ради одного chart.

### Как с ними поступить:

- `Gap Analysis` в MVE v1 можно закрыть агрегатами из `entity_overview` и `scorecard_overview`;
- если нужен detail page с `gap_description`, тогда добавляем пятую витрину `strategy.gap_detail`;
- `Coverage & QA` можно держать как internal wave 2.

Таким образом стартовый набор = 4 витрины, а не 6-8.

## 6. Сквозные фильтры

### Главное правило

Для strategy dashboards сквозные фильтры стоит хранить не в `shared`, а в `workspace`.

Почему:

- `shared` в текущем проекте означает app-wide subset;
- это может неожиданно протекать в другие workspace;
- strategy filters не должны влиять на Wildberries или EMIS.

Рекомендуемый runtime:

- `workspaceId: 'dashboard-strategy'`
- `ownerId`: по странице (`overview`, `scorecard`, `performance`, `cascade`)

### 6.1. Workspace-common filters

Это фильтры, которые должны сохраняться при переходе между strategy pages.

#### `departmentCode`

- `scope: 'workspace'`
- `apply: 'server'`
- bindings: все 4 strategy datasets

#### `horizonCode`

- `scope: 'workspace'`
- `apply: 'server'`
- bindings: все 4 strategy datasets

#### `perspectiveCode`

- `scope: 'workspace'`
- `apply: 'server'`
- bindings: все 4 strategy datasets

#### `strategyEntityId`

- `scope: 'workspace'`
- `apply: 'server'`
- bindings:
  - `strategy.entity_overview`
  - `strategy.performance_detail`
  - `strategy.cascade_detail`

Важное поведение:

- у `strategy.scorecard_overview` binding для `strategyEntityId` отсутствует;
- filter остается в workspace state, но scorecard dataset его просто игнорирует;
- это нормальный и ожидаемый contract.

### 6.2. Owner-local filters

Это фильтры, которые не обязаны быть сквозными между страницами.

#### Overview page

- `entitySemantics`
- `entityOrigin`
- `evidenceState`

#### Performance page

- `statusLabel`
- `yearNum`
- `periodLabel`

#### Cascade page

- `pathStatus`
- `completenessStatus`
- `docId`

## 7. Пример filter contract

Ниже не production code, а ориентир по shape:

```ts
const strategyFilters: FilterSpec[] = [
  {
    id: 'departmentCode',
    type: 'select',
    label: 'Департамент',
    scope: 'workspace',
    apply: 'server',
    bindings: {
      'strategy.entity_overview': { field: 'department_code', param: 'departmentCode' },
      'strategy.scorecard_overview': { field: 'department_code', param: 'departmentCode' },
      'strategy.performance_detail': { field: 'department_code', param: 'departmentCode' },
      'strategy.cascade_detail': { field: 'department_code', param: 'departmentCode' }
    }
  },
  {
    id: 'strategyEntityId',
    type: 'select',
    label: 'Strategy Entity',
    scope: 'workspace',
    apply: 'server',
    bindings: {
      'strategy.entity_overview': { field: 'strategy_entity_id', param: 'strategyEntityId' },
      'strategy.performance_detail': { field: 'strategy_entity_id', param: 'strategyEntityId' },
      'strategy.cascade_detail': { field: 'strategy_entity_id', param: 'strategyEntityId' }
    }
  }
];
```

Это и есть нужный нам компромисс:

- один workspace filter surface;
- разные datasets;
- честное игнорирование нерелевантных фильтров.

## 8. Предлагаемые страницы MVE

### Wave 1

#### `/dashboard/strategy`

- root route strategy workspace;
- редирект или landing на `overview`;
- общий page shell и workspace filter state.

#### `/dashboard/strategy/overview`

Dataset:

- `strategy.entity_overview`

Что показываем:

- KPI cards;
- coverage table;
- entity score matrix;
- top entities by coverage;
- flags / weak entities.

#### `/dashboard/strategy/scorecard`

Dataset:

- `strategy.scorecard_overview`

Что показываем:

- weighted score cards;
- matrix `department × perspective`;
- contribution bars;
- warning for missing weights.

#### `/dashboard/strategy/performance`

Dataset:

- `strategy.performance_detail`

Что показываем:

- KPI cards;
- performance table;
- top deviations;
- status distribution.

### Wave 2

#### `/dashboard/strategy/cascade`

Dataset:

- `strategy.cascade_detail`

#### `/dashboard/strategy/coverage`

Скрытая internal page.
Делать только если действительно нужна отдельная QA surface.

## 9. Dataset layer contract для repo

### Нужные изменения в коде `dashboard-builder`

1. Добавить новый dataset compiler, например:

- `packages/platform-datasets/src/server/definitions/strategyMart.ts`

2. Зарегистрировать его в:

- `packages/platform-datasets/src/server/compile.ts`

3. Добавить SQL mapping для relations в:

- `packages/platform-datasets/src/server/providers/postgresProvider.ts`

4. Разрешить `strategy.*` datasets в transport:

- `apps/web/src/routes/api/datasets/[id]/+server.ts`

### Важная repo-specific оговорка

Transport route already routes `strategy.*` datasets to the PostgreSQL provider together with `wildberries.*` and `emis.*`.

### Что не делать в этом репо

- не редактировать `db/current_schema.sql` этого репозитория ради `mart_strategy`;
- не переносить ownership strategy DWH обратно в `dashboard-builder/db`;
- не использовать local app DB snapshot как source of truth для strategy views.

## 10. Предпочтительный rollout order

### Step 1. DB read-side views

Создать:

- `mart_strategy.slobi_entity_overview`
- `mart_strategy.slobi_scorecard_overview`
- `mart_strategy.slobi_performance_detail`
- `mart_strategy.slobi_cascade_detail`

### Step 2. Dataset layer

Добавить dataset ids:

- `strategy.entity_overview`
- `strategy.scorecard_overview`
- `strategy.performance_detail`
- `strategy.cascade_detail`

### Step 3. Strategy workspace filters

Завести единый `filters.ts` для strategy workspace.

### Step 4. First 3 pages

Собрать:

- overview
- scorecard
- performance

### Step 5. Cascade

Добавить только после стабилизации первых трех.

## 11. Рекомендуемый итоговый принцип

Формула для текущего проекта такая:

- не одна витрина;
- не витрина на каждый chart;
- одна витрина на один честный grain;
- один strategy workspace filter surface;
- только общие фильтры делать сквозными.

Это дает:

- достаточно сквозной UX;
- простой dataset layer;
- предсказуемые totals;
- меньше риска сломать смысл метрик из-за mixed-grain mega-view.
