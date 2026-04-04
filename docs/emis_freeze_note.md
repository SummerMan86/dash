# EMIS Freeze Note

Этот документ хранит только frozen decisions и conventions.
Он не является current-state map.
Текущий статус репозитория и ownership rules смотреть в [EMIS Session Bootstrap](./emis_session_bootstrap.md), [EMIS Architecture Baseline](./emis_architecture_baseline.md) и [EMIS Working Contract](./emis_working_contract.md).

Если нужна точная формулировка product scope или implementation details, смотреть:

- [EMIS MVE TZ v2](./emis_mve_tz_v_2.md)
- [EMIS Implementation Spec v1](./emis_implementation_spec_v1.md)

## 1. Что уже считаем замороженным

- EMIS развивается внутри текущего `SvelteKit` приложения как `single deployable app`
- архитектурный стиль: `modular monolith`
- базовая модель контуров остается такой:
  - `platform/shared`
  - `EMIS operational`
  - `EMIS BI/read-side`
- reusable EMIS code имеет canonical home в:
  - `packages/emis-contracts/`
  - `packages/emis-server/`
  - `packages/emis-ui/`
- app-level ownership остается за:
  - `apps/web/src/routes/api/emis/*`
  - `apps/web/src/routes/emis/*`
  - `apps/web/src/routes/dashboard/emis/*`
  - `apps/web/src/lib/features/emis-manual-entry/`
  - `apps/web/src/lib/widgets/emis-drawer/`
- PostgreSQL + PostGIS входят в базовый фундамент MVE
- BI подключается через published views/read-models, а не через CRUD-формы
- `events` не входят в MVE и остаются следующим этапом
- offline basemap принят как `local PMTiles` с `auto` fallback

## 2. Обязательные data invariants

- Canonical identity должна быть выражена не только в prose, но и в DB constraints / partial unique indexes
- Soft delete semantics едины для API, views и BI:
  - базовые query/list/detail contracts работают только с `deleted_at IS NULL`
  - recreate/restore должны учитывать active unique constraints
- Audit trail, actor attribution и provenance входят в target contract, а не откладываются "на потом"
- FK behavior и controlled vocabularies должны быть задокументированы явно

## 3. Что уже не нужно обсуждать заново

- нужен ли отдельный EMIS deployable/app прямо сейчас
- нужен ли микросервисный split
- нужен ли PostGIS уже в MVE
- нормально ли хранить базовую геометрию как `geometry(..., 4326)` для MVE
- нужно ли дожимать identity/soft delete/audit до уровня БД
- нужно ли писать новый EMIS UI сразу на Svelte 5 runes
- нормален ли текущий naming default `emis-*` для ранних этапов
- нужно ли расширять dataset layer под operational EMIS use cases "на вырост"

## 4. Что ещё остаётся implementation decision

- extent и policy для audit beyond текущего write-side actor contract
- что именно идет в `CHECK/ENUM`, а что в dictionary tables
- как выглядит admin/restore contract для soft-deleted записей

## 5. Frozen Implementation Conventions

- для новых `entities/features/widgets` по умолчанию используем плоский namespace `emis-*`
- новый EMIS UI пишем сразу на Svelte 5 runes
- для EMIS operational/server flows default path:
  `routes/api/emis/* -> packages/emis-server/src/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`
- dataset/IR слой сохраняем для BI/read-side и стабильных published read-model contracts, но не расширяем его для operational сценариев
- `oracle`/`cube` не проектируем заранее; новые generic возможности `IR/Provider` не добавляем до появления реального второго backend
- `routes/api/emis/*` остаются тонким transport layer без SQL и бизнес-логики
- runtime conventions для list/meta/error shape и dataset-backed BI reads фиксируются в:
  `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
