# H-5: Close Remaining Small Boundary Hardening Gaps — Completion Report

**Wave:** EMIS Post-Split Hardening And Boundary Cleanup
**Branch:** `feature/emis-post-split-hardening`
**Date:** 2026-04-03

## Status: DONE

All three bounded hardening residuals closed. No new boundary violations introduced.

## Residual 1: mapConfig boundary exception in BI route

**Problem:** `apps/web/src/routes/dashboard/emis/vessel-positions/+page.server.ts` imported `getEmisMapConfig` via the app-local shim `$lib/server/emis/infra/mapConfig` with an eslint-disable comment, instead of the canonical package path.

**Fix:**
- Switched the BI route to `@dashboard-builder/emis-server/infra/mapConfig`
- Also normalized 2 EMIS routes that still used the shim: `emis/+page.server.ts`, `emis/pmtiles-spike/+page.server.ts`
- Deleted the now-unused shim: `apps/web/src/lib/server/emis/infra/mapConfig.ts`
- Updated `apps/web/src/routes/api/emis/AGENTS.md` to document the shim deletion

**Canonical access path:** `@dashboard-builder/emis-server/infra/mapConfig`

## Residual 2: Duplicated clampPageSize()

**Problem:** `clampPageSize()` was duplicated identically in `modules/objects/queries.ts` and `modules/news/queries.ts`. `clampMapLimit()` was a separate but similar function in `modules/map/queries.ts`.

**Fix:**
- Extracted `clampPageSize()` and `clampMapLimit()` to `packages/emis-server/src/infra/http.ts`, using the existing constants (`EMIS_DEFAULT_LIST_LIMIT`, `EMIS_MAX_LIST_LIMIT`, `EMIS_DEFAULT_MAP_LIMIT`, `EMIS_MAX_MAP_LIMIT`)
- Replaced local definitions in all 3 query modules with imports from `../../infra/http`
- `ship-routes/queries.ts` has a different-signature `clampLimit(value, max)` with no default — left as-is (not a duplicate)

**Behavior change:** None. The extracted functions use the same constants that the inline implementations hardcoded (50/200 for list, 200/500 for map).

## Residual 3: Fragile mapVesselsQuery parameter assembly

**Problem:** `mapVesselsQuery` in `modules/map/queries.ts` used hardcoded `$1`, `$2`, `$3`, `$4` for bbox parameters instead of the dynamic push-and-reference pattern (`$${values.length}`) used by all other query functions.

**Fix:** Replaced hardcoded indices with the standard push-and-reference pattern:
```typescript
values.push(west);
const westParam = `$${values.length}`;
// ... etc.
```

**Behavior change:** None. Same SQL, same parameter order, same semantics. Only the index derivation is now position-independent.

## Explicitly Deferred

- **fetchDataset boundary gap** (`apps/web/src/lib/shared/api/fetchDataset.ts`): platform-level FSD violation (shared imports entities). Not this wave's scope. Remains as carry-forward.

## Remaining Boundary Exceptions

- 3 pre-existing violations in `fetchDataset.ts` (carry-forward from before H-1)
- No new boundary violations

## Verification

| Check | Result |
|---|---|
| `pnpm check` | 0 errors, 0 warnings |
| `pnpm build` | Success (SSR + client) |
| `pnpm lint:boundaries` | 3 pre-existing only (fetchDataset FSD) |

## Files Changed

- `apps/web/src/routes/dashboard/emis/vessel-positions/+page.server.ts` — switched to canonical package import, removed eslint-disable
- `apps/web/src/routes/emis/+page.server.ts` — switched to canonical package import
- `apps/web/src/routes/emis/pmtiles-spike/+page.server.ts` — switched to canonical package import
- `apps/web/src/lib/server/emis/infra/mapConfig.ts` — DELETED (shim no longer needed)
- `packages/emis-server/src/infra/http.ts` — added `clampPageSize()` and `clampMapLimit()`
- `packages/emis-server/src/modules/objects/queries.ts` — replaced local clampPageSize with import
- `packages/emis-server/src/modules/news/queries.ts` — replaced local clampPageSize with import
- `packages/emis-server/src/modules/map/queries.ts` — replaced local clampMapLimit with import; refactored mapVesselsQuery bbox params
- `apps/web/src/routes/api/emis/AGENTS.md` — documented mapConfig shim deletion
- `docs/agents/lead-tactical/memory.md` — H-5 notes
- `docs/agents/lead-tactical/last_report.md` — this report

## Review Gate (run by orchestrator)

| Reviewer | Verdict | Findings |
|---|---|---|
| architecture | OK | INFO: bbox push order inconsistency (non-blocking) |
| code | OK | INFO: bbox order + missing comment (non-blocking) |
| security | OK | All params verified correct, no injection risk |
| docs | request changes | WARNING: plan status stale — **fixed**; INFO: AGENTS.md + RUNTIME_CONTRACT missing new helpers — **fixed** |

### Fixes applied
1. `current_plan.md` — H-5 marked completed, execution order updated, wave marked complete
2. `packages/emis-server/AGENTS.md` — http.ts description updated with clampPageSize/clampMapLimit
3. `RUNTIME_CONTRACT.md` — added clampPageSize/clampMapLimit to package-level helpers table
4. `lead-strategic/memory.md` — H-5 marked completed, wave marked complete

## Wave Status

H-1 through H-5 all DONE. Wave "EMIS Post-Split Hardening And Boundary Cleanup" is **complete**.
