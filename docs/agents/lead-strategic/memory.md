# Lead-Strategic Memory

## Active State

- active wave: `none`
- last closed wave: Restructure `src/lib/` app-local surface and remove FSD-named buckets
- closed on: `2026-04-16`
- final verdict: `ACCEPT`
- plan snapshot: `docs/agents/lead-strategic/current_plan.md`
- branch at close: `feature/src-lib-dissolve-fsd-buckets`
- execution profile at close: `opus-orchestrated-codex-workers`
- baseline status: `Yellow` (`pnpm lint:eslint` pre-existing baseline errors only)
- test baseline: `309` tests (`19` files)

## Carry Forward

- canonical app-local model is route-local first, then flat first-level `src/lib/<module>/`; FSD-named buckets are no longer live
- `src/lib/api/`, `src/lib/fixtures/`, and `src/lib/styles/` are the canonical app-local homes for the former `shared/` surface
- `apps/web/src/lib/dashboard-edit/` and `apps/web/src/lib/emis-manual-entry/` are the promoted first-level app-local modules from this wave
- `stock-alerts` and vessel-positions `EmisDrawer` are route-local, not shared widgets
- `$shared`, `$features`, and `$widgets` aliases are removed; post-wave guardrails live in ESLint boundaries plus `docs/agents/invariants.md`
- integration review is closed `OK` after fix commit `b940d92`; no open PCRs or unresolved review findings
- carry forward only the existing non-blocking baseline debt: `pnpm lint:eslint` in packages/scripts, barrel/direct import inconsistency, broad peer-isolation glob, and oversized `routes/emis/+page.svelte`

## Pruning Rule

- On new wave: rewrite this file, don't append. Keep only live strategic state.
