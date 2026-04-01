# Strategy Newcomer Guide

Этот документ нужен для разработчика или аналитика, который впервые заходит в `strategy`-срез внутри `dashboard-builder`.

Важно:

- это не новый source of truth поверх реализации;
- модель, таблицы и dataset ids описаны в [Strategy DWH v1](./strategy_dwh_v1.md);
- этот guide нужен, чтобы быстро понять, что уже сделано, где это лежит и как безопасно продолжать работу.

## 1. Что это вообще за slice

`Strategy DWH` внутри проекта отвечает за стратегические документы, balanced scorecard, planning cascade и gap analysis.

Смысл среза такой:

- связать документы проекта с KPI и плановыми горизонтами `LT -> MT -> ST -> OT`;
- показать, где цепочка разрывается структурно;
- показать, где цифры не бьются между parent KPI и child rollup;
- отдать это в BI и UI через существующий dataset/BFF слой, а не через bespoke API.

Именно для этого в проекте был добавлен отдельный `strategy`-контур в PostgreSQL и отдельный маршрут:

- `/dashboard/strategy-drive`

## 2. Что уже реализовано

### DWH слой

Есть отдельные схемы:

- `staging`
- `mart`

Есть таблицы загрузки:

- `staging.strategy_load_batch`
- `staging.strategy_document_raw`
- `staging.strategy_metric_raw`
- `staging.strategy_cascade_raw`

Есть `mart`-справочники:

- `mart.strategy_perspectives_dim`
- `mart.strategy_horizons_dim`
- `mart.strategy_metrics_dim`
- `mart.strategy_bsc_weights`

Есть `mart`-витрины:

- `mart.strategy_documents_dim`
- `mart.strategy_metric_detail`
- `mart.strategy_cascade_coverage`
- `mart.strategy_gap_overview`
- `mart.strategy_bsc_overview`
- `mart.strategy_source_coverage`

### Dataset layer

Есть зарегистрированные dataset ids:

- `strategy.documents_dim`
- `strategy.metric_detail`
- `strategy.cascade_coverage`
- `strategy.gap_overview`
- `strategy.bsc_overview`
- `strategy.source_coverage`

Они публикуются через обычный BI-путь проекта:

- `fetchDataset(...)`
- `POST /api/datasets/:id`
- `compileDataset(...)`
- `DatasetIr`
- `postgresProvider`

### UI слой

Есть рабочая страница:

- `src/routes/dashboard/strategy-drive/+page.svelte`

Сейчас на ней уже отображаются:

- overview KPI;
- BSC chart;
- planning footprint;
- planning cascade;
- numeric gap table/chart;
- source coverage;
- extracted evidence cards из auto-extracted facts.

## 3. Откуда берутся данные

В `v1` источник данных не live-parsing документов, а curated/semi-manual слой:

- `/home/orl/Shl/КА/MS BI/bsc_model`

Ключевые CSV для загрузки:

- `dim_bsc_perspectives.csv`
- `dim_horizons.csv`
- `dim_metric_dictionary_template.csv`
- `fact_bsc_weights.csv`
- `fact_kpi_decomposition_template.csv`
- `fact_planning_cascade_seed.csv`
- `data_source_map.csv`
- `auto_extracted_facts_demo.csv`

Загрузчик:

- `scripts/strategy-load.mjs`

Команда:

```bash
pnpm strategy:load
```

По умолчанию загрузчик берет `source-root` из:

- `--source-root`
- или `STRATEGY_BSC_MODEL_ROOT`
- или дефолтного пути `/home/orl/Shl/КА/MS BI/bsc_model`

## 4. Как устроен data flow

Упрощенно поток такой:

1. CSV и extracted facts читаются из `MS BI/bsc_model`.
2. Загрузчик кладет сырые записи в `staging.strategy_*`.
3. `mart`-view нормализуют и предрассчитывают BI-friendly срезы.
4. `strategyMart.ts` компилирует dataset ids в flat select IR.
5. `postgresProvider` исполняет эти выборки.
6. `strategy-drive` читает датасеты и строит UI.

Важно: текущий `postgresProvider` не делает runtime aggregate/groupBy, поэтому вся аналитическая логика должна жить в `mart`, а не в UI и не в provider.

## 5. Где смотреть код

Если нужно быстро разобраться, читать лучше в таком порядке:

1. `docs/strategy_session_bootstrap.md`
2. `docs/strategy_dwh_v1.md`
3. `docs/strategy_newcomer_guide.md`
4. historical DWH foundation SQL из `git history`
5. `scripts/strategy-load.mjs`
6. `src/lib/server/datasets/definitions/strategyMart.ts`
7. `src/lib/server/providers/postgresProvider.ts`
8. `src/routes/dashboard/strategy-drive/+page.svelte`

## 6. Что уже загружено по факту

На текущем этапе в `Strategy DWH v1` уже загружены:

- curated BSC weights;
- KPI decomposition;
- planning cascade seed;
- source coverage map;
- auto-extracted facts demo.

Это означает:

- `LT`, `MT`, `ST` уже имеют отражение в DWH;
- `OT` сейчас фиксируется как отдельный gap;
- весь массив проектных PDF/PPTX/DOCX пока не загружен в полном объеме.

То есть `mart` уже пригоден для пилотной BI-страницы, но не означает, что “все документы проекта уже заведены”.

## 7. Что считать текущими ограничениями

- document codes пока смешанные:
  - часть строк использует workbook ids вроде `1`, `5`, `7`;
  - часть строк использует source-style ids вроде `LTF25`, `MTF_2026_2028`, `STDS_2025_06_11`;
- `OT` пока не имеет полноценного operational source;
- auto extraction подключен не на весь архив, а только на demo-набор;
- часть стратегической модели еще остается curated/manual, а не полностью автоматической.

## 8. Как думать про `strategy-drive`

Текущий маршрут не просто “табличка из mart”, а обзорный cockpit для стратегии.

Его задача:

- показать общий статус стратегии;
- быстро подсветить разрывы каскада;
- показать numeric gaps;
- дать быстрый вход в доказательную базу через extracted evidence;
- отобразить покрытие источников и отсутствие OT как отдельный сигнал.

Поэтому если вы меняете страницу, полезно держать инвариант:

- сначала executive signal;
- потом проблемные зоны;
- потом evidence/data quality;
- и только потом сырые таблицы.

## 9. Как безопасно расширять slice

### Если нужно добавить новые данные

Лучший путь в `v1`:

1. расширить curated CSV или добавить новый контролируемый входной файл;
2. загрузить его в `staging`;
3. расширить `mart`-view;
4. при необходимости добавить поле в dataset mapping;
5. только потом использовать поле в UI.

### Если нужно добавить новый визуал

Лучший путь:

1. сначала проверить, есть ли поле в `mart`;
2. если нет, доработать SQL/view, а не вычислять это только на клиенте;
3. затем подключить новый датасет-срез на существующей странице или новой route.

### Чего лучше не делать

- не обходить dataset layer прямым bespoke endpoint без необходимости;
- не переносить сложную BI-агрегацию в Svelte-страницу;
- не делать `OT` фиктивно “зелёным”, если реального источника пока нет;
- не утверждать, что весь архив документов уже покрыт DWH, пока этого нет.

## 10. Полезные команды

Поднять dev runtime:

```bash
pnpm db:up
pnpm strategy:load
pnpm dev
```

Проверить типизацию:

```bash
pnpm check
```

Если нужно все поднять с нуля:

```bash
pnpm db:init
pnpm strategy:load
```

## 11. Чеклист для первого получаса

Если вы новый человек в этом slice, оптимальный старт такой:

1. прочитать [Strategy Session Bootstrap](./strategy_session_bootstrap.md);
2. открыть [Strategy DWH v1](./strategy_dwh_v1.md);
3. при необходимости посмотреть historical foundation SQL в `git history`;
4. открыть `scripts/strategy-load.mjs`;
5. открыть `src/lib/server/datasets/definitions/strategyMart.ts`;
6. открыть `src/routes/dashboard/strategy-drive/+page.svelte`;
7. локально выполнить:
   - `pnpm db:reset`
   - `pnpm strategy:load`
   - `pnpm dev`
8. открыть `/dashboard/strategy-drive` и проверить:
   - BSC block;
   - planning cascade;
   - numeric gaps;
   - source coverage;
   - extracted evidence.

## 12. Что логично делать дальше

Самые естественные следующие шаги для развития slice:

1. догружать больше проектных документов в текущую `staging + mart` модель;
2. расширять auto extraction за пределы demo-набора;
3. подключать реальный `OT` operational layer;
4. добавлять drill-down и более глубокие BI-экраны поверх уже существующих dataset ids.

## 13. Документы, которые стоит держать рядом

- [Strategy Session Bootstrap](./strategy_session_bootstrap.md)
- [Strategy DWH v1](./strategy_dwh_v1.md)
- [README](../README.md)
