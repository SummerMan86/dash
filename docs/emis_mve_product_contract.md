# EMIS MVE Product Contract

Статус на `2026-04-05`.

Этот документ остается активным и является canonical source of truth для:

- product scope MVE;
- in/out of scope;
- обязательных product/data invariants;
- high-level UX expectations;
- acceptance criteria.

Этот документ не владеет current-state architecture, runtime/API conventions, access/write-policy, observability или active DB snapshot. Для этого существуют отдельные current-state contracts в related docs ниже.

## 1. Product Intent

EMIS MVE нужен не как "демо-карта", а как минимальный, но рабочий operational и analytical контур для:

- инфраструктурных объектов;
- новостей и источников;
- связей новостей с объектами;
- карты, поиска и каталожного чтения;
- BI/read-side поверх published SQL contracts.

Продуктовая цель первой версии:

1. Дать единый рабочий экран `карта + список + карточка`.
2. Дать устойчивый write-side для объектов, новостей и связей.
3. Дать published read-models, пригодные для BI без перепроектирования operational слоя.
4. Не закладывать преждевременно тяжелую инфраструктуру beyond MVE.

## 2. Product Framing

Для MVE заранее фиксируются следующие рамки:

- EMIS развивается внутри одного deployable fullstack application.
- Архитектурный стиль на уровне продукта: `modular monolith`.
- Код и контракты должны оставаться `monorepo-ready`.
- База данных: `PostgreSQL + PostGIS` с первого этапа.
- Operational CRUD и BI/read-side остаются разными execution paths.
- EMIS должен сосуществовать с текущим BI-контуром без backdoor-интеграции через CRUD/UI слой.

## 3. In Scope For MVE

### Operational

- справочники `countries`, `object_types`, `sources`;
- ручное создание и редактирование объектов;
- ручное создание и редактирование новостей;
- ручное создание и редактирование связей `news <-> object`;
- мягкое удаление объектов и новостей;
- reference seeds, optional demo fixtures и dev-reset сценарии.

### Query / workspace

- каталог объектов;
- каталог новостей;
- карточка объекта;
- карточка новости;
- карта объектов;
- карта новостей при наличии координат;
- единый workspace `карта + результаты + переход в карточки`;
- фильтры, поиск и bbox/viewport filtering.

### BI / platform

- published SQL views/read-models для BI;
- как минимум один EMIS dataset/view, подключенный к текущему BI/BFF-контуру и отображаемый в UI;
- локальный запуск через Docker Compose;
- health/readiness/diagnostics contract;
- минимальные smoke/tests на критические data flows.

## 4. Out Of Scope For MVE

В MVE не входят:

- автоматический ingestion новостей из внешних источников;
- Kafka, Redis, Elasticsearch, MinIO;
- LLM/NLP, dedup, авто-классификация;
- отдельный Python backend;
- полноценная auth/session/RBAC система;
- real-time streaming;
- импорт Excel/GeoJSON через UI;
- AIS/трековые данные как обязательная часть MVE;
- обязательная сущность `events`;
- пользовательский конструктор аналитических дашбордов;
- admin CRUD для справочников.

## 5. Non-Negotiable Invariants

### Identity

- внутренний `UUID` является каноническим идентификатором во всех API и связях;
- `external_id` для объектов остается интеграционным ключом, но не заменяет внутренний `id`;
- для новостей canonical external identity строится вокруг `source_id + source_item_id`, а при отсутствии `source_item_id` допускается fallback `source_id + url`;
- эти правила должны быть выражены не только в prose, но и в DB constraints / partial unique indexes;
- для связей canonical uniqueness: `UNIQUE(news_id, object_id, link_type)`.

### Geo

- все геометрии хранятся в `SRID 4326`;
- bbox/viewport трактуется как `west,south,east,north` в WGS84;
- объект в MVE должен иметь геометрию;
- если точная геометрия недоступна, допустима временная point-геометрия с provenance-пометкой;
- у новостей геометрия остается опциональной.

### Soft Delete

- operational list/query/detail contracts по умолчанию работают только с активными записями (`deleted_at IS NULL`);
- soft-deleted записи не попадают в стандартные list/search/map/detail contracts;
- BI/read-models по умолчанию тоже исключают soft-deleted записи;
- recreate/restore semantics не должны нарушать active unique constraints.

### Audit, provenance, access

- каждая create/update/delete операция должна быть атрибутируема к actor identity;
- audit trail и provenance входят в обязательный контракт MVE, а не откладываются "на потом";
- production-shaped MVE допускается только в trusted/internal contour;
- session-based auth implemented post-MVE (DF-3, hardened in Phase 5): toggle via `EMIS_AUTH_MODE`, default `session` (since AUTH-7);
- dictionary management available via admin CRUD (DF-2) and seeds; admin role enforcement implemented (DF-3).

### BI coupling

- BI читает EMIS через published views/read-models, а не через CRUD/UI contracts;
- published read-models считаются отдельным контрактом;
- operational слой может эволюционировать быстрее, чем BI, но breaking change в BI-facing contracts требует явного migration/update path.

## 6. UX Expectations

Ключевая ценность MVE:

- единый рабочий сценарий `карта + аналитический список + карточка`;
- синхронизация карты и результатов поиска;
- быстрый переход из workspace в карточки объекта и новости;
- отдельные каталоги объектов и новостей как поддерживающие сценарии;
- совместимость с единым shell приложения (`BI` и `EMIS` как разные доменные разделы).

Обязательные пользовательские экраны:

1. главный workspace EMIS;
2. каталог объектов;
3. каталог новостей;
4. карточка объекта;
5. карточка новости.

## 7. Acceptance Criteria

Система считается принятой по MVE, если одновременно выполнены условия:

### Data / platform

- есть snapshot-first DB truth для active EMIS schemas;
- reference seed данные загружаются repeatable способом;
- PostGIS и обязательные индексы присутствуют;
- есть published read-models для BI;
- приложение запускается локально через Docker Compose;
- health/readiness contract документирован и проверяем.

### Objects / news / links

- можно создать, изменить и мягко удалить объект;
- можно создать и изменить новость;
- можно управлять связями `news <-> object`;
- в карточке объекта отображаются связанные новости;
- в карточке новости отображаются связанные объекты.

### Workspace / map

- карта показывает объекты;
- карта показывает новости с координатами;
- фильтры синхронизируют список и карту;
- map endpoints используют bbox или эквивалентный viewport filter;
- workspace `карта + список + карточка` является реальным рабочим сценарием, а не заглушкой.

### BI integration

- как минимум один EMIS dataset/view подключен к текущему BI/BFF-контуру и используется в UI;
- EMIS published read-models документированы;
- EMIS сосуществует с текущим BI-контуром без конфликтов namespace и контрактов.

## 8. Related Current-State Docs

- `docs/architecture.md` — repo-wide architecture contract
- `docs/emis_session_bootstrap.md` — current state, doc map, reading order
- `docs/emis_working_contract.md` — working rules, review triggers, DoD
- `docs/emis_access_model.md` — operating model и write guardrails
- `docs/emis_observability_contract.md` — health/readiness/error logging
- `docs/emis_read_models_contract.md` — published read-models и BI coupling
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — runtime/API conventions
- `db/current_schema.sql`, `db/schema_catalog.md`, `db/applied_changes.md` — active DB truth
- `docs/archive/emis/emis_implementation_reference_v1.md` — retained implementation decisions и historical rollout context

Практическое правило:

- этот документ отвечает на вопрос `что обязаны поставить и не размыть`;
- current-state contracts отвечают на вопрос `что сейчас считается truth в коде и runtime`.
