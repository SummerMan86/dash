# Docs Navigation

Этот файл - единственный полный каталог документации в репозитории.
Canonical repo-wide foundation: [architecture.md](./architecture.md).
BI vertical: [architecture_dashboard_bi.md](./architecture_dashboard_bi.md).
EMIS vertical: [architecture_emis.md](./architecture_emis.md).
Historical BI archive: [archive/bi/architecture_dashboard_bi.md](./archive/bi/architecture_dashboard_bi.md).
Модульная навигация и contour entry points: корневой [AGENTS.md](../AGENTS.md).
`README.md` отвечает только за quick start и описание приложения.

## 1. Что здесь каталогизируется

- platform / dashboard-builder docs (section 2)
- EMIS docs (section 3)
- agent workflow docs (section 3a)
- strategy docs (section 2)
- historical archives (archive subsections)

### Классификация документов

| Метка         | Значение                                                                        |
| ------------- | ------------------------------------------------------------------------------- |
| **canonical** | Source of truth для active work. Читать первым.                                 |
| **active**    | Supporting doc, полезен при работе по теме, но не source of truth.              |
| **reference** | External pointer, не хранится/не поддерживается в этом репозитории.             |
| **archive**   | Historical only. Не source of truth. Читать только для исторического контекста. |

## 2. Dashboard-builder / Strategy документация

Актуальный verification-runbook по `strategy_entity_* + mart.bsc_*` больше не хранится в этом репозитории отдельно и читается из `agent_pack`.

### Canonical

| Документ                                                                           | Владеет                                      | Source of truth для                                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| `architecture.md`                                                                  | canonical repo-wide foundation               | topology, package map, import rules, deployment, shared infrastructure            |
| `architecture_dashboard_bi.md`                                                     | BI vertical architecture                     | dataset runtime, filter contract, BI-adjacent ops paths, DWH integrations, extension points |
| `architecture_emis.md`                                                             | EMIS vertical architecture                   | operational paths, contracts, ingestion, PostGIS, auth                             |
| `../apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md` | Wildberries DWH contract                     | полный контракт с DWH: витрины, колонки, фильтры, алерты, требования к качеству |
| `strategy/bi_strategy.md`                                                          | local dashboard-builder BI strategy contract | как переложить Power BI strategy/BSC постановку в MVE-архитектуру               |
| `../apps/web/src/routes/dashboard/strategy/AGENTS.md`                              | strategy route development contract          | current pages, grain rules, filter contract и rollout path                      |
| `../apps/web/src/lib/server/datasets/AGENTS.md`                                    | dataset layer routing contract               | как `strategy.*` datasets подключаются в app runtime                            |
| `../packages/platform-datasets/AGENTS.md`                                          | dataset runtime package contract             | registry-driven pipeline, Postgres + Oracle providers, shared LRU cache, definitions |
| `../apps/web/src/lib/server/providers/AGENTS.md`                                   | provider mapping contract                    | как `strategy.*` datasets маппятся на `mart_strategy.slobi_*`                   |
| `../db/schema_catalog.md`                                                          | active app DB catalog                        | какие app-схемы и SQL-объекты считаются рабочими                                |
| `../db/current_schema.sql`                                                         | active app DB snapshot                       | текущая структура схем `emis`, `stg_emis`, `mart_emis`, `mart`                  |
| `../db/applied_changes.md`                                                         | active app DB structural log                 | журнал DDL-изменений после snapshot baseline                                    |
| `ops/beget_deployment_plan.md`                                                     | deployment runbook                           | production deployment plan для `labinsight.ru`                                  |

### Reference (external)

| Документ                                                                                                                                   | Владеет                             | Source of truth для                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------- |
| `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/imported/dashboard-builder/4. strategy_entity_bsc_mart_pilot_verification_2026_03_21.md` | strategy pilot verification runbook | refresh и smoke-checks для `strategy_entity_*` + `mart.bsc_*` |

### Archive

| Документ                                            | Владеет                          | Source of truth для                                                                                                         |
| --------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `archive/platform/current-project-analysis.md`      | historical platform analysis     | мартовский анализ проекта до package-era; полезен для исторического контекста, но не source of truth по текущей архитектуре |
| `archive/bi/architecture_dashboard_bi.md`           | pre-refactor BI architecture     | retired BI runtime shape before Wave 1 registry/filter/IR cleanup                                                      |
| `archive/bi/bi_refactor_rollout.md`                 | completed BI rollout plan        | historical BR-1..BR-10 sequencing, defaults and acceptance criteria                                                   |
| `archive/strategy-v1/strategy_session_bootstrap.md` | historical strategy bootstrap    | старый entry point по `strategy-drive` / `Strategy DWH v1`                                                                  |
| `archive/strategy-v1/strategy_dwh_v1.md`            | historical strategy architecture | старые `strategy.*` data contracts, marts и dataset ids                                                                     |
| `archive/strategy-v1/strategy_newcomer_guide.md`    | historical strategy onboarding   | старый newcomer context по strategy-срезу                                                                                   |
| `archive/strategy-v1/*`                             | historical strategy pack         | старые audits, handoffs и parallel-intake notes                                                                             |

## 3. EMIS документация

### Canonical

| Документ                                                    | Владеет                                    | Source of truth для                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `architecture.md`                                           | canonical repo-wide foundation             | topology, package map, import rules, deployment, shared infrastructure |
| `architecture_emis.md`                                      | EMIS vertical architecture                 | operational paths, contracts, ingestion, PostGIS, auth |
| `emis_session_bootstrap.md`                                 | текущее состояние и start-here entry point | где EMIS находится сейчас, что в фокусе и что читать дальше по типу задачи                                    |
| `emis_working_contract.md`                                  | short EMIS working rules                   | decision path, non-negotiables, review triggers, DoD                                                          |
| `emis_access_model.md`                                      | EMIS access model                          | viewer/editor/admin, write guardrails и где enforce                                                           |
| `emis_observability_contract.md`                            | EMIS observability contract                | readiness/health endpoints, error logging, request correlation                                                |
| `emis_read_models_contract.md`                              | EMIS BI/read-side contract                 | published read-models (views/marts), datasets и BI routes coupling                                            |
| `emis_mve_product_contract.md`                              | MVE product contract                       | product scope, invariants и acceptance                                                                        |
| `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | runtime/API conventions                    | API design conventions, error shape, list meta, audit contract, query limits/sorts                            |
| `../packages/emis-contracts/AGENTS.md`                      | EMIS contracts package navigation          | где лежат canonical entity contracts, DTO и Zod schemas                                                       |
| `../packages/emis-server/AGENTS.md`                         | EMIS server package navigation             | где лежат canonical infra helpers и backend modules                                                           |
| `../packages/emis-ui/AGENTS.md`                             | EMIS UI package navigation                 | где лежат canonical map/status UI exports                                                                     |
| `../apps/web/src/routes/emis/AGENTS.md`                     | EMIS workspace route contract              | что остается в `/emis` route layer и что выносится из workspace                                               |
| `../apps/web/src/routes/dashboard/emis/AGENTS.md`           | EMIS BI routes contract                    | границы BI route layer, dataset path и extraction rules                                                       |

### Active

| Документ                         | Владеет                          | Source of truth для                                                                         |
| -------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| `emis_monorepo_target_layout.md` | target layout и migration policy | future package layout, import direction rules, alias policy; не current-state ownership map |
| `emis_freeze_note.md`            | frozen decisions и conventions   | что не нужно переоткрывать без причины; не current ownership map                            |
| `emis_review_gate.md`            | EMIS review gate                 | lifecycle review, mandatory approve cases, approve checklist                                |
| `emis_offline_maps_ops.md`       | offline maps ops-runbook         | эксплуатация MapTiler/PMTiles и production caveats                                          |
| `emis_next_tasks_2026_03_22.md`  | backlog                          | remaining tasks и polish stack                                                              |

### Archive

| Документ                                                     | Владеет                           | Source of truth для                                                                |
| ------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------- |
| `archive/emis/emis_external_object_ingestion.md`             | completed ingestion design        | historical wave-1 design for external object ingestion after rollout completion    |
| `archive/emis/emis_external_object_ingestion_lead_tactical_handoff.md` | completed ingestion handoff | historical tactical handoff for wave-1 ingestion                                   |
| `archive/emis/emis_implementation_reference_v1.md`           | archived implementation rationale | retained implementation decisions, API/data assumptions и historical rollout order |
| `archive/emis/emis_vessel_current_positions_handoff_plan.md` | completed task handoff            | completed slice `layer=vessels` / current positions в `/emis`                      |
| `archive/emis/emis_todo_vessel_markers.md`                   | completed task notes              | historical vessel marker TODO notes                                                |
| `archive/emis/emis_handoff_2026_03_17.md`                    | archived EMIS snapshot            | историческое состояние репозитория на 17 марта 2026                                |
| `archive/emis/emis_pmtiles_validation_wave.md`               | archived validation note          | historical context по PMTiles spike/validation wave                                |

## 3a. Agent Workflow документация

### Canonical

| Документ                                      | Владеет                                      | Source of truth для                                                      |
| --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| `agents/definition-of-done.md`                | composable DoD checklists                    | Slice/Wave/Feature DoD, responsibility matrix, docs severity escalation   |
| `agents/workflow.md`                          | core agent lifecycle                         | процесс GPT-5.4 → Claude, plan ownership, execution loop, escalation     |
| `agents/review-gate.md`                       | review и governance model                    | slice/integration review, strategic acceptance/reframe pass, architecture/baseline pass  |
| `agents/recovery.md`                          | failure-path protocol                        | recovery rules для rejected slices, branch divergence и tooling outage   |
| `agents/invariants.md`                        | generic project invariants                   | repo-wide architecture/data/schema/complexity guardrails                 |
| `agents/autonomous-protocol.md`               | autonomous execution protocol                | autonomous mode lifecycle, decision framework, guardrails, recovery      |
| `agents/git-protocol.md`                      | branch и worktree protocol                   | ветки, worktrees, merge choreography, checkpoints                        |
| `agents/memory-protocol.md`                   | memory ownership                             | кто и когда пишет `memory.md`, auto-compact recovery                     |
| `agents/usage-telemetry.md`                   | agent usage telemetry                        | durable usage history, usefulness rubric, file-first telemetry contract  |
| `agents/roles.md`                             | agent role map                               | все роли, dispatch names, кто что делает                                 |
| `agents/templates.md`                         | agent communication templates                | план, задача, handoff, report, review request/result                     |
| `agents/lead-strategic/instructions.md`       | GPT-5.4 lead instructions                    | как планировать, декомпозировать, принимать результаты                   |
| `agents/architecture-steward/instructions.md` | `lead-strategic` architecture-pass checklist | как делать architecture governance pass: placement decisions и waivers   |
| `agents/baseline-governor/instructions.md`    | `lead-strategic` baseline-pass checklist     | как делать baseline pass: baseline status, known exceptions, verdict     |
| `agents/strategic-reviewer/instructions.md`   | strategic-reviewer instructions              | как делать bounded strategic acceptance/reframe pass и cheap cross-model second look |
| `agents/orchestrator/instructions.md`         | Claude Opus orchestration-only instructions  | как управлять workers, review gate, report и bounded direct-fix exception |
| `agents/lead-tactical/instructions.md`        | compatibility alias → orchestrator           | legacy entry point для старых prompt/script flows                        |
| `agents/worker/guide.md`                      | worker bootstrap and guardrails guide        | bootstrap, guardrails, review triggers, evidence rules, DoD checklist    |
| `agents/worker/instructions.md`               | worker bootstrap compatibility shim          | pointer на canonical worker guide и isolated-subagent bootstrap          |
| `agents/*-reviewer/instructions.md`           | reviewer role instructions                   | checks, output format, scope для каждого ревьюера                        |
| `agents/skills/debugging.md`                  | debugging playbook                           | reproduce, compare, hypothesize, fix, escalation triggers                |
| `agents/skills/testing-strategy.md`           | three-mode testing strategy                  | test-first, prototype-pin-refactor, verification-first, per-slice fields |
| `agents/user-guide.md`                        | user-facing agent workflow runbook           | как ставить задачи команде агентов, integrated orchestration path        |

#### Domain invariant overlays

| Документ                                      | Владеет                                      | Source of truth для                                                      |
| --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| `agents/invariants-emis.md`                   | EMIS domain invariants                       | EMIS boundaries, data invariants, tech notes (overlay to invariants.md)  |

### Active

| Документ                                          | Владеет                       | Source of truth для                                                                  |
| ------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `plans/agent_workflow_superpowers_adaptation.md`  | agent workflow rollout plan   | hybrid adoption waves, testing strategy, execution split for Superpowers adaptation  |

### Archive

| Документ           | Владеет                              | Source of truth для                                                                               |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `archive/agents/*` | historical agent model and templates | старые agent operating model, playbook, roles и handoff templates до перехода на текущий workflow |

## 4. Reading Order

### Для platform / dashboard-builder

1. `README.md`
2. `architecture.md` (canonical repo-wide foundation)
3. `architecture_dashboard_bi.md` (BI vertical)
4. `../db/schema_catalog.md`
5. если задача про Wildberries DWH - `../apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md`
6. если задача про strategy dashboards - `strategy/bi_strategy.md`
7. если задача про strategy dashboards - `../apps/web/src/routes/dashboard/strategy/AGENTS.md`
8. если задача про strategy datasets/runtime - `../apps/web/src/lib/server/datasets/AGENTS.md`
9. если нужен historical context до package-era - `archive/platform/current-project-analysis.md`
10. при необходимости - `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/imported/dashboard-builder/4. strategy_entity_bsc_mart_pilot_verification_2026_03_21.md`
11. при необходимости - `archive/bi/architecture_dashboard_bi.md`
12. при необходимости - `archive/bi/bi_refactor_rollout.md`
13. при необходимости - `archive/strategy-v1/strategy_session_bootstrap.md`

### Для ops / deploy

1. `ops/beget_deployment_plan.md`

### Для EMIS

1. `architecture.md` (canonical repo-wide foundation)
2. `architecture_emis.md` (EMIS vertical)
3. `emis_session_bootstrap.md`
4. `emis_working_contract.md`
5. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
6. `emis_mve_product_contract.md` — если нужен product scope

Опционально по задаче:

- `emis_access_model.md` - если задача затрагивает writes, роли, guardrails
- `emis_observability_contract.md` - если задача про health/readiness/error logging
- `emis_read_models_contract.md` - если задача про BI/read-models/datasets/contracts
- `emis_monorepo_target_layout.md` - если задача про structural migration, import rules или alias policy
- `emis_freeze_note.md` - если нужно понять, какие решения не нужно переоткрывать
- `emis_review_gate.md` - если нужен approve checklist или review verdict
- `emis_offline_maps_ops.md` - если работа про offline maps или PMTiles
- `emis_next_tasks_2026_03_22.md` - если нужен backlog
- `archive/emis/emis_external_object_ingestion.md` - если нужен historical design context по completed ingestion wave
- `archive/emis/emis_external_object_ingestion_lead_tactical_handoff.md` - если нужен historical tactical handoff по completed ingestion wave
- `archive/emis/emis_implementation_reference_v1.md` - если нужен historical rollout context или retained implementation rationale
- `agents/workflow.md` - если нужен core agent lifecycle
- `agents/review-gate.md` - если нужен Review Gate, strategic acceptance/reframe pass или governance pass
- `agents/recovery.md` - если выполнение ушло с happy path
- `agents/autonomous-protocol.md` - если задача в autonomous mode
- `agents/invariants.md` - если нужны generic project invariants и guardrails
- `agents/invariants-emis.md` - если нужны EMIS-specific domain invariants
- `agents/git-protocol.md` - если нужны branches, worktrees и merge choreography
- `agents/memory-protocol.md` - если нужно понять ownership `memory.md`
- `agents/usage-telemetry.md` - если нужен durable usage log, usefulness rubric или telemetry storage contract
- `agents/roles.md` - если нужны роли агентов
- `agents/templates.md` - если нужны шаблоны коммуникации между агентами
- `agents/worker/guide.md` - если нужен self-contained worker execution guide без чтения всего generic governance stack
- `../packages/emis-contracts/AGENTS.md` - если change касается contracts, DTO, Zod schemas
- `../packages/emis-server/AGENTS.md` - если change касается backend modules или infra helpers
- `../packages/emis-ui/AGENTS.md` - если change касается map/status UI package
- `../apps/web/src/routes/emis/AGENTS.md` - если работа про `/emis` workspace layer
- `../apps/web/src/routes/dashboard/emis/AGENTS.md` - если работа про BI/dashboard routes
- `archive/emis/emis_vessel_current_positions_handoff_plan.md` - если нужен historical handoff по vessel current positions slice
- `archive/emis/*`, `archive/agents/*` и `archive/strategy-v1/*` - только если нужен historical context

## 5. Правило ownership

- Этот файл владеет полным каталогом документации.
- `architecture.md` владеет canonical repo-wide foundation architecture.
- `architecture_dashboard_bi.md` владеет BI vertical architecture.
- `architecture_emis.md` владеет EMIS vertical architecture.
- Корневой `AGENTS.md` владеет развилкой по контурам и navigation entry points.
- `README.md` не должен дублировать doc map; он только отправляет сюда.
