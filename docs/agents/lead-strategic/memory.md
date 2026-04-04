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
  - topic: `EMIS Architecture Stabilization And Governance Freeze`
- Legacy docs cleanup should be treated as a separate explicit slice after topology/read-order stabilization, not as ad hoc deletion during feature work.
- User decision from `2026-04-04`:
  - first stabilize EMIS architecture/concept/docs
  - only after that open code refactor / enforcement work
- Current strategic verdict from the architecture review on `2026-04-04`:
  - the core EMIS architecture is viable
  - the main problem is not topology, but doc truthfulness, mixed current-vs-target descriptions and weak governance/enforcement coupling
- Recommended governance shape for the next wave:
  - `architecture-steward` owns canonical architecture docs, known exceptions and pre-approval for cross-layer changes
  - `architecture-reviewer` remains a bounded diff reviewer, not a second strategic lead

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
- Separate hardening wave should run on its own branch:
  - recommended integration branch: `feature/emis-post-split-hardening`
  - create it from the latest accepted base after merging `feature/emis-foundation-stabilization`
- Deferred items (P3 hardening, MIGRATION shim removal, FSD violations) tracked в `docs/emis_next_tasks_2026_03_22.md`.
- Completed hardening plan is archived:
  - `docs/archive/agents/lead_strategic_current_plan_2026_04_03_post_split_hardening.md`
- Новый active wave открыт как architecture-first stabilization plan:
  - `EMIS Architecture Stabilization And Governance Freeze`
  - focus: simplify/freeze architecture, align canonical docs with package reality, create known exceptions registry, define architect role model
- Previous baseline/enforcement-first sequencing (`S0..S8`) is not cancelled, but deferred to phase 2 after architecture docs freeze.
- New canonical exception registry:
  - `docs/emis_known_exceptions.md`
- Если задача не structural — можно работать на feature-уровне без нового plan.
- Strategic workflow updated and tested in this session:
  - optional `strategic-reviewer` sidecar is now a documented canonical role
  - default sidecar model policy:
    - `gpt-5.4-mini`
    - `reasoning_effort=medium`
    - escalate to `gpt-5.4` / `high` only for design-sensitive or cross-module acceptance
  - after each accepted slice, do a short reframe of the next slice before execution
  - use `strategic-reviewer` for disputed transitions, not for every routine next-slice clarification

## Новый active wave

- Эта wave не продолжает `ST-1..ST-10` и не переоткрывает уже закрытую hardening wave `H-1..H-5`.
- Wave name:
  - `EMIS Architecture Stabilization And Governance Freeze`
- Why now:
  - user explicitly chose architecture/docs-first work before code refactor
  - current EMIS docs mix current package-state, legacy phase-0 notes and future migration target
  - this makes the architecture harder to follow and harder to enforce than it should be
- Current planned slices:
  - `A0` — architecture-first freeze and scope boundaries
  - `A1` — simplify canonical architecture contract
  - `A2` — separate current state vs target layout vs historical docs
  - `A3` — create and wire known exceptions registry
  - `A4` — define architecture governance role model
  - `A5` — prepare phase-2 enforcement/refactor backlog
- `A1` and `A2` completed on `2026-04-04`:
  - current-state docs now tell one aligned story about:
    - topology
    - three contours
    - package ownership vs app-level ownership
    - operational path vs BI path
  - default current-state reading order now starts with:
    - `docs/emis_session_bootstrap.md`
    - `docs/emis_architecture_baseline.md`
    - `docs/emis_working_contract.md`
    - `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
  - `docs/AGENTS.md` now classifies:
    - current-state docs as canonical
    - `emis_monorepo_target_layout.md`, `emis_implementation_spec_v1.md`, `emis_freeze_note.md` as active/supporting, not current ownership truth
  - package-local navigation docs are now part of the canonical EMIS doc map:
    - `packages/emis-contracts/AGENTS.md`
    - `packages/emis-server/AGENTS.md`
    - `packages/emis-ui/AGENTS.md`
- Deferred phase 2 after docs freeze:
  - repair broken baseline checks
  - restore green boundary gate
  - tighten machine-enforced architecture boundaries
  - introduce `baseline-governor`
  - add `Red/Yellow/Green` state model and canonical baseline command
  - only then resume broader EMIS foundation closeout / refactor slices
- Wave status: **open**.
- New wave constraints:
  - topology remains frozen unless new runtime/ops pressure appears
  - no broad code refactor before architecture docs are aligned and accepted
  - no new exception without owner and target wave / expiry
  - do not mix architecture freeze with feature expansion

## Hardening wave status

- `H-1` completed and accepted:
  - `packages/emis-server` is now transport-agnostic
  - SvelteKit-specific transport glue moved to `apps/web/src/lib/server/emis/infra/http.ts`
  - framework-agnostic parsing/validation/constants/types stayed in `packages/emis-server`
  - `@sveltejs/kit` references removed from `packages/emis-server`
  - route behavior intentionally unchanged; EMIS API routes still import via `$lib/server/emis/infra/http`
  - docs updated:
    - `packages/emis-server/AGENTS.md`
    - `apps/web/src/routes/api/emis/AGENTS.md`
    - `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
  - verification reported green:
    - `pnpm check`
    - `pnpm build`
    - `pnpm lint:boundaries` with only pre-existing violations
  - review gate completed and findings addressed
- `H-2` completed and accepted:
  - generic JSON typing moved to `platform-core`
  - `platform-datasets` keeps compatibility re-export
  - `packages/emis-ui` no longer depends on `platform-datasets`
  - this slice confirmed that type-home corrections can stay narrow without triggering wider foundation cleanup
- `H-3` completed and accepted:
  - EMIS API routes now import canonical package-owned contracts/modules directly
  - app-owned transport glue intentionally remains in `$lib/server/emis/infra/http.ts`
  - this slice established an important rule for future route cleanup:
    - direct package imports for package-owned code
    - app-local imports preserved for app-owned SvelteKit transport glue
- `H-4` completed and accepted:
  - `EmisMap.svelte` reduced from `1225` to `903` lines
  - `/routes/emis/+page.svelte` reduced from `1559` to `766` lines
  - H-4 worked best as two sequential halves (`H-4a`, `H-4b`), not as one giant pass
  - extracted map-runtime pieces live in `packages/emis-ui/src/emis-map/*`
  - extracted workspace/page pieces live in `apps/web/src/routes/emis/*`
- `H-5` completed and accepted:
  - `mapConfig` boundary exception removed — BI route uses canonical package import
  - `clampPageSize()` / `clampMapLimit()` deduplicated into `packages/emis-server/src/infra/http.ts`
  - `mapVesselsQuery` bbox params switched to dynamic push-and-reference pattern
  - `fetchDataset` explicitly deferred (platform-level, not this wave)
- **Wave "EMIS Post-Split Hardening And Boundary Cleanup" is complete.** All H-1..H-5 accepted on `2026-04-03`.
- Remaining carry-forward for future waves:
  - `fetchDataset.ts` FSD gap (shared imports entities)
  - ~53 MIGRATION re-export shims outside EMIS API routes
  - stock-alerts→routes FSD violation
  - baseline verification/governance gap:
    - root EMIS smoke commands must be runnable
    - `lint:boundaries` must be green
    - active ownership docs must match code
    - baseline-governor workflow must be documented
