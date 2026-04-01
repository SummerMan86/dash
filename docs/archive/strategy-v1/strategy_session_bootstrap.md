# Strategy Session Bootstrap

Использовать как быстрый старт для новой сессии по `Strategy DWH` и `strategy-drive`.

1. Главный документ по текущему `strategy`-срезу: [Strategy DWH v1](./strategy_dwh_v1.md).
2. Полная вводная для нового разработчика: [Strategy Newcomer Guide](./strategy_newcomer_guide.md).
3. Если сессия про канонизацию intake, сначала открыть [Strategy Intake Canon Handoff 2026-03-19](/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/strategy_intake_canon_handoff_2026_03_19.md).
4. Подробный журнал curator-pass по intake: [Strategy Intake Canon Audit 2026-03-19](/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/strategy_intake_canon_audit_2026_03_19.md).
5. Текущий UI-маршрут: `/dashboard/strategy-drive`.
6. Canonical read-path для этого среза такой:
   - curated CSV / extracted facts
   - `staging.strategy_*`
   - `mart.strategy_*`
   - `strategy.*` dataset ids
   - `POST /api/datasets/:id`
   - `src/routes/dashboard/strategy-drive/+page.svelte`
7. В `v1` есть два физических слоя:
   - `staging` для сырого / полуобработанного входа;
   - `mart` для flat/filterable витрин под BI и UI.
8. Текущий загрузчик данных:
   - `pnpm strategy:load`
   - источник по умолчанию: `/home/orl/Shl/КА/MS BI/bsc_model`
9. Историческая SQL foundation для `strategy` теперь читается только через `git history`:

- `012_strategy_dwh_v1.sql`
- `013_strategy_auto_extracted_support.sql`
- `021_strategy_intake_canonical_backfill_safe_pass.sql`
- `022_strategy_document_transition_curation.sql`
- `023_strategy_fact_source_and_extraction_curation.sql`
- `024_strategy_fact_source_type_placeholder_followup.sql`

10. Что реально загружено сейчас:

- curated KPI decomposition;
- planning cascade seed;
- source coverage map;
- `auto_extracted_facts_demo.csv`.

11. Что считать текущим фактом по покрытию данных:

- `LT`, `MT`, `ST` уже отражены;
- `OT` пока остается явным domain gap;
- весь архив проектных файлов еще не загружен в DWH полностью.

12. Текущий UI уже показывает:
    - BSC score;
    - planning cascade;
    - numeric gaps;
    - source coverage;
    - extracted evidence cards.
13. Ключевые файлы для чтения в коде:
    - historical DWH foundation SQL из `git history`
    - `scripts/strategy-load.mjs`
    - `src/lib/server/datasets/definitions/strategyMart.ts`
    - `src/lib/server/providers/postgresProvider.ts`
    - `src/routes/dashboard/strategy-drive/+page.svelte`
14. Важные ограничения `v1`:
    - document codes пока гетерогенны: есть workbook-style и source-style коды;
    - OT не загружен как полноценный operational fact layer;
    - `mart` готов для пилотной аналитики, но не для claim “все документы проекта уже отражены”.
15. Если нужно продолжать работу, разумный порядок такой:

- сначала сверить [Strategy DWH v1](./strategy_dwh_v1.md);
- затем открыть [Strategy Newcomer Guide](./strategy_newcomer_guide.md);
- если работа идёт по `strategy_*_intake`, до кода обязательно открыть [Strategy Intake Canon Handoff 2026-03-19](/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/strategy_intake_canon_handoff_2026_03_19.md) и [Strategy Intake Canon Audit 2026-03-19](/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/strategy_intake_canon_audit_2026_03_19.md);
- потом переходить в код и historical SQL из `git history`, если он вообще нужен.
