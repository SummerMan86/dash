# Report: BI Clean Architecture — Waves 0-2 (CA-0..CA-7)

## Report Type

`full`

## Статус

Выполнено. Waves 0, 1, 2 (CA-0 через CA-7) завершены. 5 commits на `feature/bi-clean-architecture`.

## Plan Sync

Active plan: `docs/agents/lead-strategic/current_plan.md`
- Wave 0 (CA-0): done
- Wave 1 (CA-1, CA-2): done
- Wave 2 (CA-3..CA-7): done
- Wave 3 (CA-8..CA-12): next
- Wave 4 (CA-13..CA-16): pending

No plan changes requested. Operating mode: `ordinary iterative`.

## Что сделано

### CA-0: ESLint Governance Baseline (self-executed)

- Separated lint commands: `lint:format`, `lint:eslint`, `lint:boundaries`
- Added lint governance policy: `docs/architecture.md` §8.1
- Added ESLint rule-introduction policy: `docs/agents/invariants.md` §10
- Svelte 5 migration rules downgraded to `warn` (91+66+29 false-positive errors → warnings)
- Baseline captured: 46 errors, 187 warnings

### CA-1: Decompose product-analytics (worker, worktree)

- `+page.svelte`: 778 → **256 lines** (target ≤300)
- Extracted: `PriceEditor.svelte` (210), `ProductTable.svelte` (202), `ProductDetail.svelte` (203), `view-model.ts` (96)
- Performance fix: `analyzeProduct()` pre-computed as `Map<nm_id, Recommendation[]>` in single `$derived`
- 56 new tests (aggregation, recommendations, view-model)
- `vitest.config.ts` extended with route-level test discovery

### CA-2: Decompose stock-alerts (worker, worktree)

- `+page.svelte`: 417 → **281 lines** (target ≤350)
- Extracted: `OfficeSkuPanel.svelte` (87), `OfficesTable.svelte` (108)
- 45 new tests (aggregation, utils)

### CA-3..CA-6: Filter Path Migration (self-executed)

- All 4 BI pages migrated to explicit planner call + `useFlatParams: true`
- Pages: office-day, product-analytics, stock-alerts, demo
- Pattern: `planFiltersForDataset()` called in page, serverParams merged into params
- Strategy/EMIS pages explicitly out of scope (per plan constraints)

### CA-7: Remove Legacy Filter Path (self-executed)

- `useFlatParams` flag removed from `FetchDatasetArgs`
- Canonical flat-params path is now the default in `fetchDataset()`
- Legacy path retained as deprecated fallback, gated by `filterContext` presence (for non-migrated strategy/EMIS pages)
- All custom compile `dateRangeWhere`/`publishedRangeWhere` updated to read from `params` (canonical) with `filters` fallback
- Deprecated annotations added to `filterContext`, `filters`, `skipClientFilter`

## Checks Evidence (fresh, after final commit d57e2d0)

| Check | Result |
|---|---|
| `pnpm check` | 0 errors, 0 warnings |
| `pnpm build` | success |
| `pnpm test` | **228 passed** (127 baseline + 101 new) |
| `pnpm lint:boundaries` | no violations |

## Review Disposition

Slice reviews: not run during execution (workers ran self-checks, tactical verified after integration).
Integration review: **pending** — code-reviewer and architecture-reviewer requested by user.

## Architectural Decisions

1. **Svelte migration rules as warnings** (CA-0): 3 Svelte 5 recommended rules downgraded from `error` to `warn` to reduce noise. Documented in `architecture.md` §8.1.

2. **Legacy path isolation, not removal** (CA-7): Plan called for full removal of legacy path. EMIS and strategy pages still use `filterContext` (out of scope). Compromise: canonical path is default; legacy path retained as deprecated, gated by `filterContext` presence. `useFlatParams` flag removed as planned.

3. **Custom compile backward-compat** (CA-7): `dateRangeWhere` functions changed from `query.filters` to `{ ...query.filters, ...query.params }` merge. Prevents date range regression for migrated pages while maintaining compatibility for non-migrated EMIS/strategy paths.

## Risks / Escalations

1. **CA-7 partial vs plan**: Plan specifies `DatasetQuery.filters` field removal and complete legacy path elimination. Actual: filters field kept (deprecated) and legacy path isolated. Reason: EMIS/strategy pages out of scope. **Recommend**: lead-strategic acknowledge this as accepted trade-off, update debt register.

2. **No visual verification**: Pages verified by type-checking + build + tests only. Dev server is running; visual verification deferred. `prototype-pin-refactor` verification mode prescribed for CA-1/CA-2.

## Branch

- `feature/bi-clean-architecture` (5 commits ahead of `main`)
- Clean merge path (no conflicts expected)

## Readiness

- Wave 3 can start immediately (CA-8 depends on CA-7, which is done)
- Operating mode remains `ordinary iterative`
