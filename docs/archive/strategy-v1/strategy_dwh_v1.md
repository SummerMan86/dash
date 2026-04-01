# Strategy DWH v1

`strategy`-срез добавляет в `dashboard-builder` отдельный DWH-контур для стратегических документов, balanced scorecard и gap analysis.

Для быстрого входа в контекст:

- [Strategy Session Bootstrap](./strategy_session_bootstrap.md)
- [Strategy Newcomer Guide](./strategy_newcomer_guide.md)
- [Strategy Audit 2026-03-18](./strategy_audit_2026_03_18.md)
- [Strategy Business Audit 2026-03-18](./strategy_business_audit_2026_03_18.md)
- [Strategy Parallel Intake 2026-03-18](./strategy_parallel_intake_2026_03_18.md)
- [Strategy Intake DWH/BI Assessment 2026-03-18](./strategy_intake_dwh_bi_assessment_2026_03_18.md)

## Что создано

- `staging.strategy_load_batch`
- `staging.strategy_document_raw`
- `staging.strategy_metric_raw`
- `staging.strategy_cascade_raw`
- `mart.strategy_perspectives_dim`
- `mart.strategy_horizons_dim`
- `mart.strategy_metrics_dim`
- `mart.strategy_bsc_weights`
- `mart.strategy_documents_dim`
- `mart.strategy_metric_detail`
- `mart.strategy_cascade_coverage`
- `mart.strategy_gap_overview`
- `mart.strategy_bsc_overview`
- `mart.strategy_source_coverage`
- `mart.strategy_executive_kpi_registry`
- `mart.strategy_executive_kpi_v2`
- `mart.strategy_current_intake_run`
- `mart.strategy_intake_ready_documents`
- `mart.strategy_intake_ready_facts`
- `mart.strategy_intake_ready_links`
- `mart.strategy_intake_ready_gaps`
- `mart.strategy_intake_readiness_qa`

`postgresProvider` по-прежнему остается flat/filterable, поэтому все BI-агрегации считаются в `mart`-view, а не в runtime provider.

## Dataset IDs

- `strategy.documents_dim`
- `strategy.metric_detail`
- `strategy.kpi_provenance`
- `strategy.cascade_coverage`
- `strategy.gap_overview`
- `strategy.bsc_overview`
- `strategy.source_coverage`
- `strategy.executive_kpi_v2`
- `strategy.current_intake_run`
- `strategy.intake_ready_documents`
- `strategy.intake_ready_facts`
- `strategy.intake_ready_links`
- `strategy.intake_ready_gaps`
- `strategy.intake_readiness_qa`

Все они доступны через текущий API:

```bash
POST /api/datasets/:id
```

## Загрузка curated CSV / full batch

Источники берутся из пакета:

- `/home/orl/Shl/КА/MS BI/bsc_model`

Или из пути, переданного через `--source-root` / `STRATEGY_BSC_MODEL_ROOT`.

Базовая команда:

```bash
pnpm strategy:load
```

Пример с явным batch:

```bash
pnpm strategy:load -- \
  --batch-id strategy_curated_v1 \
  --source-root "/home/orl/Shl/КА/MS BI/bsc_model"
```

Для массовой сборки по всему архиву проекта:

```bash
pnpm strategy:build-full
pnpm strategy:load -- \
  --batch-id strategy_full_project_20260317 \
  --source-root "/home/orl/Shl/КА/MS BI/bsc_model"
```

## Что грузится

- `dim_bsc_perspectives.csv` -> `mart.strategy_perspectives_dim`
- `dim_horizons.csv` -> `mart.strategy_horizons_dim`
- `dim_metric_dictionary_template.csv` -> `mart.strategy_metrics_dim`
- `fact_bsc_weights.csv` -> `mart.strategy_bsc_weights`
- `fact_kpi_decomposition_template.csv` -> `staging.strategy_metric_raw`
- `fact_planning_cascade_seed.csv` -> `staging.strategy_cascade_raw`
- `data_source_map.csv` -> `staging.strategy_metric_raw`
- `auto_extracted_facts_demo.csv` -> `staging.strategy_metric_raw`
- `strategy_document_raw` собирается как производный документный слой из этих curated CSV

Если в `source-root` уже есть full-файлы, загрузчик автоматически предпочитает:

- `document_inventory_full.csv`
- `dim_metric_dictionary_full.csv`
- `fact_kpi_decomposition_full.csv`
- `fact_planning_cascade_full.csv`
- `auto_extracted_facts_full.csv`

## Текущий полный batch

По состоянию на `2026-03-18` актуальным считается batch `strategy_full_project_20260318_exec_v2`.

Фактическое наполнение:

- `427` файлов инвентаризировано в bulk-build (`pdf/pptx/docx`);
- `759` auto-extracted фактов собрано по всему архиву после quality-фильтрации;
- `154` KPI-узла сгенерировано для полной декомпозиции;
- `51` cascade links сгенерирован по директоратам;
- в `staging` загружено `428` документов, `937` metric rows и `51` cascade rows;
- в `mart` доступны `428` documents, `913` metric detail rows, `17` cascade coverage rows, `5` numeric gap rows, `82` BSC overview rows и `40` source coverage rows.

## Audit fixes applied

После повторного аудита были внесены важные корректировки:

- auto-extracted facts теперь сохраняют канонические `document_code / document_name / department_code / perspective_code`;
- loader резолвит документы по inventory и больше не плодит дубликаты по basename;
- `strategy.source_coverage` теперь поддерживает `departmentCode` и `perspectiveCode`;
- `strategy-drive` больше не показывает ложные нули до client-side загрузки;
- extraction rules ужесточены для самых шумных метрик и section/contents lines.
- executive curated layer теперь использует ручные display-overrides и умеет скрывать сомнительные numeric values за `reference_only`, чтобы management view не тянул шумный `latest` факт.

## Важные оговорки v1

- `strategy_documents_dim` пока агрегирует документы из нескольких curated источников, поэтому код документа может быть либо workbook-style (`1`, `5`, `7`), либо source-style (`LTF25`, `MTF_2026_2028`).
- `strategy_metric_detail` включает и KPI-декомпозицию, и auto-extracted факты из документов.
- downstream build поверх parallel intake может читать ready-only views `mart.strategy_intake_ready_documents`, `mart.strategy_intake_ready_facts`, `mart.strategy_intake_ready_links`, `mart.strategy_intake_ready_gaps` как convenience/current-run contract.
- начиная с `Strategy Entity Core + BSC Mart v1.1 fix`, `mart.refresh_bsc_model()` больше не использует эти views как execution path: refresh читает selected `run_id` напрямую из `staging.strategy_parse_run`, `staging.strategy_registry_overlay_raw`, `staging.strategy_registry_overlay_xwalk`, `staging.strategy_document_intake`, `staging.strategy_fact_intake`, `staging.strategy_link_intake`, `staging.strategy_gap_intake`.
- `strategy_intake_readiness_qa` фиксирует ready/hold counts, canonical smoke-checks и distinct JSON-срезы по текущему intake run для `documents/facts/links/gaps`, включая `fact/gap perspective`.
- `strategy_link_intake` и `strategy_gap_intake` теперь тоже прошли readiness-pass и доступны в ready-only контракте с zero-hold по текущему run.
- в `strategy_entity_*` и `mart.bsc_*` output `strategy_entity_id` теперь anchor-based (`SE_<md5>`), а legacy `SE_REG_*` / `SE_DOC_*` поддерживаются только как временный compatibility format в override targets.
- `strategy.kpi_provenance` строится поверх `strategy_metric_detail` и server-side достраивает `document_url` из `document_file` и `STRATEGY_DOCUMENT_BASE_URL`.
- `OT` пока отражается как доменный gap, а не как полноценный operational fact layer.
- `strategy_bsc_overview` считает score на leaf-KPI и отдает уже предрасчитанные weighted score columns для BI-страниц.

## Что уже видно в UI

Текущий маршрут:

- `/dashboard/strategy-drive`

На нем уже отображаются:

- обзорные KPI по стратегии;
- BSC score;
- planning cascade;
- numeric gaps;
- source coverage;
- KPI provenance entry + evidence panel с открытием source documents;
- executive curated KPI v2 с management-safe display semantics.
