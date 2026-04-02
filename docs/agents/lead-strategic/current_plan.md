# Plan: EMIS Foundation Stabilization And Extension Readiness

## Цель
Стабилизировать не только текущий MVE-контур EMIS, а именно фундамент системы, чтобы следующие волны развития не превратили приложение в несобираемый монолит:
- подключение новых источников;
- расширение write/query flows;
- эволюция модели данных;
- переход от плоской модели `news + links` к richer graph/event/provenance model;
- будущие forecasting / verification / ingestion pipelines;
- дальнейший рост BI/read-model contracts.

Смысл этого плана:
- сначала зафиксировать фундаментальные границы и правила эволюции;
- затем закрыть минимальные operational guardrails;
- не путать "сделать еще одну фичу" с "подготовить архитектуру к широкому развитию".

Этот план предназначен для передачи `lead-tactical` и исполнения по agent workflow:
- GPT-5.4 определяет фундаментальные рамки и принимает результат;
- Claude Opus исполняет план, ставит bounded задачи workers при необходимости;
- после code/runtime changes обязателен Review Gate;
- при новых cross-layer design decisions `lead-tactical` не импровизирует, а эскалирует.

## Подзадачи

### ST-1: Freeze Foundation Architecture For Future Growth
- scope: `docs/emis_mve_tz_v_2.md`, `docs/emis_implementation_spec_v1.md`, `docs/emis_session_bootstrap.md`, `docs/emis_freeze_note.md`, `db/schema_catalog.md`
- depends on: —
- размер: M
- заметки:
  - docs-first architecture freeze
  - зафиксировать как canonical foundation:
    - operational write model
    - staging / ingestion model
    - published read-model / BI model
  - явно описать, что current `news_items + news_object_links` — текущий MVE slice, а не final target model для graph analytics
  - зафиксировать, что будущие `events`, graph edges, verification artifacts, forecasts не должны врастать случайными полями в route/UI слой
  - зафиксировать, где будут жить:
    - source ingestion contracts
    - provenance and canonical identity rules
    - graph-ready domain contracts
    - published analytical contracts
  - цель: снять двусмысленность "доращиваем текущие CRUD-таблицы как придется" vs "строим расширяемое ядро"

### ST-2: Define Schema Evolution Policy For Graph/Source Expansion
- scope: `docs/emis_freeze_note.md`, `docs/emis_session_bootstrap.md`, `db/schema_catalog.md`, optional new section in `docs/emis_implementation_spec_v1.md`, optional `db/applied_changes.md` note if needed
- depends on: ST-1
- размер: S
- заметки:
  - docs-only decision slice
  - зафиксировать policy:
    - raw ingestion data does not become UI contract directly
    - new source-specific fields do not leak into generic entities without contract review
    - graph relations are separate domain contracts, not ad hoc extension of `news_object_links`
    - BI/forecasting reads consume documented views/read models, not operational tables directly
  - явно разделить:
    - what is stable public contract
    - what is internal operational schema
    - what is allowed to evolve aggressively

### ST-3: Freeze Minimal Operating Model And Dictionary/Admin Scope
- scope: `docs/emis_mve_tz_v_2.md`, `docs/emis_session_bootstrap.md`, `docs/emis_freeze_note.md`, `docs/emis_next_tasks_2026_03_22.md`, `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- depends on: ST-1
- размер: S
- заметки:
  - docs-only stage; Review Gate: только `docs-reviewer`
  - зафиксировать без скрытой RBAC-фантазии:
    - MVE runs in trusted/internal contour
    - `viewer` = read only
    - `editor` = writes for current bounded operational slices
    - `admin` = operational/admin scope only if explicitly implemented
  - принять одно решение по словарям:
    - recommended default: `seed-managed only` for MVE
  - явно разделить:
    - что enforceится сейчас
    - что postponed beyond MVE

### ST-4: Design And Implement Centralized Write Policy Helper
- scope: `src/lib/server/emis/infra/*`, `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`, optional docs alignment in `docs/emis_session_bootstrap.md` and backlog
- depends on: ST-3
- размер: M
- заметки:
  - один reusable helper для production-shaped write policy
  - helper должен покрывать both API writes and manual UI actions
  - policy questions, которые должны быть закрыты в implementation:
    - require actor header in production-shaped mode or explicit trusted fallback policy
    - clear dev/local behavior
    - stable machine-readable failure code for denied write
  - не тащить auth/RBAC framework; только minimum enforceable guardrail

### ST-5: Wire Write Policy Into All Current EMIS Write Entry Points
- scope: `src/routes/api/emis/objects/*`, `src/routes/api/emis/news/*`, `src/routes/emis/objects/*/+page.server.ts`, `src/routes/emis/news/*/+page.server.ts`
- depends on: ST-4
- размер: M
- заметки:
  - transport/action integration only
  - route files остаются transport-only
  - не дублировать policy logic в route actions
  - expected write entry points:
    - API `POST/PATCH/DELETE`
    - manual UI `new/edit` actions

### ST-6: Define And Implement Health/Readiness/Error-Logging Contract
- scope: `src/routes/api/emis/health/+server.ts`, `src/lib/server/emis/infra/http.ts`, new infra helper(s) if needed, `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`, `docs/emis_session_bootstrap.md`, `docs/emis_next_tasks_2026_03_22.md`
- depends on: ST-3
- размер: M
- заметки:
  - endpoint must say more than "snapshot files exist"
  - minimum target:
    - explicit DB readiness semantics
    - degraded/unavailable states
    - one centralized place for EMIS API error logging
    - no credential/token leakage in logs
  - keep contract boring and operable; no observability platform buildout

### ST-7: Add Contract Checks And Negative-Path Smoke Coverage
- scope: `scripts/emis-smoke.mjs`, `scripts/emis-write-smoke.mjs`, optional new helper script if needed, docs references to smoke path
- depends on: ST-5, ST-6
- размер: S
- заметки:
  - add at least:
    - negative case for denied write / missing required write context
    - readiness/health contract verification
  - if practical, add one assertion that documented contract layer is used instead of raw operational shortcut
  - goal: foundation rules do not live only in prose

### ST-8: Prevent Further Growth Of Oversized `/emis` Route And Map Widget
- scope: `src/routes/emis/+page.svelte`, `src/routes/emis/AGENTS.md`, `src/lib/widgets/emis-map/EmisMap.svelte`, `src/lib/widgets/emis-map/AGENTS.md`, optional extraction helpers/components if touched by previous tasks
- depends on: ST-1
- размер: M
- заметки:
  - this is a bounded stabilization slice, not a full redesign
  - acceptable outcomes:
    - docs-level hard guardrail only, if no feature work touched these files
    - or small extraction directly caused by ST-5/ST-6 integration
  - do not start speculative large refactor
  - if new logic must land in these files, extraction is the default, not further inline growth

## Recommended Execution Order
1. ST-1 architecture freeze for future growth.
2. ST-2 schema evolution policy for graph/source expansion.
3. ST-3 operating model + dictionary/admin scope.
4. ST-4 centralized write-policy helper.
5. ST-5 write-entry-point integration.
6. ST-6 health/readiness + centralized error logging.
7. ST-7 smoke/contract hardening.
8. ST-8 only as guardrail/extraction work needed by the previous slices.

## Worker Strategy
- Default stance: one worker at a time. Quality > parallelism.
- `lead-tactical` should do ST-1 and ST-2 directly or with one doc-focused worker, because these tasks define the rest of the wave.
- Recommended delegation after docs freeze:
  - Worker A: ST-4 `infra` write-policy helper
  - Worker B: ST-5 write-entry-point wiring
  - Worker C: ST-6 health/readiness/error-logging slice
- Do not run ST-5 before ST-4 is merged into the integration branch.
- ST-7 should run only after the integration branch already contains ST-5 and ST-6.
- ST-8 should not become an open-ended refactor track.

## Lead-Tactical Kickoff
1. Read this plan end-to-end before delegating anything.
2. Re-read:
   - `docs/agents/workflow.md`
   - `docs/agents/templates.md`
   - `docs/emis_session_bootstrap.md`
   - `docs/emis_mve_tz_v_2.md`
   - `docs/emis_implementation_spec_v1.md`
   - `docs/emis_freeze_note.md`
   - `db/schema_catalog.md`
3. Confirm the current integration branch is:
   - `feature/emis-foundation-stabilization`
4. Execute ST-1, ST-2, ST-3 before spawning implementation workers.
5. After ST-3 is checkpointed, decide whether ST-4, ST-5, ST-6 should be:
   - sequential with one worker at a time
   - or partially parallel, but only with disjoint ownership and clear dependency handling
6. Do not delegate unresolved design questions to workers.
7. Before each worker task, explicitly state:
   - files owned by the worker
   - files out of scope
   - which prior checkpoint/commit the worker must build on
8. After each worker handoff:
   - review placement and scope discipline first
   - merge into the integration branch
   - only then hand off the next dependent slice
9. Run Review Gate on the integrated diff, not on isolated worker prose summaries.

## Worker Task Drafts

### Worker A Draft: ST-4 Centralized Write Policy Helper
Use this as the starting handoff from `lead-tactical` to a worker.

```md
# Task: ST-4 Centralized Write Policy Helper

## Что сделать
Реализовать один reusable helper для production-shaped EMIS write policy.
Helper должен централизованно решать, разрешен ли write в текущем контексте, и возвращать/пробрасывать стабильную machine-readable ошибку для disallowed writes.

## Scope
- файлы:
  - `src/lib/server/emis/infra/*`
  - `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- слои: `server/emis/infra`, runtime contract
- НЕ трогать:
  - `src/routes/api/emis/*`
  - `src/routes/emis/*`
  - `db/*`

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branch: `agent/worker/emis-write-policy`

## Архитектурные ограничения
- Не тащить auth/RBAC framework.
- Не дублировать policy в нескольких helper'ах.
- Route-specific logic не должна переехать в `infra`.
- Runtime contract обновить, если меняется error/code behavior.

## Проверки
- `pnpm check` если затрагивается typed runtime behavior
- targeted review of changed files

## Формат сдачи
Используй `Worker Handoff` из `docs/agents/templates.md`.
Обязательно укажи:
- helper API
- где и как предполагается его вызывать из API routes и manual actions
- какой failure code введен
```

### Worker B Draft: ST-5 Write Entry Point Integration
Use this only after ST-4 is merged into the integration branch.

```md
# Task: ST-5 Wire Write Policy Into Current EMIS Write Entry Points

## Что сделать
Подключить уже реализованный centralized write-policy helper ко всем текущим EMIS write entry points:
- API `POST/PATCH/DELETE`
- manual UI `new/edit` actions

## Scope
- файлы:
  - `src/routes/api/emis/objects/*`
  - `src/routes/api/emis/news/*`
  - `src/routes/emis/objects/*/+page.server.ts`
  - `src/routes/emis/news/*/+page.server.ts`
- слои: transport routes, SvelteKit form actions
- НЕ трогать:
  - `src/lib/server/emis/modules/*`
  - `db/*`
  - broad docs rewrite beyond small contract sync

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branch: `agent/worker/emis-write-entrypoints`

## Архитектурные ограничения
- Route files остаются transport-only.
- Не дублировать policy logic inline.
- Не менять domain behavior service/repository слоя без явной необходимости.
- Если нужна docs sync, ограничить ее runtime-contract related updates.

## Проверки
- `pnpm check`
- targeted manual review of all touched write entry points

## Формат сдачи
Используй `Worker Handoff` из `docs/agents/templates.md`.
Обязательно перечисли:
- какие entry points покрыты
- какие behavior changes появились для denied writes
- какие файлы остались нетронутыми намеренно
```

### Worker C Draft: ST-6 Health/Readiness/Error Logging
Use this after ST-3 is frozen. If ST-4/ST-5 are still in progress, keep the ownership strictly disjoint.

```md
# Task: ST-6 Health Readiness And Centralized API Error Logging

## Что сделать
Превратить текущий `/api/emis/health` в явный operational contract и добавить одно централизованное место для EMIS API error logging без утечки credential/token data.

## Scope
- файлы:
  - `src/routes/api/emis/health/+server.ts`
  - `src/lib/server/emis/infra/http.ts`
  - `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
  - optional small docs sync in `docs/emis_session_bootstrap.md` and `docs/emis_next_tasks_2026_03_22.md`
- слои: transport + infra
- НЕ трогать:
  - `src/routes/emis/+page.svelte`
  - `src/lib/widgets/emis-map/*`
  - `db/current_schema.sql` unless a true DB contract change is required

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branch: `agent/worker/emis-health-readiness`

## Архитектурные ограничения
- Health endpoint должен сообщать больше, чем наличие snapshot files.
- Не строить observability platform.
- Logging должен быть centralized и safe by default.
- Не добавлять hidden business logic в route layer.

## Проверки
- `pnpm check`
- targeted endpoint contract verification if practical

## Формат сдачи
Используй `Worker Handoff` из `docs/agents/templates.md`.
Обязательно укажи:
- новая shape/semantics health-readiness ответа
- где теперь централизованно логируются EMIS API failures
- какие sensitive values intentionally do not get logged
```

## Architectural Decisions To Carry Through
- EMIS remains a modular monolith, not a microservice split project.
- The foundation is three-layered:
  - operational/domain write model in `emis`
  - staging/ingestion model in `stg_emis`
  - published analytical contracts in `mart_emis` / `mart`
- New source onboarding should land through domain/staging contracts, not through ad hoc route-level logic.
- Future graph/event/forecasting capabilities should extend the domain model through explicit new contracts and published read models, not by overloading current CRUD DTOs in place.
- Dataset/IR stays for BI/read-side contracts; it is not the default home for operational growth.

## Ограничения
- Не открывать заново вопросы monorepo/microservices/topology.
- Не смешивать foundation stabilization с post-MVE feature implementation:
  - no vessel historical track
  - no broad admin UI
  - no full RBAC/auth project
  - no full graph model implementation
  - no forecasting engine implementation
  - no speculative dataset/IR expansion for operational flows
- `routes/api/emis/*` остаются transport-only: без SQL и без business logic.
- Новый shared abstraction добавлять только при явном reuse pressure.
- Runtime changes обязательно отражать в `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`.
- Contract-level docs updates должны поддерживать discoverability в `docs/emis_session_bootstrap.md` и `docs/AGENTS.md`.
- Если меняется DB contract, обновлять `db/current_schema.sql` и `db/applied_changes.md`.
- Для docs-only slice не трогать runtime code без необходимости.
- Не продолжать рост `src/routes/emis/+page.svelte` и `src/lib/widgets/emis-map/EmisMap.svelte` без extraction justification.

## Review Gate Expectations
- ST-1 to ST-3:
  - `docs-reviewer`
  - `architecture-reviewer` if wording changes architecture ownership or published contracts
- ST-4 to ST-8:
  - `architecture-reviewer`
  - `security-reviewer`
  - `docs-reviewer`
  - `code-reviewer`
  - `ui-reviewer` only if `.svelte` UI behavior changed materially
- Any new contract/schema/cross-layer ambiguity:
  - escalate to user for GPT-5.4 decision, do not improvise

## Git Checkpoints
- checkpoint 1: architecture freeze for future growth
- checkpoint 2: schema evolution policy for graph/source expansion
- checkpoint 3: operating model + dictionary/admin scope freeze
- checkpoint 4: centralized write-policy helper
- checkpoint 5: write-entry-point integration
- checkpoint 6: health/readiness + API error logging
- checkpoint 7: smoke/contract hardening
- optional checkpoint 8: bounded extraction if oversized file growth was touched

## Ожидаемый результат
- EMIS gets a documented foundation for broad future growth, not only local MVE polish.
- The team has one explicit rule set for how operational schema, ingestion schema, and published read models evolve.
- Future graph/event/forecasting work has a prepared architectural lane instead of growing as accidental extensions of current CRUD slices.
- Production-shaped writes have one centralized guardrail instead of permissive fallback-only behavior.
- Dictionary/admin scope stops being ambiguous for future sessions.
- `/api/emis/health` becomes a real operational contract with readiness semantics.
- Route-level EMIS failures are logged in one place with consistent format.
- Smoke coverage checks both happy path and at least the critical negative guardrail path.
- `lead-tactical` can execute the stabilization wave without reopening core architecture decisions on every next feature.
