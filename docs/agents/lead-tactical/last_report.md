# Report: Oracle-First BI LRU Cache Foundation (OC Wave)

## Report Type

`full`

## Статус

Выполнено. Все 3 slice (OC-1, OC-2, OC-3) завершены, review findings исправлены, docs обновлены.

## Что сделано

- OC-1: Shared LRU cache helper (`packages/platform-datasets/src/server/providerCache.ts`, 97 lines)
  - `createProviderCache({ maxEntries })` — bounded LRU via `lru-cache` v11, default 200 entries
  - `buildCacheKey(datasetId, params, tenantId)` — deterministic key, `\0` separator, requestId excluded
  - Manual TTL via `Date.now()` (testable with fake timers), `structuredClone` on read+write
  - 14 tests: hit, miss, TTL expiry, tenant separation, requestId exclusion, LRU eviction order, write-side + read-side immutability, colon separator collision

- OC-2: Oracle Provider Adoption (`oracleProvider.ts`, net -26 lines)
  - Replaced ad-hoc `Map`/FIFO TTL cache with shared `providerCache`
  - `meta.cacheAgeMs` now derived from `cachedAt` timestamp (simpler, more reliable)
  - `connectionName` extraction hardened: explicit throw guard instead of silent `'default'` fallback
  - Removed unused `IrSelectItem` import
  - 4 tests: sqlText differentiation, requestId exclusion, tenant separation, bind value differentiation

- OC-3: Wave closure — all 5 canonical checks green, no drift in protected scope

- Docs: AGENTS.md full rewrite, architecture_dashboard_bi.md §4 updated with implementation details, docs/AGENTS.md description updated

## Plan Sync

- current_plan.md: `unchanged`
- plan change requests: `none`
- operating mode at handoff: `ordinary iterative`
- mode change signal: `none`

## Review Disposition

- integration review: `run` (all 5 reviewers: architecture, security, code, docs × 2 passes)
- rationale: first adoption of shared cache primitive, cross-file change within provider layer

## Strategic Cadence

- next-slice impact: `none`
- strategic-reviewer yield: `not run` (Codex submitted but no substantive response returned)
- strategic-reviewer model: `not run`
- why strategic-reviewer was run: attempted for plan acceptance
- cross-model value: `not applicable`
- cadence note: Codex strategic review deferred; findings resolved by Claude reviewers

## Findings по severity

**CRITICAL**:

- code-reviewer: oracleProvider.ts:258 — connectionName dead code ternary with silent 'default' fallback → FIXED (explicit throw guard)

**WARNING**:

- security-reviewer: providerCache.ts:30 — cache key separator collision when datasetId/tenantId contain `:` → FIXED (`\0` separator)
- code-reviewer: providerCache.test.ts — vi.useRealTimers() leak → FIXED (afterEach added)
- code-reviewer: oracleProvider.ts:244 — binds as positional keys fragile → FIXED (binds as array)
- code-reviewer: providerCache.ts — stale-slot documentation → FIXED (JSDoc added)
- code-reviewer: providerCache.test.ts:82 — cachedAt tolerance unnecessary → FIXED (exact equality)
- docs-reviewer: AGENTS.md missing oracleProvider → FIXED (full rewrite)
- docs-reviewer (pass 2): docs/AGENTS.md:43 stale description → FIXED

**INFO**:

- code-reviewer: read-side immutability test missing → FIXED (added)
- code-reviewer: cachedAt JSDoc missing → FIXED
- docs-reviewer: providerCache.ts §7 ref → FIXED (now §4+§7)
- docs-reviewer (pass 2): "normalized params" imprecise → FIXED (clarified in arch doc)
- architecture-reviewer: connectionName ternary fallback → covered by CRITICAL fix

## Reviewer Verdicts

- architecture-reviewer: OK (1 INFO)
- security-reviewer: request changes → fixed (1 WARNING, 2 INFO)
- code-reviewer: request changes → fixed (1 CRITICAL, 4 WARNING, 3 INFO)
- docs-reviewer (pass 1): request changes → fixed (1 WARNING, 3 INFO)
- docs-reviewer (pass 2): request changes → fixed (1 WARNING, 1 INFO)

## Governance Summary

- architecture pass: summarized inline — no boundary violations, provider-internal cache only
- baseline pass: not needed (no schema/contract changes)
- exceptions / waivers touched: `none`
- rationale: OC wave is strictly provider-internal; no public API, schema, or route changes

## Checks Evidence

- `pnpm check`: green `fresh`
- `pnpm check:packages`: green `fresh` (all 8 packages)
- `pnpm build`: green `fresh`
- `pnpm lint:boundaries`: green `fresh` (no violations)
- `pnpm test`: green `fresh` (10 files, 127 tests)

## Ветки

- integration branch: `main` (direct, no feature branch — ordinary iterative, low-risk)
- worker branches merged: `none` (lead-tactical self-executed)
- review diff: new files + oracleProvider.ts cache replacement

## Agent Effort

- workers spawned: 0 (self-executed)
- review passes: 7 (slice: 5 parallel, integration docs: 2)
- codex calls: 1 (strategic review — no substantive response)

## Usage Telemetry

- agent value: `meaningful` — 5 reviewers found 1 CRITICAL + 7 WARNING that were all fixed
- agent value reason: security reviewer caught separator collision, code reviewer caught dead code ternary
- orchestration value: `efficient` — self-executed 3 small slices, parallel review, quick fix cycle
- optimization note: Codex strategic review didn't return substantive feedback; consider --resume in future

## Готовность

Готово к commit. Все checks green, findings resolved, docs updated.

## Вопросы к lead-strategic

- none
