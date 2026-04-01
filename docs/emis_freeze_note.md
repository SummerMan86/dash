# EMIS Freeze Note

Этот документ теперь хранит только замороженные решения и конвенции.
Текущий статус репозитория, backlog и completed slices смотреть в [EMIS Session Bootstrap](./emis_session_bootstrap.md).

Важно:

- это не новый source of truth;
- если нужна точная формулировка требований, смотреть:
  - [EMIS MVE TZ v2](./emis_mve_tz_v_2.md)
  - [EMIS Implementation Spec v1](./emis_implementation_spec_v1.md)

## 1. Что уже считаем замороженным

- EMIS развивается внутри текущего SvelteKit-приложения как `single deployable app`.
- В коде держим `monorepo-ready` границы, но физический split в `apps/*` и `packages/*` пока не делаем.
- Архитектурный стиль: modular monolith.
- PostgreSQL + PostGIS входят в базовый фундамент MVE.
- BI подключается через views/read-models, а не через CRUD-формы.
- `events` не входят в MVE и остаются следующим этапом.
- Offline basemap принят как `local PMTiles` с `auto` fallback.

## 2. Обязательные data invariants

- Canonical identity должна быть выражена не только в prose, но и в DB constraints / partial unique indexes.
- Soft delete semantics едины для API, views и BI:
  - базовые query/list/detail contracts работают только с `deleted_at IS NULL`;
  - recreate/restore должны учитывать active unique constraints.
- Audit trail, actor attribution и provenance входят в target contract, а не откладываются "на потом".
- FK behavior и controlled vocabularies должны быть задокументированы явно.

## 3. Что уже не нужно обсуждать заново

- Нужен ли отдельный repo/monorepo прямо сейчас.
- Нужен ли микросервисный split.
- Нужен ли PostGIS уже в MVE.
- Нормально ли хранить базовую геометрию как `geometry(..., 4326)` для MVE.
- Нужно ли дожимать identity/soft delete/audit до уровня БД.
- Нужно ли писать новый EMIS UI сразу на Svelte 5 runes.
- Нормален ли текущий naming default `emis-*` для ранних этапов.

## 4. Что ещё остаётся implementation decision

- extent и policy для audit beyond текущего write-side actor contract;
- что именно идет в `CHECK/ENUM`, а что в dictionary tables;
- как выглядит admin/restore contract для soft-deleted записей.

## 5. Текущие implementation conventions

- Для новых `entities/features/widgets` по умолчанию используем плоский namespace `emis-*`.
- Новый EMIS UI пишем сразу на Svelte 5 runes.
- Для EMIS operational/server flows default path:
  `routes/api/emis/* -> server/emis/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`.
- Dataset/IR слой сохраняем для существующего BI/read-side и для стабильных EMIS read-model contracts, но не расширяем его для operational сценариев "на вырост".
- `oracle`/`cube` не проектируем заранее; новые возможности `IR/Provider` не добавляем до появления реального второго backend.
- Server-side EMIS живет в:
  - `src/lib/server/emis/infra/*`
  - `src/lib/server/emis/modules/*`
- `routes/api/emis/*` остаются тонким transport layer без SQL и бизнес-логики.
- Runtime conventions для list/meta/error shape и dataset-backed BI reads фиксируются в:
  - `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`.
