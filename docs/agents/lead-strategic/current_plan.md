# Plan: Dashboard-Builder BI Refactor Wave 1 — COMPLETE

## Status

**Wave 1 complete.** All 10 slices (BR-1..BR-10) implemented, reviewed, and merged to `main`.
Branch: `feature/bi-refactor-wave1` (merged). 109 tests, 30+ review passes, 5-check Green.

## Цель

Привести non-EMIS BI contour (`wildberries`, `strategy`, generic dashboard runtime) к canonical target architecture из `docs/architecture_dashboard_bi_target.md`, сохранив low-ops single-deployable delivery для клиентов без собственной техподдержки.

**Цель достигнута.** Target architecture реализована. Reference migration: `/dashboard/strategy/scorecard/`.

## Canonical Reframe

- Старый draft `S-20` -> `S-29` retired. Он был собран до фиксации target BI architecture и больше не задаёт sequencing.
- Canonical execution order для BI refactor теперь задаётся slices `BR-1` -> `BR-10` ниже.
- Scope этой wave: только non-EMIS BI first wave. EMIS operational refactor и EMIS BI migration не входят в этот план.

## Pre-Implementation Watchpoints

These points do not reopen the target architecture. They are execution clarifications that must be tracked explicitly during rollout and tightened if real implementation evidence requires it.

- `BR-2` -> `BR-3` is an intentional transitional bridge:
  - `executeDatasetQuery()` may land before registry extraction is fully canonical
  - this bridge is acceptable only as a short-lived rollout seam
  - `BR-3` must close registry ownership clearly so package orchestration does not sit on top of a long-lived mixed metadata model
- `/api/datasets/:id/schema` needs one explicit implementation policy for schema visibility:
  - decide how `hidden` fields are exposed or suppressed
  - choose one canonical `Zod -> JSON Schema` export path
  - keep this as execution detail unless implementation evidence shows a real contract gap
- filter migration must not leave a permanent compatibility merge path inside `fetchDataset()`:
  - compatibility adapters are allowed only at wrapper boundaries for non-migrated pages
  - migrated pages must use explicit planner output + intentional param merge into flat `DatasetQuery.params`
- honest IR cleanup is mandatory, not aspirational:
  - `groupBy` / `call()` must not survive as part of the canonical read-model path after declarative mode lands
  - if a real analytical need appears, it should trigger a separate `AnalyticalIr` discussion, not silent re-expansion of `SelectIr`
- first-wave low-ops baseline must stay explicit:
  - bounded in-memory provider cache inside the app process is the default server cache path
  - PostgreSQL remains the app-owned persistence home for dashboards, saved BI metadata, and related builder state
  - no mandatory Redis, external cache tier, or standalone Cube deployment for the first release
- if Cube enters the rollout later:
  - model it as explicit `source.kind: 'cube'`
  - use it for published or pre-aggregated read models, not as a hidden proxy behind `oracle` / `clickhouse`
- real-time refresh must remain page-owned in the first wave:
  - bounded polling over `fetchDataset()` is the default
  - SSE/WebSocket is a future optimization only if evidence shows polling is insufficient
- freshness observability is part of the runtime acceptance path:
  - changed slices must preserve a credible path to `sourceKind` and `cacheAgeMs` in telemetry and, where needed, response metadata for RT dashboards

## Operating Mode

Current mode: `high-risk iterative / unstable wave` for `BR-1` -> `BR-8`.

Почему high-risk сейчас:

- `BR-1` -> `BR-5` меняют canonical dataset/runtime seam, route transport seam и filter wire contract
- `BR-7` добавляет первый real-time non-Postgres provider, cache policy, timeout/cancel behavior и freshness semantics
- `BR-8` закрывает первый route-local reference migration end-to-end

Плановая деэскалация:

- после принятия `BR-8` с fresh green 5-check evidence и без open drift по route/access/cache/query-state можно переключиться на `ordinary iterative` для `BR-9` и optional `BR-10`
- если любой принятый slice меняет acceptance следующего шага или заново открывает route/provider boundary risk, режим сразу возвращается в `high-risk iterative / unstable wave`

## Autonomous Execution Protocol

Эта wave исполняется в **максимально автономном** режиме. Пользователь подтвердил план и ожидает минимум прерываний при высоком уровне ответственности.

### Когда agents продолжают без паузы на пользователя

- strategic verdict — `ACCEPT`: lead-tactical сразу запускает следующий slice
- strategic verdict — `ACCEPT WITH ADJUSTMENTS`: lead-strategic фиксирует `Plan Change Request`, lead-tactical применяет и продолжает — без паузы, если adjustment не меняет wave scope
- post-slice reframe не выявил scope drift или новый architectural risk
- 5-check verification green
- reviewer findings — только `INFO` или `WARNING`, все resolved в рамках slice

### Когда нужна пауза на пользователя

- `CRITICAL` finding от любого reviewer
- scope change: slice потребовал работу за пределами заявленного scope wave (например, EMIS spillover, новая schema migration, новый external dependency)
- `REJECT` verdict после 2+ cycles (recovery path RP-5)
- новый exception / waiver, не покрытый existing invariants
- решение, которое меняет durable target architecture (не plan sequencing, а сам `architecture_dashboard_bi_target.md`)
- финальный merge wave в main после BR-8 или BR-10

### Structural Reframe Checkpoints

Обязательные расширенные reframe points, где lead-strategic должен пересмотреть оставшийся план целиком (не только next slice), даже если текущий slice прошёл чисто:

**После BR-3 (fan-out point):**
- registry extraction доказана; package ownership model работает или нет
- решение: запускать BR-4/BR-5/BR-7 параллельно или линейно
- проверить: не появились ли новые зависимости между BR-4, BR-5, BR-7
- проверить: EMIS mechanical extraction прошла чисто, mock datasets в реестре

**После BR-7 (first non-Postgres provider):**
- Oracle provider доказан; multi-backend path работает или нет
- проверить: cache/timeout/cancel contract не потребовал изменений в core runtime
- проверить: provider contract (`execute(ir, entry, ctx)`) выдержал первый реальный backend
- решение: BR-8 reference page selection — какая страница даёт максимальный reference value

**После BR-8 (convergence / de-escalation gate):**
- первая page migration end-to-end: flat params + page-local state + no legacy merge
- решение: деэскалация в `ordinary iterative` для BR-9/BR-10 или сохранение `high-risk`
- проверить: reference page достаточно убедительна для паттерна; не нужны corrections в target doc
- если всё green — agents продолжают BR-9 автономно без паузы на юзера

### Parallel Dispatch Window

После принятия BR-3 lead-tactical может запустить параллельные worker'ы:

```
BR-3 accepted
  ├─ worker A: BR-4 (schema introspection)
  ├─ worker B: BR-5 (flat filter contract)
  └─ worker C: BR-7 (Oracle provider)
```

Условия для параллельного запуска:
- BR-3 verdict `ACCEPT` с green 5-check
- post-BR-3 structural reframe подтвердил отсутствие новых зависимостей
- каждый worker получает изолированный scope из plan (не перекрывающиеся файлы)
- если worker'ы не могут быть файлово-изолированы, fallback на линейное исполнение

Слияние параллельных результатов:
- lead-tactical принимает каждый worker-result по отдельности (slice review + strategic acceptance)
- интеграционный review после слияния всех трёх, до запуска BR-6 (зависит от BR-5)
- conflict resolution — lead-tactical, не worker

## Review Discipline

- `BR-1` -> `BR-8`:
  - short post-slice reframe обязателен всегда
  - `strategic-reviewer` запускается после каждого принятого slice
  - minimum slice review: `code-reviewer` + `architecture-reviewer`
- `security-reviewer` обязателен для:
  - `BR-2` (`executeDatasetQuery`, HTTP error mapping, access gate)
  - `BR-3` (`postgresProvider` refactor, SQL-generating code changes, dataset catalog ownership transfer)
  - `BR-4` (`/api/datasets/:id/schema`, schema access policy)
  - `BR-5` (filter input merge semantics, transport seam change, user-controlled params reaching server)
  - `BR-7` (backend credentials, cache identity, timeout/retryable behavior, cancellation/pool safety)
- `BR-9` и optional `BR-10` можно перевести на risk-triggered `strategic-reviewer` cadence только после stabilizing reframe post-`BR-8`
- acceptance каждого slice требует fresh evidence на canonical 5-check baseline:
  - `pnpm check`
  - `pnpm check:packages`
  - `pnpm build`
  - `pnpm lint:boundaries`
  - `pnpm test`
- после каждого stable slice обязателен checkpoint commit

## Закрытый groundwork

### Docs / Architecture Canon ✅

- repo-wide foundation, BI current-state и BI target-state docs уже зафиксированы
- rollout ownership и slice order зафиксированы в `docs/plans/bi_refactor_rollout.md`

### Verification Foundation ✅

- canonical 5-check baseline уже Green (passes, но текущее test coverage — ~26 pilot tests; core dataset runtime largely untested; `test-first` verification mode на каждом slice должен существенно расширить покрытие)
- per-package verification введён через `pnpm check:packages`
- CI reporting gate уже существует; перевод в blocking mode не часть этой wave

## Граф зависимостей

После BR-3 цепочка разветвляется. Линейное исполнение допустимо, но не обязательно.

```
BR-1 → BR-2 → BR-3 ─┬─ BR-4 (schema introspection)
                      ├─ BR-5 (filters) → BR-6 (client state) ─┐
                      └─ BR-7 (Oracle provider) ────────────────┼─→ BR-8 (first migration)
                                                                     │
                                                                     ↓
                                                                   BR-9 → BR-10
```

BR-4, BR-5 и BR-7 технически независимы друг от друга после BR-3. BR-8 — convergence point, требует BR-6 и BR-7.

## Подзадачи

### BR-1: Dataset Runtime Contracts

- scope: `packages/platform-datasets/src/model/*`, contract/runtime types in `platform-datasets`
- depends on: verification foundation
- размер: M
- acceptance: final first-wave contract shapes добавлены additively и компилируются вместе с текущим runtime: `DatasetRegistryEntry`, `SourceDescriptor` (including explicit `cube`), `DatasetFieldDef`, `DatasetFilterBinding`, `DatasetAccess`, expanded cache contract, flat `DatasetQuery.params`, `DatasetError.retryable`, `SelectIr.offset`, response/telemetry freshness fields; route behavior ещё не меняется
- verification intent: target contract surface существует и может co-exist с current execution path без route cutover
- verification mode: `test-first`
- заметки: не вводить `CapabilityProfile` или capability matrix; `groupBy` / `call()` не расширяются и не становятся зависимостью новых slice'ов; пометить `groupBy` и `call()` в `SelectIr` как `@deprecated` в JSDoc чтобы IDE подсвечивала случайное использование; зафиксировать `ContractVersion` strategy (остаётся `'v1'` с additive расширениями, или вводится `'v2'` с routing logic в route handler)

### BR-2: Package-Orchestrated Execution

- scope: `packages/platform-datasets/src/server/executeDatasetQuery.ts` (new), `apps/web/src/routes/api/datasets/[id]/+server.ts`, typed package errors
- depends on: BR-1
- размер: M
- acceptance: route handler становится thin shell: parse transport, derive `ServerContext`, delegate в `executeDatasetQuery(datasetId, query, ctx)`, map typed errors to HTTP; provider selection by dataset prefix уходит из route code; dataset access проверяется package-owned orchestration before compile / execute
- verification intent: existing dataset requests проходят через package entrypoint без route-level provider logic
- verification mode: `test-first`
- заметки: ownership dataset metadata и registry extraction ещё не cut over здесь; это следующий slice

### BR-3: Registry Extraction from Postgres Provider

- scope: `packages/platform-datasets/src/server/registry/*`, existing dataset definitions, `postgresProvider`
- depends on: BR-2
- размер: L
- acceptance: registry становится canonical owner dataset entries, fields и source descriptors для migrated Postgres datasets; `postgresProvider` получает entry-owned metadata вместо provider-local catalog; central compile/dataset-family switch перестаёт быть canonical source of truth
- verification intent: migrated datasets продолжают исполняться через provider без metadata drift и без provider-owned dataset catalog
- verification mode: `test-first`
- заметки: custom `compile` остаётся supported; `genericCompile()` ещё не вводится; EMIS-датасеты (`emis.*`) в `postgresProvider` перекладываются в реестр механически (entry + source descriptor) без миграции страниц — чтобы provider перестал владеть каталогом целиком; mock-backed датасеты (payment analytics и др.) также получают registry entries с `source.kind: 'mock'`

### BR-4: Schema Introspection

- scope: `platform-datasets` schema lookup/export, `GET /api/datasets/:id/schema`
- depends on: BR-3
- размер: M
- acceptance: `getDatasetSchema(datasetId)` и HTTP schema endpoint отдают `fields` + exported params schema without data query execution; schema path использует ту же dataset access policy, что и query execution; route остаётся thin
- verification intent: schema can be fetched without query execution; unauthorized datasets (access check fails) не раскрывают schema; `hidden` fields suppressed из schema response (field-level, не dataset-level flag)
- verification mode: `test-first`
- заметки: `/schema` telemetry может быть lighter, но access denials должны быть видимы; этот surface также должен оставаться пригодным для embedded metadata-driven query builder, а не arbitrary SQL UI

### BR-5: Flat Filter Contract Migration

- scope: `packages/platform-filters/src/model/*`, planner APIs, `apps/web/src/lib/shared/api/fetchDataset.ts`, active BI route filter wiring
- depends on: BR-3
- размер: L
- acceptance: flat `DatasetQuery.params` становится единственным canonical wire bag на migrated path; planner resolves provenance client-side via `planFiltersForTarget()` / `planFiltersForTargets()`; implicit legacy merge убран из canonical `fetchDataset` path; first-wave canonical combinations ограничены tier-1 (`workspace + server`, `owner + server`, `workspace + client`)
- verification intent: migrated filter flow идёт end-to-end через planner-only path и не скрывает merge precedence
- verification mode: `test-first`
- заметки: compatibility adapter допустим только на wrapper boundary для non-migrated pages; не расширять wave на `shared + *` или `* + hybrid`; включает alignment planner API: текущий `planFiltersForDataset()` переименовывается в `planFiltersForTarget()`, добавляется batch-helper `planFiltersForTargets()` — target naming из architecture doc

### BR-6: Client Query State Alignment

- scope: route-local BI pages/helpers, `fetchDataset` client facade, page-local async query state
- depends on: BR-5
- размер: M
- acceptance: migrated pages используют page-owned `AsyncState<T>` / typed client errors, keep-previous-data refresh, optional page-owned auto-refresh и in-flight dedup / cancellation через `fetchDataset`; dataset results не уходят в new global stores
- verification intent: page-local orchestration соответствует route-first model и не даёт regressions по stale-request UX
- verification mode: `test-first`
- заметки: `TanStack Query` не вводить в этой wave; не вводить global subscription runtime

### BR-7: Oracle Provider

- scope: `platform-datasets` provider layer, Oracle provider infra, one Oracle-backed dataset definition
- depends on: BR-3
- размер: L
- acceptance: один paginated Oracle read-model dataset вызывается через standard dataset route и возвращает корректные данные (route/provider proof, не full page migration); provider lazy-initializes client / pool, использует bounded in-memory TTL cache, поддерживает timeout + best-effort cancel, не держит pool в плохом состоянии после timeout и имеет explicit retryable error mapping
- verification intent: first real-time non-Postgres backend работает без изменений route contract; page migration scope остаётся в BR-8
- verification mode: `test-first`
- заметки: использовать `node-oracledb` Thin mode; не добавлять fake capability layer; Cube не делать обязательной частью этого slice

### BR-8: First Dashboard Migration

- scope: one real BI route under `apps/web/src/routes/dashboard/<domain>/...`, route-local `filters.ts`, `view-model.ts`, page components
- depends on: BR-6, BR-7 (convergence point: нужны flat params + client state + provider path)
- размер: L
- acceptance: одна реальная BI page мигрирована end-to-end на target runtime: flat params contract, page-local query state, no legacy filter merge, no page-specific provider branching; page становится reference slice для следующих migrations
- verification intent: target dataset runtime доказан на real route-local page composition
- verification mode: `test-first`
- заметки: выбрать страницу с максимальным reference value, а не самый широкий churn

### BR-9: Generic Compiler + Honest IR Cleanup

- scope: `genericCompile(entry, typedParams)`, declarative registry bindings, `packages/platform-datasets/src/model/ir.ts`, at least one simple dataset
- depends on: BR-8
- размер: M
- acceptance: хотя бы один dataset использует declarative mode end-to-end через explicit query bindings; `genericCompile()` работает на narrowed read-model `SelectIr`; remaining `groupBy` / `call()` debt removed or isolated so target runtime stays honest; custom `compile` remains supported
- verification intent: declarative mode работает без возврата fake capabilities или unsupported IR semantics в canonical path
- verification mode: `test-first`
- заметки: этот slice закрывает последний target gap по honest read-model IR

### BR-10: Further Providers or Second Reference Migration

- scope: one additional provider or one more high-value migration after runtime path is proven
- depends on: BR-9
- размер: L
- acceptance: architecture extends через static registration only; route contract не меняется; не появляется runtime plugin loading или capability matrix relapse
- verification intent: target path масштабируется дальше первого provider / first reference page
- verification mode: `test-first`
- заметки: optional milestone, не blocker для wave close если `BR-1` -> `BR-9` уже доказали target architecture достаточно убедительно

## Ограничения

- Эта wave покрывает только non-EMIS BI first wave; EMIS operational refactor и EMIS BI migration out of scope
- Никакого SQL в `routes/api/datasets/*`
- Никакого provider selection в route code
- Никаких dataset/schema access bypasses мимо package orchestration
- Никаких reversed imports из packages в app
- Не вводить `CapabilityProfile`, fake provider matrices или runtime plugin loading
- `genericCompile()` не вводить раньше `BR-9`
- Никаких новых global stores для dataset data/query state
- Никакого `TanStack Query`, dashboard DSL или broad app-wide query-manager migration в этой wave
- Никакой mandatory external infra для first-wave BI delivery: built-in in-memory cache и app-owned PostgreSQL persistence остаются baseline
- Embedded query builder, если добавляется, работает только через registry/schema introspection; arbitrary SQL builder out of scope
- Filter wire contract target: flat `DatasetQuery.params`; planner provenance resolving stays client-side
- Honest IR remains target: новые slices не должны снова опираться на `groupBy` / `call()` как на canonical supported contract
- Provider cache остаётся provider-owned и bounded; cache identity must exclude `requestId`
- Real-time refresh в first wave остаётся page-owned polling-first pattern; no global subscription runtime
- Cube, если используется, должен быть explicit source kind, а не скрытая прослойка под `oracle` / `clickhouse`
- Minimal structured query telemetry must exist at every changed runtime boundary
- Old draft backlog items, not part of this wave:
  - EMIS tests / shim burn-down
  - alerts deployment contract / pending migration drain
  - platform-core formatting-only test expansion
  - broad folder naming cleanup without direct BI payoff

## Ожидаемый результат

- `platform-datasets` владеет canonical dataset registry, execution orchestration, schema introspection и provider dispatch
- `/api/datasets/:id` остаётся thin HTTP transport; `/api/datasets/:id/schema` существует и использует ту же access policy
- Migrated BI pages используют flat params contract, page-local async query state и polling-first RT refresh без hidden global data stores
- Oracle provider доказывает first-wave multi-provider path с bounded built-in server-side cache и timeout/cancel discipline
- Embedded metadata-driven query builder может опираться на registry/schema surface без перехода к arbitrary SQL authoring
- Declarative dataset mode работает поверх honest read-model `SelectIr`
- Старый pre-target sequencing больше не используется; future implementation tasks открываются по `BR-*` slices
