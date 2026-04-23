# Plan: Architecture Docs Alignment — Foundation / BI / EMIS

## Status

- opened on `2026-04-18`
- wave status: `closed` on `2026-04-23`
- priority: `high` — active architecture docs, draft recommendations, and current runtime vocabulary have started to drift; first we need a canonical structure before deeper edits
- branch: `main` (docs-only wave; product code не ожидается)
- execution profile: `opus-orchestrated-codex-workers` via `./scripts/codex-companion.sh`
- operating mode: `ordinary iterative` from ST-3 onward (facts + topology locked by ST-2 on `2026-04-22`); closed cleanly at ST-6 on `2026-04-23`. Prior mode (`high-risk iterative / unstable wave`) was active through ST-1 + ST-2.
- ST-1 status: `closed` (all three docs = `DOCS FIRST`; claims-vs-reality matrix at `docs/agents/lead-strategic/st-1_claims_vs_reality_matrix.md`)
- ST-2 status: `closed` on `2026-04-22` (see _ST-2 Canonical Decisions_)
- ST-3 status: `closed` on `2026-04-22` — light pair mode. Codex write-lane `jobId=task-moahu5em-gciijx`, `threadId=019db6d6-9777-71f2-a7a7-87d72bc55b07`. Claude Opus `architecture-reviewer` pass: one WARNING (dead backlog link, ST-1 `[C]` item worker missed) — patched inline by `lead-strategic` at `docs/architecture.md:76` (link now points to `./archive/architecture_improvements_backlog.md`). All other findings clean; scope fully compliant; no forbidden files touched.
- ST-4 status: `closed` on `2026-04-23` — full orchestrator acceptance. Codex write-lane `jobId=task-moaixeey-jea9vt`, `threadId=019db6f2-8a8e-7fc2-8b95-1e72c507dd86`, elapsed `4m 56s`. Architecture-reviewer: `OK`; docs-reviewer: one WARNING on pre-existing stale dataset example, patched inline via `workflow.md` §2.1 direct-fix (`ifts.pay_docs_hourly` -> `ifts.message_stats`). D-1 BI-side / D-3 / D-4 landed, OQ-B closed in-doc (no companion doc), `D-6` held, `pnpm exec prettier --check docs/bi/architecture.md` green, baseline Yellow preserved.
- ST-5 status: `closed` on `2026-04-23` — full orchestrator acceptance. Codex write-lane `jobId=task-moavvtxz-omujis`, `threadId=019db83e-a51c-71f3-8eb7-8dbb2d8e5f1c`, elapsed `3m 27s`. Architecture-reviewer: `OK`; docs-reviewer: `OK`; zero follow-ups. ST-1 EMIS drift items plus D-5 / D-7 landed, the governing principle held (`docs/emis/architecture.md` now points to BI as runtime authority without duplicating BI rule prose), `pnpm exec prettier --check docs/emis/architecture.md` green, diff bounded to `docs/emis/architecture.md`, baseline Yellow preserved.
- ST-6 status: `closed` on `2026-04-23` — governance-closeout triage completed via `docs/agents/orchestrator/last_report.md`; OQ-C = `discard` under `D-6`; planner-rename residue classified into 3 docs follow-ups + 3 WB caller-rename runtime follow-ups; `emisMart.ts` legacy removal deferred to the EMIS BI `filterContext` migration trigger.
- baseline status: `Yellow` (carried — pre-existing `pnpm lint:eslint` errors; baseline-governor verdict `baseline closed` on `2026-04-23`)
- test baseline: `309` tests (`19` файлов); в волне не меняется
- canonical live plan path: `docs/agents/lead-strategic/current_plan.md`
- Brainstorm: completed — task framing confirmed; wave closed docs-first and as-is-first

## Goal

Структурировать и провести audit-first волну по архитектурным документам так, чтобы `architecture.md`, `bi/architecture.md` и `emis/architecture.md` описывали один и тот же текущий runtime truth, не спорили по vocabulary и давали понятный reading order для следующих волн.

## Task Understanding

- Текущий черновик смешивает открытые вопросы, уже принятые архитектурные допущения, backlog-идеи и шаги исполнения.
- Для старта нужна не новая архитектура, а нормальная рабочая форма: что считаем решением, что остаётся открытым вопросом, что входит в эту фазу, а что уходит в follow-up.
- Эта волна по умолчанию docs-first. Любые code/runtime изменения фиксируются как отдельные следующие slices после выверенного docs baseline.

## Scope

- `docs/architecture.md`
- `docs/bi/architecture.md`
- `docs/emis/architecture.md`
- `docs/AGENTS.md` — только если меняется reading order или ownership map
- optional companion doc: `docs/bi_operating_model.md` или `docs/bi_dataset_governance.md`
- input materials (draft, не canonical):
  - `docs/archive/architecture_improvements_backlog.md`
  - `docs/archive/bi_architecture_final_recommendations.md`

## Non-goals

- не менять архитектурное ядро без доказанного несоответствия коду
- не сливать foundation / BI / EMIS в один большой monolith-документ по умолчанию
- не принимать в этой фазе решение о physical monorepo split
- не запускать multi-tenant или HA redesign; допустимы только current-state clarifications
- не переписывать EMIS operational path под generic BI narrative
- для ST-5 "documentary alignment" означает только current-state correction of module boundaries, contract-surface wording, and BI-pointer hygiene; не переписывать auth flow, ingestion pipeline, PostGIS runtime, runbooks, or domain boundaries
- никаких изменений product code (`apps/web`, `packages/*`) — любой code touch = escalation, не slice этой волны
- migration debt fixes (actual code refactors per `bi/architecture.md` §9) — отдельная будущая волна
- изменения `docs/agents/*` workflow — отдельная будущая волна
- `baseline-governor` role scope changes — закрыто предыдущей волной

## Chosen Approach

- Архитектурную основу не меняем: package-first modular monolith, thin routes, registry-first BI execution через `executeDatasetQuery()`, flat `DatasetQuery.params`, честный `SelectIr`, package-orchestrated server-side caching и page-owned async state остаются каноном.
- Сначала audit, потом редактура. Сначала проверяем claims vs reality по трём active docs, потом чистим narrative и дубли.
- Базовая гипотеза по topology: оставить три основных документа (`architecture.md`, `bi/architecture.md`, `emis/architecture.md`) с явным reading order, а не склеивать их в один файл на 1600+ строк.
- Материал уровня to-be / future-state фиксируем отдельно и позже, только после выверенного as-is.
- Если operating/governance detail не помещается в основной BI doc без перегруза, выносим его в companion doc, а не размываем foundation narrative.

## Operating Principle

Cross-model reviewer concurrency — canonical default для audit-паса (`./docs/agents/codex-integration.md` §5 item 6). Audit ST (ST-1) использует paired reviewer pass на каждый документ: `architecture-reviewer` Claude Opus via Agent tool (audit mode) + `architecture-reviewer` Codex `gpt-5.4` high effort via `./scripts/codex-companion.sh task --fresh --effort high`, параллельно. Findings двух моделей объединяются (union); более строгий severity выигрывает по одному пункту. Single-lane fallback допустим только если одна lane реально нестабильна на задаче, с пометкой `unverified cross-model` и rationale.

Каждый audit pass выносит per-doc verdict: `CLEAR` | `DOCS FIRST` | `ESCALATE`. Freeze rule: если `architecture.md` = `DOCS FIRST`, ST-3 (foundation refresh) выполняется до ST-4/ST-5; если BI или EMIS = `DOCS FIRST`, соответствующий edit ST становится первым в apply-очереди.

## Pre-execution Gates

- Architecture Readiness Check (`workflow.md` §2.3.1) — **не triggered**. Основание: docs-only wave, product code не ожидается, изменения строго в architecture doc surface.
- Baseline gate перед новой large feature wave — не применим; эта волна governance alignment, не large feature.
- Baseline pass через `baseline-governor` — при wave close (см. Expected Result).

## Provisional Decisions At Plan Open

- `architecture.md` остаётся canonical repo-wide foundation doc в этой фазе; rename в `architecture_foundation.md` или `architecture_core.md` пока не открываем.
- Вынесение кода в `packages/*` определяется reusable ownership/boundary, а не количеством подпапок само по себе. Несколько модулей внутри app-local зоны ещё не повод автоматически делать новый package.
- EMIS BI/read-side должен использовать те же BI-принципы и vocabulary там, где execution model реально общий; при этом EMIS operational path остаётся отдельным и явно описанным.
- Tenancy и `scheduler_locks` в этой волне допускают только документационные уточнения текущего состояния.

## ST-2 Canonical Decisions (2026-04-22)

Paired cross-model verdict: Claude Opus `lead-strategic` + Codex `gpt-5.4` high effort (`./scripts/codex-companion.sh task --fresh`, thread `019db6c3-3e5d-7a02-98ad-fac54f86889d`). Union-of-findings; no divergence on topology or D-item resolution. ST-2 acceptance closed.

### Topology verdict

- Three-doc topology kept canonical: `docs/architecture.md` (repo-wide foundation) + `docs/bi/architecture.md` (BI vertical) + `docs/emis/architecture.md` (EMIS vertical). Split or merge not opened in this wave.
- `architecture.md` **not renamed**. Root `AGENTS.md` / `docs/AGENTS.md` already hard-code the filename as canonical anchor; rename cost > clarity gain.
- **No BI companion doc** created up front. Re-evaluated during ST-4; split only if `bi/architecture.md` cannot hold current-state runtime plus bounded operating surface cleanly (OQ-B remains auto-closing via ST-4 acceptance). Purpose/owner of any companion doc must be defined before creation.

### OQ-1 resolution (closed in ST-2)

- **Principles placement:** stay in `architecture.md §1 Foundation Decisions`. No separate principles doc.
- **Monorepo stance → named foundation rule:** _"The system is one deployable SvelteKit app in a pnpm workspace monorepo; package boundaries are monorepo-ready code boundaries, not a commitment to a physical split in this wave."_ Wording lands in ST-3 via foundation-doc refresh.
- **Package extraction rule → named foundation rule:** _"Promote code to `packages/*` when it owns a reusable contract, execution boundary, or cross-route/domain capability that should remain app-independent; number of subfolders is never a packaging criterion."_ Wording lands in ST-3 via foundation-doc refresh.

### OQ-3 resolution (closed in ST-2)

- **Naming conventions placement:** one short canonical section inside `architecture.md` covering route/path naming, package/module naming, app-local peer-module naming, and wire-format casing. No separate `docs/conventions.md` in this wave.
- **Drafting ownership:** lands inside ST-3 as part of the foundation refresh; bounded addition, not a new apply slice. If that section balloons past ~30 lines in drafting, escalate to follow-up wave rather than expand ST-3 scope.

### D-item → ST apply map

| D-item | Summary | Owner ST | Notes |
|---|---|---|---|
| D-1 | Foundation BI path stated as canonical/default; `filterContext`-path pages (strategy compatibility subset + EMIS BI read-side) framed as **transitional, non-target surface scheduled for rework** — not as "supported dual path" and not as reference implementation for BI canonical path | ST-3 (foundation narrative) **+** ST-4 (precise seam detail) | Split ownership: foundation states policy + names the transitional surface; BI vertical §9 debt register frames `filterContext` callers as migration queue. Canonical flat-params reference callers remain `strategy/scorecard` + `wildberries/office-day` only |
| D-2 | Foundation package graph rewritten to match actual manifests/imports (`platform-filters`, `emis-contracts`, `emis-server`, `emis-ui` edges) | ST-3 | Affects `architecture.md` §3 Package Map **and** §5.1 Package Dependency Graph; §5.2 ESLint-config drift stays INFO-only note |
| D-3 | Planner vocabulary normalization (resolves OQ-A) | ST-4 | Canonical primitive: `planFiltersForTarget()`. Ergonomic batch helper: `planFiltersForTargets()`. Compatibility alias: `planFiltersForDataset()` — documented as such, kept for live route callers |
| D-4 | BI doc separates current live contract from migration debt (`DatasetQuery.filters`, `fetchDataset.filterContext`, access enforcement placeholder, schema introspection scope, cache-key prose, `providerCache` ownership) | ST-4 | Debt detail belongs only in BI doc §9 debt register; narrative sections must not mix current-state with target |
| D-5 | EMIS doc names `packages/platform-datasets/src/server/registry/index.ts` as runtime source of truth for `emis.*` datasets **at current moment**; app-local `apps/web/src/lib/server/datasets/definitions/emisMart.ts` marked legacy/reference-only; EMIS BI read-side itself gets an explicit **non-target marker** ("scheduled for rework") so the registry pointer reads as current-state truth, not canonical target | ST-5 | Affects EMIS doc §3 Storage Ownership **and** §5 Published Read-Models. ST-5 must not codify the current EMIS BI form as canonical reference |
| D-6 | Backlog/recommendation material stays out of apply scope unless it directly resolves a verified ST-1 drift item | constraint across ST-3/4/5/6 | **Not a slice.** Reaffirmed scope guardrail at each apply-ST kickoff; reject additions not traceable to a concrete ST-1 finding |
| D-7 | EMIS doc §5 Rule 1 scoped to `mart` as the published BI SQL contract home | ST-5 | `mart_emis` explicitly stays outside BI registry as operational-derived surface; any future BI use = explicit exception with rationale, not default wording |
| D-8 | Foundation §4.2 `wildberries` active-slices list corrected | ST-3 | Replace generic `wildberries under /dashboard/wildberries/` with actual live sub-routes (e.g. `office-day`, `product-analytics`, `stock-alerts`) or mark the parent shell as under-construction |

### Carry-forward risk flags from ST-2

- **Non-target BI surfaces.** EMIS BI read-side **and** strategy compatibility pages (`strategy/overview`, `strategy/performance`, `strategy/cascade`, `strategy/scorecard_v2`) are transitional surfaces scheduled for rework. D-1 / D-5 / ST-5 wording must NOT codify their current form as canonical BI behavior. In docs tonality these slices are demoted from canonical reference status ("archived from canonical exemplars until migration lands"). Maturity criterion for the BI canonical runtime = **migration of strategy.* pages from `filterContext` to flat-params path**, not migration of EMIS dashboards. EMIS BI carries its own domain overlay and is a separate, later migration.
- `docs/AGENTS.md` currently names `emis/README.md` as the EMIS reading entry point; ST-3 / ST-5 must preserve the distinction between **doc-set entry point** (EMIS README) and **architecture source of truth** (three-doc canonical set). If reading order is touched, update both consistently.
- Planner-name normalization (D-3) may leave downstream drift in local nav docs, invariants overlays, and comments; ST-4 scope includes a narrow sweep, residue goes to ST-6 triage as docs follow-up.
- `D-6` constraint re-applies at every apply-ST kickoff: worker scope additions not traceable to a concrete ST-1 finding are rejected in acceptance.

## Open Questions

### Resolves via ST acceptance (auto-closing)

- **OQ-A.** Какое имя planner API становится каноническим после audit (`planFiltersForTarget`, `planFiltersForTargets`, или другой реально используемый вариант) — **closed in ST-2**: canonical primitive `planFiltersForTarget()`, batch helper `planFiltersForTargets()`, compatibility alias `planFiltersForDataset()`. ST-4 lands the wording via D-3.
- **OQ-B.** Что именно должно остаться внутри `bi/architecture.md`, а что лучше вынести в companion operating/governance doc — **closed in ST-4 acceptance**: kept in `bi/architecture.md`, no companion doc created.
- **OQ-C.** Какие low-cost улучшения из backlog (`system summary`, `TOC`, `external dependencies catalog`, `merge verification hooks`) входят в эту волну, а какие откладываются — **closed in ST-6 as `discard`**. None of these items tied back to accepted ST-1 evidence, so under `D-6` they do not enter this wave. If reopened later, treat them as a separate trigger-based docs-polish mini-wave rather than carry-forward debt from this closure.

### Resolved in ST-2

- **OQ-1.** Place of architectural principles; monorepo stance; package extraction rule — **resolved**. See _ST-2 Canonical Decisions → OQ-1 resolution_.
- **OQ-3.** Naming conventions placement — **resolved**. See _ST-2 Canonical Decisions → OQ-3 resolution_.

## Deferred Follow-up (Out Of This Wave)

- agent workflow / architect role / worker visibility of architecture docs — отдельная wave по `docs/agents/*`; orthogonal к текущему architecture-docs alignment
- redesign documentation workflow / docs-as-skills — отдельная wave после stabilised `as-is` docs и явного `to-be`
- code/runtime alignment beyond documentation corrections — только после закрытия docs-only результата этой wave

## Risk Flags

- `architecture.md` может всё ещё рассказывать legacy BI narrative, который уже расходится с активным dataset runtime.
- `bi/architecture.md` может содержать внутреннюю неоднородность по planner vocabulary и operating surface.
- Формулировка "EMIS BI построен по аналогии с dashboards BI" верна только для shared read-side частей; если написать её слишком широко, она сотрёт важную operational границу.
- Draft backlog/recommendation docs могут раздувать scope; эту волну нужно держать audit-first, а не превращать в бесконечный docs-polish pass.
- Codex `gpt-5.4 high` lane может давать шум на нарративных документах; при системной нестабильности — single-lane fallback с пометкой `unverified cross-model`.
- `DOCS FIRST` verdict на `architecture.md` замораживает последующие apply-ST до фиксации root; принятое cost freeze rule.
- ST-5 scope (apply) может раздуться под backlog; переносить в scope только пункты из фактических findings ST-1, не из черновиков.

## Subtasks

### ST-1: Audit active architecture docs against repo reality

- scope: `docs/architecture.md`, `docs/bi/architecture.md`, `docs/emis/architecture.md` плюс representative code paths (`packages/*`, `apps/web/src/**`, active aliases, active enforcement rules) и draft input docs
- depends on: —
- size: M
- reviewers (paired, параллельно per doc): Claude Opus `architecture-reviewer` (audit mode, Agent tool) + Codex `gpt-5.4` high effort `architecture-reviewer` (companion CLI)
- acceptance:
  - для каждого active doc: verdict `CLEAR` | `DOCS FIRST` | `ESCALATE`
  - для каждого active doc: список `accurate` / `needs correction` / `needs decision`
  - зафиксированы claims-vs-reality по canonical paths (BI runtime path, planner API, dataset source of truth), vocabulary и ownership boundaries
  - produced artifact: claims-vs-reality matrix for foundation / BI / EMIS docs
  - открытые вопросы reduced to named decisions вместо mixed notes
  - freeze rule activated: ST-3 первым в apply-очереди, если `architecture.md` = `DOCS FIRST`; соответствующий edit ST первым, если BI или EMIS = `DOCS FIRST`
- verification intent: сверить ключевые runtime paths и ownership claims с текущим кодом и active docs
- verification mode: `verification-first`
- notes: начинать с `architecture.md` (root); затем BI vertical; затем EMIS overlay

### ST-2: Lock canonical document topology and naming

- scope: роли документов, reading order, rename/no-rename, need/no-need for companion doc; снять ambiguity по OQ-1/OQ-3 настолько, насколько это нужно для topology lock до ST-3
- depends on: ST-1
- size: S
- acceptance:
  - явно зафиксировано, остаётся ли topology `foundation + BI + EMIS`
  - решение по rename `architecture.md` записано и обосновано
  - если нужен companion doc, его purpose и owner определены заранее
  - topology-affecting ambiguity по OQ-1/OQ-3 не остаётся перед стартом ST-3; если что-то сохраняется, оно явно bounded как non-blocking follow-up
- verification intent: убедиться, что `docs/AGENTS.md` и root `AGENTS.md` не начинают противоречить новому reading order
- verification mode: `verification-first`

### ST-3: Refresh `architecture.md` foundation narrative

- scope: system summary, current BI narrative, source-of-truth pointers, package/app placement, selected low-cost accuracy fixes, OQ-1/OQ-3 textual landing
- depends on: ST-1, ST-2
- size: M
- owns: `D-1` (foundation-side narrative + **non-target pointer** for `filterContext`-path slices), `D-2` (§3 package map + §5.1 dep graph), `D-8` (§4.2 wildberries slice list), OQ-1 textual landing (monorepo rule + package extraction rule in §1), OQ-3 textual landing (one short naming-conventions section)
- acceptance:
  - legacy BI path в foundation doc заменён на актуальный foundation-level narrative; `filterContext`-path surface явно помечен как **transitional, non-target, scheduled for rework** (а не "supported dual path" и не reference implementation). Canonical flat-params reference callers названы явно: `strategy/scorecard`, `wildberries/office-day` (D-1 foundation-side)
  - package graph (§3 + §5.1) приведён в соответствие с реальными manifests/imports для `platform-filters`, `emis-contracts`, `emis-server`, `emis-ui` (D-2)
  - §4.2 BI slices list скорректирован по `wildberries` (D-8) — либо перечислены реальные sub-routes, либо shell помечен как under-construction
  - монорепо-правило и package-extraction rule записаны в §1 как named canonical rules (OQ-1)
  - один короткий canonical раздел naming conventions добавлен в foundation doc (OQ-3)
  - убран drift вокруг `DatasetIr`, `SelectIr`, `executeDatasetQuery()` и dataset definitions source of truth
  - low-cost improvements, которые реально снижают ambiguity, либо внесены, либо явно отложены (feeds OQ-C resolution); `D-6` constraint соблюдён
- verification intent: перечитать изменённые sections against BI/EMIS docs и representative code paths
- verification mode: `verification-first`
- notes: tenancy / `scheduler_locks` только clarifications, не redesign; если naming-conventions раздел превышает ~30 строк — эскалировать в follow-up wave, не раздувать ST-3

### ST-4: Normalize `bi/architecture.md`

- scope: canonical fetch path, planner vocabulary, planner integration, migration debt, operating surface
- depends on: ST-1, ST-2
- size: M
- owns: `D-1` (precise seam detail in BI §9 debt register — framed as **migration queue, not supported dual path**), `D-3` (planner vocabulary per ST-2 decision), `D-4` (current live contract vs migration debt separation: `DatasetQuery.filters`, `fetchDataset.filterContext`, access enforcement placeholder, schema introspection scope, cache-key prose, `providerCache` ownership)
- acceptance:
  - planner API нормализован по ST-2 decision: `planFiltersForTarget()` primitive, `planFiltersForTargets()` batch helper, `planFiltersForDataset()` документирован как compatibility alias (closes OQ-A + resolves D-3)
  - внутренний drift между fetch path, planner sections и guardrails убран
  - `filterContext` seam описан в §9 как migration queue: strategy compatibility pages (`overview`, `performance`, `cascade`, `scorecard_v2`) + EMIS BI read-side перечислены как transitional non-target callers, с explicit criterion "BI runtime maturity = strategy.* pages migrated to flat-params"; EMIS miграция — отдельный, более поздний трек, не блокирует BI maturity call-out (D-1 BI-side)
  - каждое из: `DatasetQuery.filters`, `fetchDataset.filterContext`, access enforcement, schema introspection, cache-key prose, `providerCache` ownership — либо описано как current-state truth, либо как migration debt в §9; narrative sections не смешивают (D-4)
  - runtime budgets / runbooks / governance metadata / freshness / contract versioning либо интегрированы в BI doc, либо вынесены в companion doc с явной ссылкой (resolves OQ-B); если companion doc создаётся — его purpose + owner определены до создания
  - `D-6` constraint соблюдён; downstream planner-rename drift в nav/guardrails либо закрыт здесь, либо передан в ST-6 triage
- verification intent: BI doc должен рассказывать одну coherent as-is историю с отдельно помеченным debt/follow-up
- verification mode: `verification-first`

### ST-5: Align `emis/architecture.md` with shared BI/read-side rules

- scope: full current-state alignment of `docs/emis/architecture.md`: operational side + BI overlay + storage / contracts / extension points. **EMIS operational semantics are NOT rewritten** — this slice is current-state documentary alignment only, per the same `as-is-first` rule used for ST-3 (foundation) and ST-4 (BI).
- depends on: ST-1, ST-2
- size: M
- owns: `D-5` (registry pointer as current-state truth **+** explicit non-target marker on EMIS BI read-side), `D-7` (§5 Rule 1 scoped to `mart` only; `mart_emis` explicitly operational-only), ST-1 EMIS operational drift findings: `[O]` §1 `emis-manual-entry` omission, §2.2 BI bridge wording must acknowledge the live `filterContext` compatibility seam via `docs/bi/architecture.md` §9 migration queue, and §4 Contract Surfaces must name `packages/platform-datasets/src/server/registry/index.ts` as runtime source of truth for `emis.*` (not only in §5)
- testable claim (проверяется и кодифицируется в этой ST):
  - **Claim (reframed, descriptive-only):** EMIS BI/read-side сейчас физически ездит по shared BI runtime (`fetchDataset` → `/api/datasets/:id` → `executeDatasetQuery` → `SelectIr`), используя тот же registry/planner API, что и Dashboards BI, — но это **non-target state, scheduled for rework**, а не канонизация текущей формы как "EMIS ≡ BI". Registry pointer фиксирует current-state source of truth, не target.
  - **Non-claim:** EMIS operational write-side остаётся отдельным доменом с distinct transactional semantics; документируется как intentional divergence с rationale, а не устраняется.
- governing principle:
  - **EMIS BI lives under BI laws.** `docs/emis/architecture.md` must point to `docs/bi/architecture.md` as the source of truth for BI runtime rules (dataset runtime, filter wire contract, planner vocabulary, cache prose, fetch flow, `SelectIr` policy) and must not duplicate those rules in EMIS prose
  - EMIS BI overlay carries only EMIS-specific bridge facts: registry pointer for `emis.*` datasets, `mart` as the only BI-published SQL contract home while `mart_emis` remains operational-derived and outside BI registry, explicit **non-target marker** on the BI/read-side section, and a pointer to `docs/bi/architecture.md` §9 as the migration-queue home for EMIS BI callers
  - any duplicated BI runtime rule prose in the EMIS doc must be removed during ST-5
- acceptance:
  - §1 Inside EMIS location list includes `apps/web/src/lib/emis-manual-entry/*` (ST-1 `[O]` operational drift)
  - EMIS doc явно различает operational default path и BI/read-side overlay; BI/read-side surface имеет explicit **non-target marker** ("scheduled for rework") на уровне секции, не только в risk notes
  - нет противоречий с `bi/architecture.md` по shared abstractions и vocabulary
  - §2.2 BI bridge section explicitly acknowledges the live `filterContext` compatibility seam and points to `docs/bi/architecture.md` §9 as the migration-queue home for EMIS BI callers; it does not restate BI runtime rules
  - §4 Contract Surfaces names `packages/platform-datasets/src/server/registry/index.ts` as runtime source of truth for `emis.*` datasets **at current moment**; app-local `emisMart.ts` copy is described as legacy/reference-only; neither pointer is presented as target architecture (D-5)
  - EMIS BI/read-side overlay contains no duplicated BI rule prose; only EMIS-specific bridge facts plus pointers to the BI doc remain
  - §5 Rule 1 чётко называет `mart` как published BI SQL contract home; `mart_emis` описан как operational-derived surface, не BI-registered (D-7); любое будущее BI-использование `mart_emis` = explicit exception, не default
  - сохранено правило: EMIS operational side по умолчанию живёт вне generic dataset path, пока не опубликован documented read model
  - §3 Storage Ownership / §6 Extension Points / §7 Fixed Defaults / §8 Boundary Rules spot-checked against live runtime; corrections land only if drift is found and traceable to ST-1 evidence
  - reframed claim подтверждён в doc как descriptive current-state statement с явной non-target меткой, **не** как canonical architectural thesis
  - ST-5 явно не кодифицирует current EMIS BI форму как reference implementation или BI maturity criterion; maturity criterion остаётся за strategy.* migration (per ST-2 risk flag)
  - `pnpm exec prettier --check docs/emis/architecture.md` clean
  - diff bounded to `docs/emis/architecture.md` only
  - test baseline `309` / `19` unchanged; baseline Yellow preserved
  - `D-6` constraint соблюдён
- verification intent: сверить canonical paths и vocabulary across BI/EMIS docs
- verification mode: `verification-first`
- notes: PCR-1 on `2026-04-23` expands ST-5 from narrow BI-intersection cleanup to full current-state EMIS doc alignment; kickoff assumption is **full orchestrator** (one bounded worker + `architecture-reviewer` + `docs-reviewer`) unless kickoff inventory proves the sweep is materially narrower. `D-6` is re-stated at kickoff: no backlog/recommendation additions without a concrete ST-1 trace.

### ST-6: Triage open questions + produce follow-up execution backlog

- scope: (a) explicit triage residual open questions после ST-3/4/5; (b) отделить docs-only result этой волны от следующей code/runtime очереди
- depends on: ST-3, ST-4, ST-5
- size: S
- status: `done` on `2026-04-23` — closeout artifact = `docs/agents/orchestrator/last_report.md`; triage summary = OQ-C discarded under `D-6`, planner-rename residue carried as 3 docs follow-ups + 3 trigger-based WB caller renames, `emisMart.ts` legacy removal deferred to a later EMIS BI migration wave
- acceptance:
  - каждый residual open question получает triage verdict: `in-scope` (закрывается этой волной как патч к одному из уже выполненных ST), `follow-up` (вынесен в отдельную волну с зафиксированным owner + expiry), или `discard` (закрыт с rationale)
  - follow-up items разделены на `docs follow-up`, `code/runtime follow-up`, `trigger-based deferred`
  - code/runtime follow-up items derived only from accepted ST-1 findings; pre-committed implementation backlog без audit evidence не добавляется
  - `follow-up` треки записаны в `lead-strategic/memory.md` как carry forward
  - после wave close не остаётся "висящих" архитектурных замечаний без owner или next step
- verification intent: каждая non-doc проблема должна иметь оформленный follow-up; каждый open question — зафиксированный путь
- verification mode: `verification-first`

## Constraints

- Не открывать redesign архитектурного ядра, если ST-1 не докажет, что текущий written contract уже ложен.
- Не склеивать три архитектурных документа в один файл без явной выгоды по navigation/ownership.
- Не описывать EMIS BI как "полностью тот же dashboards BI" там, где активен другой execution path.
- Не превращать текущую docs-wave в скрытый tenancy / HA / monorepo redesign.
- Не открывать redesign documentation workflow / docs-as-skills внутри этой wave.
- Сначала зафиксировать as-is и vocabulary, потом открывать future-state material.
- Package extraction: по ownership/boundary, не по числу подпапок.
- Baseline не ухудшается.

## Expected Result

- `current_plan.md` перестаёт быть набором заметок и становится canonical execution plan.
- Foundation / BI / EMIS docs синхронизированы по текущему runtime truth.
- Written verdict по topology (three-doc default подтверждён или обоснованно изменён) и по EMIS≡BI thesis (что shared canonically, что intentional divergence).
- Разделены `as-is`, `migration debt`, `future-state`.
- Open questions этой wave: каждый в одном из статусов — resolved в текущей волне / вынесен в follow-up с owner+expiry / discarded с rationale.
- `invariants.md` обновлён, если аудит выявил новое enforceable правило.
- Baseline pass через `baseline-governor` на wave close: `Yellow` сохранён (carried) или переведён в `Green`.
- `lead-strategic/memory.md` переписан (≤20 строк), отражает closed wave + carry forward для следующей волны.
- После wave close есть понятный next backlog: что доделывать в docs, что переносить в code/runtime slices, что ждать по trigger'у.

## Immediate Next Step

- No active wave is open. This plan now serves as the closed-wave trace until the next strategic trigger is approved.
- Next-wave inputs are the carried `Yellow` baseline, test baseline `309` / `19`, BI §9 migration debt register, and the carry-forward items recorded in `lead-strategic/memory.md`.
- Recommended next-wave mode hypothesis: code/runtime migrations seeded by BI §9 should reopen as `high-risk iterative` because they cross dataset runtime, page callers, and EMIS/BI seam boundaries.
