# Plan: EMIS Phase 3 — Tech Debt Cleanup and Final Stabilization

## Цель

Закрыть все carry-forward tech debt после MVE closeout и post-MVE (P1/P2).
Результат: чистый baseline без known exceptions, waivers и drift.

## Контекст

- MVE accepted with explicit deferrals (NW-5, 2026-04-05)
- Post-MVE feature waves P1 (vessel track) и P2 (offline maps) завершены
- Baseline green, 0 live exceptions
- Carry-forward items задокументированы в `docs/agents/lead-tactical/memory.md`

## Scope

Только tech debt и stabilization. Никаких новых фич и product expansion.

## Slices

### TD-1: Decompose `+page.svelte` (799 → target < 650)

- status: **completed** (2026-04-05, 799 -> 639 lines)
- file: `apps/web/src/routes/emis/+page.svelte` (799 lines)
- architecture-reviewer WARNING from P1 review: exceeds 700-line threshold
- approach:
  - extract bbox/viewport-aware catalog logic into a route-local helper (e.g. `emisPageCatalog.ts`)
  - extract vessel-mode derived state (`vesselFlyToTarget`, vessel selection helpers) into a route-local helper (e.g. `emisPageVesselMode.ts`)
  - unify debounce patterns: replace raw `setTimeout` with `useDebouncedLoader` or a consistent pattern
- constraints:
  - route-local files only (`apps/web/src/routes/emis/`)
  - no new packages or cross-boundary changes
  - preserve all existing behavior and smoke coverage
- done when:
  - `+page.svelte` < 650 lines
  - all 6 canonical checks green
  - architecture-reviewer passes without warnings

### TD-2: Remove MIGRATION re-export shims

- status: **completed** (2026-04-05, 72 shims removed, -3280 lines)
- scope: dead re-export shims in `entities/`, `shared/`, `widgets/` directories
  - these are `export { X } from '@dashboard-builder/...'` files left from the ST-1..ST-10 package extraction
  - they are no longer imported by any active code (verify before deletion)
- approach:
  - grep for each shim's import path across the codebase
  - if zero imports found → delete the shim file
  - if imports found → update import to point directly at the package, then delete the shim
  - update any local `AGENTS.md` or `index.ts` barrels that reference deleted shims
- constraints:
  - do NOT touch package code (`packages/*`)
  - do NOT touch route handlers or server code unless they import a shim
  - verify with `pnpm check` + `pnpm build` after each batch of deletions
- done when:
  - zero MIGRATION re-export shims remain in `entities/`, `shared/`, `widgets/`
  - all 6 canonical checks green

### TD-3: Fix stock-alerts layer-boundary violation

- status: **completed** (2026-04-05, lint:boundaries zero violations)
- scope: `stock-alerts` module imports from `routes` layer (pre-existing violation)
- approach:
  - identify the specific import(s) crossing the boundary
  - relocate shared code to the correct layer, or re-route the import
- constraints:
  - this is NOT an EMIS module — be careful with non-EMIS code
  - minimal change, no refactoring beyond what's needed to fix the violation
- done when:
  - `pnpm lint:boundaries` reports zero violations (currently pre-existing violations masked)
  - `pnpm check` + `pnpm build` green

### TD-4: Fix Prettier drift

- status: **completed** (2026-04-05, 90 files formatted; 32 re-drifted from subsequent TD-1/TD-2/TD-3 commits)
- scope: `pnpm lint` currently fails due to Prettier formatting drift across the codebase
- approach:
  - run `pnpm lint --fix` or `prettier --write` on affected files
  - review the diff to ensure no semantic changes
  - if the diff is massive (>50 files), split into logical batches
- constraints:
  - formatting only — no code changes
  - do NOT change `.prettierrc` or eslint config unless there's a config conflict causing the drift
- done when:
  - `pnpm lint` passes clean
  - all 6 canonical checks green

### TD-5: Register `+page.svelte` exception closure and final baseline

- status: **completed** (2026-04-05, baseline Green / closed, zero carry-forward)
- scope: governance closure
- approach:
  - if TD-1 brings `+page.svelte` under 700 lines, confirm no exception needed
  - if still above 700, register in `docs/emis_known_exceptions.md` with owner and target
  - run full baseline: all 6 canonical checks
  - update `docs/emis_session_bootstrap.md` with final stabilization status
  - update this plan with completion status
  - update backlog `docs/emis_next_tasks_2026_03_22.md`
- done when:
  - zero carry-forward tech debt items remain
  - baseline verdict: Green / closed
  - docs reflect final stabilized state

## Execution Order

```
TD-1 (page decomp) ──→ TD-5 (governance closure)
TD-2 (shims cleanup) ─┘
TD-3 (stock-alerts) ──┘
TD-4 (prettier) ──────┘
```

TD-1 through TD-4 can run in parallel. TD-5 runs after all others complete.

## Recommended Handoff To Lead-Tactical

Start with TD-1 (highest architectural impact) and TD-2 (largest dead code surface).
TD-3 and TD-4 are independent and can be parallelized.
TD-5 is the final governance gate.

## Post-Stabilization

After TD-5, the codebase is ready for the next product planning cycle.
Potential directions (not in scope for this plan):

- Auth/RBAC implementation
- Admin UI for dictionaries
- News ingestion from external sources
- BI dashboard expansion
