# Strategy Intake DWH/BI Assessment 2026-03-18

## Зачем нужен этот документ

Это snapshot-оценка текущего intake-слоя `strategy_parse_hybrid_v7_1` как источника для следующего этапа:

- разработки intake-based datamart;
- подготовки pilot BI-дашбордов;
- планирования финальной модели `mart` и визуализаций в следующем диалоге.

Документ фиксирует состояние на момент проверки и нужен как handoff, если следующая сессия стартует без полного контекста.

## Проверенный run

- `run_id`: `strategy_parse_hybrid_v7_1`
- `status`: `active`
- `workbook_version`: `hybrid_v7_1`

### Статус очереди

- всего задач: `428`
- `completed`: `21`
- `claimed`: `6`
- `pending`: `401`
- `blocked`: `0`
- `skipped`: `0`

## Snapshot intake-наполнения

### Объем строк

- `staging.strategy_document_intake`: `21`, из них `13` с `ready_for_dwh_flag = true`
- `staging.strategy_fact_intake`: `765`, из них `404` с `ready_for_dwh_flag = true`
- `staging.strategy_link_intake`: `129`
- `staging.strategy_gap_intake`: `81`

### Базовая заполненность

#### Документы

- `21/21` с `doc_id`
- `21/21` с `department_code`
- `21/21` с `horizon_code`
- `21/21` с `source_document_file`
- `21/21` документов уже имеют связанные факты
- `21/21` документов уже имеют связанные связи
- `21/21` документов уже имеют связанные gap-записи

#### Факты

- `765/765` с `fact_id`
- `765/765` с источником `source_path`
- `765/765` со `source_page`
- `751/765` с `raw_value`
- `340/765` с `numeric_value`
- `709/765` с `perspective_code`
- `94/765` с `metric_code`
- `490/765` с `chain_id`

#### Связи

- `129/129` с `rel_id`
- `129/129` с `relation_type`
- `129/129` со `source_horizon_code`
- `100/129` с `chain_id`
- `15` записей с `structural_gap_flag = true`
- `1` запись с `numeric_gap_flag = true`

#### Gap

- `81/81` с `gap_id`
- `81/81` с `gap_category_code`
- `81/81` с `criticality_code`
- `81/81` с `perspective_code`
- `55/81` с `chain_id`

## Что реально покрыто сейчас

### По документам

- всего документов в latest intake: `21`
- все `21` относятся к `TD`
- все `21` относятся к горизонту `LT`
- распределение по BSC-перспективам документов:
  - `OPS`: `19`
  - `FIN`: `1`
  - `RISK`: `1`

### По фактам

Распределение фактов:

- `TD / LT / OPS`: `609`
- `TD / LT / FIN`: `70`
- `TD / LT / <blank perspective>`: `56`
- `TD / LT / RISK`: `29`
- `TD / LT / PEOPLE`: `1`

### По стратегическому содержанию

Стратегически полезные fact rows (`GOAL`, `TASK`, `KPI`, `CANDIDATE_METRIC`, `MILESTONE`, `TARGET`, `PLAN`):

- `293`

Стратегически полезные links (`GOAL_TO_TASK`, `TASK_TO_FACT`, `FACT_TO_FACT`, `ACTUAL_VS_PLAN`):

- `23`

Стратегически полезные gaps (`STRUCT`, `NUMERIC`):

- `13`

Документы, в которых уже есть:

- KPI: `6`
- GOAL: `5`
- TASK: `7`
- MILESTONE: `9`
- RISK: `5`

## Что видно по классам данных

Наиболее частые `fact_class`:

- `OBJECT_PARAM`: `82`
- `CANDIDATE_METRIC`: `81`
- `KPI`: `81`
- `TECH_PARAM`: `69`
- `MILESTONE`: `45`
- `TASK`: `45`
- `PRODUCTION`: `44`
- `REFERENCE`: `44`
- `BUDGET`: `39`
- `CONSTRAINT`: `29`

Наиболее частые `gap_category_code`:

- `SOURCE`: `30`
- `SCOPE`: `21`
- `DQ`: `17`
- `STRUCT`: `10`
- `NUMERIC`: `3`

## Вывод по готовности DWH/BI

### Что уже можно делать

На текущем intake уже можно строить pilot datamart и первые BI-страницы:

- реестр паспортов документов;
- реестр извлеченных фактов;
- покрытие и прогресс очереди;
- source coverage / data quality;
- gap register;
- документно-фактовую graph-view;
- pilot-страницы по каскаду и BSC readiness.

### Что пока делать рано

Пока рано объявлять этот слой финальной моделью для:

- cross-directorate balanced scorecard;
- полноценного каскада `цели -> задачи -> KPI` по всему архиву;
- numeric reconciliation dashboard как executive truth;
- итоговой управленческой витрины по всему `Сахалин-2`.

Причины:

- обработан только небольшой поднабор документов (`21/428`);
- текущий latest intake почти полностью состоит из `TD / LT`;
- `metric_code` заполнен только у `94/765` фактов;
- часть фактов/links/gaps еще не доведена до полного cascade/BSC-контекста.

## Рекомендация по архитектуре следующего шага

Не строить BI напрямую поверх `staging.strategy_*_intake`.

Вместо этого подготовить intake-based `mart`-слой, например:

- `mart.strategy_intake_document_passports`
- `mart.strategy_intake_fact_registry`
- `mart.strategy_intake_goal_task_kpi_graph`
- `mart.strategy_intake_cascade_coverage`
- `mart.strategy_intake_bsc_mapping`
- `mart.strategy_intake_gap_register`
- `mart.strategy_intake_source_coverage`

И уже поверх него публиковать dataset ids и дашборды.

## Что нужно доанализировать в следующем диалоге

### Final datamart model

- итоговый grain каждой витрины;
- какие поля брать напрямую из intake, а какие нормализовать;
- отдельный ли namespace делать (`strategy_intake.*`) или расширять текущий `strategy.*`;
- правила дедупликации и канонизации `metric_code`, `chain_id`, `relation_type`, `gap_category_code`;
- как разделить pilot read-model и финальный management-grade слой.

### BI visual scope

Какие страницы уже можно подготовить:

- intake overview;
- document passports;
- extraction coverage;
- gap register;
- strategic graph / cascade preview;
- BSC readiness / KPI readiness.

Какие страницы пока лучше не обещать как финальные:

- executive BSC;
- full cross-directorate cascade;
- numeric reconciliation as trusted management scorecard.

## Короткий вывод

Текущий intake-слой уже достаточно насыщен, чтобы начать разработку intake-based datamart и pilot BI.

Но он еще недостаточно зрелый, чтобы считать его финальным источником для полноценных стратегических дашбордов по всему проекту `Сахалин-2`.
