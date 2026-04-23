# Docs Navigation

Этот файл - единственный полный каталог документации в репозитории.
Canonical repo-wide foundation: [architecture.md](./architecture.md).
BI vertical: [bi/architecture.md](./bi/architecture.md).
EMIS vertical: [emis/README.md](./emis/README.md) (doc set entry).
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

| Документ                                                                           | Владеет                                      | Source of truth для                                                                                           |
| ---------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `architecture.md`                                                                  | canonical repo-wide foundation               | system summary, foundation principles, topology, package map, import rules, deployment, shared infrastructure |
| `bi/architecture.md`                                                               | BI vertical architecture                     | dataset runtime, filter contract, BI-adjacent ops paths, DWH integrations, extension points                   |
| `emis/architecture.md`                                                             | EMIS vertical architecture                   | operational paths, contracts, ingestion, PostGIS, auth                                                        |
| `../apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md` | Wildberries DWH contract                     | полный контракт с DWH: витрины, колонки, фильтры, алерты, требования к качеству                               |
| `strategy/bi_strategy.md`                                                          | local dashboard-builder BI strategy contract | как переложить Power BI strategy/BSC постановку в MVE-архитектуру                                             |
| `../apps/web/src/routes/dashboard/strategy/AGENTS.md`                              | strategy route development contract          | current pages, grain rules, filter contract и rollout path                                                    |
| `../apps/web/src/lib/server/datasets/AGENTS.md`                                    | dataset layer routing contract               | как `strategy.*` datasets подключаются в app runtime                                                          |
| `../packages/platform-datasets/AGENTS.md`                                          | dataset runtime package contract             | registry-driven pipeline, Postgres + Oracle providers, shared LRU cache, definitions                          |
| `../apps/web/src/lib/server/providers/AGENTS.md`                                   | provider mapping contract                    | как `strategy.*` datasets маппятся на `mart_strategy.slobi_*`                                                 |
| `../db/schema_catalog.md`                                                          | active app DB catalog                        | какие app-схемы и SQL-объекты считаются рабочими                                                              |
| `../db/current_schema.sql`                                                         | active app DB snapshot                       | текущая структура схем `emis`, `stg_emis`, `mart_emis`, `mart`                                                |
| `../db/applied_changes.md`                                                         | active app DB structural log                 | журнал DDL-изменений после snapshot baseline                                                                  |
| `ops/beget_deployment_plan.md`                                                     | deployment runbook                           | production deployment plan для `labinsight.ru`                                                                |

### Reference (external)

| Документ                                                                                                                                   | Владеет                             | Source of truth для                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------- |
| `/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/docs/imported/dashboard-builder/4. strategy_entity_bsc_mart_pilot_verification_2026_03_21.md` | strategy pilot verification runbook | refresh и smoke-checks для `strategy_entity_*` + `mart.bsc_*` |

### Archive

| Документ                                            | Владеет                          | Source of truth для                                                                                                         |
| --------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `archive/platform/current-project-analysis.md`      | historical platform analysis     | мартовский анализ проекта до package-era; полезен для исторического контекста, но не source of truth по текущей архитектуре |
| `archive/bi/architecture_dashboard_bi.md`           | pre-refactor BI architecture     | retired BI runtime shape before Wave 1 registry/filter/IR cleanup                                                           |
| `archive/bi/bi_refactor_rollout.md`                 | completed BI rollout plan        | historical BR-1..BR-10 sequencing, defaults and acceptance criteria                                                         |
| `archive/strategy-v1/strategy_session_bootstrap.md` | historical strategy bootstrap    | старый entry point по `strategy-drive` / `Strategy DWH v1`                                                                  |
| `archive/strategy-v1/strategy_dwh_v1.md`            | historical strategy architecture | старые `strategy.*` data contracts, marts и dataset ids                                                                     |
| `archive/strategy-v1/strategy_newcomer_guide.md`    | historical strategy onboarding   | старый newcomer context по strategy-срезу                                                                                   |
| `archive/strategy-v1/*`                             | historical strategy pack         | старые audits, handoffs и parallel-intake notes                                                                             |

## 3. EMIS документация

Consolidated EMIS doc set lives in `docs/emis/`. Each file owns one axis; there is no overlap with repo-wide `architecture.md`.

### Canonical

| Документ                                                    | Владеет                           | Source of truth для                                                                                           |
| ----------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `architecture.md`                                           | canonical repo-wide foundation    | system summary, foundation principles, topology, package map, import rules, deployment, shared infrastructure |
| `emis/README.md`                                            | EMIS entry point + doc map        | current truth, module boundary, default EMIS reading path without BI prerequisites                            |
| `emis/architecture.md`                                      | EMIS vertical architecture        | EMIS domain boundary, operational path, storage ownership, contracts, optional BI bridge, fixed defaults      |
| `emis/product_scope.md`                                     | EMIS product scope                | in/out of scope, product invariants, UX expectations                                                          |
| `emis/access_model.md`                                      | EMIS access model                 | supported modes, roles, sessions, write-policy helper, env vars                                               |
| `emis/change_policy.md`                                     | EMIS governance                   | decision path, non-negotiables, review triggers, exception policy, DoD                                        |
| `emis/operations.md`                                        | EMIS ops runbook                  | readiness/health, error logging, offline maps, post-deploy verification                                       |
| `emis/structural_migration.md`                              | target layout и migration policy  | target package layout, import direction rules, alias policy                                                   |
| `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | runtime/API conventions           | API design conventions, error shape, list meta, audit contract, query limits/sorts                            |
| `../packages/emis-contracts/AGENTS.md`                      | EMIS contracts package navigation | где лежат canonical entity contracts, DTO и Zod schemas                                                       |
| `../packages/emis-server/AGENTS.md`                         | EMIS server package navigation    | где лежат canonical infra helpers и backend modules                                                           |
| `../packages/emis-ui/AGENTS.md`                             | EMIS UI package navigation        | где лежат canonical map/status UI exports                                                                     |
| `../apps/web/src/routes/emis/AGENTS.md`                     | EMIS workspace route contract     | что остается в `/emis` route layer и что выносится из workspace                                               |
| `../apps/web/src/routes/dashboard/emis/AGENTS.md`           | EMIS BI routes contract           | границы BI route layer, dataset path и extraction rules                                                       |

### Archive

| Документ                                                               | Владеет                           | Source of truth для                                                                |
| ---------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| `archive/emis/emis_session_bootstrap.md`                               | pre-consolidation bootstrap       | историческая start-here страница с журналом Phase 3/4/5 и ingestion Wave 1         |
| `archive/emis/emis_next_tasks_2026_03_22.md`                           | completed backlog                 | закрытый post-MVE backlog (MVE closeout, P1/P2, Phase 3/4/5)                       |
| `archive/emis/emis_vessel_track_contract.md`                           | frozen P1.1 feature contract      | historical behavior contract для vessel historical track integration               |
| `archive/emis/emis_external_object_ingestion.md`                       | completed ingestion design        | historical wave-1 design for external object ingestion after rollout completion    |
| `archive/emis/emis_external_object_ingestion_lead_tactical_handoff.md` | completed ingestion handoff       | historical tactical handoff for wave-1 ingestion                                   |
| `archive/emis/emis_implementation_reference_v1.md`                     | archived implementation rationale | retained implementation decisions, API/data assumptions и historical rollout order |
| `archive/emis/emis_vessel_current_positions_handoff_plan.md`           | completed task handoff            | completed slice `layer=vessels` / current positions в `/emis`                      |
| `archive/emis/emis_todo_vessel_markers.md`                             | completed task notes              | historical vessel marker TODO notes                                                |
| `archive/emis/emis_handoff_2026_03_17.md`                              | archived EMIS snapshot            | историческое состояние репозитория на 17 марта 2026                                |
| `archive/emis/emis_pmtiles_validation_wave.md`                         | archived validation note          | historical context по PMTiles spike/validation wave                                |

## 3a. Agent Workflow документация

### Canonical

| Документ                                | Владеет                                                              | Source of truth для                                                                          |
| --------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `agents/workflow.md`                    | core agent lifecycle, review model, governance, DoD, memory protocol | процесс, plan ownership, execution loop, review gate, governance passes, DoD, durable memory |
| `agents/execution-profiles.md`          | runtime/model binding per profile                                    | which runtime, model, effort, fallback per role per profile                                  |
| `.././docs/agents/codex-integration.md` | Codex CLI integration                                                | plugin commands, proof tuples, companion CLI, Codex prompting templates                      |
| `agents/autonomous-mode.md`             | autonomous execution delta                                           | autonomous mode lifecycle, decision framework, guardrails, recovery                          |
| `agents/templates.md`                   | all agent communication templates                                    | plan, task, handoff, report, governance, transparency templates                              |
| `agents/invariants.md`                  | generic project invariants                                           | repo-wide architecture/data/schema/complexity guardrails                                     |
| `agents/git-protocol.md`                | branch и worktree protocol                                           | ветки, worktrees, merge choreography, checkpoints                                            |
| `agents/recovery.md`                    | failure-path protocol                                                | recovery rules для rejected slices, branch divergence и tooling outage                       |
| `agents/lead-strategic/instructions.md` | GPT-5.4 lead + governance passes                                     | planning, acceptance, architecture/baseline/strategic review passes                          |
| `agents/orchestrator/instructions.md`   | Claude Opus orchestration instructions                               | worker dispatch, review gate, report, direct-fix exception                                   |
| `agents/worker/guide.md`                | worker bootstrap and guardrails                                      | bootstrap, guardrails, review triggers, evidence rules, DoD checklist                        |
| `agents/*-reviewer/instructions.md`     | reviewer role instructions                                           | checks, output format, scope for each reviewer                                               |
| `agents/ui-reviewer/instructions.md`    | UI smoke + deep mode                                                 | smoke-test checks and deep UX audit mode                                                     |
| `agents/skills/debugging.md`            | debugging playbook                                                   | reproduce, compare, hypothesize, fix, escalation triggers                                    |
| `agents/skills/testing-strategy.md`     | three-mode testing strategy                                          | test-first, prototype-pin-refactor, verification-first, per-slice fields                     |
| `../docs/QUICKSTART.md`                 | user-facing operator runbook                                         | как ставить задачи команде агентов, промпты и сценарии                                       |
| `../docs/ops/usage-telemetry.md`        | agent usage telemetry                                                | durable usage history, usefulness rubric, file-first telemetry contract                      |

#### Domain invariant overlays

| Документ                    | Владеет                | Source of truth для                                                     |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `agents/invariants-emis.md` | EMIS domain invariants | EMIS boundaries, data invariants, tech notes (overlay to invariants.md) |

### Active

| Документ                                         | Владеет                     | Source of truth для                                                                 |
| ------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------- |
| `plans/agent_workflow_superpowers_adaptation.md` | agent workflow rollout plan | hybrid adoption waves, testing strategy, execution split for Superpowers adaptation |

### Archive

| Документ           | Владеет                              | Source of truth для                                                                               |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `archive/agents/*` | historical agent model and templates | старые agent operating model, playbook, roles и handoff templates до перехода на текущий workflow |

## 4. Reading Order

### Для platform / dashboard-builder

1. `README.md`
2. `architecture.md` (canonical repo-wide foundation)
3. `bi/architecture.md` (BI vertical)
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
2. `emis/README.md` (EMIS entry point + doc map)
3. `emis/architecture.md` (operational/BI paths, storage, contracts, fixed defaults)
4. `emis/change_policy.md` (decision path, review triggers, DoD)
5. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
6. `emis/product_scope.md` — если нужен product scope

Опционально по задаче:

- `bi/architecture.md` - только если change затрагивает `/dashboard/emis/*`, `platform-datasets` или shared filter/dataset runtime
- `emis/access_model.md` - если задача затрагивает writes, роли, sessions, guardrails
- `emis/operations.md` - если задача про health/readiness, error logging или offline maps/PMTiles
- `emis/architecture.md` §6 - если задача про BI/read-models/datasets/contracts
- `emis/structural_migration.md` - если задача про structural migration, import rules или alias policy
- `agents/workflow.md` - если нужен core agent lifecycle, review model, governance passes, DoD
- `agents/recovery.md` - если выполнение ушло с happy path
- `agents/autonomous-mode.md` - если задача в autonomous mode
- `agents/invariants.md` - если нужны generic project invariants и guardrails
- `agents/invariants-emis.md` - если нужны EMIS-specific domain invariants
- `agents/git-protocol.md` - если нужны branches, worktrees и merge choreography
- `agents/workflow.md` §8 - если нужно понять memory ownership
- `ops/usage-telemetry.md` - если нужен durable usage log, usefulness rubric или telemetry storage contract
- `agents/templates.md` - если нужны шаблоны коммуникации между агентами
- `agents/worker/guide.md` - если нужен self-contained worker execution guide без чтения всего generic governance stack
- `../packages/emis-contracts/AGENTS.md` - если change касается contracts, DTO, Zod schemas
- `../packages/emis-server/AGENTS.md` - если change касается backend modules или infra helpers
- `../packages/emis-ui/AGENTS.md` - если change касается map/status UI package
- `../apps/web/src/routes/emis/AGENTS.md` - если работа про `/emis` workspace layer
- `../apps/web/src/routes/dashboard/emis/AGENTS.md` - если работа про BI/dashboard routes
- `archive/emis/emis_session_bootstrap.md`, `archive/emis/emis_next_tasks_2026_03_22.md`, `archive/emis/emis_vessel_track_contract.md` - если нужен historical wave journal или frozen feature contract
- `archive/emis/*`, `archive/agents/*` и `archive/strategy-v1/*` - только если нужен historical context

## 5. Правило ownership

- Этот файл владеет полным каталогом документации.
- `architecture.md` владеет canonical repo-wide foundation architecture.
- `bi/architecture.md` владеет BI vertical architecture.
- `emis/architecture.md` владеет EMIS vertical architecture.
- Корневой `AGENTS.md` владеет развилкой по контурам и navigation entry points.
- `README.md` не должен дублировать doc map; он только отправляет сюда.
