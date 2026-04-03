# Plan: EMIS Monorepo-Style Separation And Shared Foundation

## Цель
Подготовить и затем выполнить controlled monorepo-style separation для EMIS, чтобы:

- EMIS перестал жить как "еще один большой модуль внутри dashboard-builder";
- platform/shared foundation остался общим и переиспользуемым;
- BI/dashboard и EMIS перестали излишне смешиваться в code ownership и navigation context;
- проект не раскололся преждевременно на два deployable app, пока это не нужно по runtime/ops.

Ключевое решение этой волны:

- **делаем monorepo-style split по ownership и package boundaries;**
- **не делаем сразу runtime split на два отдельных приложения;**
- **сначала получаем single-deployable monorepo-ready repository, потом при необходимости выносим EMIS в отдельный app почти без переписывания.**

Этот план предназначен для передачи `lead-tactical` и исполнения по agent workflow:

- GPT-5.4 фиксирует topology decision и migration strategy;
- Claude Opus реализует поэтапный migration plan и управляет workers;
- Review Gate обязателен для runtime/code changes;
- при новых topology/design вопросах `lead-tactical` не импровизирует, а эскалирует.

## Подзадачи

### ST-1: Freeze Target Topology And Split Strategy
- scope: `docs/emis_architecture_baseline.md`, `docs/emis_working_contract.md`, `docs/emis_session_bootstrap.md`, `docs/current-project-analysis.md`, `AGENTS.md`, `docs/AGENTS.md`
- depends on: —
- размер: M
- заметки:
  - docs-first decision slice
  - явно зафиксировать target state:
    - monorepo-style repository
    - one deployable app for current phase
    - future-ready option for `apps/emis` / `apps/bi`
  - зафиксировать, что у EMIS и dashboard-builder:
    - разный product identity
    - разный UX/design language
    - разный operational path
    - общий foundation only where reuse is real
  - снять двусмысленность между:
    - "оставляем один app навсегда"
    - "срочно режем на два приложения"
  - recommended verdict:
    - now: single-deployable monorepo
    - later: optional multi-app split

### ST-2: Define Canonical Repository Layout And Package Ownership
- scope: new or updated docs under `docs/`, `AGENTS.md`, optional local `AGENTS.md` updates for moved ownership zones
- depends on: ST-1
- размер: M
- заметки:
  - docs-only architecture slice
  - зафиксировать target layout примерно такого класса:
    - `apps/web` (или equivalent current app shell)
    - `packages/platform-*`
    - `packages/emis-*`
    - `packages/bi-*`
    - `packages/db`
  - для каждого current active zone определить target home:
    - `apps/web/src/lib/shared/*`
    - `apps/web/src/lib/entities/filter/*`
    - `apps/web/src/lib/entities/dataset/*`
    - `apps/web/src/lib/server/datasets/*`
    - `apps/web/src/lib/server/emis/*`
    - `apps/web/src/routes/emis/*`
    - `apps/web/src/routes/dashboard/emis/*`
  - важно: не оставлять "переедет потом как-нибудь"

### ST-3: Define Migration Rules, Import Boundaries And Alias Policy
- scope: `docs/emis_working_contract.md`, `docs/emis_architecture_baseline.md`, `docs/agents/workflow.md`, optional new migration doc if needed
- depends on: ST-2
- размер: S
- заметки:
  - docs-only ruleset
  - зафиксировать migration policy:
    - no big-bang move
    - migrate by bounded slices
    - preserve runtime behavior during structure changes
    - keep old aliases compatible only temporarily
  - явно описать:
    - package import direction
    - what can depend on platform packages
    - what must not depend back on EMIS packages
    - when compatibility re-export is allowed
    - when a move requires docs/runtime contract update

### ST-4: Prepare Workspace Foundation And Baseline Cleanup Plan
- scope: `pnpm-workspace.yaml`, root `package.json`, `eslint.config.js`, root docs for commands/bootstrap, optional new migration doc
- depends on: ST-1, ST-2, ST-3
- размер: M
- заметки:
  - implementation planning + minimal repo foundation
  - before large moves, decide:
    - workspace package globs
    - root scripts vs app-local scripts
    - where DB scripts and smoke scripts live
    - how architecture boundary enforcement is checked automatically during migration
  - mandatory part of this slice:
    - explicitly include current shared baseline blocker in plan
    - current parse/type issues must not be buried under structural migration
    - add initial architecture lint baseline for current repo structure, preferably via pragmatic ESLint import restrictions
    - guardrails must cover at least:
      - FSD layer direction (`shared -> entities/features/widgets/routes`, `entities -> features/widgets/routes`, `features -> widgets/routes`)
      - client-side prohibition on `$lib/server/*` imports
      - EMIS transport/server boundary (`routes/api/emis/*` stays transport-only)
      - no direct `/dashboard/emis/*` dependency on EMIS operational server code
    - do not overbuild the first guardrail layer:
      - start with pragmatic ESLint restrictions
      - stronger package-level enforcement follows after `apps/*` and `packages/*` extraction
  - if runtime edits start here, keep them minimal and boring

#### ST-4 Acceptance Checklist
- workspace foundation:
  - `pnpm-workspace.yaml` describes target workspace globs for future `apps/*` and `packages/*`
  - root `package.json` explicitly separates root orchestration scripts from app-local scripts that should later live under `apps/web`
  - docs explicitly state where DB scripts and smoke scripts live before and after ST-5
- baseline blocker:
  - `Select.svelte` parse/type baseline blocker is not hand-waved away
  - report must state either:
    - blocker resolved in ST-4
    - or blocker is an explicit gate that must be resolved before the next physical move slice
- architecture lint baseline:
  - `eslint.config.js` contains initial import-boundary guardrails for the current repo structure
  - minimum guardrails cover:
    - `shared` must not import from `entities`, `features`, `widgets`, `routes`
    - `entities` must not import from `features`, `widgets`, `routes`
    - `features` must not import from `widgets`, `routes`
    - client-side code must not import from `$lib/server/*`
    - `routes/api/emis/*` must not import UI/client code
    - `routes/dashboard/emis/*` must not import EMIS operational server modules directly
  - implementation should stay pragmatic:
    - prefer `no-restricted-imports` / similar ESLint restrictions first
    - do not introduce heavy dependency tooling unless the simple baseline proves insufficient
- verification:
  - report explicitly states which lint/check commands now verify boundary enforcement
  - any temporary non-enforced gaps are listed explicitly, not hidden behind “follow-up later”
- handoff readiness:
  - `last_report.md` must separately state:
    - what closed workspace foundation
    - what closed architecture lint baseline
    - what risks remain before ST-5
    - why ST-5 is now safe to start

### ST-5: Extract Current App Into `apps/*` Without Behavior Change
- scope: app root config and source placement; likely `src/*`, `static/*`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, app package manifest(s), bootstrap scripts/docs
- depends on: ST-4
- размер: L
- заметки:
  - first physical move
  - target outcome:
    - current SvelteKit runtime lives under one app directory
    - root becomes workspace orchestrator, not the app itself
  - no EMIS-vs-BI logic change in this slice
  - no design refactor in this slice
  - preserve command ergonomics via root scripts or documented wrappers

### ST-6: Extract Shared Platform Packages
- scope: current shared reusable foundation, likely from `apps/web/src/lib/shared/*`, `apps/web/src/lib/entities/filter/*`, `apps/web/src/lib/entities/dataset/*`, `apps/web/src/lib/server/db/*`, selected dataset/provider contracts
- depends on: ST-5
- размер: L
- заметки:
  - extract only real shared foundation
  - avoid dumping half the app into `packages/shared`
  - expected package classes:
    - UI/styles/utils
    - filter engine
    - dataset contracts/runtime
    - DB/shared infra where reuse is real
  - if reuse pressure is weak, keep code in app for now

### ST-7: Extract EMIS Packages And Isolate EMIS Ownership
- scope: EMIS entities/features/widgets/server modules/runtime helpers and related docs/contracts
- depends on: ST-6
- размер: L
- заметки:
  - extract EMIS into dedicated package boundaries:
    - entity contracts
    - server modules
    - map/runtime widgets where feasible
    - route-supporting helpers
  - keep `/routes/emis/*` transport/composition in app layer if needed
  - do not prematurely split route tree into a second SvelteKit app here
  - target result:
    - EMIS code no longer competes with BI code for same ownership namespace

### ST-8: Rationalize BI/Dashboard Packages And Remaining App Glue
- scope: `apps/web/src/routes/dashboard/*`, dataset definitions, BI helpers, app shell/navigation docs
- depends on: ST-6, ST-7
- размер: M
- заметки:
  - topology decision is already frozen:
    - stay within single-deployable monorepo
    - do not reopen "separate EMIS app now?" in this slice
  - `bi-alerts` and `bi-dashboards` are conditional package targets, not mandatory outputs
  - isolate BI/read-side from EMIS operational packages
  - keep app shell thin
  - decide what remains app-specific glue vs what becomes package-level BI foundation
  - avoid turning dashboard routes into another generic shared package dump
  - keep deferred post-ST-7 backlog items out of scope unless they directly block BI/dashboard placement
  - if reusable BI dataset code is touched, report must make the canonical source-of-truth explicit rather than leaving duplicate active-looking locations ambiguous

#### ST-8 Acceptance Checklist
- packaging verdict:
  - `last_report.md` must explicitly state for each conditional BI package target:
    - `bi-alerts` — extracted or intentionally kept in `apps/web`
    - `bi-dashboards` — extracted or intentionally kept in `apps/web`
  - if a package is not created, report must justify the missing reuse pressure concretely, not with "later maybe"
  - do not create speculative packages with no real second consumer or stable package API
- BI/dataset placement:
  - canonical home for reusable BI dataset compilers/helpers must be explicit after the slice
  - if old app-path dataset definitions remain on disk, report must say whether they are:
    - compatibility shims
    - dead legacy candidates for ST-10 cleanup
    - or still canonical by deliberate decision
  - strategy/wildberries route folders must not become storage for reusable non-route BI foundation
- app glue boundaries:
  - all route trees remain in `apps/web/src/routes/*`
  - `apps/web` remains the leaf consumer/composition layer
  - report enumerates what intentionally stayed app glue:
    - route composition
    - app shell/navigation
    - SvelteKit-bound helpers
    - dashboard editor glue if `bi-dashboards` is not justified
    - alert runtime boot/scheduler glue if `bi-alerts` is not justified
- EMIS/BI separation:
  - BI/dashboard code must not import EMIS operational packages directly
  - EMIS read-side dashboards continue through published views / dataset layer, not through `emis-server`
  - no new dependency from `platform-*` back into BI/dashboard code
- docs and navigation:
  - touched BI/dashboard zones have updated navigation docs where placement changed
  - touched strategy/Wildberries/dataset docs no longer leave canonical ownership ambiguous
  - stale references discovered during the slice are either fixed or explicitly listed as deferred
- verification:
  - report includes integrated results for:
    - `pnpm check`
    - `pnpm build`
    - `pnpm lint:boundaries`
  - any pre-existing non-ST-8 gaps remain explicitly listed, not silently absorbed into the slice
- handoff readiness:
  - `last_report.md` must separately state:
    - what BI/dashboard code moved into package boundaries
    - what intentionally remained app glue and why
    - whether `bi-alerts` / `bi-dashboards` were created or explicitly deferred
    - why ST-9 is now safe to start

### ST-9: Verify Commands, Checks, Docs And Handoff Readiness
- scope: scripts/docs/verification paths affected by ST-4..ST-8
- depends on: ST-5, ST-6, ST-7, ST-8
- размер: M
- заметки:
  - this is an integrated-branch verification and docs coherence slice, not a new structural migration
  - do not reopen package topology or conditional package decisions already accepted in ST-8
  - all moved commands and paths must remain discoverable
  - update reading order, ownership docs, and smoke instructions
  - normalize canonical branch/path language where previous reports or docs drifted
  - verification target:
    - repo bootstrap still understandable
    - EMIS newcomer path is shorter and more focused
    - shared foundation is explicit rather than tribal

#### ST-9 Acceptance Checklist
- integrated verification:
  - run on the integrated branch, not a worker-only diff
  - report must include current results for:
    - `pnpm check`
    - `pnpm build`
    - `pnpm lint:boundaries`
  - if any command fails, report must classify:
    - regression introduced in ST-4..ST-8
    - or pre-existing baseline issue
- command discoverability:
  - root/docs reading path must clearly answer:
    - how to bootstrap the repo
    - how to run verification after the migration slices
    - which command is canonical for boundary-only verification
  - if wrappers/root scripts exist, docs must prefer one canonical command rather than listing competing variants without guidance
- docs and navigation coherence:
  - top-level and local navigation docs touched by ST-4..ST-8 must agree on:
    - current package layout
    - current app shell placement
    - current EMIS package placement
    - current BI/dashboard app-glue decisions from ST-8
  - any stale path references discovered in active reading order must be fixed or explicitly listed as deferred
- branch and handoff coherence:
  - canonical integration branch naming must be stated consistently across plan/report/docs that are part of the active workflow
  - if an older branch name remains in historical reports, active docs must make clear what is current vs historical
  - report must call out any remaining ambiguity in branch protocol instead of leaving mixed naming in active guidance
- handoff readiness:
  - `last_report.md` must explicitly state:
    - why ST-10 is now safe to start
    - what active source-of-truth docs a newcomer should read first
    - what residual non-blocking gaps remain after ST-9

### ST-10: Legacy Docs Cleanup And Archive Normalization
- scope: `docs/*`, `docs/archive/*`, root navigation docs, agent docs references
- depends on: ST-1, ST-2, ST-3, ST-9
- размер: M
- заметки:
  - dedicated docs cleanup slice, not mixed into structural moves
  - active scope is docs/archive/navigation normalization only
  - цель:
    - убрать лишние active-looking legacy docs из primary reading path
    - нормализовать, что считается:
      - canonical source of truth
      - active supporting doc
      - historical/archive-only doc
      - completed handoff note
  - cleanup policy:
    - не удалять source-of-truth docs
    - не удалять исторические материалы без archive destination
    - не держать завершенные wave/handoff docs в active top-level `docs/`, если они больше не нужны в reading order
    - где возможно, prefer archive move + explicit note over silent deletion
    - классификация `// MIGRATION` shim-зон допустима только как docs inventory; actual shim removal не входит в этот slice
    - не втягивать в slice deferred technical follow-ups из `P3: Post-Split Architecture Hardening`
    - не втягивать BI-only debt, не влияющий на docs/archive/navigation normalization
  - expected outputs:
    - reduced top-level docs noise
    - updated `docs/AGENTS.md` catalog
    - explicit archive conventions
    - fewer “looks active but actually finished” documents
  - current pre-migration inventory:
    - keep as canonical EMIS docs:
      - `docs/emis_session_bootstrap.md`
      - `docs/emis_architecture_baseline.md`
      - `docs/emis_working_contract.md`
      - `docs/emis_mve_tz_v_2.md`
      - `docs/emis_implementation_spec_v1.md`
      - `docs/emis_freeze_note.md`
    - keep as active supporting EMIS docs:
      - `docs/emis_architecture_review.md`
      - `docs/emis_offline_maps_ops.md`
      - `docs/emis_next_tasks_2026_03_22.md`
    - keep as active cross-domain docs:
      - `docs/current-project-analysis.md`
      - `docs/strategy/bi_strategy.md`
      - `docs/ops/beget_deployment_plan.md`
      - `docs/agents/*`
      - `docs/AGENTS.md`
    - already normalized to archive-only:
      - `docs/archive/emis/emis_vessel_current_positions_handoff_plan.md`
      - `docs/archive/emis/emis_todo_vessel_markers.md`
      - `docs/archive/emis/emis_handoff_2026_03_17.md`
      - `docs/archive/emis/emis_pmtiles_validation_wave.md`
      - `docs/archive/agents/*`
      - `docs/archive/strategy-v1/*`
    - likely later cleanup candidates:
      - empty `docs/emis/` directory if it remains unused
      - further separation of ops docs if more deployment runbooks appear
      - further separation of strategy docs if more BI/strategy design docs appear
      - any future completed handoff/wave notes that accidentally land in top-level `docs/`
  - carry-forward docs cleanup candidates confirmed by ST-9:
    - `README.md` still uses short conceptual paths in "Что уже есть"; normalize only if it improves navigation clarity without making overview prose heavier
    - `docs/emis_working_contract.md` still contains forward-tense wording about the already-closed `Select.svelte` ST-4 blocker; convert to current-state wording during cleanup

#### ST-10 Acceptance Checklist
- scope discipline:
  - touched files stay within docs/navigation/archive surface:
    - `docs/*`
    - `docs/archive/*`
    - `README.md`
    - root/local navigation docs that reference archived or canonical materials
  - no runtime code edits
  - no package topology changes
  - no actual removal of `// MIGRATION` re-export shims as part of this slice
- canonical classification:
  - `docs/AGENTS.md` explicitly distinguishes:
    - canonical source-of-truth docs
    - active supporting docs
    - archive-only / historical docs
    - completed handoff or wave notes
  - active reading order does not send newcomers through historical docs by default
- archive normalization:
  - completed handoff/wave/task notes no longer look like active top-level docs
  - archived docs remain discoverable under `docs/archive/*`
  - archive references are clearly marked historical / not source of truth
- navigation coherence:
  - root `AGENTS.md`, `docs/AGENTS.md`, `docs/emis_session_bootstrap.md` and any touched local navigation docs agree on:
    - current canonical docs
    - current archive locations
    - current single-deployable monorepo framing
  - no reopened debate about topology or package ownership appears in touched docs
- carry-forward cleanup:
  - `README.md` conceptual-path wording is either:
    - normalized for clearer navigation
    - or explicitly left as conceptual overview without pretending to be path navigation
  - `docs/emis_working_contract.md` no longer uses forward-tense wording about the already-closed ST-4 `Select.svelte` blocker
- explicit exclusions:
  - report must state that ST-10 did not absorb:
    - `P3: Post-Split Architecture Hardening`
    - `fetchDataset.ts` boundary-gap remediation
    - `widgets/stock-alerts` BI-only debt
    - `emis-server` decoupling / `EmisMap` decomposition / similar runtime cleanup
  - if `// MIGRATION` shims are mentioned, report must classify them as deferred cleanup inventory unless a docs-only move required a note update
- verification and handoff:
  - report confirms no broken references were introduced in touched docs
  - if no runtime commands were needed, report says so explicitly instead of implying missing verification
  - `last_report.md` must separately state:
    - which docs remain canonical
    - which docs were archived/moved or reclassified
    - which docs were intentionally left in place and why
    - what cleanup candidates remain deferred after ST-10

## Recommended Execution Order
1. ST-1 topology freeze.
2. ST-2 target layout and ownership map.
3. ST-3 migration rules and alias policy.
4. ST-4 workspace foundation plan + baseline cleanup plan.
5. ST-5 move current app into `apps/*`.
6. ST-6 extract shared platform packages.
7. ST-7 extract EMIS packages.
8. ST-8 isolate BI/dashboard packages and remaining app glue.
9. ST-9 docs/checks/handoff verification.
10. ST-10 legacy docs cleanup and archive normalization.

## Worker Strategy
- ST-1 to ST-4 should be owned directly by `lead-tactical` or one doc-focused worker only.
- Do not delegate structural decisions before topology and ownership are frozen.
- After ST-4 checkpoint:
  - Worker A: ST-5 app extraction
  - Worker B: ST-6 shared platform packages
  - Worker C: ST-7 EMIS package extraction
  - Worker D: ST-8 BI/dashboard rationalization
- ST-6, ST-7, ST-8 may run partially in parallel only if:
  - package ownership is disjoint
  - integration branch already contains the result of ST-5
  - `lead-tactical` clearly assigns write boundaries
- ST-9 must run on integrated branch, not on isolated worker branches.
- ST-10 should run only after the new reading order is already stable.
- Do not mix docs cleanup with app/package moves in the same worker task.

## Lead-Tactical Kickoff
1. Read this plan end-to-end before delegating anything.
2. Re-read:
   - `docs/agents/workflow.md`
   - `docs/agents/templates.md`
   - `docs/emis_session_bootstrap.md`
   - `docs/emis_architecture_baseline.md`
   - `docs/emis_working_contract.md`
   - `docs/current-project-analysis.md`
   - `AGENTS.md`
   - `docs/AGENTS.md`
3. Confirm the current integration branch is:
   - `feature/emis-foundation-stabilization`
4. Execute ST-1, ST-2, ST-3, ST-4 before spawning implementation workers.
5. Do not start physical moves while topology/ownership rules remain ambiguous.
6. Do not start ST-5 until ST-4 explicitly defines the initial automated architecture guardrails.
7. Before each worker task, explicitly state:
   - owned files/directories
   - forbidden directories
   - which checkpoints/commits are already merged into integration branch
8. After each worker handoff:
   - review placement and dependency direction first
   - merge into integration branch
   - only then hand off the next dependent structural slice
9. Review Gate runs on integrated diff, not on prose summary.
10. If migration starts to look like a big-bang rewrite, stop and re-slice.
11. Execute docs cleanup only after the new canonical docs and paths are already confirmed.

## Worker Task Drafts

### Worker A Draft: ST-5 Extract Current App Into `apps/*`

```md
# Task: ST-5 Extract Current App Into apps/*

## Что сделать
Перевести текущий SvelteKit runtime из repo root в app directory внутри monorepo-style layout без изменения пользовательского поведения.

## Scope
- файлы:
  - app runtime/config files
  - package/workspace manifests
  - bootstrap docs and command docs affected by the move
- слои: app shell, workspace config, repo bootstrap
- НЕ трогать:
  - EMIS domain logic
  - BI business logic
  - DB schema contents

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branch: `agent/worker/app-extraction`

## Архитектурные ограничения
- No second deployable app.
- No behavioral refactor hidden inside move.
- Preserve command ergonomics as much as possible.
- If alias compatibility is needed, keep it explicit and temporary.

## Проверки
- repo bootstrap commands still resolve
- targeted app build/check path documented

## Формат сдачи
Используй `Worker Handoff` из `docs/agents/templates.md`.
Обязательно укажи:
- old path -> new path mapping
- какие root scripts were kept as wrappers
- какие follow-up moves are now unblocked
```

### Worker B Draft: ST-6 Extract Shared Platform Packages

```md
# Task: ST-6 Extract Shared Platform Packages

## Что сделать
Вытащить из текущего app runtime только реально shared foundation в отдельные workspace packages без превращения migration в generic dump.

## Scope
- файлы:
  - shared UI/styles/utils
  - filter engine
  - dataset contracts/runtime
  - shared DB/helpers only where reuse is clear
- НЕ трогать:
  - EMIS-specific business logic
  - dashboard route composition
  - app shell/navigation beyond necessary import rewiring

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branch: `agent/worker/platform-packages`

## Архитектурные ограничения
- Extract only real foundation.
- Do not create one giant `shared-everything` package.
- Dependency direction must stay one-way toward platform, not back from platform to domain packages.

## Проверки
- imports resolve cleanly
- targeted type/runtime checks for moved packages

## Формат сдачи
Используй `Worker Handoff`.
Обязательно укажи:
- package list
- why each extracted slice is truly shared
- what intentionally stayed in app layer
```

### Worker C Draft: ST-7 Extract EMIS Packages

```md
# Task: ST-7 Extract EMIS Packages And Isolate EMIS Ownership

## Что сделать
Вынести EMIS code into dedicated workspace package boundaries so that EMIS stops competing with BI/platform code inside the same ownership namespace.

## Scope
- файлы:
  - EMIS entities/features/widgets
  - `server/emis/*`
  - EMIS route-supporting helpers where appropriate
- НЕ трогать:
  - broad BI/dashboard refactor
  - DB schema redesign
  - second SvelteKit app split

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branch: `agent/worker/emis-packages`

## Архитектурные ограничения
- Keep operational boundaries intact.
- Do not move route transport/business logic into the wrong layer.
- Avoid speculative over-packaging.

## Проверки
- imports resolve
- EMIS path remains discoverable in docs
- targeted EMIS runtime checks where practical

## Формат сдачи
Используй `Worker Handoff`.
Обязательно укажи:
- extracted EMIS package boundaries
- what remained app glue intentionally
- what future `apps/emis` split is now enabled by this move
```

### Worker D Draft: ST-8 Rationalize BI/Dashboard Packages And Remaining App Glue

```md
# Task: ST-8 Rationalize BI/Dashboard Packages And Remaining App Glue

## Что сделать
Закрыть remaining BI/dashboard structural questions после ST-6 и ST-7:
- отделить reusable BI/dashboard foundation от app-local glue;
- не переоткрывать topology decision;
- принять явное решение по conditional targets `bi-alerts` и `bi-dashboards`.

## Scope
- файлы:
  - `apps/web/src/routes/dashboard/*`
  - dataset-related BI code and docs touched by BI/dashboard placement
  - `apps/web/src/lib/features/dashboard-edit/*`
  - `apps/web/src/lib/server/alerts/*`
  - app shell/navigation docs affected by the placement result
- НЕ трогать:
  - EMIS operational/server refactors outside direct BI boundary needs
  - second app split
  - broad docs archive cleanup outside touched BI/dashboard references

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branch: `agent/worker/bi-dashboard-rationalization`

## Архитектурные ограничения
- Routes stay in `apps/web`.
- `bi-alerts` / `bi-dashboards` are optional, only if reuse pressure is real.
- Do not turn route folders into hidden package-level libraries.
- BI must not import EMIS operational code directly; use dataset/read-model boundaries.
- If you keep code in app, say why it is app glue instead of package foundation.

## Проверки
- imports resolve after any placement change
- `pnpm check`
- `pnpm build`
- `pnpm lint:boundaries`
- docs/navigation for touched BI zones remain accurate

## Формат сдачи
Используй `Worker Handoff`.
Обязательно укажи:
- package verdict for `bi-alerts`
- package verdict for `bi-dashboards`
- canonical home for touched BI dataset/helpers
- what remained app glue intentionally
- why ST-9 is or is not unblocked
```

### Worker E Draft: ST-9 Verify Commands, Checks, Docs And Handoff Readiness

```md
# Task: ST-9 Verify Commands, Checks, Docs And Handoff Readiness

## Что сделать
Проверить integrated result после ST-5..ST-8 как единое состояние репозитория:
- прогнать canonical verification;
- выровнять docs/navigation/reading order;
- убрать неоднозначность в branch/path guidance для следующего handoff.

## Scope
- файлы:
  - root/docs navigation and workflow docs affected by ST-4..ST-8
  - touched local `AGENTS.md` and command docs where discoverability drift remains
  - `docs/agents/lead-tactical/last_report.md` for current handoff
- НЕ трогать:
  - new structural moves
  - package topology decisions already accepted
  - archive normalization beyond what is needed to keep active reading order coherent

## Ветки
- integration branch: canonical current integration branch for this wave
- worker branch: `agent/worker/st9-verification-handoff`

## Архитектурные ограничения
- Verify integrated state; do not use ST-9 to sneak in extra refactors.
- Prefer fixing active-doc drift over expanding scope into broad cleanup.
- If branch naming drift is found, normalize active guidance and clearly mark historical references as historical.

## Проверки
- `pnpm check`
- `pnpm build`
- `pnpm lint:boundaries`
- active reading-order docs resolve to real current paths

## Формат сдачи
Используй `Worker Handoff`.
Обязательно укажи:
- current canonical verification commands
- docs/paths/branch references fixed
- any residual non-blocking gaps
- why ST-10 is now or is not safe to start
```

### Worker F Draft: ST-10 Legacy Docs Cleanup And Archive Normalization

```md
# Task: ST-10 Legacy Docs Cleanup And Archive Normalization

## Что сделать
Привести docs tree в состояние, где active reading path короткий и очевидный, а historical/completed materials не маскируются под рабочие source-of-truth документы.

## Scope
- файлы:
  - `docs/*`
  - `docs/archive/*`
  - root/navigation docs that reference moved or archived materials
- НЕ трогать:
  - runtime code
  - DB schema/runtime contracts
  - structural app/package moves

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branch: `agent/worker/docs-cleanup`

## Архитектурные ограничения
- Do not delete active source-of-truth docs.
- Prefer archive move + explicit discoverability note over silent deletion.
- Keep current canonical reading order short and stable.
- If a document still matters for active work, do not archive it just because it is old.
- Do not use ST-10 to remove `// MIGRATION` shims or to change runtime/package boundaries.
- Do not pull deferred `P3` hardening or BI-only debt into this docs slice.

## Проверки
- `docs/AGENTS.md` remains coherent
- `emis_session_bootstrap.md` reading order stays valid
- no broken references introduced in touched docs

## Формат сдачи
Используй `Worker Handoff`.
Обязательно укажи:
- which docs were kept canonical
- which docs were archived/moved
- which docs were intentionally left in place and why
- which deferred cleanup items were explicitly kept out of scope
```

## Architectural Decisions To Carry Through
- EMIS and dashboard-builder/BI share foundation, but not product identity.
- Physical separation should follow real ownership and context boundaries, not branding alone.
- Current target topology is **single-deployable monorepo**, not immediate multi-app deployment.
- `apps/*` + `packages/*` is the default migration direction.
- Dataset/IR remains a BI/read-side contract, not a home for EMIS operational growth.
- EMIS operational/server path remains:
  `routes/api/emis/* -> server/emis/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`
- Shared packages must stay boring and minimal; no “god package”.
- Boundary rules should be enforced twice over time:
  - first by pragmatic ESLint restrictions on current structure
  - later by package boundaries / exports after extraction
- Docs cleanup is a separate discipline slice after topology stabilization, not a side effect of random feature work.

## Ограничения
- Не открывать заново вопрос "делаем ли прямо сейчас отдельный EMIS deployable".
- Не начинать с big-bang filesystem rewrite.
- Не смешивать monorepo migration с feature expansion EMIS.
- Не смешивать legacy docs cleanup с runtime refactor в одном slice.
- Не маскировать baseline runtime problems структурными move-коммитами.
- Не откладывать automated boundary enforcement до конца migration; первый guardrail layer должен появиться до ST-5.
- `routes/api/emis/*` остаются transport-only.
- EMIS operational logic не уходит в dataset compiler.
- Runtime/docs contracts должны сохранять discoverability после move.
- Если structural move меняет DB/runtime contract docs paths, обновлять их в том же slice.

## Review Gate Expectations
- ST-1 to ST-4:
  - `docs-reviewer`
  - `architecture-reviewer`
- ST-5 to ST-9:
  - `architecture-reviewer`
  - `docs-reviewer`
  - `code-reviewer`
  - `security-reviewer` if server/import/runtime behavior changed materially
  - `ui-reviewer` only if frontend behavior changed materially
- ST-10:
  - `docs-reviewer`
  - `architecture-reviewer` only if cleanup changes ownership or canonical reading order materially
- Any ambiguity in topology, import direction, or package ownership:
  - escalate to user for GPT-5.4 decision

## Git Checkpoints
- checkpoint 1: topology freeze
- checkpoint 2: target layout + ownership map
- checkpoint 3: migration rules + workspace foundation plan
- checkpoint 4: app extraction into `apps/*`
- checkpoint 5: shared platform packages
- checkpoint 6: EMIS package extraction
- checkpoint 7: BI/dashboard rationalization
- checkpoint 8: command/docs/check verification
- checkpoint 9: legacy docs cleanup and archive normalization

## Ожидаемый результат
- Repo stops being cognitively “one large SvelteKit app with everything mixed by proximity”.
- EMIS gets clearer ownership and shorter reading path in new dialogs.
- Shared foundation becomes explicit package-level architecture instead of implicit `apps/web/src/lib/*` overlap.
- Migration gets an early automated boundary-check layer instead of relying only on review discipline.
- BI/dashboard and EMIS can evolve independently without immediate deploy split.
- Future `apps/emis` or `apps/bi` split becomes feasible with bounded follow-up work, not a repo rewrite.
- Active docs tree becomes shorter and less misleading for new sessions; historical materials stay discoverable but stop polluting the primary context.
