# Strategy Business Audit 2026-03-18

Этот документ фиксирует первый business-layer аудит топовых KPI-цепочек в `Strategy DWH` после технического аудита и полной перезагрузки batch `strategy_full_project_20260318_audit`.

Связанный CSV-реестр:

- `/home/orl/Shl/КА/MS BI/bsc_model/business_audit_top20_kpi_chains_2026_03_18.csv`

## Методика

Каждая KPI-цепочка оценивалась по 5 критериям:

- понятность бизнес-смысла `metric_code + unit`;
- трассируемость до канонического документа;
- наличие осмысленного planning chain по горизонтам;
- наличие/отсутствие явного numeric gap;
- пригодность для показа руководству без ручного объяснения.

Использованы три статуса:

- `ready_limited` — можно показывать в management planning dashboard, но только как плановый/структурный KPI, не как `actual`;
- `needs_review` — смысл KPI правдоподобен, но нужна ручная верификация владельцем данных;
- `not_ready` — цепочка или семантически сомнительна, или уже содержит явный шум/ошибку.

## Итог по top-20

- `6` chains: `ready_limited`
- `8` chains: `needs_review`
- `6` chains: `not_ready`

## Что уже можно показывать

Ниже — safest subset, который можно использовать в management planning view с оговоркой, что это еще не operational actual layer:

- `TD_DRILLING_METERS_meters_2029`
- `IT_BUDGET_rub_mn_2023`
- `PrD_BUDGET_rub_mn_2017`
- `TD_BUDGET_rub_mn_2019`
- `PrD_GAS_PRODUCTION_bcm_2026`
- `TD_HEADCOUNT_persons_2023`

Общее правило:

- эти KPI подходят для блока `planning / reference / strategy alignment`;
- их пока нельзя интерпретировать как полноценный `BSC actual score`.

## Что показывать только рабочей группе

Цепочки ниже выглядят потенциально полезными, но пока требуют ручной валидации:

- `DPID_HEADCOUNT_persons_2024`
- `DPID_KPI_VALUE_percent_2027`
- `TD_GAS_PRODUCTION_bcm_2023`
- `ComD_SHUTDOWN_DAYS_days_2029`
- `DPID_CAPEX_rub_mn_2009`
- `TD_CASH_FLOW_rub_mn_2013`
- `DPID_DRILLING_METERS_meters_2009`
- `KRU_AUDIT_FINDINGS_events_2023`

Причины типовые:

- слишком старый источник;
- single-source KPI без каскада;
- generic KPI code вроде `KPI_VALUE`;
- сильный dependence on business interpretation.

## Что пока нельзя показывать руководству

Эти цепочки сейчас лучше заблокировать в executive BI:

- `DPID_RISK_COUNT_events_2035`
- `DPID_MAINTENANCE_COUNT_events_2025`
- `TD_MAINTENANCE_COUNT_events_2035`
- `DPID_SHUTDOWN_DAYS_days_2058`
- `ComD_RISK_COUNT_hours_2025`
- `ComD_BUDGET_days_2029`

Почему они blocked:

- numeric gap близок к 100%;
- period/horizon выглядят подозрительно;
- unit не соответствует самому KPI;
- extraction, вероятно, захватил шумную или не ту семантику.

## Практический вывод

`Strategy DWH` уже можно использовать как управленческий planning/gap contour, но только в двух режимах:

- показывать `ready_limited` KPI как стратегические plan signals;
- показывать `needs_review` только внутри рабочей группы;
- исключить `not_ready` из management deck до ручной очистки.

## Что уже внедрено после аудита

Следующий шаг из этого аудита уже выполнен:

- создан отдельный curated registry для 6 `ready_limited` KPI;
- в DWH опубликована management-safe витрина `mart.strategy_executive_kpi_v2`;
- для спорных цепочек включен режим `reference_only`, чтобы executive UI не показывал шумные raw latest values;
- для более надежных budget KPI добавлены ручные display overrides.

## Следующий правильный шаг

Следующая итерация должна быть не технической, а business-curation:

1. подтвердить у владельцев данных 6 `ready_limited` KPI;
2. вручную разобрать 8 `needs_review`;
3. исправить extraction rules по blocked chains;
4. отдельно подключить `OT / actual` источники, чтобы BSC перестал быть только структурным.
