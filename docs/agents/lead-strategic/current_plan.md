# Plan: Dashboard-Builder Stabilization Before New Features

## Цель

Создать canonical architecture doc для всего dashboard-builder, привести документацию в соответствие, затем закрыть baseline, довести test coverage и расчистить tech debt. Порядок: docs → verification → tests → cleanup. Operating mode: `ordinary iterative`.

## Подзадачи

### Phase 1: Architecture Canon

#### S-1: Создать architecture_dashboard_builder.md

- scope: `docs/architecture_dashboard_builder.md` (новый), `docs/architecture.md` (→ wrapper), `AGENTS.md` (root), `docs/AGENTS.md`
- depends on: —
- размер: L
- acceptance: новый doc покрывает: system topology, full package/app map, domain contours (platform/shared, BI, EMIS operational, strategy, Wildberries, alerts), canonical execution paths (BI dataset, EMIS operational, alert/ops), data/storage ownership, import/dependency rules, client/server contract surfaces, extension points для Oracle/CubeJS, deployment model, documentation taxonomy, verification hooks. `architecture.md` → compatibility wrapper. Navigation в AGENTS.md обновлена.
- verification intent: новый reader может понять всю архитектуру без чтения EMIS-specific docs
- verification mode: `verification-first`

#### S-2: Docs sync against architecture canon

- scope: `docs/emis_monorepo_target_layout.md`, `docs/emis_mve_product_contract.md`, `docs/emis_session_bootstrap.md`, strategy/external-ownership wording, другие active docs с drift'ами, missing package AGENTS.md (`platform-core`, `platform-filters`, `platform-ui`)
- depends on: S-1
- размер: M
- acceptance: все docs согласованы с architecture_dashboard_builder.md; stale target-state docs обновлены или archived; 3 platform packages получили AGENTS.md; strategy overlay и external ownership wording согласованы
- verification intent: targeted grep по ключевым терминам (package homes, contour names, auth defaults, external ownership wording) не выдаёт contradictions между architecture doc и active domain docs
- verification mode: `verification-first`

### Phase 2: Verification Foundation

#### S-3: Re-close baseline on current main

- scope: canonical checks (pnpm check, build, lint:boundaries, test)
- depends on: S-1
- размер: S
- acceptance: fresh baseline verdict зафиксирован; все checks green или justified not-run
- verification intent: прогнать все checks и зафиксировать результат
- verification mode: `test-first`

#### S-4: CI gate for architecture health

- scope: `.github/workflows/` (новый), `package.json` scripts
- depends on: S-3
- размер: M
- acceptance: GitHub Actions workflow: check + build + lint:boundaries + test на PR и push to main. Сначала reporting mode, потом blocking.
- verification intent: PR без green checks виден как failed
- verification mode: `test-first`

#### S-5: Make packages independently verifiable

- scope: `packages/*/tsconfig.json` (новые), root build scripts
- depends on: S-3
- размер: M
- acceptance: каждый package имеет tsconfig.json; per-package typecheck проходит; пакеты проверяются как first-class единицы
- verification intent: `pnpm -r --filter ./packages/* exec tsc --noEmit` green
- verification mode: `test-first`

### Phase 3: Test Coverage

#### S-6: Deepen tests: platform-datasets

- scope: `packages/platform-datasets/src/**/*.test.ts`
- depends on: S-5
- размер: L
- acceptance: dataset definition coverage, provider execution tests (postgresProvider — core BI runtime). Покрытие routing + definitions + provider layer.
- verification intent: core BI execution path покрыт тестами
- verification mode: `test-first`

#### S-7: Deepen tests: platform-filters runtime

- scope: `packages/platform-filters/src/**/*.test.ts`
- depends on: S-5
- размер: L
- acceptance: тесты для store, serialization, registry, workspace scoping, URL sync. State migration и runtime behavior покрыты.
- verification intent: filter runtime покрыт тестами
- verification mode: `test-first`

#### S-8: Tests: platform-core/format.ts

- scope: `packages/platform-core/src/**/*.test.ts`
- depends on: S-5
- размер: S
- acceptance: 10+ pure formatting functions покрыты тестами
- verification intent: все formatting edge cases (null, 0, negative, locale) под тестами
- verification mode: `test-first`

#### S-9: Tests: EMIS contracts + auth logic

- scope: `packages/emis-contracts/src/**/*.test.ts`, `packages/emis-server/src/**/*.test.ts`
- depends on: S-5
- размер: L
- acceptance: Zod schemas, password hashing, auth-mode fallback, ingestion match resolution под тестами
- verification intent: high-value contract surfaces и auth logic покрыты
- verification mode: `test-first`

### Phase 4: Contract & Code Cleanup

#### S-10: Remove legacy filter bridge from fetchDataset

- scope: `apps/web/src/lib/shared/api/fetchDataset.ts`
- depends on: S-7
- размер: L
- acceptance: getFilterSnapshot() legacy merge убран; один canonical filter contract; cache/request/URL semantics однозначны
- verification intent: filter flow end-to-end работает через planner-only path
- verification mode: `test-first`

#### S-11: Align IR with provider capabilities

- scope: `packages/platform-datasets/src/model/ir.ts`, providers
- depends on: S-6
- размер: M
- acceptance: call()/groupBy либо реализованы, либо IR contract сужен. Провайдер не бросает на advertised capabilities.
- verification intent: IR contract честно отражает то, что providers execute
- verification mode: `test-first`

#### S-12: Delete legacy dataset definition copies

- scope: `apps/web/src/lib/server/datasets/definitions/*`
- depends on: S-6
- размер: M
- acceptance: legacy copies удалены или конвертированы в re-exports; один source of truth
- verification intent: нет двух определений одного dataset
- verification mode: `verification-first`

#### S-13: Finish EMIS shim burn-down

- scope: `apps/web/src/lib/server/emis/*` (migration re-exports)
- depends on: S-9
- размер: M
- acceptance: 16 `// MIGRATION` re-export файлов удалены; consumers переключены на package imports
- verification intent: build green после удаления shims
- verification mode: `test-first`

#### S-14: Alerts deployment contract + drain pending migrations

- scope: `db/pending_changes.sql`, alerts schema, deployment docs
- depends on: S-1
- размер: M
- acceptance: все live environments имеют AUTH audit + ING-2 + strategy deltas; alerts contract задокументирован; pending_changes.sql drained
- verification intent: deployment state truthful и задокументирован
- verification mode: `verification-first`

### Phase 5: Polish

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

## Ограничения

- Не начинать новые фичи до завершения Phase 1 + Phase 2
- Architecture doc (S-1) замораживает терминологию — все последующие docs/tests/cleanup следуют ей
- Не менять public API пакетов без test coverage на затронутые контракты
- Не удалять legacy filter bridge (S-10) до test coverage на filter runtime (S-7)
- CI gate (S-4) — сначала reporting mode, потом blocking
- Docs-first: тесты и cleanup закрепляют задокументированную архитектуру, а не фиксируют текущие assumptions

## Ожидаемый результат

- Canonical architecture doc для всего dashboard-builder
- Все docs согласованы с architecture canon
- Fresh baseline verdict + CI gate
- Пакеты — independent verifiable units
- Core runtime (datasets, filters, formatting) покрыт тестами
- EMIS contracts и auth под тестами
- Legacy dual-contract убран, IR честно отражает capabilities
- Путь для Oracle/CubeJS расчищен
