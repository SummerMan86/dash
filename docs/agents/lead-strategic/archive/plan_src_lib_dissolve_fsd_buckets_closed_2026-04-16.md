# Plan: Restructure `src/lib/` app-local surface and remove FSD-named buckets (Closed)

## Status

- opened on `2026-04-16`
- completed on `2026-04-16`
- wave status: `closed`
- closeout verdict: `ACCEPT`
- branch: `feature/src-lib-dissolve-fsd-buckets`
- selected execution profile: `opus-orchestrated-codex-workers`
- operating mode at close: `high-risk iterative / unstable wave`
- next slice: `none — wave closed`
- baseline status: `Yellow` (`pnpm lint:eslint` has pre-existing baseline errors only)
- canonical live plan path: `docs/agents/lead-strategic/current_plan.md`

## Goal

Remove the remaining FSD-named buckets from `apps/web/src/lib/`, land the flat app-local `src/lib/*` model, and close the config/docs sweep so the repo reflects the actual post-wave structure.

## Slice Status

- `ST-1` `done` — `5102bb3` — removed unused tracked starter assets from `apps/web/src/lib/images/*`
- `ST-2` `done` — `a360fdf` — dissolved `shared/` into `src/lib/api/`, `src/lib/fixtures/`, and `src/lib/styles/`
- `ST-3` `done` — `afb63cc` — route-localized Wildberries `stock-alerts` and deleted `src/lib/widgets/stock-alerts/`
- `ST-4` `done` — `2308994` — promoted `dashboard-edit` to `apps/web/src/lib/dashboard-edit/`
- `ST-5` `done` — `e221ca9` — promoted `emis-manual-entry` to `apps/web/src/lib/emis-manual-entry/`
- `ST-6` `done` — `8033bb0` — route-localized `EmisDrawer` to `routes/dashboard/emis/vessel-positions/`
- `ST-7` `done` — `9222d37` — removed `$shared/$features/$widgets`, updated ESLint boundaries, and deleted empty FSD directories
- `ST-8` `done` — `c9c0385` — closed docs across current-state architecture, navigation, and workflow surfaces
- `Fix` `done` — `b940d92` — resolved stale FSD references found during integration review

## Governance Closeout

- final strategic verdict: `ACCEPT`
- plan change requests: `none`
- integration review: `green after fix` (`architecture-reviewer`, `code-reviewer`, `docs-reviewer`)
- architecture pass: `done` (pre-implementation audit + per-slice architecture-reviewer coverage)
- architecture docs: synced to the post-wave `src/lib/*` structure
- `docs/agents/invariants.md`: updated in `ST-7`
- `docs/agents/orchestrator/memory.md` and `docs/agents/lead-strategic/memory.md`: rewritten to active state
- ready state for next wave: flat app-local model is canonical; choose operating mode fresh from a `Yellow` baseline

## Verification Baseline

- `pnpm check`: green
- `pnpm build`: green
- `pnpm test`: green (`19` files, `309` tests)
- `pnpm lint:boundaries`: green
- `pnpm lint:eslint`: baseline-only pre-existing errors

## Carry Forward

- Non-blocking baseline debt remains outside this wave: existing `pnpm lint:eslint` failures in packages/scripts.
- Monitoring-only items from integration review remain non-blocking: barrel/direct import inconsistency in product analytics, broad peer-isolation glob, and `apps/web/src/routes/emis/+page.svelte` size.
- Next wave should assume the canonical app-local placement model is route-local first, then first-level `src/lib/<module>/` only for app-specific cross-route code.

## Expected Result

Achieved: `src/lib/` no longer advertises `shared/`, `features/`, or `widgets/` as live FSD buckets; app-local ownership is flattened; docs, config, and review guardrails match the codebase; the wave is closed and ready for merge approval.
