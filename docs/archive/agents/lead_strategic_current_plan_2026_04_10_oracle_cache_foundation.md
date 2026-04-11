# Plan: Oracle-First BI LRU Cache Foundation for OLTP Dashboards

## Status

- active on `2026-04-10`
- previous completed BI plan archived in `docs/archive/agents/lead_strategic_current_plan_2026_04_10_bi_refactor_wave1_complete.md`

## Цель

Подготовить provider-owned server-side cache foundation для OLTP-oriented BI datasets без открытия dashboard/UI scope.

Эта wave должна заменить ad-hoc Oracle `Map` cache на reusable bounded LRU cache helper внутри `@dashboard-builder/platform-datasets`, чтобы следующий tactical диалог мог строить первый OLTP dashboard поверх стабильной cache semantics, а не поверх локального provider-specific workaround.

## Operating Mode

- current mode: `ordinary iterative`
- immediate escalation to `high-risk iterative / unstable wave`, если implementation:
  - выходит за пределы Oracle-first provider cache;
  - меняет public dataset contracts (`DatasetQuery`, `DatasetResponse`, `DatasetRegistryEntry.cache`);
  - тянет в scope `fetchDataset(...)`, `/api/datasets/:id`, dashboard routes или другой UI/runtime churn

## Подзадачи

### OC-1: Shared LRU Cache Foundation

- scope: `packages/platform-datasets/package.json`, internal server-only cache helper under `packages/platform-datasets/src/server/*`, focused helper tests
- depends on: —
- размер: M
- acceptance: `lru-cache` added as a runtime dependency; package gets an internal reusable cache helper for provider responses; helper stores cached `DatasetResponse` together with `cachedAt`; helper supports deterministic keying, TTL expiry, bounded max entries (`200` in the first pass), and true LRU eviction; tests cover cache hit, TTL miss after expiry, tenant separation, `requestId` exclusion, and eviction order
- verification intent: shared cache primitive exists in the canonical BI runtime package and matches the documented provider-owned cache contract without changing any public API
- verification mode: `test-first`
- заметки: helper stays internal to `platform-datasets`; do not export it from the public `./server` entrypoint; no env knobs, no prewarm, no background refresh in this slice

### OC-2: Oracle Provider Adoption

- scope: `packages/platform-datasets/src/server/providers/oracleProvider.ts`, Oracle-provider-focused tests
- depends on: OC-1
- размер: M
- acceptance: `oracleProvider` stops using its local `Map`/FIFO TTL cache and uses the shared helper instead; cache still activates only when `entry.cache?.ttlMs > 0`; timeout handling, retryable error mapping, and lazy pool lifecycle remain intact; cache hits expose consistent `meta.cacheAgeMs` derived from real cache age
- verification intent: Oracle-backed OLTP datasets keep their existing route/runtime contract while moving to bounded LRU semantics in the provider layer
- verification mode: `test-first`
- заметки: do not add `staleWhileRevalidate`, refresh automation, or any change to current `ifts.*` cache hints in this slice

### OC-3: Wave Closure And Drift Check

- scope: package/runtime verification for unchanged client, route, registry, and Postgres seams
- depends on: OC-2
- размер: S
- acceptance: fresh verification evidence exists for `pnpm check`, `pnpm check:packages`, `pnpm build`, `pnpm lint:boundaries`, and `pnpm test`; no unintended drift lands in `fetchDataset(...)`, `/api/datasets/:id`, `postgresProvider`, dashboard routes, or the current dataset registry set beyond incidental test harness wiring
- verification intent: Oracle-first cache wave closes without silent blast radius outside provider cache infrastructure
- verification mode: `verification-first`
- заметки: any required public-contract change or dashboard/UI work is a plan reframe trigger, not an inline extension of this wave

## Ограничения

- Не менять public dataset contracts:
  - `DatasetQuery`
  - `DatasetResponse`
  - `DatasetRegistryEntry.cache`
  - `/api/datasets/:id`
  - `fetchDataset(...)`
- Не добавлять и не мигрировать dashboards/routes в этой wave; первый OLTP dashboard идёт отдельным follow-up plan.
- Не подключать shared cache helper к `postgresProvider` в этой wave; rollout remains Oracle-first.
- Не менять registry dataset set и не переопределять current `ifts.*` cache hints, если это не нужно для сохранения текущей semantics.
- Не вводить `staleWhileRevalidate`, `refreshIntervalMs` automation, proactive warmup, Redis/external cache tier, или env-configurable cache sizing.
- Сохранять bounded in-process memory model из `docs/architecture.md` и `docs/architecture_dashboard_bi.md`.

## Ожидаемый результат

- `@dashboard-builder/platform-datasets` получает reusable internal provider-cache primitive, aligned with the BI architecture contract.
- `oracleProvider` переходит с ad-hoc insertion-order eviction на bounded LRU semantics.
- Oracle cache hits начинают отдавать устойчивый `meta.cacheAgeMs`.
- Следующая wave может открывать route-first OLTP dashboard поверх существующих `ifts.*` datasets или новых honest read models, не переоткрывая cache foundation.
