# Plan: Architecture Docs Alignment — Foundation / BI / EMIS

## Status

- opened on `2026-04-18`
- wave status: `active`
- priority: `high` — active architecture docs, draft recommendations, and current runtime vocabulary have started to drift; first we need a canonical structure before deeper edits
- branch: `main` (docs-only wave; product code не ожидается)
- execution profile: `opus-orchestrated-codex-workers` via `./scripts/codex-companion.sh`
- operating mode: `high-risk iterative / unstable wave` до закрытия ST-2 (facts + topology locked); затем `ordinary iterative` через apply-ST-ы (ST-3/4/5); прямой wave closure после ST-6
- baseline status: `Yellow` (carried — pre-existing `pnpm lint:eslint` errors; в волне не меняется)
- test baseline: `309` tests (`19` файлов); в волне не меняется
- canonical live plan path: `docs/agents/lead-strategic/current_plan.md`

## Goal

Структурировать и провести audit-first волну по архитектурным документам так, чтобы `architecture.md`, `architecture_dashboard_bi.md` и `architecture_emis.md` описывали один и тот же текущий runtime truth, не спорили по vocabulary и давали понятный reading order для следующих волн.

## Task Understanding

- Текущий черновик смешивает открытые вопросы, уже принятые архитектурные допущения, backlog-идеи и шаги исполнения.
- Для старта нужна не новая архитектура, а нормальная рабочая форма: что считаем решением, что остаётся открытым вопросом, что входит в эту фазу, а что уходит в follow-up.
- Эта волна по умолчанию docs-first. Любые code/runtime изменения фиксируются как отдельные следующие slices после выверенного docs baseline.

## Scope

- `docs/architecture.md`
- `docs/architecture_dashboard_bi.md`
- `docs/architecture_emis.md`
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
- никаких изменений product code (`apps/web`, `packages/*`) — любой code touch = escalation, не slice этой волны
- migration debt fixes (actual code refactors per `architecture_dashboard_bi.md` §9) — отдельная будущая волна
- изменения `docs/agents/*` workflow — кроме Q2 triage в ST-6
- `baseline-governor` role scope changes — закрыто предыдущей волной

## Chosen Approach

- Архитектурную основу не меняем: package-first modular monolith, thin routes, registry-first BI execution через `executeDatasetQuery()`, flat `DatasetQuery.params`, честный `SelectIr`, provider-owned caching и page-owned async state остаются каноном.
- Сначала audit, потом редактура. Сначала проверяем claims vs reality по трём active docs, потом чистим narrative и дубли.
- Базовая гипотеза по topology: оставить три основных документа (`architecture.md`, `architecture_dashboard_bi.md`, `architecture_emis.md`) с явным reading order, а не склеивать их в один файл на 1600+ строк.
- Материал уровня to-be / future-state фиксируем отдельно и позже, только после выверенного as-is.
- Если operating/governance detail не помещается в основной BI doc без перегруза, выносим его в companion doc, а не размываем foundation narrative.

## Operating Principle

Cross-model reviewer concurrency — canonical default для audit-паса (`docs/codex-integration.md` §5 item 6). Audit ST (ST-1) использует paired reviewer pass на каждый документ: `architecture-reviewer` Claude Opus via Agent tool (audit mode) + `architecture-reviewer` Codex `gpt-5.4` high effort via `./scripts/codex-companion.sh task --fresh --effort high`, параллельно. Findings двух моделей объединяются (union); более строгий severity выигрывает по одному пункту. Single-lane fallback допустим только если одна lane реально нестабильна на задаче, с пометкой `unverified cross-model` и rationale.

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

## Open Questions

### Resolves via ST acceptance (auto-closing)

- **OQ-A.** Какое имя planner API становится каноническим после audit (`planFiltersForTarget`, `planFiltersForTargets`, или другой реально используемый вариант) — closes в ST-4 acceptance.
- **OQ-B.** Что именно должно остаться внутри `architecture_dashboard_bi.md`, а что лучше вынести в companion operating/governance doc — closes в ST-4 acceptance.
- **OQ-C.** Какие low-cost улучшения из backlog (`system summary`, `TOC`, `external dependencies catalog`, `merge verification hooks`) входят в эту волну, а какие откладываются — closes в ST-5 scope decision.

### Require explicit triage in ST-6 (не auto-resolve)

- **OQ-1.** Место архитектурных принципов в начале документа; отношение к структуре монорепо; правило выделения пакета (расширение к Provisional Decisions).
- **OQ-2.** Позиция архитектора в агентной модели: должен ли `lead-strategic` согласовывать placement через architecture pass на этапе планирования; как обеспечить видимость архитектурных решений для worker'а (worker не читает architecture docs по default). Orthogonal к architecture docs — likely follow-up wave про `docs/agents/*`.
- **OQ-3.** Конвенции именования (папки, пакеты, модули) — отдельный документ (`docs/conventions.md`) или секция в foundation doc.

## Risk Flags

- `architecture.md` может всё ещё рассказывать legacy BI narrative, который уже расходится с активным dataset runtime.
- `architecture_dashboard_bi.md` может содержать внутреннюю неоднородность по planner vocabulary и operating surface.
- Формулировка "EMIS BI построен по аналогии с dashboards BI" верна только для shared read-side частей; если написать её слишком широко, она сотрёт важную operational границу.
- Draft backlog/recommendation docs могут раздувать scope; эту волну нужно держать audit-first, а не превращать в бесконечный docs-polish pass.
- Codex `gpt-5.4 high` lane может давать шум на нарративных документах; при системной нестабильности — single-lane fallback с пометкой `unverified cross-model`.
- `DOCS FIRST` verdict на `architecture.md` замораживает последующие apply-ST до фиксации root; принятое cost freeze rule.
- ST-5 scope (apply) может раздуться под backlog; переносить в scope только пункты из фактических findings ST-1, не из черновиков.

## Subtasks

### ST-1: Audit active architecture docs against repo reality

- scope: `docs/architecture.md`, `docs/architecture_dashboard_bi.md`, `docs/architecture_emis.md` плюс representative code paths (`packages/*`, `apps/web/src/**`, active aliases, active enforcement rules) и draft input docs
- depends on: —
- size: M
- reviewers (paired, параллельно per doc): Claude Opus `architecture-reviewer` (audit mode, Agent tool) + Codex `gpt-5.4` high effort `architecture-reviewer` (companion CLI)
- acceptance:
  - для каждого active doc: verdict `CLEAR` | `DOCS FIRST` | `ESCALATE`
  - для каждого active doc: список `accurate` / `needs correction` / `needs decision`
  - зафиксированы claims-vs-reality по canonical paths (BI runtime path, planner API, dataset source of truth), vocabulary и ownership boundaries
  - открытые вопросы reduced to named decisions вместо mixed notes
  - freeze rule activated: ST-3 первым в apply-очереди, если `architecture.md` = `DOCS FIRST`; соответствующий edit ST первым, если BI или EMIS = `DOCS FIRST`
- verification intent: сверить ключевые runtime paths и ownership claims с текущим кодом и active docs
- verification mode: `verification-first`
- notes: начинать с `architecture.md` (root); затем BI vertical; затем EMIS overlay

### ST-2: Lock canonical document topology and naming

- scope: роли документов, reading order, rename/no-rename, need/no-need for companion doc; preliminary stance по OQ-1/OQ-3 (resolves в ST-6 окончательно)
- depends on: ST-1
- size: S
- acceptance:
  - явно зафиксировано, остаётся ли topology `foundation + BI + EMIS`
  - решение по rename `architecture.md` записано и обосновано
  - если нужен companion doc, его purpose и owner определены заранее
  - preliminary stance по OQ-1 (principles placement) и OQ-3 (conventions doc) зафиксирован как input для ST-6 triage
- verification intent: убедиться, что `docs/AGENTS.md` и root `AGENTS.md` не начинают противоречить новому reading order
- verification mode: `verification-first`

### ST-3: Refresh `architecture.md` foundation narrative

- scope: system summary, current BI narrative, source-of-truth pointers, package/app placement, selected low-cost accuracy fixes
- depends on: ST-1, ST-2
- size: M
- acceptance:
  - legacy BI path в foundation doc заменён на актуальный foundation-level narrative
  - убран drift вокруг `DatasetIr`, `SelectIr`, `executeDatasetQuery()` и dataset definitions source of truth
  - low-cost improvements, которые реально снижают ambiguity, либо внесены, либо явно отложены (feeds OQ-C resolution)
- verification intent: перечитать изменённые sections against BI/EMIS docs и representative code paths
- verification mode: `verification-first`
- notes: tenancy / `scheduler_locks` только clarifications, не redesign

### ST-4: Normalize `architecture_dashboard_bi.md`

- scope: canonical fetch path, planner vocabulary, planner integration, migration debt, operating surface
- depends on: ST-1, ST-2
- size: M
- acceptance:
  - одно каноническое имя planner API зафиксировано и используется последовательно (resolves OQ-A)
  - внутренний drift между fetch path, planner sections и guardrails убран
  - runtime budgets / runbooks / governance metadata / freshness / contract versioning либо интегрированы, либо вынесены в companion doc с явной ссылкой (resolves OQ-B)
- verification intent: BI doc должен рассказывать одну coherent as-is историю с отдельно помеченным debt/follow-up
- verification mode: `verification-first`

### ST-5: Align `architecture_emis.md` with shared BI/read-side rules

- scope: только пересечение EMIS BI/read-model layer с общим BI runtime; без переписывания operational execution path
- depends on: ST-1, ST-2
- size: S
- testable claim (проверяется и кодифицируется в этой ST):
  - **Claim:** EMIS read-side делит canonical execution vocabulary с Dashboards BI (`SelectIr`, `executeDatasetQuery`, planner API) там, где execution model реально идентичен.
  - **Non-claim:** EMIS operational write-side остаётся отдельным доменом с distinct transactional semantics; документируется как intentional divergence с rationale, а не устраняется.
- acceptance:
  - EMIS doc явно различает operational default path и BI/read-side overlay
  - нет противоречий с `architecture_dashboard_bi.md` по shared abstractions и vocabulary
  - сохранено правило: EMIS operational side по умолчанию живёт вне generic dataset path, пока не опубликован documented read model
  - testable claim либо подтверждён в doc с конкретными shared surfaces, либо опровергнут с explicit rationale (EMIS як полностью отдельный домен — валидный исход)
- verification intent: сверить canonical paths и vocabulary across BI/EMIS docs
- verification mode: `verification-first`

### ST-6: Triage open questions + produce follow-up execution backlog

- scope: (a) explicit triage OQ-1/OQ-2/OQ-3; (b) отделить docs-only result этой волны от следующей code/runtime очереди
- depends on: ST-3, ST-4, ST-5
- size: S
- acceptance:
  - каждый из OQ-1/OQ-2/OQ-3 получает triage verdict: `in-scope` (закрывается этой волной как патч к одному из уже выполненных ST), `follow-up` (вынесен в отдельную волну с зафиксированным owner + expiry), или `discard` (закрыт с rationale)
  - follow-up items разделены на `docs follow-up`, `code/runtime follow-up`, `trigger-based deferred`
  - такие вещи как `assertDatasetAccess()`, `/api/datasets/:id/schema` access gate, governance metadata rollout и verification hooks попали в явный next-slice backlog
  - `follow-up` треки записаны в `lead-strategic/memory.md` как carry forward
  - после wave close не остаётся "висящих" архитектурных замечаний без owner или next step
- verification intent: каждая non-doc проблема должна иметь оформленный follow-up; каждый open question — зафиксированный путь
- verification mode: `verification-first`

## Constraints

- Не открывать redesign архитектурного ядра, если ST-1 не докажет, что текущий written contract уже ложен.
- Не склеивать три архитектурных документа в один файл без явной выгоды по navigation/ownership.
- Не описывать EMIS BI как "полностью тот же dashboards BI" там, где активен другой execution path.
- Не превращать текущую docs-wave в скрытый tenancy / HA / monorepo redesign.
- Сначала зафиксировать as-is и vocabulary, потом открывать future-state material.
- Package extraction: по ownership/boundary, не по числу подпапок.
- Baseline не ухудшается.

## Expected Result

- `current_plan.md` перестаёт быть набором заметок и становится canonical execution plan.
- Foundation / BI / EMIS docs синхронизированы по текущему runtime truth.
- Written verdict по topology (three-doc default подтверждён или обоснованно изменён) и по EMIS≡BI thesis (что shared canonically, что intentional divergence).
- Разделены `as-is`, `migration debt`, `future-state`.
- Open questions OQ-1/OQ-2/OQ-3: каждый в одном из статусов — resolved в текущей волне / вынесен в follow-up с owner+expiry / discarded с rationale.
- `invariants.md` обновлён, если аудит выявил новое enforceable правило.
- Baseline pass через `baseline-governor` на wave close: `Yellow` сохранён (carried) или переведён в `Green`.
- `lead-strategic/memory.md` переписан (≤20 строк), отражает closed wave + carry forward для следующей волны.
- После wave close есть понятный next backlog: что доделывать в docs, что переносить в code/runtime slices, что ждать по trigger'у.

## Immediate Next Step

- Начать с ST-1: paired reviewer pass (Claude Opus + Codex `gpt-5.4` high) по трём active docs, начиная с `architecture.md` как root (freeze-зависимость следующих ST). Собрать claims-vs-reality matrix и per-doc verdict до любых крупных редакторских решений.
