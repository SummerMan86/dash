# Docs Navigation

Этот файл - единственный полный каталог документации в репозитории.
Архитектурные правила и модульная навигация живут в корневом [AGENTS.md](../AGENTS.md), а `README.md` отвечает только за quick start и описание приложения.

## 1. Что здесь каталогизируется

- platform / dashboard-builder docs
- EMIS docs
- strategy docs
- historical archives

## 2. Dashboard-builder / Strategy документация

Актуальный verification-runbook по `strategy_entity_* + mart.bsc_*` больше не хранится в этом репозитории отдельно и читается из `agent_pack`.

| Документ                                                                                                                                   | Владеет                                      | Source of truth для                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md`                                                                  | Wildberries DWH contract                     | полный контракт с DWH: витрины `mart.fact_product_office_day` / `mart.fact_product_day`, обязательные колонки, фильтры, conf-таблицы, алерты, рекомендации и требования к качеству данных |
| `current-project-analysis.md`                                                                                                              | platform analysis и reusable foundation      | текущее состояние платформы, риски и сильные стороны                                                                                                                                      |
| `strategy/bi_strategy.md`                                                                                                                  | local dashboard-builder BI strategy contract | как переложить Power BI strategy/BSC постановку в MVE-архитектуру `dashboard-builder`: витрины, filters, routes и rollout order                                                           |
| `../apps/web/src/routes/dashboard/strategy/AGENTS.md`                                                                                               | strategy route development contract          | как развивать serious strategy dashboards: current pages, grain rules, filter contract и rollout path                                                                                     |
| `../apps/web/src/lib/server/datasets/AGENTS.md`                                                                                                     | dataset layer routing contract               | как `strategy.*` datasets подключаются в app runtime и когда нужен новый published view                                                                                                   |
| `../apps/web/src/lib/server/providers/AGENTS.md`                                                                                                    | provider mapping contract                    | как `strategy.*` datasets маппятся на `mart_strategy.slobi_*` и что обновлять при смене SQL contract                                                                                      |
| `../db/schema_catalog.md`                                                                                                                  | active app DB catalog                        | какие app-схемы и опубликованные SQL-объекты считаются рабочими в этом репозитории                                                                                                        |
| `../db/current_schema.sql`                                                                                                                 | active app DB snapshot                       | точная текущая структура схем `emis`, `stg_emis`, `mart_emis`, `mart`                                                                                                                     |
| `../db/applied_changes.md`                                                                                                                 | active app DB structural log                 | короткий журнал DDL-изменений после snapshot baseline                                                                                                                                     |
| `ops/beget_deployment_plan.md`                                                                                                             | deployment runbook                           | текущий production deployment plan и infrastructure notes for `labinsight.ru`                                                                                                             |
| `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/imported/dashboard-builder/4. strategy_entity_bsc_mart_pilot_verification_2026_03_21.md` | strategy pilot verification runbook          | refresh и smoke-checks для `strategy_entity_*` + `mart.bsc_*`                                                                                                                             |
| `archive/strategy-v1/strategy_session_bootstrap.md`                                                                                        | historical strategy bootstrap                | старый entry point по `strategy-drive` / `Strategy DWH v1`                                                                                                                                |
| `archive/strategy-v1/strategy_dwh_v1.md`                                                                                                   | historical strategy architecture             | старые `strategy.*` data contracts, marts и dataset ids                                                                                                                                   |
| `archive/strategy-v1/strategy_newcomer_guide.md`                                                                                           | historical strategy onboarding               | старый newcomer context по strategy-срезу                                                                                                                                                 |
| `archive/strategy-v1/*`                                                                                                                    | historical strategy pack                     | старые audits, handoffs и parallel-intake notes                                                                                                                                           |

## 3. EMIS документация

| Документ                                           | Владеет                                       | Source of truth для                                                   |
| -------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `emis_session_bootstrap.md`                        | текущее состояние, entry point, short doc map | что уже сделано, что сейчас в фокусе, с чего начинать новую сессию    |
| `emis_architecture_baseline.md`                    | canonical EMIS boundary map                   | platform vs EMIS operational vs EMIS BI, placement rules              |
| `emis_working_contract.md`                         | short EMIS working rules                      | decision path, non-negotiables, review triggers, DoD                  |
| `emis_mve_tz_v_2.md`                               | scope, invariants, acceptance                 | продуктовые рамки и ограничения                                       |
| `emis_implementation_spec_v1.md`                   | implementation decisions и rollout order      | структура реализации, API, snapshot-first DB contract и порядок работ |
| `emis_freeze_note.md`                              | frozen decisions и conventions                | что не нужно переоткрывать без причины                                |
| `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | runtime/API conventions                       | error shape, list meta, audit contract, query limits/sorts            |
| `emis_monorepo_target_layout.md`                   | canonical monorepo target layout              | target directory structure, zone mapping, import rules, alias policy, migration policy |
| `emis_architecture_review.md`                      | EMIS architecture approve checklist           | lifecycle review, mandatory approve cases, approve checklist          |
| `emis_offline_maps_ops.md`                         | offline maps ops-runbook                      | эксплуатация MapTiler/PMTiles и production caveats                    |
| `emis_next_tasks_2026_03_22.md`                    | backlog                                       | remaining tasks и polish stack                                        |
| `agents/workflow.md`                               | agent workflow и инварианты                   | процесс GPT-5.4 → Claude → review, правила, коммуникация             |
| `agents/roles.md`                                  | agent role map                                | все роли, dispatch names, кто что делает                              |
| `agents/templates.md`                              | agent communication templates                 | план, задача, handoff, report, review request/result                  |
| `agents/lead-strategic/instructions.md`            | GPT-5.4 lead instructions                     | как планировать, декомпозировать, принимать результаты                 |
| `agents/lead-tactical/instructions.md`             | Claude Opus tactical lead instructions        | как управлять workers, review gate, report                            |
| `agents/worker/instructions.md`                    | Claude worker instructions                    | как выполнять задачи, self-check, handoff                             |
| `agents/reviewer-*/instructions.md`                | reviewer role instructions                    | checks, output format, scope для каждого ревьюера                     |
| `../apps/web/src/routes/emis/AGENTS.md`                     | EMIS workspace route contract                 | что остается в `/emis` route layer и что выносится из workspace       |
| *(extracted to `packages/emis-ui/`)*                        | EMIS map runtime (was AGENTS.md)              | map widgets now live in `packages/emis-ui/src/emis-map/`              |
| `../apps/web/src/routes/dashboard/emis/AGENTS.md`           | EMIS BI routes contract                       | границы BI route layer, dataset path и extraction rules               |
| `archive/emis/emis_vessel_current_positions_handoff_plan.md` | archived task handoff              | completed slice `layer=vessels` / current positions in `/emis`        |
| `archive/emis/emis_handoff_2026_03_17.md`          | archived EMIS snapshot                        | историческое состояние репозитория на 17 марта 2026                   |
| `archive/emis/emis_pmtiles_validation_wave.md`     | archived validation note                      | historical context по PMTiles spike/validation wave                   |

## 4. Reading Order

### Для platform / dashboard-builder

1. `README.md`
2. `current-project-analysis.md`
3. `../db/schema_catalog.md`
4. если задача про Wildberries DWH - `../apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md`
5. если задача про strategy dashboards - `strategy/bi_strategy.md`
6. если задача про strategy dashboards - `../apps/web/src/routes/dashboard/strategy/AGENTS.md`
7. если задача про strategy datasets/runtime - `../apps/web/src/lib/server/datasets/AGENTS.md`
8. при необходимости - `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/imported/dashboard-builder/4. strategy_entity_bsc_mart_pilot_verification_2026_03_21.md`
9. при необходимости - `archive/strategy-v1/strategy_session_bootstrap.md`

### Для ops / deploy

1. `ops/beget_deployment_plan.md`

### Для EMIS

1. `emis_session_bootstrap.md`
2. `emis_architecture_baseline.md`
3. `emis_monorepo_target_layout.md`
4. `emis_working_contract.md`
5. `emis_mve_tz_v_2.md`
6. `emis_implementation_spec_v1.md`
7. `emis_freeze_note.md`
8. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`

Опционально по задаче:

- `emis_architecture_review.md` - если нужен approve checklist или review verdict
- `emis_offline_maps_ops.md` - если работа про offline maps или PMTiles
- `emis_next_tasks_2026_03_22.md` - если нужен backlog
- `agents/workflow.md` - если нужен agent workflow, процесс, инварианты
- `agents/roles.md` - если нужны роли агентов
- `agents/templates.md` - если нужны шаблоны коммуникации между агентами
- `../apps/web/src/routes/emis/AGENTS.md` - если работа про `/emis` workspace layer
- `packages/emis-ui/` - если работа про map runtime (extracted from widgets/emis-map)
- `../apps/web/src/routes/dashboard/emis/AGENTS.md` - если работа про BI/dashboard routes
- `archive/emis/emis_vessel_current_positions_handoff_plan.md` - если нужен historical handoff по vessel current positions slice
- `archive/emis/*`, `archive/agents/*` и `archive/strategy-v1/*` - только если нужен historical context

## 5. Правило ownership

- Этот файл владеет полным каталогом документации.
- Корневой `AGENTS.md` владеет архитектурными правилами и развилкой по контурам.
- `README.md` не должен дублировать doc map; он только отправляет сюда.
