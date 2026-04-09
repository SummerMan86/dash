# Lead-Strategic Memory

Персистентная память GPT-5.4 lead между сессиями.
Обновляется в конце каждой сессии.

## Update 2026-04-06

- Active wave switched to:
  - `EMIS External Object Ingestion, Wave 1`
- Strategic operating mode for this wave:
  - `high-risk iterative / unstable wave`
- Canonical scope for the new wave:
  - generic ingestion contour
  - active sources only `osm` and `gem`
  - `stg_emis` as raw truth
  - `emis.objects` as curated operational truth
  - `mart.emis_objects_dim` still built only from curated objects
- Frozen wave decisions:
  - `wikimapia` is explicitly deferred to a later source-validation/legal-ops wave
  - canonical multi-source identity moves to `emis.object_source_refs`
  - `emis.objects.external_id` remains compatibility-only
  - full geometry support is included in wave 1 for imported objects
  - current manual object editor may remain point-first, but non-point imported objects must be protected from geometry corruption
  - no separate background runtime, scheduler, or queue is introduced in wave 1
- Execution-ready docs prepared in this session:
  - `docs/plans/emis_external_object_ingestion.md`
  - `docs/agents/lead-strategic/current_plan.md`
- First tactical opening order for the new wave:
  - `ING-1` -> `ING-2` -> `ING-3`
  - only then `ING-4` / `ING-5` and downstream slices

## Принятые решения

- EMIS уже считаем отдельным доменным контуром, а не просто частью "dashboard-builder demo".
- Текущий правильный topology decision:
  - single-deployable monorepo-style repository now
  - optional split into separate apps later
  - no immediate second deployable app for EMIS
- Shared foundation остается общей, но product identity и ownership у EMIS и BI/dashboard считаются разными.
- Для новых EMIS задач canonical docs теперь:
  - `docs/architecture.md`
  - `docs/emis_session_bootstrap.md`
  - `docs/emis_working_contract.md`
- Strategic plan for the current active wave lives in:
  - `docs/agents/lead-strategic/current_plan.md`
  - topic: `EMIS External Object Ingestion, Wave 1`
- Closed freeze-wave plan is archived in:
  - `docs/archive/agents/lead_strategic_current_plan_2026_04_04_architecture_stabilization_and_governance_freeze.md`
- Legacy docs cleanup should be treated as a separate explicit slice after topology/read-order stabilization, not as ad hoc deletion during feature work.
- User decision from `2026-04-04`:
  - first stabilize EMIS architecture/concept/docs
  - only after that open code refactor / enforcement work
- Current strategic verdict from the architecture review on `2026-04-04`:
  - the core EMIS architecture is viable
  - the main problem is not topology, but doc truthfulness, mixed current-vs-target descriptions and weak governance/enforcement coupling
- Final governance shape for the current wave:
  - `lead-strategic` runs an `architecture pass` for canonical architecture docs, placement decisions, architecture waivers/exceptions and pre-approval for cross-layer changes
  - `architecture-reviewer` remains a bounded diff reviewer, not a second strategic lead
  - `lead-strategic` runs a `baseline pass` for baseline status and registry truthfulness, but placement decisions stay in the architecture pass

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
    - resolve `fetchDataset.ts` boundary gap — closed in `P3.2`
    - remove redundant `cacheKeyQuery` in `fetchDataset.ts` — closed in `P3.2`
  - Pre-existing layer-boundary issues at that time: stock-alerts→routes, fetchDataset shared→entities
  - `pnpm lint` Prettier drift (not blocking)

## Заметки для следующей сессии

- **Wave ST-1..ST-10 полностью закрыта.** Не открывать новый structural slice автоматически без нового user prompt / нового плана.
- Не переоткрывать спор “нужен ли отдельный EMIS app прямо сейчас” без нового runtime/ops pressure.
- Integration branch `feature/emis-foundation-stabilization` содержит все 10 slices; merge в main — по решению пользователя.
- Separate hardening wave should run on its own branch:
  - recommended integration branch: `feature/emis-post-split-hardening`
  - create it from the latest accepted base after merging `feature/emis-foundation-stabilization`
- Deferred items (P3 hardening, MIGRATION shim removal, layer-boundary cleanup) tracked в `docs/emis_next_tasks_2026_03_22.md`.
- Completed hardening plan is archived:
  - `docs/archive/agents/lead_strategic_current_plan_2026_04_03_post_split_hardening.md`
- Closed freeze-wave plan is archived:
  - `docs/archive/agents/lead_strategic_current_plan_2026_04_04_architecture_stabilization_and_governance_freeze.md`
- Historical note:
  - `EMIS Phase 2 Baseline Truthfulness And Boundary Enforcement` is closed
  - phase-2 baseline and post-MVE follow-up remain green
  - ordinary bounded feature work reopened after that closure
  - the current active wave is now `EMIS External Object Ingestion, Wave 1`
- Previous baseline/enforcement-first sequencing (`S0..S8`) is not cancelled, but deferred to phase 2 after architecture docs freeze.
- New canonical exception registry:
  - `docs/emis_known_exceptions.md`
- Если задача не structural — можно работать на feature-уровне без нового plan.
- Strategic workflow updated and tested in this session:
  - `strategic-reviewer` is a documented bounded strategic acceptance/reframe pass inside `lead-strategic`
  - default sidecar model policy:
    - `gpt-5.4-mini`
    - `reasoning_effort=medium`
    - escalate to `gpt-5.4` / `high` only for design-sensitive or cross-module acceptance
  - after each accepted slice, do a short reframe of the next slice before execution
  - `lead-strategic` selects operating mode at wave start and can switch it after any post-slice reframe with rationale
  - per-slice `strategic-reviewer` is normal in unstable/high-yield waves; ordinary iterative work can keep the pass at risk-triggered or final-only cadence

## Текущий active wave

- Эта wave не переоткрывает `ST-1..ST-10`, `H-1..H-5`, phase-2 baseline repair, `NW-1..NW-5` или Phase 3-5 закрытые slices.
- Wave name:
  - `EMIS External Object Ingestion, Wave 1`
- Why now:
  - baseline remains green after completed auth hardening and post-MVE closure
  - EMIS is ready for ordinary feature work
  - next expansion pressure is external-object ingestion from validated public sources
- Current plan state:
  - `docs/agents/lead-strategic/current_plan.md` now tracks the ingestion wave
  - detailed design reference lives in `docs/plans/emis_external_object_ingestion.md`
- Current planned slices:
  - `ING-1` — contract freeze and execution alignment
  - `ING-2` — DB foundation
  - `ING-3` — geometry broadening and curated object contract upgrade
  - `ING-4` — ingestion contracts and query/repository layer
  - `ING-5` — source adapters and registry
  - `ING-6` — resolution engine and curated publication
  - `ING-7` — API transport
  - `ING-8` — review UI
  - `ING-9` — verification and governance closure
- Resume point for the next chat:
  - start with `ING-1`
  - keep mode `high-risk iterative / unstable wave`
  - do not reopen the deferred question about separate background ingestion runtime inside this wave
  - do not reopen `wikimapia` in this wave
  - enforce the non-point imported object guard in manual edit flow before tactical work reaches UI integration
- Wave constraints:
  - topology remains frozen unless new runtime/ops pressure appears
  - no BI/read-side shortcut from staging
  - no new exception without owner and target wave / expiry
  - do not mix this ingestion wave with unrelated feature expansion

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
  - ~53 MIGRATION re-export shims outside EMIS API routes
  - stock-alerts→routes layer-boundary violation
  - baseline verification/governance gap:
    - root EMIS smoke commands must be runnable
    - `lint:boundaries` must stay green while gaining package-aware coverage
    - active ownership docs must match code
    - baseline pass workflow must be documented
