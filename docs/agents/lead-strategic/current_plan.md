# Plan: Dashboard-Builder Stabilization Before New Features

## Цель

Привести dashboard-builder к стабильному состоянию: canonical architecture docs, verification foundation, реализация target BI architecture, тесты на target contracts, cleanup. Порядок: docs → verification → architecture implementation → target tests → cleanup. Operating mode: `ordinary iterative`.

## Выполненные подзадачи

### Phase 1: Architecture Canon ✅

- **S-1**: Создать architecture_dashboard_builder.md → Done
- **S-1.5**: Разделить на foundation + BI + EMIS verticals → Done
- **S-1.6**: Target-state architecture для BI vertical → Done
- **S-2**: Docs sync against architecture canon → Done

## Активные подзадачи

### Phase 2: Verification Foundation

#### S-3: Re-close baseline on current main

- scope: canonical checks (pnpm check, build, lint:boundaries, test)
- depends on: Phase 1
- размер: S
- acceptance: fresh baseline verdict зафиксирован; все checks green или justified not-run
- verification intent: прогнать все checks и зафиксировать результат
- verification mode: `test-first`

#### S-5: Make packages independently verifiable

- scope: `packages/*/tsconfig.json` (новые), root build scripts
- depends on: S-3
- размер: M
- acceptance: каждый package имеет tsconfig.json; per-package typecheck проходит
- verification intent: `pnpm -r --filter ./packages/* exec tsc --noEmit` green
- verification mode: `test-first`

#### S-4: CI gate for architecture health

- scope: `.github/workflows/` (новый)
- depends on: S-5
- размер: M
- acceptance: GitHub Actions workflow: check + build + lint:boundaries + test. Сначала reporting mode, потом blocking.
- verification intent: PR без green checks виден как failed
- verification mode: `test-first`

### Phase 3: BI Architecture Implementation

Реализация 7-step migration из `architecture_dashboard_bi_target.md`.

#### S-20: Introduce dataset registry

- scope: `packages/platform-datasets/src/server/registry.ts` (новый), `compile.ts` (delegate to registry)
- depends on: S-5
- размер: M
- acceptance: `DatasetRegistry` module существует; existing datasets зарегистрированы; `compile.ts` делегирует в registry для registered datasets, fallback на current switch для unregistered
- verification intent: registry lookup работает для всех 5 dataset families
- verification mode: `test-first`

#### S-21: Migrate dataset families into registry

- scope: `packages/platform-datasets/src/server/definitions/*`, registry entries
- depends on: S-20
- размер: M
- acceptance: все 5 families (payment, wildberries, productPeriod, emisMart, strategyMart) зарегистрированы в registry; compile.ts switch полностью заменён на registry dispatch
- verification intent: `pnpm test` green, все existing pilot tests pass
- verification mode: `test-first`

#### S-22: Extract sourceMetadata from postgresProvider

- scope: `packages/platform-datasets/src/server/providers/postgresProvider.ts`, registry entries
- depends on: S-21
- размер: L
- acceptance: SQL mappings (DATASETS record) вынесены в registry sourceMetadata; postgresProvider получает metadata через entry, не из internal record
- verification intent: provider execution не сломан; existing tests pass
- verification mode: `test-first`

#### S-23: Switch route handler to registry-based provider selection

- scope: `apps/web/src/routes/api/datasets/[id]/+server.ts`
- depends on: S-22
- размер: S
- acceptance: prefix-based `isPostgresDataset()` заменён на `registry.get(id).backendKind`; route handler тонкий: lookup → compile → validate → execute
- verification intent: all dataset requests routed correctly
- verification mode: `test-first`

#### S-24: Unify filter contract, remove legacy merge

- scope: `apps/web/src/lib/shared/api/fetchDataset.ts`, `packages/platform-filters/src/model/types.ts`
- depends on: S-23
- размер: L
- acceptance: `getFilterSnapshot()` legacy merge убран из fetchDataset; `DatasetQuery.params` — единственный canonical input; `DatasetQuery.filters` deprecated; compilers получают clean typed params
- verification intent: filter flow end-to-end через planner-only path; no legacy state в canonical path
- verification mode: `test-first`

#### S-25: Narrow IR — remove groupBy/call from SelectIr

- scope: `packages/platform-datasets/src/model/ir.ts`, affected definitions/providers
- depends on: S-24
- размер: M
- acceptance: `groupBy` и `call()` удалены из `SelectIr` type; провайдер не бросает на advertised capabilities; IR честно отражает read-model fetch contract
- verification intent: TypeScript compile clean; no runtime throws на supported IR
- verification mode: `test-first`

#### S-26: Remove legacy dataset definition copies

- scope: `apps/web/src/lib/server/datasets/definitions/*`
- depends on: S-21
- размер: M
- acceptance: legacy copies удалены; registry — единственный source of truth для dataset definitions
- verification intent: build green; no duplicate definitions
- verification mode: `verification-first`

### Phase 4: Contract Test Coverage

Тесты пишутся против TARGET contracts (после migration), не против as-is.

#### S-6: Tests: platform-datasets (target contracts)

- scope: `packages/platform-datasets/src/**/*.test.ts`
- depends on: S-25
- размер: L
- acceptance: registry lookup, provider dispatch, capability validation, provider execution against registry-owned metadata. Покрытие target BI execution path.
- verification intent: target dataset contract полностью под тестами
- verification mode: `test-first`

#### S-7: Tests: platform-filters (target contracts)

- scope: `packages/platform-filters/src/**/*.test.ts`
- depends on: S-24
- размер: L
- acceptance: planner-produced serverParams, DatasetQuery.params как canonical input, legacy adapter compatibility только на wrapper boundary. Store, serialization, URL sync.
- verification intent: target filter contract полностью под тестами
- verification mode: `test-first`

#### S-8: Tests: platform-core/format.ts

- scope: `packages/platform-core/src/**/*.test.ts`
- depends on: S-5
- размер: S
- acceptance: 10+ pure formatting functions покрыты тестами
- verification intent: formatting edge cases (null, 0, negative, locale)
- verification mode: `test-first`

#### S-9: Tests: EMIS contracts + auth logic

- scope: `packages/emis-contracts/src/**/*.test.ts`, `packages/emis-server/src/**/*.test.ts`
- depends on: S-5
- размер: L
- acceptance: Zod schemas, password hashing, auth-mode fallback, ingestion match resolution
- verification intent: high-value EMIS contract surfaces и auth logic
- verification mode: `test-first`

#### S-27: Integration test: BI execution seam

- scope: end-to-end test: `fetchDataset → /api/datasets/:id → registry → provider`
- depends on: S-6, S-7
- размер: M
- acceptance: cross-package BI path покрыт integration тестом; registry → compile → provider → response
- verification intent: новый BI contract работает end-to-end
- verification mode: `test-first`

### Phase 5: Cleanup & Polish

#### S-13: Finish EMIS shim burn-down

- scope: `apps/web/src/lib/server/emis/*` (migration re-exports)
- depends on: S-9
- размер: M
- acceptance: 16 `// MIGRATION` re-export файлов удалены; consumers на package imports
- verification intent: build green после удаления shims
- verification mode: `test-first`

#### S-14: Alerts deployment contract + drain pending migrations

- scope: `db/pending_changes.sql`, alerts schema, deployment docs
- depends on: Phase 1
- размер: M
- acceptance: все live environments имеют pending deltas; alerts contract задокументирован; pending_changes.sql drained
- verification intent: deployment state truthful
- verification mode: `verification-first`

#### S-15: Reduce cross-package coupling

- scope: `packages/platform-filters/`, `packages/platform-core/`
- depends on: S-7
- размер: S
- acceptance: JsonValue → platform-core; dataset-runtime ownership consolidated
- verification intent: package graph cleaner
- verification mode: `verification-first`

#### S-16: Clean dead artifacts

- scope: `apps/web/src/Examples/`, experimental routes
- depends on: —
- размер: S
- acceptance: orphan files removed; experimental routes formalized или removed
- verification intent: no dead code in source tree
- verification mode: `verification-first`

#### S-28: First non-Postgres provider proof (optional)

- scope: Oracle or CubeJS provider
- depends on: S-27
- размер: L
- acceptance: новый provider зарегистрирован в registry; работает end-to-end через target BI path
- verification intent: registry + provider interface доказаны для non-Postgres backend
- verification mode: `test-first`
- заметки: optional milestone, не blocker для stabilization

## Ограничения

- Не начинать новые фичи до завершения Phase 2
- Architecture target doc (S-1.6) замораживает BI contracts — implementation следует ему
- BI deep tests (S-6, S-7) пишутся ПОСЛЕ migration (Phase 3), не до — чтобы не цементировать legacy
- S-8 и S-9 не зависят от BI migration, можно параллелить с Phase 3
- CI gate (S-4) — сначала reporting mode, потом blocking
- Legacy filter bridge (S-24) убирается только после registry migration (S-23)

## Ожидаемый результат

- Architecture docs: foundation + BI as-is + EMIS as-is + BI target-state
- Fresh baseline verdict + CI gate + per-package typecheck
- BI architecture реализована по target: registry, unified filters, honest IR
- Target contracts покрыты тестами (datasets, filters, formatting, EMIS, integration)
- Legacy dual-contract убран, shims удалены, dead artifacts cleaned
- Путь для Oracle/CubeJS расчищен и доказан (optional)
