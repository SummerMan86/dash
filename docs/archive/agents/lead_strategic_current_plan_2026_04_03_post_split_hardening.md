# Plan: EMIS Post-Split Hardening And Boundary Cleanup

Archived from `docs/agents/lead-strategic/current_plan.md` on `2026-04-03`
after wave completion.

## Цель
Закрыть наиболее важные архитектурные residuals после wave `ST-1..ST-10`, не переоткрывая topology decision и не смешивая их с новой package migration.

Цели этой волны:

- довести `emis-server` до реально transport-agnostic состояния;
- убрать некорректные package edges и временные route-level compatibility habits, которые мешают строгой package isolation;
- уменьшить pressure points в EMIS UI/workspace без UX redesign;
- закрыть несколько узких post-split hardening gaps так, чтобы следующий runtime slice не упирался в structural debt.

Ключевое решение этой волны:

- **не продолжаем старую ST-wave задним числом;**
- **открываем отдельную hardening wave поверх уже принятой monorepo-style topology;**
- **не переоткрываем вопрос “нужен ли отдельный EMIS app прямо сейчас”;**
- **не смешиваем hardening с большим feature expansion.**

Этот план предназначен для передачи `lead-tactical` и исполнения по agent workflow:

- GPT-5.4 фиксирует scope и sequencing;
- Claude Opus режет работу на bounded implementation slices;
- Review Gate обязателен для runtime/code changes;
- при новых topology/design вопросах `lead-tactical` не импровизирует, а эскалирует.

## Базовые факты перед стартом

- Wave `ST-1..ST-10` закрыта и принята.
- `H-1`..`H-5` completed and accepted on `2026-04-03`. Wave is complete.
  - `packages/emis-server` is transport-agnostic (H-1)
  - `packages/emis-ui` no longer depends on `platform-datasets` (H-2)
  - EMIS API routes now use direct package imports for package-owned code (H-3)
  - `EmisMap.svelte` and `/routes/emis/+page.svelte` were reduced and decomposed without UX redesign (H-4)
  - `mapConfig` boundary exception removed, `clampPageSize` deduplicated, `mapVesselsQuery` params stabilized (H-5)
- Current topology remains:
  - single-deployable monorepo-style repository
  - runtime in `apps/web`
  - package boundaries in `packages/*`
- Remaining carry-forward (not addressed in this wave):
  - `fetchDataset.ts` — pre-existing platform/FSD gap (shared imports entities)
  - ~53 MIGRATION re-export shims outside EMIS API routes — code removal, separate effort
  - stock-alerts→routes FSD violation — pre-existing
- Wave status: **complete**, no further slices planned

## Подзадачи

### H-1: Make `emis-server` Transport-Agnostic
- status: completed on `2026-04-03`
- scope:
  - `packages/emis-server/src/infra/http.ts`
  - `packages/emis-server/src/infra/audit.ts`
  - touched `apps/web/src/routes/api/emis/*`
  - touched docs for transport rules
- depends on: —
- размер: M
- заметки:
  - move SvelteKit-specific `RequestHandler`, `json(...)`, and raw `Request` glue out of package-level server infra
  - keep framework-agnostic parsing / error mapping / write-context primitives in package
  - app route layer should stay thin, but explicitly own transport glue
  - no API contract changes in this slice

#### H-1 Acceptance Checklist
- `packages/emis-server` no longer imports directly from `@sveltejs/kit`
- framework-agnostic helpers remain in `packages/emis-server`
- SvelteKit transport glue lives in `apps/web` or another app-local transport-only layer
- `routes/api/emis/*` stay thin and behavior-compatible
- docs clearly say that transport-specific glue is app-owned, not package-owned
- report explicitly states whether any route files switched from shim imports to direct package imports during the slice

### H-2: Remove Invalid `emis-ui -> platform-datasets` Edge
- status: completed on `2026-04-03`
- scope:
  - `packages/emis-ui/*`
  - any minimal type relocation needed in `platform-core`
  - optional compatibility re-export touch in `platform-datasets`
  - touched docs/package manifests
- depends on: H-1 not required
- размер: S
- заметки:
  - current issue is architectural, not feature-level
  - `JsonValue` usage should be satisfied without teaching `emis-ui` about dataset foundation
  - preferred canonical home for generic JSON scalar/object/array typing is `@dashboard-builder/platform-core`, not `emis-contracts`
  - if the move would otherwise create broader churn, `platform-datasets` may re-export the type from `platform-core` for compatibility; do not expand this slice into mass consumer rewiring
  - the narrow expected code path is:
    - add/export generic JSON type in `platform-core`
    - switch `packages/emis-ui` to consume that canonical source
    - drop direct `emis-ui -> platform-datasets` dependency
  - do not use this slice to redesign `EmisMap.svelte`; only the dependency edge should change
  - no map UX changes in this slice

#### H-2 Acceptance Checklist
- `packages/emis-ui/package.json` no longer depends on `@dashboard-builder/platform-datasets`
- `packages/emis-ui` imports only from allowed packages per target layout
- `packages/emis-ui/src/emis-map/EmisMap.svelte` no longer imports `JsonValue` from `@dashboard-builder/platform-datasets`
- no new forbidden edge is introduced as a replacement
- touched docs/AGENTS explain the corrected dependency shape if needed

### H-3: Normalize EMIS Route Imports Away From Legacy Shim Guidance
- status: completed on `2026-04-03`
- scope:
  - `apps/web/src/routes/api/emis/*`
  - `apps/web/src/routes/api/emis/AGENTS.md`
  - any touched compatibility-shim docs
- depends on: H-1
- размер: M
- заметки:
  - do not attempt global shim removal in this slice
  - focus only on route-level imports and route-level guidance for new work
  - canonical rule after the slice:
    - app routes import package code directly when the package is already canonical
    - app-owned transport glue remains app-local and is imported from `$lib/server/emis/infra/http.ts`
    - shims remain only for compatibility where migration is still incomplete
  - after H-1, do not try to replace `handleEmisRoute` / `jsonEmisList` / `jsonEmisError` imports with package imports
  - likely normalization targets in this slice:
    - `@dashboard-builder/emis-contracts/*` instead of `$entities/emis-*`
    - `@dashboard-builder/emis-server/*` for package-owned infra/modules where canonical
    - keep `$lib/server/emis/infra/http.ts` for app-owned SvelteKit transport glue
  - keep route code boring; do not mix this with module logic rewrites

#### H-3 Acceptance Checklist
- `apps/web/src/routes/api/emis/AGENTS.md` no longer presents shim imports as the default path for new routes
- touched EMIS API routes use direct package imports where the package is already canonical
- touched EMIS API routes keep importing app-owned transport glue from `$lib/server/emis/infra/http.ts`
- remaining shim-based imports, if any, are explicitly justified in report
- report distinguishes:
  - route-import normalization completed now
  - broader shim removal deferred

### H-4: Decompose EMIS Pressure Points Without UX Redesign
- status: completed on `2026-04-03` (H-4a: EmisMap.svelte 1225→903; H-4b: +page.svelte 1559→767)
- scope:
  - `packages/emis-ui/src/emis-map/EmisMap.svelte`
  - `apps/web/src/routes/emis/+page.svelte`
  - closely related internal helpers/components only
- depends on: H-2 preferred first
- размер: L
- заметки:
  - file-size reduction is the goal, not a visual redesign
  - current pressure is high enough that H-4 should default to two sequential sub-slices, not one giant pass:
    - H-4a: `EmisMap.svelte`
    - H-4b: `apps/web/src/routes/emis/+page.svelte`
  - prefer bounded extraction such as:
    - overlay fetch orchestration
    - diagnostics / status HUD
    - route-layer composition helpers
    - selection / sync orchestration
  - preserve behavior and route contracts
  - do not let this become a speculative component explosion
  - if H-4a already consumes the safe review budget, stop after H-4a, report it explicitly, and re-enter for H-4b as the next tactical step under the same strategic umbrella

#### H-4 Acceptance Checklist
- main files are materially smaller and easier to review
- extracted units have clear ownership and names
- no user-visible UX redesign is introduced accidentally
- route/runtime contracts remain unchanged or are explicitly documented
- report calls out what pressure point was reduced in each file
- if only one of the two files is decomposed in the first pass, report must say which half of H-4 remains and why it was intentionally deferred

### H-5: Close Remaining Small Boundary Hardening Gaps
- status: completed on `2026-04-03`
- scope:
  - `apps/web/src/routes/dashboard/emis/vessel-positions/+page.server.ts`
  - `apps/web/src/lib/server/emis/infra/mapConfig.ts` only if still needed as compatibility shim after route normalization
  - `packages/emis-server/src/infra/mapConfig.ts`
  - page-size normalization helpers in `packages/emis-server/src/modules/{objects,news}/*`
  - `packages/emis-server/src/modules/map/queries.ts` (`mapVesselsQuery`)
  - `apps/web/src/lib/shared/api/fetchDataset.ts` only if explicitly pulled into the slice
- depends on: H-1
- размер: M
- заметки:
  - this is a bounded hardening slice, not a grab-bag cleanup
  - include only residuals that directly affect package boundaries or EMIS evolution:
    - `mapConfig` boundary exception in BI route
    - duplicated `clampPageSize()`
    - fragile `mapVesselsQuery` parameter assembly
  - current repo state suggests the preferred `mapConfig` outcome is **not** forced extraction to a new platform package:
    - first re-check whether the canonical access path can simply be the already-package-owned `@dashboard-builder/emis-server/infra/mapConfig`
    - keep app-local `mapConfig` shim only if it still has justified compatibility consumers after the BI route exception is removed
  - `mapVesselsQuery` is currently located in `packages/emis-server/src/modules/map/queries.ts`; do not plan work against stale pre-split paths
  - `fetchDataset` boundary gap is platform-level and may remain a separate follow-up if the slice would otherwise grow too broad

#### H-5 Acceptance Checklist
- `mapConfig` exception in EMIS BI route is removed, and the canonical access path is documented explicitly
- page-size normalization duplication is removed without behavior change
- `mapVesselsQuery` parameter assembly no longer relies on fragile manual index bookkeeping
- if `fetchDataset` was not included, report says so explicitly and keeps it deferred

## Recommended Execution Order
1. `H-1` completed: transport decoupling for `emis-server`.
2. `H-2` completed: invalid `emis-ui` dependency edge removed.
3. `H-3` completed: route import normalization and route-level doc cleanup.
4. `H-4` completed: pressure-point decomposition (`EmisMap.svelte`, then `/routes/emis/+page.svelte`).
5. `H-5` completed: small remaining boundary-hardening gaps closed.

**Wave complete.** All H-1..H-5 slices accepted on `2026-04-03`.

## Scope Boundaries

### In scope
- package-boundary hardening
- transport-vs-server separation cleanup
- route import normalization where packages are already canonical
- bounded decomposition of oversized EMIS files
- small EMIS-facing residual cleanup from post-split backlog

### Out of scope
- separate EMIS deployable/app split
- broad BI-only cleanup unrelated to EMIS/platform boundaries
- broad MIGRATION shim removal across the whole app
- new product features
- auth/RBAC expansion
- big-bang redesign of `/emis` UX

## Review Gate Expectations
- H-1:
  - `architecture-reviewer`
  - `code-reviewer`
  - `security-reviewer`
  - `docs-reviewer`
- H-2:
  - `architecture-reviewer`
  - `code-reviewer`
  - `docs-reviewer`
- H-3:
  - `architecture-reviewer`
  - `docs-reviewer`
  - `code-reviewer`
- H-4:
  - `architecture-reviewer`
  - `code-reviewer`
  - `ui-reviewer`
  - `docs-reviewer`
- H-5:
  - `architecture-reviewer`
  - `code-reviewer`
  - `docs-reviewer`
  - `security-reviewer` if touched server/query logic materially changes

## Worker Strategy
- H-1 should be owned directly by `lead-tactical` or one focused worker; it is the main architectural blocker.
- H-1 is already closed; do not spend worker capacity on it again.
- H-2 may run in parallel with H-1 only if the write scopes are clearly disjoint.
- H-2 is narrow enough that `lead-tactical` should prefer doing it directly unless the actual write scope unexpectedly expands beyond:
  - `packages/emis-ui/*`
  - `packages/platform-core/*`
  - optional `packages/platform-datasets/*` compatibility re-export
- H-3 should start only after H-1 clarifies the canonical app/package transport boundary.
- H-4 should be split into bounded sub-slices by default:
  - first `EmisMap.svelte`
  - then `/routes/emis/+page.svelte`
- H-5 should stay narrow; if it starts absorbing `fetchDataset` or wider BI concerns, re-slice it.

## Lead-Tactical Kickoff
1. Read this plan end-to-end before delegating anything.
2. Re-read:
   - `docs/emis_session_bootstrap.md`
   - `docs/architecture.md`
   - `docs/emis_working_contract.md`
   - `docs/emis_monorepo_target_layout.md`
