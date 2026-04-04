# EMIS Freeze Note

Short ledger of EMIS decisions that are frozen and should not be reopened casually.

Этот документ не является:

- current-state map;
- implementation backlog;
- runtime/API contract;
- historical rollout journal.

Для current truth читать:

- [docs/emis_session_bootstrap.md](./emis_session_bootstrap.md)
- [docs/architecture.md](./architecture.md)
- [docs/emis_working_contract.md](./emis_working_contract.md)

## 1. Frozen Architecture Decisions

- EMIS остается внутри текущего `SvelteKit` приложения как `single deployable app`.
- High-level style: `modular monolith`.
- Repo framing по EMIS остается трехконтурным:
  - `platform/shared`
  - `EMIS operational`
  - `EMIS BI/read-side`
- Reusable EMIS code имеет canonical home в:
  - `packages/emis-contracts/`
  - `packages/emis-server/`
  - `packages/emis-ui/`
- App-level HTTP/UI composition остается в `apps/web/`; отдельный EMIS deployable сейчас не открываем.

## 2. Frozen Data And Platform Invariants

- `PostgreSQL + PostGIS` входят в базовый фундамент MVE.
- BI подключается через published views/read-models, а не через CRUD/UI contracts.
- Canonical identity должна быть выражена в DB constraints / partial unique indexes.
- Soft delete semantics должны быть едиными для API, views и recreate/restore flows.
- Audit trail, actor attribution и provenance входят в обязательный контракт.
- FK behavior и vocabulary boundaries должны быть задокументированы явно.

## 3. Frozen Scope Boundaries

- `events` не входят в MVE.
- Микросервисный split и отдельный EMIS runtime сейчас не открываем.
- Dataset/IR слой не расширяем под operational EMIS use cases "на вырост".
- Dictionary management в MVE остается `seed-managed`; admin CRUD deferred beyond MVE.

## 4. Frozen Technical Defaults

- Offline basemap default: local `PMTiles` bundle с `auto` fallback.
- Для новых `entities/features/widgets` по умолчанию используем плоский namespace `emis-*`.
- Новый EMIS UI по умолчанию пишем на Svelte 5 runes.

## 5. Not In This Document

Открытые implementation decisions, active backlog и retained historical rationale держать в других документах:

- product scope / acceptance:
  [docs/emis_mve_product_contract.md](./emis_mve_product_contract.md)
- live backlog:
  [docs/emis_next_tasks_2026_03_22.md](./emis_next_tasks_2026_03_22.md)
- retained historical context:
  [docs/archive/emis/emis_implementation_reference_v1.md](./archive/emis/emis_implementation_reference_v1.md)
