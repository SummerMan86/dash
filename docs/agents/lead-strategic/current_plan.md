# Plan: Restructure `src/lib/` app-local surface and remove FSD-named buckets

## Status

- opened on `2026-04-16`
- wave status: `open`
- operating mode: `safe structural refactor`
- canonical live plan path: `docs/agents/lead-strategic/current_plan.md`

## Context

Project moved away from FSD (Feature-Sliced Design) to package-first architecture, but `src/lib/` still contains transitional FSD-named buckets:

- `shared/`
- `features/dashboard-edit/`
- `features/emis-manual-entry/`
- `widgets/stock-alerts/`
- `widgets/emis-drawer/`

Architecture docs now define the target app-local model as:

- route-local first
- then `src/lib/<module>/` for rare app-local cross-route modules
- packages as the primary grouping and scaling mechanism

This wave executes that model across the remaining app-local surface so that `src/lib/` no longer advertises FSD-style bucket names.

## Goal

- dissolve FSD-named buckets in `src/lib/`
- flatten surviving app-local code by role/module
- move single-route code route-local where justified
- promote multi-route app-specific modules to first-level `src/lib/<module>/`
- remove the FSD aliases and lint rules that are no longer needed after the moves
- keep docs aligned with the actual post-wave state

## Subtasks

### ST-1: Remove Unused Tracked Starter Assets
- scope: `apps/web/src/lib/images/*`
- depends on: —
- size: S
- acceptance:
  - tracked starter assets under `src/lib/images/` are removed only if still unused
  - no runtime imports or references remain
- verification intent: confirm assets are unused and the app still builds
- verification mode: `verification-first`
- notes:
  - empty directories under `src/lib/server/**` and `src/lib/features/dashboard-builder/` are not tracked and are not worker-worthy slices

### ST-2: Dissolve `shared/` into First-Level `src/lib/` Folders
- scope:
  - `apps/web/src/lib/shared/api/**`
  - `apps/web/src/lib/shared/fixtures/**`
  - `apps/web/src/lib/shared/styles/**`
  - all consumers of those paths
- depends on: ST-1
- size: M
- acceptance:
  - `shared/api/` becomes `src/lib/api/`
  - `shared/fixtures/` becomes `src/lib/fixtures/`
  - `shared/styles/` becomes `src/lib/styles/`
  - `src/lib/styles/` becomes the canonical app-level home for the design system guide, token CSS, and global style docs
  - product code imports `fetchDataset` through `$lib/api/...`
  - product code imports fixtures through `$lib/fixtures/...`
  - `src/lib/shared/` is deleted once no product-code imports remain
- verification intent: ensure path moves are complete and do not break typecheck/build/boundaries across BI and EMIS consumers
- verification mode: `verification-first`

### ST-3: Route-Localize Wildberries `stock-alerts`
- scope:
  - `apps/web/src/routes/dashboard/wildberries/stock-alerts/**`
  - `apps/web/src/lib/widgets/stock-alerts/**`
- depends on: ST-2
- size: M
- acceptance:
  - route-local files become the canonical home for `stock-alerts` types, utils, filters, and Svelte components
  - `$widgets/stock-alerts` imports are removed from product code
  - `apps/web/src/lib/widgets/stock-alerts/` is deleted after the route owns the implementation directly
- verification intent: ensure the stock-alerts route still builds and tests continue to pass
- verification mode: `verification-first`
- notes:
  - keep the route-local helpers as real source files, not re-export shims

### ST-4: Promote `dashboard-edit` to a First-Level App-Local Module
- scope:
  - `apps/web/src/lib/features/dashboard-edit/**`
  - `apps/web/src/routes/dashboard/+page.svelte`
  - `apps/web/src/routes/dashboard/test/+page.svelte`
  - touched local navigation docs
- depends on: ST-3
- size: M
- acceptance:
  - `features/dashboard-edit/` moves to `src/lib/dashboard-edit/`
  - product imports use `$lib/dashboard-edit`
  - stale self-references and local docs are updated
- verification intent: ensure dashboard editor routes and imports still build after the move
- verification mode: `verification-first`

### ST-5: Promote `emis-manual-entry` to a First-Level App-Local Module
- scope:
  - `apps/web/src/lib/features/emis-manual-entry/**`
  - EMIS route consumers under `apps/web/src/routes/emis/**`
  - touched local navigation docs
- depends on: ST-2
- size: M
- acceptance:
  - `features/emis-manual-entry/` moves to `src/lib/emis-manual-entry/`
  - EMIS route consumers import forms through `$lib/emis-manual-entry/...`
  - local docs reflect the new canonical home
- verification intent: ensure EMIS object/news create-edit routes still build after the move
- verification mode: `verification-first`
- notes:
  - keep the forms app-local; they depend on `$app/forms` and are not package candidates in this wave

### ST-6: Route-Localize `EmisDrawer` in BI Vessel Positions
- scope:
  - `apps/web/src/lib/widgets/emis-drawer/**`
  - `apps/web/src/routes/dashboard/emis/vessel-positions/**`
  - touched local navigation docs
- depends on: ST-2
- size: M
- acceptance:
  - `EmisDrawer.svelte` becomes route-local to `routes/dashboard/emis/vessel-positions/`
  - `$widgets/emis-drawer` imports are removed from product code
  - `apps/web/src/lib/widgets/emis-drawer/` is deleted after the route owns the component directly
- verification intent: ensure the vessel-positions BI page still builds and behaves with the route-local drawer
- verification mode: `verification-first`
- notes:
  - this is a BI route-local component, not an EMIS reusable UI package concern

### ST-7: Remove Obsolete Aliases and Boundary Rules
- scope:
  - `apps/web/svelte.config.js`
  - `vitest.config.ts`
  - `eslint.config.js`
  - touched imports/docs needed to keep config truthful
- depends on: ST-2, ST-3, ST-4, ST-5, ST-6
- size: M
- acceptance:
  - `$shared` alias is removed
  - `$features` alias is removed
  - `$widgets` alias is removed
  - ESLint boundary rules are updated to the actual remaining structure
  - config matches the implemented post-wave layout without transitional FSD buckets
- verification intent: ensure config, lint boundaries, typecheck, and build match the implemented structure
- verification mode: `verification-first`

### ST-8: Close Out Docs Against the Actual Post-Wave State
- scope:
  - `docs/architecture.md`
  - `docs/architecture_dashboard_bi.md`
  - `README.md`
  - `apps/web/src/lib/AGENTS.md`
  - touched local `AGENTS.md` / `CLAUDE.md` files in moved zones
- depends on: ST-7
- size: S
- acceptance:
  - docs reflect the real post-wave structure, not an aspirational end-state
  - moved paths are updated for `api/`, `fixtures/`, `styles/`, `dashboard-edit/`, `emis-manual-entry/`, and route-localized `stock-alerts` / `EmisDrawer`
  - `shared/`, `features/`, and `widgets/` are no longer described as active app-local homes
  - docs explicitly state how the design system is applied: reusable components from `@dashboard-builder/platform-ui`, app-level token CSS and guide from `src/lib/styles/`
- verification intent: ensure navigation and architecture docs match the code layout after implementation
- verification mode: `verification-first`
- notes:
  - architecture-docs-first decisions for flat app-local structure are already recorded; this slice is sync/close-out, not a new architecture decision

## Constraints

- Do not reopen package-era ownership. Reusable logic still belongs in `packages/*`.
- Do not treat untracked empty-directory cleanup as a meaningful worker slice.
- Prefer truthful incremental completion over broad speculative rewrites.
- Keep `src/lib/server/**` as the formal server-only boundary.
- Do not move EMIS code into packages unless it becomes genuinely reusable beyond the app-local module/route scope.
- Preserve the route/package contour split:
  - operational EMIS workspace/forms remain app-local
  - BI vessel drawer remains route-local to the BI page

## Expected Result

- `shared/` is dissolved into `src/lib/api/`, `src/lib/fixtures/`, and `src/lib/styles/`
- Wildberries `stock-alerts` becomes route-local
- `EmisDrawer` becomes route-local to `routes/dashboard/emis/vessel-positions/`
- `dashboard-edit` becomes `src/lib/dashboard-edit/`
- `emis-manual-entry` becomes `src/lib/emis-manual-entry/`
- `$shared`, `$features`, and `$widgets` are removed, and config/lint rules match the implemented state
- docs describe the actual post-wave layout without FSD-named app-local buckets
