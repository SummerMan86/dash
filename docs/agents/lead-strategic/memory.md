# Lead-Strategic Memory

Персистентная память GPT-5.4 lead между сессиями.
Обновляется в конце каждой сессии.

## Принятые решения

- EMIS уже считаем отдельным доменным контуром, а не просто частью "dashboard-builder demo".
- Текущий правильный topology decision:
  - single-deployable monorepo-style repository now
  - optional split into separate apps later
  - no immediate second deployable app for EMIS
- Shared foundation остается общей, но product identity и ownership у EMIS и BI/dashboard считаются разными.
- Для новых EMIS задач canonical docs теперь:
  - `docs/emis_architecture_baseline.md`
  - `docs/emis_working_contract.md`
- Strategic plan for the next wave lives in:
  - `docs/agents/lead-strategic/current_plan.md`
  - topic: `EMIS Monorepo-Style Separation And Shared Foundation`
- Legacy docs cleanup should be treated as a separate explicit slice after topology/read-order stabilization, not as ad hoc deletion during feature work.

## Контекст текущей работы

- Приняты и закрыты structural slices:
  - ST-1, ST-2, ST-3 — topology/layout/rules docs
  - ST-4 — workspace foundation + boundary lint baseline
  - ST-5 — current app extracted to `apps/web`
  - ST-6 — shared platform packages extracted:
    - `platform-core`
    - `db`
    - `platform-ui`
    - `platform-datasets`
    - `platform-filters`
  - ST-7 — EMIS packages extracted:
    - `emis-contracts`
    - `emis-server`
    - `emis-ui`
  - ST-8 — BI/dashboard rationalization accepted:
    - `bi-alerts` intentionally stays in `apps/web`
    - `bi-dashboards` intentionally stays in `apps/web`
    - BI/dashboard canonical placement vs app glue is now explicit
  - ST-9 — integrated verification/docs coherence accepted:
    - canonical verification commands confirmed:
      - `pnpm check`
      - `pnpm build`
      - `pnpm lint:boundaries`
    - active workflow docs now use canonical integration branch name:
      - `feature/emis-foundation-stabilization`
    - ST-10 is unblocked
- Root repo now acts as workspace orchestrator; runtime lives under `apps/web`.
- `Select.svelte` baseline blocker is resolved; `pnpm check` is green.
- Canonical boundary-only verification now exists via `pnpm lint:boundaries`.
- New active package zones now have local `AGENTS.md`:
  - `packages/emis-contracts/AGENTS.md`
  - `packages/emis-server/AGENTS.md`
  - `packages/emis-ui/AGENTS.md`
- Pre-migration docs cleanup already started:
  - vessel handoff and ad hoc EMIS TODO moved to `docs/archive/emis/*`
  - strategy doc moved to `docs/strategy/bi_strategy.md`
  - deployment runbook moved to `docs/ops/beget_deployment_plan.md`
  - stale references to old EMIS agent docs were replaced with `docs/agents/workflow.md` and `docs/agents/templates.md`
- Post-ST-7 architectural follow-ups were intentionally moved to backlog:
  - `docs/emis_next_tasks_2026_03_22.md`
  - Track `P3: Post-Split Architecture Hardening`
  - includes:
    - remove SvelteKit coupling from `emis-server`
    - decompose `EmisMap.svelte`
    - deduplicate `clampPageSize()`
    - stabilize `mapVesselsQuery` param assembly
    - resolve `fetchDataset.ts` boundary gap
    - remove redundant `cacheKeyQuery` in `fetchDataset.ts` if it becomes unnecessary during the boundary fix
- ST-10 carry-forward cleanup candidates already noted in strategic plan:
  - `README.md` still uses short conceptual paths in one overview section
  - `docs/emis_working_contract.md` still has stale forward-tense wording about the already-closed ST-4 `Select.svelte` blocker
- ST-10 scope must stay narrow:
  - docs/archive/navigation normalization only
  - `// MIGRATION` shims may be inventoried/classified in docs, but not removed in this slice
  - deferred `P3: Post-Split Architecture Hardening` items stay out of scope
  - BI-only debt such as `widgets/stock-alerts -> routes/*` stays out of scope

## Заметки для следующей сессии

- Если следующая задача про structural migration, начинать с `docs/agents/lead-strategic/current_plan.md`.
- Следующий strategic slice по плану: `ST-10` (Legacy Docs Cleanup And Archive Normalization).
- Не переоткрывать спор "нужен ли отдельный EMIS app прямо сейчас" без нового runtime/ops pressure.
- Для нового диалога по `ST-10` считать текущей базой:
  - ST-8 и ST-9 уже приняты
  - active workflow docs и branch naming уже выровнены
  - remaining task is docs/archive normalization, not package migration
- Strategic acceptance gate for ST-10 now lives in:
  - `docs/agents/lead-strategic/current_plan.md`
  - use that checklist instead of improvising extra cleanup goals
- Не втягивать в `ST-10` deferred follow-ups из backlog `P3`, если новый scope их явно не требует.
- Не втягивать в `ST-10` BI-only debt вроде `widgets/stock-alerts -> routes/*`; это не EMIS backlog item.
- Если задача про cleanup docs:
  - сначала отделить canonical docs от supporting docs и archive-only docs
  - prefer archive move + clear note over silent deletion
  - не удалять source-of-truth документы ради “визуальной чистоты”
  - использовать inventory из ST-10 в `current_plan.md` как baseline, а не собирать карту заново
