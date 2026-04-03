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

- **Wave ST-1..ST-10 полностью закрыта (2026-04-03).**
- Все 10 structural slices приняты и закоммичены на `feature/emis-foundation-stabilization`.
- Краткий итог wave:
  - ST-1..ST-3: topology/layout/rules docs
  - ST-4: workspace foundation + boundary lint baseline, Select.svelte blocker resolved
  - ST-5: app extracted to `apps/web`
  - ST-6: 5 shared platform packages (platform-core, db, platform-ui, platform-datasets, platform-filters)
  - ST-7: 3 EMIS packages (emis-contracts, emis-server, emis-ui)
  - ST-8: BI/dashboard rationalization (bi-alerts, bi-dashboards kept in app with justification)
  - ST-9: integrated verification, docs coherence, stale branch/baseline fixes
  - ST-10: docs classification, archive normalization, carry-forward cleanup
- Root repo is workspace orchestrator; runtime lives under `apps/web`.
- 8 packages total, canonical verification: `pnpm check`, `pnpm build`, `pnpm lint:boundaries`.
- `docs/AGENTS.md` now has explicit doc classification (canonical/active/reference/archive).
- Post-wave deferred items (not blocking, tracked in backlog):
  - ~53 `// MIGRATION` re-export shims — code removal, not docs scope
  - `P3: Post-Split Architecture Hardening`:
    - remove SvelteKit coupling from `emis-server`
    - decompose `EmisMap.svelte`
    - deduplicate `clampPageSize()`
    - stabilize `mapVesselsQuery` param assembly
    - resolve `fetchDataset.ts` boundary gap
    - remove redundant `cacheKeyQuery` in `fetchDataset.ts`
  - Pre-existing FSD violations: stock-alerts→routes, fetchDataset shared→entities
  - `pnpm lint` Prettier drift (not blocking)

## Заметки для следующей сессии

- **Wave ST-1..ST-10 полностью закрыта.** Не открывать новый structural slice автоматически без нового user prompt / нового плана.
- Не переоткрывать спор “нужен ли отдельный EMIS app прямо сейчас” без нового runtime/ops pressure.
- Integration branch `feature/emis-foundation-stabilization` содержит все 10 slices; merge в main — по решению пользователя.
- Deferred items (P3 hardening, MIGRATION shim removal, FSD violations) tracked в `docs/emis_next_tasks_2026_03_22.md`.
- Для нового structural wave нужен новый plan от lead-strategic, а не продолжение текущего.
- Если задача не structural — можно работать на feature-уровне без нового plan.
