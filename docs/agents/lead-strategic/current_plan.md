# Plan: BI Clean Architecture — Audit-Driven Remediation

## Status

- active on `2026-04-12`
- Waves 0–2 (CA-0..CA-7) **done** — 6 commits on `feature/bi-clean-architecture`
- Wave 3 (CA-8..CA-12) — **next**
- Wave 4 (CA-13..CA-16) — pending
- previous completed plan archived in `docs/archive/agents/lead_strategic_current_plan_2026_04_10_oracle_cache_foundation.md`

## Цель

Довести BI-вертикаль до состояния чистой архитектуры на основе замечаний architecture audit (2026-04-11).

Аудит выявил, что фундамент (registry, IR, providers, filter planner) зрелый и хорошо спроектирован, но три класса проблем мешают низкой когнитивной нагрузке при разработке:

1. God component и отсутствие декомпозиции на страницах
2. Незавершённая миграция filter path (legacy vs flat params)
3. Bypass валидации через `looseParams` на большинстве датасетов
4. Implicit filter runtime в client data path (`active runtime` / global fallback)
5. Слабое тестовое покрытие route-local BI logic и WB proxy path

Все замечания зафиксированы в `docs/architecture_dashboard_bi.md` §8 (guardrails) и §9 (migration debt register).

## Operating Mode

- current mode: `ordinary iterative`
- escalate to `high-risk iterative`, если:
  - slice меняет public wire contract (`DatasetQuery`, `DatasetResponse`)
  - slice требует coordinated changes в 3+ packages
  - slice ломает существующие тесты (127 green tests as baseline)

## Architecture Readiness

Readiness check выполнен в рамках аудита. Все architectural decisions уже зафиксированы:
- `architecture_dashboard_bi.md` §8 — code quality guardrails
- `architecture_dashboard_bi.md` §9 — migration debt register
- `invariants.md` §8 — architecture-docs-first
- `invariants.md` §9 — BI vertical invariants

Readiness: `CLEAR` — решения задокументированы, можно приступать к реализации.

## Waves

### Wave 0: Lint Governance Baseline (Critical)

Зафиксировать model проверки качества кода: какие команды canonical, какие lint-сигналы blocking, и по каким правилам новые ESLint-checks можно добавлять по мере роста проекта. Также скорректировать агентную модель, чтобы это работало. Учесть baseline-governor и когда его надо вызывать, после каждой доработки, в конце подзадач?

### Wave 1: Page Decomposition (Critical)

Устранить god component и привести страницы к чистой композиции; попутно сделать route-local BI logic тестируемой.

### Wave 2: Filter Path Migration (Critical)

Завершить миграцию на `useFlatParams: true`, удалить legacy path.

### Wave 3: Contract Hardening (High)

Заменить `looseParams` на явные Zod-схемы, унифицировать кеширование.

### Wave 4: Cleanup & Hardening (Medium/Low)

Убрать дубликаты, реализовать access control, навести порядок в demo.

---

## Подзадачи

### CA-0: Establish ESLint governance baseline ✅

- status: **done** (commit `64a08ea`)
- wave: 0
- scope: `eslint.config.js`, `package.json`, `docs/architecture.md` §8, `docs/agents/invariants.md`, `docs/agents/lead-strategic/current_plan.md`
- depends on: —
- размер: M
- acceptance:
  - canonical verification commands разделены и явно задокументированы:
    - `pnpm lint:format` — formatting only
    - `pnpm lint:eslint` — semantic lint only
    - `pnpm lint:boundaries` — architectural import boundaries only
    - `pnpm lint` — aggregate entrypoint
  - в `docs/architecture.md` §8 добавлена policy, что именно означает каждый lint command и какой из них обязателен для architectural slices
  - в `docs/agents/invariants.md` добавлены правила для введения новых ESLint-checks:
    - правило должно быть low-noise и без массовых false positives
    - правило не вводится repo-wide как blocking, пока baseline по нему uncontrolled
    - для red baseline допускается `touched-files only` enforcement
    - architectural guardrails приоритетнее stylistic rules
    - новый blocking rule сопровождается remediation plan или bounded scope
  - зафиксирован project policy для роста:
    - новые rules добавляются только через docs-first decision
    - предпочтение правилам, которые защищают boundaries, contracts, unsafe runtime patterns и accidental complexity
    - stylistic checks не должны маскировать архитектурные сигналы
  - `eslint.config.js` приведён к low-noise baseline:
    - архивный код исключён из lint scope
    - placeholder-параметры `_name` не создают лишний шум
    - есть отдельный guardrail для dashboard client modules vs server imports
  - `pnpm lint:boundaries` green
  - `pnpm lint:eslint` baseline явно зафиксирован: текущий долг не обязан быть полностью закрыт этим slice, но policy "не ухудшать touched files" становится canonical
- verification intent: сделать lint управляемым инструментом архитектурного governance, а не случайным источником шума
- verification mode: `verification-first`
- заметки:
  - slice не обязан делать весь repo lint-green
  - slice обязан сделать lint-policy однозначной для следующих волн

### CA-1: Decompose product-analytics page ✅

- status: **done** (commit `9c47e8c`, 256 lines, +56 tests)
- wave: 1
- scope: `apps/web/src/routes/dashboard/wildberries/product-analytics/`
- depends on: —
- размер: L
- acceptance:
  - `+page.svelte` ≤ 300 строк, содержит только data loading, filter wiring, layout composition
  - price management вынесен в `PriceEditor.svelte` (самостоятельный компонент со своей state machine)
  - product table вынесен в `ProductTable.svelte` (сортировка, рендеринг строк, sparkline)
  - detail panel вынесен в `ProductDetail.svelte` (метрики, рекомендации)
  - `analyzeProduct()` вызывается **один раз** в `$derived` (Map по nm_id), не per-row в `{#each}`
  - chart options вынесены в `view-model.ts` как фабричные функции
  - добавлены route-local unit tests для `aggregation.ts`, `recommendations.ts` и `view-model.ts`
  - все 127 тестов green, `pnpm check` и `pnpm build` pass
- verification intent: page decomposition сохраняет текущее поведение без регрессий
- verification mode: `prototype-pin-refactor` (UI change, проверка через dev server)
- заметки: не добавлять новую функциональность; строго рефакторинг

### CA-2: Decompose stock-alerts page ✅

- status: **done** (commit `42e95ec`, 281 lines, +45 tests)
- wave: 1
- scope: `apps/web/src/routes/dashboard/wildberries/stock-alerts/`
- depends on: —
- размер: M
- acceptance:
  - `+page.svelte` ≤ 350 строк
  - aggregation pipeline уже в `aggregation.ts` (OK), но drill-down panel вынесен в отдельный компонент
  - preset / filter / office-detail composition не размазана по `+page.svelte`; page остаётся orchestration-only
  - добавлены route-local unit tests для `aggregation.ts` и `utils.ts`
  - `pnpm check` и `pnpm build` pass
- verification intent: та же декомпозиция без изменения поведения
- verification mode: `prototype-pin-refactor`
- заметки: параллелен CA-1, нет зависимостей

### CA-3: Migrate WB office-day to useFlatParams ✅

- status: **done** (commit `ce1454b`)
- wave: 2
- scope: `apps/web/src/routes/dashboard/wildberries/office-day/+page.svelte`, `apps/web/src/lib/shared/api/fetchDataset.ts`
- depends on: CA-1 (для минимизации merge conflicts)
- размер: S
- acceptance:
  - page вызывает `fetchDataset({ ..., useFlatParams: true })` с явными params из planner
  - page не использует `getFilterSnapshot()` или implicit filter merge
  - поведение не изменено
- verification intent: страница работает идентично через canonical path
- verification mode: `prototype-pin-refactor`

### CA-4: Migrate WB product-analytics to useFlatParams ✅

- status: **done** (commit `ce1454b`)
- wave: 2
- scope: `apps/web/src/routes/dashboard/wildberries/product-analytics/+page.svelte`
- depends on: CA-1, CA-3
- размер: S
- acceptance: аналогично CA-3
- verification mode: `prototype-pin-refactor`

### CA-5: Migrate WB stock-alerts to useFlatParams ✅

- status: **done** (commit `ce1454b`)
- wave: 2
- scope: `apps/web/src/routes/dashboard/wildberries/stock-alerts/+page.svelte`
- depends on: CA-2, CA-3
- размер: S
- acceptance: аналогично CA-3
- verification mode: `prototype-pin-refactor`

### CA-6: Migrate demo dashboard to useFlatParams ✅

- status: **done** (commit `ce1454b`)
- wave: 2
- scope: `apps/web/src/routes/dashboard/demo/+page.svelte`
- depends on: CA-3
- размер: S
- acceptance: аналогично CA-3; demo page использует `useFlatParams: true`
- verification mode: `prototype-pin-refactor`

### CA-7: Remove legacy filter path from fetchDataset ✅

- status: **done** (commit `d57e2d0`)
- wave: 2
- scope: `apps/web/src/lib/shared/api/fetchDataset.ts`, `@dashboard-builder/platform-filters` (getFilterSnapshot, getEffectiveFilters exports)
- depends on: CA-3, CA-4, CA-5, CA-6 (все страницы мигрированы)
- размер: M
- acceptance:
  - `fetchDataset.ts` содержит только canonical flat-params path
  - `useFlatParams` parameter удалён (больше не нужен — есть только один path)
  - `DatasetQuery.filters` field удалён из wire contract
  - `fetchDataset.ts` больше не импортирует и не использует `getFilterSnapshot()`, `getEffectiveFilters()` или `getActiveFilterRuntime()`
  - implicit active-runtime fallback убран из BI data path; страница обязана передать params явно
  - legacy filter helpers либо удалены из public exports, либо изолированы как internal compatibility API без участия в canonical BI path
  - добавлен low-noise ESLint guardrail, запрещающий legacy helper usage на canonical BI path (`fetchDataset` / BI pages), если rule не даёт false positives
  - все 127+ тестов green, `pnpm check`, `pnpm build`, `pnpm lint:boundaries` pass
  - migration debt entries #2 и #3 закрыты в `architecture_dashboard_bi.md` §9
- verification intent: единственный canonical data path, нет ambiguity
- verification mode: `test-first`
- заметки: это breaking change для non-migrated consumers; убедиться, что все страницы мигрированы до этого slice

### CA-8: Introduce typed custom compile contract

- wave: 3
- scope: `packages/platform-datasets/src/model/registry.ts`, `packages/platform-datasets/src/server/executeDatasetQuery.ts`, `packages/platform-datasets/src/server/registry/index.ts`, custom compile definitions
- depends on: CA-7
- размер: M
- acceptance:
  - custom compile получает parsed params / typed params, а не raw `DatasetQuery`
  - `executeDatasetQuery()` передаёт в custom compile результат `paramsSchema.parse(...)`
  - custom compile больше не читает `.filters`; flat params являются единственным compile input
  - тесты runtime/registry обновлены под новый compile contract
  - `pnpm test`, `pnpm check` green
- verification intent: убрать contract hole между `paramsSchema` и custom compile
- verification mode: `test-first`

### CA-9: Explicit paramsSchema for WB datasets

- wave: 3
- scope: `packages/platform-datasets/src/server/registry/index.ts`, `packages/platform-datasets/src/server/definitions/wildberriesOfficeDay.ts`, `wildberriesProductPeriod.ts`
- depends on: CA-8
- размер: M
- acceptance:
  - `wildberries.fact_product_office_day` и `wildberries.fact_product_period` имеют explicit Zod paramsSchema с конкретными полями (dateFrom, dateTo, limit, offset и др.)
  - `looseParams` больше не используется для WB datasets
  - compile использует typed params, а не raw query bag
  - тесты для param validation добавлены
  - `pnpm test` green
  - migration debt entry #1 обновлён (2 из 13 resolved)
- verification intent: bad params ловятся на уровне контракта, не SQL
- verification mode: `test-first`

### CA-10: Explicit paramsSchema for payment datasets

- wave: 3
- scope: `packages/platform-datasets/src/server/registry/index.ts`, `packages/platform-datasets/src/server/definitions/paymentAnalytics.ts`
- depends on: CA-8
- размер: S
- acceptance: аналогично CA-9 для `payment.*` datasets (4 штуки)
- verification mode: `test-first`

### CA-11: Explicit paramsSchema for IFTS datasets

- wave: 3
- scope: `packages/platform-datasets/src/server/registry/index.ts`, `packages/platform-datasets/src/server/definitions/iftsMart.ts`
- depends on: CA-8
- размер: M
- acceptance: аналогично CA-9 для `ifts.*` datasets (4 штуки); Oracle-specific params (operday, service, etc.) typed
- verification mode: `test-first`
- заметки: параллелен CA-9 и CA-10

### CA-12: Provider cache middleware

- wave: 3
- scope: `packages/platform-datasets/src/server/executeDatasetQuery.ts`, `packages/platform-datasets/src/server/providers/postgresProvider.ts`, `packages/platform-datasets/src/server/providers/oracleProvider.ts`
- depends on: —
- размер: M
- acceptance:
  - cache check/populate логика вынесена из `oracleProvider` в middleware-слой (decorator или orchestration step в `executeDatasetQuery`)
  - `postgresProvider` автоматически получает caching для datasets с `entry.cache.ttlMs > 0`
  - Oracle provider продолжает работать как раньше, но через shared middleware
  - cache key основан на `datasetId + normalized params + relevant server context`; `requestId` не участвует
  - тесты для cache middleware добавлены
  - `pnpm test` green
  - migration debt entry #6 закрыт
- verification intent: кеширование провайдер-агностичное, DRY
- verification mode: `test-first`

### CA-13: Remove duplicate dataset definitions

- wave: 4
- scope: `apps/web/src/lib/server/datasets/definitions/`
- depends on: CA-9, CA-10, CA-11
- размер: S
- acceptance:
  - директория `apps/web/src/lib/server/datasets/definitions/` удалена или содержит только re-exports из `packages/platform-datasets`
  - все imports обновлены
  - `pnpm lint:boundaries` и `pnpm build` pass
  - migration debt entry #7 закрыт
- verification mode: `verification-first`

### CA-14: Implement assertDatasetAccess

- wave: 4
- scope: `packages/platform-datasets/src/server/executeDatasetQuery.ts`, `packages/platform-datasets/src/model/ports.ts`
- depends on: —
- размер: M
- acceptance:
  - `assertDatasetAccess(entry, ctx)` реализован: проверяет `entry.access.requiredScopes` против `ctx.scopes`
  - при несоответствии бросает `DatasetExecutionError` с кодом `DATASET_ACCESS_DENIED`
  - placeholder comment удалён
  - тесты для access denied и access granted добавлены
  - `pnpm test` green
  - migration debt entry #5 закрыт
- verification mode: `test-first`
- заметки: текущие datasets не имеют `access.requiredScopes`, поэтому behavior не меняется; это подготовка к multi-tenant

### CA-15: Add WB BI route-local and proxy tests

- wave: 4
- scope: `apps/web/src/routes/dashboard/wildberries/*`, `apps/web/src/routes/api/wb/prices/+server.ts`
- depends on: CA-1, CA-2
- размер: S
- acceptance:
  - есть targeted tests на route-local BI logic, которая не покрыта package-level suite
  - `/api/wb/prices` покрыт тестами на validation, missing token, upstream error mapping и success response
  - `pnpm test` green
- verification intent: route-local BI logic больше не остаётся "слепой зоной" между packages и UI
- verification mode: `test-first`

### CA-16: Wave closure and debt register update

- wave: 4
- scope: `docs/architecture_dashboard_bi.md` §9, verification
- depends on: CA-1..CA-15
- размер: S
- acceptance:
  - все 7 entries в migration debt register обновлены (resolved или updated status)
  - `pnpm check`, `pnpm build`, `pnpm test`, `pnpm lint:boundaries` green
  - final architecture-reviewer integration review pass
- verification mode: `verification-first`

## Sequencing

```
Wave 0: ✅ DONE
  CA-0 (lint governance baseline)

Wave 1: ✅ DONE
  CA-1 (product-analytics decompose)
  CA-2 (stock-alerts decompose)

Wave 2: ✅ DONE
  CA-3 (office-day useFlatParams)
  CA-4 (product-analytics useFlatParams)
  CA-5 (stock-alerts useFlatParams)
  CA-6 (demo useFlatParams)
  CA-7 (remove legacy path)

Wave 3: ⏳ NEXT
  CA-8  (typed custom compile contract) ◄── CA-7 ✅
  CA-9  (WB paramsSchema)               ◄── CA-8
  CA-10 (payment paramsSchema)          ◄── CA-8
  CA-11 (IFTS paramsSchema)             ◄── CA-8
  CA-12 (cache middleware)                 (independent, can start anytime)

Wave 4 (after Wave 3):
  CA-13 (remove duplicate definitions) ◄── CA-9..CA-11
  CA-14 (assertDatasetAccess)          (independent)
  CA-15 (WB route-local/proxy tests)   ◄── CA-1 ✅, CA-2 ✅
  CA-16 (wave closure)                 ◄── all
```

## Ограничения

- Не добавлять новую функциональность — строго рефакторинг и contract hardening
- Не менять wire contract (`DatasetQuery`/`DatasetResponse`) до CA-7 (coordinated removal of `.filters`)
- Не трогать EMIS datasets и routes — scope ограничен BI vertical
- Не трогать strategy dashboard — его paramsSchema уже explicit
- Реальная auth / tenant derivation для dataset routes не входит в этот план; CA-14 даёт access-gate scaffold, но не вводит новый auth contour
- 228 green tests — baseline (127 original + 101 added by CA-1/CA-2); каждый slice должен закончиться с ≥ 228 green tests
- `pnpm lint:eslint` сейчас не green repo-wide; slices не должны увеличивать lint debt в touched files и по возможности должны его уменьшать
- `pnpm check`, `pnpm build`, `pnpm lint:boundaries` — обязательная верификация каждого slice
- после CA-0 добавление новых blocking ESLint rules допускается только через docs-first rule-introduction policy

## Ожидаемый результат

- Все BI pages ≤ 350 строк с чистой декомпозицией (SRP)
- Единственный canonical data path в `fetchDataset()` без legacy branch
- Нет implicit active-runtime fallback в BI data path
- Custom compile получает только validated params
- Все BI datasets с explicit paramsSchema — contract-level validation
- Provider-agnostic кеширование через middleware
- Нет дубликатов dataset definitions
- Access control реализован (подготовка к multi-tenant)
- Route-local BI logic и WB proxy path покрыты focused tests
- Migration debt register §9 полностью закрыт
- Когнитивная нагрузка при разработке нового дашборда: минимальная
