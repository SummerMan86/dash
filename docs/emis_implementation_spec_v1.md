# EMIS Implementation Spec v1

## 1. Назначение документа

Этот документ переводит [ТЗ EMIS v2](./emis_mve_tz_v_2.md) в практический план реализации внутри текущего репозитория `dashboard-builder`.

Цель документа:

- зафиксировать способ внедрения EMIS без большого предварительного рефакторинга;
- описать минимальную структуру кода и данных;
- определить API, страницы, миграции и seed;
- разбить работу на реалистичные этапы.

## 2. Базовое решение на старт

На первом этапе EMIS реализуется **внутри текущего SvelteKit-приложения**.

При этом фиксируются следующие правила:

1. Не делаем отдельный репозиторий.
2. Не делаем физическое монорепо на старте.
3. Не трогаем массово существующие BI-модули без необходимости.
4. Новый код EMIS кладем в отдельный namespace.
5. Shared-подсистемы текущего проекта считаем platform layer по соглашению, даже если они пока физически лежат в старых папках.

Итог: быстрый старт без лишнего churn, но с понятной дорогой к будущему split.

## 3. Что считаем platform layer в текущем проекте

На этапе v1 не переименовываем всю кодовую базу, а просто фиксируем статус существующих модулей:

- `src/lib/shared/*` - platform shared UI/styles/utils
- `src/lib/entities/dataset/*` - platform dataset contracts
- `src/lib/entities/filter/*` - platform filter engine
- `src/lib/server/providers/*` - platform data provider patterns
- `src/lib/server/db/*` - platform DB access

Это важно, чтобы EMIS не начинал тянуть в себя дубли shared-логики.

## 4. Рекомендуемая структура EMIS внутри текущего приложения

```text
src/
  lib/
    entities/
      emis-object/
      emis-news/
      emis-link/
      emis-dictionary/
      emis-geo/
    features/
      emis-object-form/
      emis-news-form/
      emis-link-editor/
      emis-workspace-filters/
    widgets/
      emis-map/
      emis-object-card/
      emis-news-card/
      emis-search-results/
    server/
      emis/
        infra/
        modules/
          dictionaries/
          links/
          news/
          objects/
          geo/          # позже
          search/       # позже
          read-models/  # позже
  routes/
    emis/
      +page.svelte
      objects/          # следующим этапом
      news/             # следующим этапом
    api/
      emis/
        health/
        objects/
        news/
        dictionaries/
        links/          # следующим этапом
        map/            # следующим этапом
        search/         # следующим этапом
```

## 5. Правила по слоям

### 5.1. `entities/emis-*`

Содержат:

- типы доменных сущностей;
- DTO для UI;
- Zod-схемы на границах;
- вспомогательные мапперы без I/O.

Не содержат:

- SQL;
- HTTP;
- Svelte components.

### 5.2. `server/emis/infra`

Общий backend infrastructure layer:

- доступ к БД и транзакциям;
- типовые EMIS errors;
- HTTP helpers для API routes;
- технические зависимости, которые не относятся к конкретному домену.

### 5.3. `server/emis/modules/*`

Семантические backend-модули по доменам:

- `objects`
- `news`
- `links`
- `dictionaries`
- позже `geo`, `search`, `read-models`

Внутри каждого модуля допускаются свои `repository/service/queries`, если это действительно нужно домену.

Такой подход позволяет:

- не смешивать unrelated домены;
- держать read/write логику рядом с предметной областью;
- не раздувать глобальные папки `repositories/` и `services/`;
- сохранить monolith-friendly структуру без лишнего microservice-style дробления.

### 5.4. `routes/api/emis/*`

Тонкий transport layer:

- читает request;
- валидирует вход;
- вызывает нужный модуль или infra helper;
- возвращает DTO;
- не содержит бизнес-логики.

## 6. Структура страниц

### 6.1. Обязательные страницы v1

- `/emis` - основной workspace
- `/emis/objects` - каталог объектов
- `/emis/objects/[id]` - карточка объекта
- `/emis/news` - каталог новостей
- `/emis/news/[id]` - карточка новости

### 6.2. Смысл страницы `/emis`

Именно `/emis` должен стать главным рабочим экраном MVE:

- карта в центре;
- фильтры сверху или слева;
- список результатов справа или снизу;
- быстрый переход в карточки;
- переключение между объектами и новостями;
- единый набор фильтров для карты и списка.

Отдельные каталоги нужны, но не должны быть единственным пользовательским сценарием.

### 6.3. Что можно отложить

Можно не делать в первой поставке:

- отдельные сложные админки;
- map drawing tools;
- пользовательские дашборды;
- сложную систему сохраненных представлений.

## 7. База данных и миграции

### 7.1. Где хранить миграции

Рекомендуемый путь:

```text
db/
  migrations/
  seeds/
  fixtures/
```

Это лучше, чем прятать миграции глубоко в `src/`, потому что:

- это инфраструктурный слой;
- его будет проще вынести в `packages/db` при будущем split;
- команды CI/dev будут прозрачнее.

### 7.2. Первая пачка миграций

```text
db/migrations/
  001_enable_extensions.sql
  002_emis_reference_tables.sql
  003_emis_objects.sql
  004_emis_news.sql
  005_emis_news_object_links.sql
  006_emis_indexes.sql
  007_emis_views.sql
```

#### `001_enable_extensions.sql`

Включает:

- `postgis`
- `pgcrypto` или эквивалент для UUID generation

#### `002_emis_reference_tables.sql`

Создает:

- `countries`
- `object_types`
- `sources`

#### `003_emis_objects.sql`

Создает:

- `objects`

#### `004_emis_news.sql`

Создает:

- `news_items`

#### `005_emis_news_object_links.sql`

Создает:

- `news_object_links`

#### `006_emis_indexes.sql`

Создает индексы:

- B-tree
- GIST
- FTS

#### `007_emis_views.sql`

Создает:

- `vw_news_flat`
- `vw_object_news_facts`
- `vw_objects_dim`

### 7.3. Seed-структура

```text
db/seeds/
  001_countries.sql
  002_object_types.sql
  003_sources.sql
  004_demo_objects.sql
  005_demo_news.sql
  006_demo_links.sql
```

Если SQL seed неудобен, допустим JSON + TS runner, но интерфейс должен быть одинаковым:

- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm db:reset`

Конкретные scripts можно утвердить отдельным маленьким PR.

## 8. Data access strategy

### 8.1. Write side

Для create/update/delete используем repository + service flow:

```text
API route -> validate -> service -> repository -> DB
```

Примеры сервисов:

- `createObject`
- `updateObject`
- `softDeleteObject`
- `createNewsItem`
- `updateNewsItem`
- `attachNewsToObjects`

### 8.2. Read side

Для query-сценариев используем отдельные queries:

- `listObjectsQuery`
- `getObjectDetailsQuery`
- `listNewsQuery`
- `getNewsDetailsQuery`
- `mapObjectsQuery`
- `mapNewsQuery`

Это позволит:

- оптимизировать SQL под UI-сценарии;
- не перегружать service слой;
- легче подключать BI/read-model endpoints.

### 8.3. Когда использовать текущий dataset layer

Текущий `DatasetQuery -> IR -> Provider` слой рекомендуется использовать не для CRUD, а для:

- аналитических витрин;
- BI-виджетов;
- табличных read-моделей;
- интеграции views EMIS в существующий BI.

Для картографических и CRUD endpoint'ов прямые EMIS queries будут понятнее и дешевле по сложности.

## 9. API namespace и контракты

### 9.1. Namespace

Все EMIS endpoints должны жить под:

```text
/api/emis/*
```

Это исключит конфликт с текущими:

- `/api/datasets/*`
- `/api/wb/*`

### 9.2. CRUD endpoints

#### Объекты

- `GET /api/emis/objects`
- `GET /api/emis/objects/:id`
- `POST /api/emis/objects`
- `PATCH /api/emis/objects/:id`
- `DELETE /api/emis/objects/:id`

#### Новости

- `GET /api/emis/news`
- `GET /api/emis/news/:id`
- `POST /api/emis/news`
- `PATCH /api/emis/news/:id`
- `DELETE /api/emis/news/:id`

#### Связи

- `POST /api/emis/news/:id/objects`
- `PATCH /api/emis/news/:id/objects/:objectId`
- `DELETE /api/emis/news/:id/objects/:objectId`

#### Справочники

- `GET /api/emis/dictionaries/object-types`
- `GET /api/emis/dictionaries/sources`
- `GET /api/emis/dictionaries/countries`

### 9.3. Query endpoints

- `GET /api/emis/search/objects`
- `GET /api/emis/search/news`
- `GET /api/emis/map/objects`
- `GET /api/emis/map/news`

### 9.4. Минимальные DTO

#### `ObjectSummaryDto`

```ts
type ObjectSummaryDto = {
	id: string;
	name: string;
	objectTypeCode: string;
	objectTypeName: string;
	countryCode: string | null;
	region: string | null;
	status: string;
	hasGeometry: boolean;
};
```

#### `ObjectDetailDto`

```ts
type ObjectDetailDto = {
	id: string;
	name: string;
	nameEn: string | null;
	objectType: {
		id: string;
		code: string;
		name: string;
	};
	countryCode: string | null;
	region: string | null;
	status: string;
	operatorName: string | null;
	description: string | null;
	attributes: Record<string, unknown>;
	geometry: GeoJSON.Geometry;
	relatedNews: NewsSummaryDto[];
};
```

#### `NewsSummaryDto`

```ts
type NewsSummaryDto = {
	id: string;
	title: string;
	sourceName: string;
	publishedAt: string;
	countryCode: string | null;
	newsType: string | null;
	importance: number | null;
	relatedObjectsCount: number;
};
```

#### `MapFeatureDto`

```ts
type MapFeatureDto = GeoJSON.Feature<
	GeoJSON.Geometry,
	{
		id: string;
		kind: 'object' | 'news';
		title: string;
		subtitle?: string;
		colorKey?: string;
	}
>;
```

## 10. Поиск и фильтры

### 10.1. Принцип

На старте фильтры должны быть едиными для:

- workspace `/emis`;
- list pages;
- map endpoints.

### 10.2. Минимальный набор фильтров

#### Для объектов

- `q`
- `objectType`
- `country`
- `status`

#### Для новостей

- `q`
- `source`
- `country`
- `newsType`
- `dateFrom`
- `dateTo`
- `objectId`

#### Для карты

- `bbox`
- `layer=objects|news|all`

### 10.3. Как интегрировать с текущей filter system

На первом этапе:

1. Использовать существующий filter engine.
2. Добавить EMIS-specific filter specs.
3. Обязательно закрыть lifecycle:
   - unregister on destroy
   - page scope
   - active page

Если lifecycle не будет стабилизирован вовремя, допустим временный локальный store внутри EMIS workspace, но это fallback, а не целевой вариант.

## 11. Карта

### 11.1. Стек

- `MapLibre GL JS`
- GeoJSON responses
- PostGIS для bbox-фильтрации

### 11.2. Первый UI-виджет карты

Рекомендуется сделать отдельный reusable widget:

```text
src/lib/widgets/emis-map/
  EmisMap.svelte
  layer-config.ts
  popup-renderers.ts
```

`EmisMap.svelte` должен уметь:

- принимать feature collections;
- отображать слои объектов и новостей;
- эмитить click/select events;
- реагировать на bbox/viewport change.

### 11.3. Ограничения первой версии

Не делаем в первой поставке:

- редактирование геометрии на карте;
- clustering with advanced controls;
- offline tiles;
- time slider.

## 12. BI / analytical integration

### 12.1. Что подключаем к BI в первую очередь

К существующему BI-контурy нужно подключать:

- `vw_news_flat`
- `vw_object_news_facts`
- `vw_objects_dim`

### 12.2. Где использовать dataset layer

Рекомендуемый путь:

- EMIS CRUD и map работают через `api/emis/*`;
- BI виджеты и read models при необходимости используют `api/datasets/*`.

Так мы сохраняем совместимость с текущим проектом и не ломаем существующий BFF.

### 12.3. Что не смешивать

Не нужно:

- строить CRUD экран напрямую на BI views;
- строить BI charts напрямую на operational forms;
- делать write side зависимым от chart widgets.

## 13. Тестирование

### 13.1. Минимальный обязательный набор

- migration smoke test
- repository tests для objects/news/links
- API contract smoke tests для:
  - `GET /api/emis/objects`
  - `GET /api/emis/news`
  - `GET /api/emis/map/objects`
- UI smoke test на загрузку `/emis`

### 13.2. Что пока можно не покрывать глубоко

- полный visual regression;
- end-to-end на все фильтры;
- сложные performance tests.

Но хотя бы один smoke path по основному workspace нужен.

### 13.3. Что считаем обязательным hardening для production-shaped MVE

Даже если часть этих пунктов не попадает в самый ранний demo contour, их нельзя терять из implementation backlog:

- actor attribution для write-операций;
- audit trail по объектам, новостям и связям;
- provenance метки для seed/manual/future import данных;
- согласованные правила soft delete и restore;
- единые API conventions для pagination, sorting, timezone и error shape.

## 14. Порядок реализации

### Этап 0. Repo alignment

Результат:

- docs обновлены;
- namespace EMIS утвержден;
- решение по migrations/seeds принято;
- app shell direction зафиксирован.

Текущий статус:

- выполнен.

### Этап 1. DB foundation

Задачи:

- включить PostGIS;
- создать reference tables;
- создать objects/news/links tables;
- создать indexes и views;
- реализовать migrate/seed/reset scripts.

Gate завершения:

- `pnpm db:status` видит все миграции;
- `pnpm db:migrate` проходит в PostGIS-окружении;
- `pnpm db:seed` загружает demo-данные;
- локальный runtime с PostGIS описан и воспроизводим.

Текущий статус:

- миграции, seed и scripts уже добавлены;
- принятие этапа сейчас блокируется отсутствием PostGIS в текущем локальном PostgreSQL.

### Этап 2. Server write layer

Задачи:

- repositories для dictionaries, objects, news, links;
- services для CRUD и attach/detach;
- Zod validation;
- базовые `api/emis/*` endpoints.

Gate завершения:

- работают create/update/delete сценарии для objects и news;
- работают attach/detach/update link сценарии;
- ошибки валидации и not found отдаются стабильно;
- есть заготовка под actor/audit hooks.

Текущий статус:

- базовые dictionaries, objects, news и link endpoints уже реализованы;
- доменный server layer собран в `infra + modules/*`;
- audit/actor hooks пока не внедрены.

### Этап 3. Server query layer

Задачи:

- list queries;
- detail queries;
- map queries;
- search queries;
- DTO mappers.

Gate завершения:

- list/detail endpoints выдают стабильные DTO;
- map endpoints отдают GeoJSON;
- search endpoints поддерживают минимальные фильтры;
- правила сортировки, limit/offset и timezone одинаково трактуются во всех query routes.

Текущий статус:

- list/detail foundation для objects и news уже есть;
- map/search endpoints остаются следующим обязательным пакетом.

### Этап 4. UI workspace

Задачи:

- `/emis` page;
- shared filters for map/list;
- `EmisMap.svelte`;
- results list;
- navigation в карточки.

Gate завершения:

- `/emis` становится рабочим экраном, а не заглушкой;
- карта и список используют один набор фильтров;
- есть выбор между объектами и новостями;
- переходы в карточки работают из списка и с карты.

Текущий статус:

- route `/emis` уже существует как foundation page;
- workspace UI, map widget и синхронизация фильтров еще не сделаны.

### Этап 5. Catalogs and detail pages

Задачи:

- `/emis/objects`
- `/emis/objects/[id]`
- `/emis/news`
- `/emis/news/[id]`

Gate завершения:

- каталоги открываются отдельно от workspace;
- карточки показывают связанные сущности;
- manual create/edit flows определены хотя бы для одного базового сценария.

Текущий статус:

- detail/list pages пока не реализованы.

### Этап 6. BI wiring

Задачи:

- подключить views к dataset layer;
- сделать 1-2 BI widgets по данным EMIS;
- зафиксировать контракты для будущего shared use.

Gate завершения:

- EMIS views читаются из BI-слоя без ручных обходов;
- существует хотя бы один BI/read-model сценарий поверх EMIS;
- документировано, какие views считаются стабильным контрактом для BI.

Текущий статус:

- базовые SQL views уже заложены миграцией;
- dataset wiring и BI widgets пока не подключены.

## 15. Definition of Done для первой рабочей поставки

Первая рабочая поставка считается завершенной, если:

1. База поднимается с нуля миграциями.
2. Seed загружает demo-данные.
3. `/emis` показывает карту и результаты.
4. Можно открыть карточку объекта.
5. Можно открыть карточку новости.
6. Можно создать минимум один объект и одну новость вручную.
7. Можно связать новость с несколькими объектами.
8. Работают map/search endpoints.
9. BI видит хотя бы один EMIS read model/view.

## 16. Action plan по пакетам работ

Рекомендуемая последовательность ближайших технических волн:

- Wave A: PostGIS runtime + green `db:migrate/db:seed`
- Wave B: map/search query layer + GeoJSON endpoints
- Wave C: `/emis` workspace v1 с картой, фильтрами и списком
- Wave D: catalogs/detail pages + manual create/edit flows + audit hook scaffold
- Wave E: BI wiring + smoke tests + production-shape hardening

Логика именно такая:

- без PostGIS не закрывается фундамент данных;
- без map/search не появится реальный workspace;
- без workspace трудно валидировать UX и фильтры;
- без BI wiring не подтверждается исходная идея EMIS как части общей платформы.

## 17. Git cadence

Для реализации EMIS принимается правило:

- после каждого завершенного технического этапа делаем локальный git commit;
- не копим большую незафиксированную ветку на много дней;
- checkpoint-коммиты допустимы даже до полного окончания всей фичи, если этап сам по себе рабочий и проверяемый.

Практический ритм:

- перед checkpoint-коммитом прогоняем `pnpm check` и `pnpm build`;
- если менялись БД-артефакты, дополнительно прогоняем `pnpm db:status`, `pnpm db:migrate` и `pnpm db:seed` в доступном PostGIS-контуре;
- отдельный commit допустим и для документации, если он синхронизирует архитектурное решение и экономит контекст команде.

## 18. Текущий статус и action guide

### 18.1. Что уже есть в репозитории

- docs v2/spec и AGENTS-слой для EMIS;
- namespace `/emis` и `/api/emis/*`;
- DB scripts, migrations и demo seeds;
- server layer для dictionaries, objects, news, links;
- list/detail endpoints для objects и news;
- health endpoint и базовая `/emis` page;
- semantic structure `src/lib/server/emis/infra + modules/*`.

### 18.2. Что сейчас блокирует или сдерживает прогресс

- локальная PostgreSQL пока без PostGIS, поэтому DB foundation формально не принят;
- map/search endpoints еще не реализованы;
- `/emis` пока не стал настоящим workspace;
- audit/auth/provenance еще только зафиксированы в документах, но не в коде;
- BI wiring пока остается только на уровне schema/views.

### 18.3. Ближайшая рабочая последовательность

1. Поднять воспроизводимый PostGIS-контур и довести `db:migrate/db:seed` до зеленого состояния.
2. Реализовать `map/*` и `search/*` endpoints с едиными query conventions.
3. Собрать первый рабочий `/emis` workspace: карта, фильтры, список результатов.
4. Добавить каталоги и карточки как отдельные entry points.
5. После этого ввести manual create/edit flows и заготовку audit attribution.
6. Завершить BI wiring и smoke tests как условие первой рабочей поставки.
