# Strategy Audit 2026-03-18

Короткий аудит `Strategy DWH` после массовой загрузки полного архива проектных документов.

## Что было проверено

- historical foundation SQL `012-014` из `git history`
- `scripts/strategy-bulk-build.py`
- `scripts/strategy-load.mjs`
- `src/lib/server/datasets/definitions/strategyMart.ts`
- `src/lib/server/providers/postgresProvider.ts`
- `src/routes/dashboard/strategy-drive/+page.svelte`
- Postgres `staging` / `mart`
- HTTP read-path `/api/datasets/:id`

## Что нашли и исправили

### 1. Auto-extracted facts теряли каноническую привязку к документам

Проблема:

- `auto_extracted_facts_full.csv` не содержал `document_code`, `document_name`, `department_code`, `perspective_code`;
- loader был вынужден восстанавливать документ по basename;
- из-за этого появлялись дубликаты документов в `mart.strategy_documents_dim` и `NULL` в `department_code`.

Исправление:

- bulk builder теперь пишет канонические поля документа в `auto_extracted_facts_full.csv`;
- loader резолвит canonical document через `document_file / document_code / document_name`;
- auto/data-source факты теперь грузятся в DWH с корректным `department_code`.

Результат:

- `null_dept_auto = 0`
- `duplicate_files in mart.strategy_documents_dim = 0`

### 2. Source coverage не фильтровался по подразделению и перспективе

Проблема:

- `strategy.source_coverage` не отдавал `department_code` и `perspective_code`;
- фильтры UI были неполными и вводили в заблуждение.

Исправление:

- добавлена миграция `014_strategy_quality_fixes.sql`;
- `mart.strategy_source_coverage` теперь включает `department_code`, `perspective_code`;
- dataset definition и postgres mapping обновлены;
- фильтры `departmentCode / perspectiveCode` реально работают через `/api/datasets/:id`.

### 3. Strategy Drive показывал ложные нули до загрузки client-side данных

Проблема:

- страница SSR-рендерилась с `0 фактов`, пока `onMount` еще не успел сходить в API.

Исправление:

- начальное состояние страницы переведено в честный loading state;
- до первой загрузки показываются skeleton / loading badges;
- если `actual` еще не загружены, BSC не притворяется нулем и явно сообщает `Нет actuals`.

### 4. Extraction rules были слишком широкими и давали шум

Проблема:

- слишком общие keyword-эвристики (`то`, `проект`, `показател`, и т.д.);
- попадали оглавления, номера разделов, псевдо-метрики.

Исправление:

- ужесточены правила для `MAINTENANCE_COUNT`, `PROJECT_COUNT`, `LNG_OUTPUT`, `KPI_VALUE`, `WELL_COUNT`;
- добавлены проверки plausible `unit/range`;
- добавлены фильтры на строки, похожие на contents / section headings.

## Текущее состояние после аудита

Текущий batch:

- `strategy_full_project_20260318_audit`

Фактические объемы:

- `427` project files scanned
- `759` auto-extracted facts
- `154` KPI decomposition rows
- `51` cascade rows
- `428` rows in `staging.strategy_document_raw`
- `937` rows in `staging.strategy_metric_raw`
- `428` rows in `mart.strategy_documents_dim`
- `913` rows in `mart.strategy_metric_detail`
- `17` rows in `mart.strategy_cascade_coverage`
- `5` rows in `mart.strategy_gap_overview`
- `82` rows in `mart.strategy_bsc_overview`
- `40` rows in `mart.strategy_source_coverage`

## Что проверено end-to-end

- `pnpm check` проходит без ошибок и warning
- `/api/datasets/strategy.documents_dim` отвечает корректно
- `/api/datasets/strategy.metric_detail` возвращает канонический `department_code`
- `/api/datasets/strategy.source_coverage` фильтруется по `departmentCode`
- `/dashboard/strategy-drive` открывается и рендерит корректный loading state

## Остаточный риск

Самый важный остаточный риск не в коде, а в данных:

- полноценный `OT` / operational actual layer все еще не загружен;
- `mart.strategy_bsc_overview` структурно готов, но `actual_score` остается пустым, пока не подключен слой исполнения;
- часть extracted facts все еще heuristic и требует бизнес-курирования для production-grade KPI governance.

Итог:

- DWH / loader / read-model / UI сейчас приведены в согласованное и существенно более надежное состояние;
- production-grade интерпретация KPI все еще требует ручной верификации вместе с владельцами данных.
