# EMIS Product Scope

Текущий продуктовый контракт для EMIS.  
Документ отвечает на вопросы:

- что EMIS обязан поддерживать как продуктовый контур;
- что входит в scope, а что нет;
- какие data/product invariants обязательны;
- какие пользовательские сценарии считаются базовыми.

Историческое MVE-позиционирование убрано из top-level active docs.  
Ниже зафиксирован **текущий рабочий scope**, а не chronology фаз.

## 1. Product intent

EMIS — это не только карта, а минимально достаточный operational + analytical контур для:

- инфраструктурных объектов;
- новостей и источников;
- связей `news <-> object`;
- карты, поиска, каталогов и карточек;
- BI/read-side поверх published SQL contracts.

Ключевая цель:

1. Дать единый рабочий сценарий `карта + результаты + карточка`.
2. Дать устойчивый write-side для объектов, новостей и связей.
3. Дать published read-models для BI без перелома operational слоя.
4. Не размывать продукт в heavy platform scope без явной необходимости.

## 2. In scope

### Operational

- справочники `countries`, `object_types`, `sources`;
- ручное создание, редактирование и мягкое удаление объектов;
- ручное создание, редактирование и мягкое удаление новостей;
- ручное управление связями `news <-> object`;
- audit / actor attribution / provenance для write-side;
- admin CRUD для словарей и пользователей как часть текущего работающего контура.

### Query / workspace

- каталог объектов;
- каталог новостей;
- карточка объекта;
- карточка новости;
- карта объектов;
- карта новостей при наличии координат;
- единый workspace `карта + список + переход в карточки`;
- поиск, фильтры и bbox/viewport filtering;
- ship-routes и current vessel positions как часть EMIS workspace.

### BI / platform integration

- published SQL views / read-models для BI;
- EMIS dataset ids в dataset runtime;
- совместимость с текущим BI/BFF контуром без backdoor интеграции;
- health/readiness/diagnostics contracts;
- smoke verification для критических data flows.

## 3. Out of scope

Ниже — то, что не считается обязательной частью текущего scope по умолчанию:

- Kafka, Redis, Elasticsearch, MinIO;
- отдельный Python backend;
- real-time streaming;
- offline geocoding, routing, map editing tools;
- time slider / playback platform beyond текущего route-specific контракта;
- импорт Excel/GeoJSON через UI как обязательный базовый сценарий;
- LLM/NLP, dedup, авто-классификация;
- events как обязательная сущность;
- произвольный конструктор аналитических дашбордов внутри EMIS.

Новый scope добавляется только явным решением, а не как “естественное расширение”.

## 4. Non-negotiable invariants

### 4.1. Identity

- внутренний `UUID` — канонический идентификатор во всех API и связях;
- `external_id` для объектов — интеграционный ключ, но не замена внутреннему `id`;
- canonical external identity для новостей строится вокруг `source_id + source_item_id`, а при отсутствии `source_item_id` допускается fallback `source_id + url`;
- для связей canonical uniqueness: `UNIQUE(news_id, object_id, link_type)`.

### 4.2. Geo

- все геометрии хранятся в `SRID 4326`;
- bbox/viewport трактуется как `west,south,east,north`;
- объект в operational контуре должен иметь геометрию;
- если точная геометрия недоступна, допустима временная point-геометрия с provenance-пометкой;
- геометрия новости остаётся опциональной.

### 4.3. Soft delete

- стандартные operational list/search/map/detail contracts работают только с активными записями;
- soft-deleted записи не попадают в стандартные list/search/map/detail contracts;
- BI/read-models по умолчанию тоже исключают soft-deleted записи;
- restore/recreate semantics не должны ломать active unique constraints.

### 4.4. Audit, access, provenance

- каждая write-операция должна быть атрибутируема к actor identity;
- audit trail и provenance — обязательная часть продукта, а не post-factum hardening;
- production contour предполагает auth/session/RBAC;
- trusted/internal deployment contour допустим, но не отменяет обязательность access contract.

### 4.5. BI coupling

- BI читает EMIS через published read-models, а не через CRUD/UI contracts;
- published read-models считаются отдельным контрактом;
- breaking change в BI-facing contract требует явного migration/update path.

## 5. UX expectations

Базовая пользовательская ценность EMIS:

- единый рабочий сценарий `карта + список + карточка`;
- синхронизация карты и результатов поиска;
- быстрый переход из workspace в карточки объекта и новости;
- отдельные каталоги объектов и новостей как поддерживающие сценарии;
- согласованное сосуществование EMIS и BI в общем application shell.

### Обязательные пользовательские экраны

1. главный EMIS workspace;
2. каталог объектов;
3. каталог новостей;
4. карточка объекта;
5. карточка новости;
6. административные экраны, нужные для текущего operating model.

## 6. Что считать продуктово завершённым для очередного slice

Новый slice считается продуктово корректным, если:

- не размывает базовый scope;
- не ломает обязательные инварианты;
- не создаёт backdoor coupling между operational и BI;
- остаётся проверяемым через smoke/targeted verification;
- при необходимости обновляет docs и DB truth.

## 7. Related sources

- `architecture.md` — текущая архитектура и границы;
- `change_policy.md` — правила изменения системы;
- `access_model.md` — доступ, роли, write-policy;
- `operations.md` — readiness, logs, offline maps;
- `db/current_schema.sql`, `db/schema_catalog.md`, `db/applied_changes.md` — active DB truth;
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — runtime/API conventions.
