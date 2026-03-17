# EMIS Freeze Note

Этот документ - короткая памятка для новых сессий, новых агентов и быстрых high-level обсуждений.

Важно:

- это **не** новый source of truth;
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
- Offline basemap допустим, но считается отдельной post-MVE wave.

### 1.1. Status update от 17 марта 2026

Минимальный slice из исходных Wave B / Wave C уже вытянут вперед и реализован, а DB/read-model foundation заметно продвинулся.

Что считать фактом в коде:

- локальный PostGIS dev runtime уже поднят через `docker compose`, DB работает на `localhost:5435`;
- EMIS migration state уже не ограничивается `001-007`:
  - `008_emis_identity_and_provenance.sql`
  - `009_emis_audit_log.sql`
  - `010_emis_mart_views.sql`
  - `011_emis_ship_route_vessels.sql`
- `GET /api/emis/search/objects` и `GET /api/emis/search/news` уже существуют;
- `/emis` уже является рабочим workspace, а не только foundation-page;
- map/list на `/emis` уже сидят на общем filter runtime;
- `dateRange` уже шарится между BI и EMIS через app-shared subset;
- EMIS dictionary filters уже грузят options из существующих dictionary endpoints.
- BI/read-model contract уже зафиксирован через:
  - `mart.emis_news_flat`
  - `mart.emis_object_news_facts`
  - `mart.emis_objects_dim`
- ship-route vertical slice уже интегрирован в `/emis` поверх `mart_emis`:
  - datasets `emis.ship_route_vessels`
  - datasets `emis.ship_route_points`
  - datasets `emis.ship_route_segments`
  - стабильный catalog `mart.emis_ship_route_vessels`
  - dictionary endpoint `/api/emis/dictionaries/vessels`
  - workspace filter `shipHbkId` уже синхронизируется с URL.

Что это не означает:

- catalogs/detail pages все еще не закрыты;
- audit hook wiring для write-side все еще не закрыт, хотя DB foundation уже есть;
- ship-route slice пока остается thin vertical slice, а не полноценным отдельным map API;
- исходный roadmap ниже не отменяется, но его нужно читать с учетом этого status update.

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

- точный DDL для `audit_log` и actor references;
- что именно идет в `CHECK/ENUM`, а что в dictionary tables;
- точная migration sequence для audit/provenance/unique constraints;
- какой именно первый BI-экран считаем обязательным;
- какой production-format offline basemap выбираем в будущем: pre-extracted bundle или `PMTiles`;
- как выглядит admin/restore contract для soft-deleted записей.

## 5. Текущие implementation conventions

- Для новых `entities/features/widgets` по умолчанию используем плоский namespace `emis-*`.
- Новый EMIS UI пишем сразу на Svelte 5 runes.
- Для EMIS operational/server flows default path: `routes/api/emis/* -> server/emis/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`.
- Dataset/IR слой сохраняем для существующего BI/read-side и для стабильных EMIS read-model contracts, но не расширяем его для operational сценариев "на вырост".
- `oracle`/`cube` не проектируем заранее; новые возможности `IR/Provider` не добавляем до появления реального второго backend.
- Server-side EMIS живет в:
  - `src/lib/server/emis/infra/*`
  - `src/lib/server/emis/modules/*`
- `routes/api/emis/*` остаются тонким transport layer без SQL и бизнес-логики.

## 6. Ближайший маршрут реализации

- Wave A: PostGIS runtime + green `db:migrate/db:seed`
- уже закрыто, включая dev scripts и локальный Docker runtime на `5435`
- Wave B: map/search query layer + GeoJSON endpoints
  Минимальный рабочий slice уже реализован вне исходной очереди; остается hardening.
- Wave C: `/emis` workspace v1
  Минимальный рабочий slice уже реализован вне исходной очереди; добавлен ship-route preview с URL-synced vessel filter, остаются catalogs/detail navigation и UX hardening.
- Wave D: catalogs/detail pages + manual create/edit flows + audit hook scaffold
- Wave E: BI wiring + smoke tests + production-shape hardening
- Wave F: offline basemap bundle + local static delivery + no-internet smoke checks

## 7. Как использовать этот документ

- Для новой сессии сначала прочитать этот freeze note.
- Затем перейти в `ТЗ v2`, если нужен точный scope и acceptance.
- Затем перейти в `implementation spec`, если нужен точный порядок работ и технические решения.

Короткое правило:

- `freeze note` = summary
- `ТЗ v2` = что и зачем
- `implementation spec` = как делаем
