# Plan: Dashboard-Builder Stabilization Before New Features

## Цель

Закрыть baseline на текущем main, устранить critical tech debt и довести test coverage до уровня, при котором новые фичи (Oracle, CubeJS, расширенный BI) можно строить безопасно. Operating mode: `ordinary iterative`.

## Backlog

### P0 — Blockers / Must fix before new features

| # | Задача | Размер | Описание |
|---|---|---|---|
| **S-1** | Re-close baseline on current main | M | Прогнать canonical checks (check, build, lint:boundaries, test) и зафиксировать fresh baseline verdict. Последний green pass — 2026-04-05, после merge'а не перепроверялся. |
| **S-2** | CI gate for architecture health | M | Добавить GitHub Actions workflow: pnpm check + build + lint:boundaries + test на PR и push to main. Сейчас всё ручное — любой regression тихий. |
| **S-3** | Make packages independently verifiable | M | Добавить per-package typecheck (tsconfig.json в каждом package). Сейчас только apps/web/tsconfig.json — пакеты не проверяются как first-class единицы. |
| **S-4** | Deepen tests: platform-datasets | L | Расширить за routing tests: dataset definition coverage, provider execution (postgresProvider — core BI runtime, largest untested hotspot). |
| **S-5** | Deepen tests: platform-filters runtime | L | Тесты для store.svelte.ts, serialization.ts, registry, workspace scoping, URL sync. Сейчас только planner — реальный risk в state migration и runtime. |
| **S-6** | Remove legacy filter bridge from fetchDataset | L | Убрать merge getFilterSnapshot() legacy state в planner-driven flow. Пока два filter contract живут вместе — ambiguous cache, request, URL semantics для каждого нового dataset page. |
| **S-7** | Align IR with provider capabilities | M | Либо реализовать call()/groupBy в providers, либо сузить IR contract. Сейчас модель разрешает то, что провайдер бросает. Блокирует Oracle/Cube позже. |

### P1 — Should fix during stabilization

| # | Задача | Размер | Описание |
|---|---|---|---|
| **S-8** | Tests: EMIS contracts + auth logic | L | Unit tests для emis-contracts Zod schemas, password hashing, auth-mode fallback, ingestion match resolution. Zero coverage на high-value contract surface. |
| **S-9** | Tests: platform-core/format.ts | S | 10+ pure formatting functions (formatNumber, formatCurrency, formatPercent, formatDate и др.) без тестов. |
| **S-10** | Delete legacy dataset definition copies | M | Убрать legacy copies в apps/web/src/lib/server/datasets/definitions/* или конвертировать в re-exports. Ложный second source of truth. |
| **S-11** | Finish EMIS shim burn-down | M | Убрать 16 `// MIGRATION` re-export файлов в apps/web/src/lib/server/emis/*. Blurry ownership, замедляет review. |
| **S-12** | Sync architecture docs with codebase | M | emis_monorepo_target_layout.md: fetchDataset ownership. emis_mve_product_contract.md: auth defaults. Два конкретных drift'а. |
| **S-13** | Add missing package AGENTS.md | S | db, platform-core, platform-filters, platform-ui — 4 пакета без navigation docs. |
| **S-14** | Alerts deployment contract | M | Решить: alerts остаётся app-local manual schema или входит в snapshot-first DB contract. Сейчас тихо отключается если schema не applied. |
| **S-15** | Drain db/pending_changes.sql | M | Подтвердить, что все live environments имеют AUTH audit + ING-2 + strategy deltas. Задокументировать deployment rule. |

### P2 — Fix during next relevant work

| # | Задача | Размер | Описание |
|---|---|---|---|
| **S-16** | Reduce cross-package coupling | S | JsonValue в platform-filters → platform-core. Consolidate dataset-runtime ownership. |
| **S-17** | Clean dead artifacts from source trees | S | apps/web/src/Examples/ (orphan PNG), experimental routes (demo, test, edit-dnd-demo) — formalize или remove. |

## Recommended Execution Order

**Phase 1 — Baseline closure (S-1, S-2, S-3):**
Прогнать checks, поставить CI gate, сделать пакеты verifiable. Foundation для всего остального.

**Phase 2 — Test coverage critical path (S-4, S-5, S-9):**
Покрыть core runtime: datasets, filters, format utilities. Без этого новые фичи — blind.

**Phase 3 — Contract cleanup (S-6, S-7, S-10, S-11):**
Убрать legacy bridge, выровнять IR, удалить дублирование. Расчистить путь для Oracle/Cube.

**Phase 4 — EMIS stabilization (S-8, S-14, S-15):**
Тесты EMIS contracts, alerts contract, drain pending migrations.

**Phase 5 — Docs and polish (S-12, S-13, S-16, S-17):**
Sync docs, navigation, cleanup.

## Ограничения

- Не начинать новые фичи до завершения Phase 1
- Не менять public API пакетов без test coverage на затронутые контракты
- Не удалять legacy bridge (S-6) до наличия test coverage на filter runtime (S-5)
- CI gate (S-2) не должен блокировать текущую разработку на этапе внедрения — сначала reporting mode, потом blocking

## Ожидаемый результат

- Fresh baseline verdict на main
- CI автоматически ловит regressions
- Пакеты — independent verifiable units
- Core runtime (datasets, filters, formatting) покрыт тестами
- Legacy dual-contract убран, IR честно отражает capabilities
- EMIS contracts и auth под тестами
- Путь для Oracle/CubeJS расчищен
