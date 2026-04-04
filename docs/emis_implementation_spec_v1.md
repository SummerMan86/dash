# EMIS Implementation Spec v1

## 1. Назначение документа

Этот документ переводит [ТЗ EMIS v2](./emis_mve_tz_v_2.md) в практический план реализации внутри текущего репозитория `dashboard-builder`.

Статус на 4 апреля 2026:

- package extraction уже произошел: текущий repo использует `apps/web` + `packages/*`
- current ownership и placement rules читать в:
  - [EMIS Session Bootstrap](./emis_session_bootstrap.md)
  - [EMIS Architecture Baseline](./emis_architecture_baseline.md)
  - [EMIS Working Contract](./emis_working_contract.md)
- этот spec больше не является current ownership map
- если любой path/example ниже расходится с current ownership docs, приоритет у current ownership docs

### Update от 23 марта 2026

DB governance в репозитории переведен в snapshot-first режим:

- текущую структуру читаем по `db/current_schema.sql`;
- короткую карту модели держим в `db/schema_catalog.md`;
- структурные изменения фиксируем в `db/applied_changes.md`;
- `db/pending_changes.sql` используем только как optional delta для уже существующей live DB;
- историческая migration-лента убрана из рабочего дерева репозитория.

Цель документа:

- зафиксировать способ внедрения EMIS без большого предварительного рефакторинга;
- описать минимальную структуру кода и данных;
- определить API, страницы, миграции и seed;
- разбить работу на реалистичные этапы.

Текущий статус репозитория, закрытые slice'ы и ближайший focus вынесены в отдельный master doc:
[EMIS Session Bootstrap](./emis_session_bootstrap.md).

Этот spec фиксирует retained implementation decisions, structure assumptions и rollout order.

## 2. Базовое решение на старт и его текущий статус

EMIS по-прежнему реализуется **внутри текущего SvelteKit-приложения**, но high-level repo layout уже перешел к `apps/web` + `packages/*`.

При этом фиксируются следующие правила:

1. Не делаем отдельный репозиторий.
2. Не делаем отдельный EMIS deployable/app на текущем этапе.
3. Reusable EMIS contracts/server/ui живут в `packages/emis-*`.
4. App-level composition остается в `apps/web/`:
   - `src/routes/api/emis/*`
   - `src/routes/emis/*`
   - `src/routes/dashboard/emis/*`
   - `src/lib/features/emis-manual-entry/`
   - `src/lib/widgets/emis-drawer/`
   - `src/lib/server/emis/infra/http.ts`
5. Shared-подсистемы текущего проекта считаем platform layer и не дублируем их в EMIS без реального reuse pressure.

Итог: один deployable app, package-owned reusable EMIS code и app-owned route composition без big-bang refactor.

## 3. Что считаем platform layer в текущем проекте

Canonical reusable platform layer:

- `packages/platform-core/*`
- `packages/platform-ui/*`
- `packages/platform-datasets/*`
- `packages/platform-filters/*`
- `packages/db/*`

App-level platform glue по-прежнему остается в:

- `apps/web/src/lib/shared/*` - platform shared UI/styles/utils
- `apps/web/src/lib/entities/dataset/*` - platform dataset contracts
- `apps/web/src/lib/entities/filter/*` - platform filter engine
- `apps/web/src/lib/server/providers/*` - platform data provider patterns
- `apps/web/src/lib/server/db/*` - platform DB access

Это важно, чтобы EMIS не начинал тянуть в себя дубли shared-логики.

## 4. Текущая структура EMIS в репозитории

```text
dashboard-builder/
  apps/web/
    src/lib/server/emis/infra/http.ts
    src/lib/features/emis-manual-entry/
    src/lib/widgets/emis-drawer/
    src/routes/api/emis/
    src/routes/emis/
    src/routes/dashboard/emis/
  packages/
    emis-contracts/
    emis-server/
    emis-ui/
```

### 4.1. Naming convention по EMIS namespace

Базовой конвенцией считаем плоские префиксы:

- `entities/emis-*`
- `features/emis-*`
- `widgets/emis-*`

Это решение принято осознанно:

- оно безопасно рядом с существующим BI-контуром
- уменьшает риск конфликтов имен в одном приложении
- сохраняет совместимость между package code, app-local code и временными shims

Допустимая альтернатива в будущем:

- `entities/emis/*`
- `features/emis/*`
- `widgets/emis/*`

Но переход к вложенной структуре имеет смысл только как отдельный осознанный refactor, когда EMIS-домен заметно вырастет. Для v1 и ранних post-MVE волн default - сохранять плоскую `emis-*` схему.

## 5. Правила по слоям

### 5.1. `packages/emis-contracts/*`

Содержат:

- типы доменных сущностей;
- DTO для UI;
- Zod-схемы на границах;
- вспомогательные мапперы без I/O.

Не содержат:

- SQL;
- HTTP;
- Svelte components.

### 5.2. `packages/emis-server/src/infra`

Общий backend infrastructure layer:

- доступ к БД и транзакциям;
- типовые EMIS errors;
- framework-agnostic parsing/validation helpers для API routes;
- технические зависимости, которые не относятся к конкретному домену.

### 5.3. `packages/emis-server/src/modules/*`

Семантические backend-модули по доменам:

- `objects`
- `news`
- `links`
- `dictionaries`
- `ship-routes`
- позже `geo`, `search`, `read-models`

Внутри каждого модуля допускаются свои `repository/service/queries`, если это действительно нужно домену.

Такой подход позволяет:

- не смешивать unrelated домены;
- держать read/write логику рядом с предметной областью;
- не раздувать глобальные папки `repositories/` и `services/`;
- сохранить monolith-friendly структуру без лишнего microservice-style дробления.

### 5.4. `apps/web/src/routes/api/emis/*`

Тонкий transport layer:

- читает request;
- валидирует вход;
- вызывает нужный модуль или infra helper;
- возвращает DTO;
- не содержит бизнес-логики.

### 5.5. `apps/web/src/routes/emis/*` и `apps/web/src/routes/dashboard/emis/*`

Route layer содержит:

- workspace/UI orchestration для `/emis`
- BI/read-side pages для `/dashboard/emis/*`
- page-level composition и view-model shaping

Route layer не содержит:

- SQL
- reusable domain contracts
- server business logic

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

## 7. База данных и snapshot-first contract

### 7.1. Где хранить DB source of truth

Рекомендуемый путь:

```text
db/
  schema_catalog.md
  current_schema.sql
  applied_changes.md
  pending_changes.sql
  seeds/
```

Это лучше, чем прятать DB-артефакты глубоко в `src/`, потому что:

- это инфраструктурный слой;
- его будет проще вынести в `packages/db` при будущем split;
- команды CI/dev будут прозрачнее.

### 7.2. Как читать текущую структуру

Рабочий порядок чтения:

1. `db/schema_catalog.md`
2. `db/current_schema.sql`
3. `db/applied_changes.md`
4. при необходимости - `db/pending_changes.sql`

#### Следующая обязательная schema wave после foundation

До production-shaped MVE нужно добавить отдельную schema wave для:

- audit/provenance полей в `objects`, `news_items`, `news_object_links`;
- append-only `audit_log`;
- DB constraints для controlled vocabularies, которые в MVE не должны оставаться свободным `TEXT`;
- soft delete aware unique constraints и restore-safe semantics.

#### Текущий фактический baseline в репозитории

На 23 марта 2026 года текущий snapshot baseline уже фиксирует и документирует:

- active app schemas `emis`, `stg_emis`, `mart_emis`, `mart`;
- identity/provenance contract и partial unique indexes;
- append-only `emis.audit_log`;
- `mart.emis_*` BI views;
- `mart.emis_ship_route_vessels` как стабильный vessel catalog поверх `mart_emis`.

Историческая foundation wave `001-011` теперь читается только через `git history`, а не через рабочее дерево.

### 7.3. Seed-структура

```text
db/seeds/
  001_countries.sql
  002_object_types.sql
  003_sources.sql

db/demo-fixtures/
  004_demo_objects.sql
  005_demo_news.sql
  006_demo_links.sql
```

Если SQL seed неудобен, допустим JSON + TS runner, но интерфейс должен быть одинаковым:

- `pnpm db:apply`
- `pnpm db:seed`
- `pnpm db:demo`
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

Дополнительные обязательные правила:

- write side должен уважать active unique constraints, а не реализовывать identity только в приложении;
- soft delete и restore не должны обходить canonical identity rules;
- actor attribution и provenance должны быть доступны service-слою как явные поля или hooks, а не появляться постфактум в UI.

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

Дополнительное правило:

- dataset layer не нужно расширять под operational EMIS use cases;
- новые generic возможности `IR/Provider` не добавляем, пока нет реального второго backend;
- `oracle`/`cube` остаются будущим refactor-trigger, а не текущей задачей реализации.

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

- `GET /api/emis/map-config`
- `GET /api/emis/search/objects`
- `GET /api/emis/search/news`
- `GET /api/emis/map/objects`
- `GET /api/emis/map/news`

Правила semantics:

- базовые query endpoints по умолчанию работают только с `deleted_at IS NULL`;
- доступ к soft-deleted данным не считается частью стандартного MVE query contract;
- map endpoints возвращают GeoJSON FeatureCollection, а не ad-hoc JSON payload.

Практическая привязка для этого слоя:

- `search/*` и map endpoints считаются частью тонкого transport layer над query modules;
- runtime conventions для query/list/meta/error shape фиксируются в:
  - `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`.

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

Текущий рекомендуемый путь интеграции:

- `useFilterWorkspace({ workspaceId: 'emis', ownerId: 'workspace', specs })`
- runtime-resolved specs в `FilterPanel`
- `planFiltersForTarget(...)` для dataset и EMIS targets
- namespaced URL sync через `sf.*` и `wf.*`
- app-shared subset допускается для общих фильтров вроде `dateRange`
- fallback с отдельным локальным store внутри EMIS workspace не считать целевым направлением

## 11. Карта

### 11.1. Стек

- `MapLibre GL JS`
- GeoJSON responses
- PostGIS для bbox-фильтрации

Гео-договоренность для MVE:

- базовое хранение через `geometry(..., 4326)` достаточно для карты, bbox и большинства list/map сценариев;
- если позже появятся radius/distance queries, их нужно реализовывать через `geom::geography` в query layer, например через `ST_DWithin(geom::geography, ...)`, а не считать расстояния "в градусах";
- это не требует менять базовое решение MVE по хранению геометрии уже сейчас.

### 11.2. Первый UI-виджет карты

Рекомендуется сделать отдельный reusable widget:

```text
packages/emis-ui/src/emis-map/
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
- time slider.

### 11.4. Offline basemap

Offline basemap уже реализован и прошёл validation wave.

Текущий рабочий contract:

- объекты и новости EMIS отдаются локально из нашей БД и API;
- offline basemap реализован как отдельный runtime layer поверх `MapLibre GL JS` через `pmtiles` + `@protomaps/basemaps`;
- карта переключается между `online`, `offline` и `auto` mode через server-resolved config (`mapConfig.ts`);
- offline bundle размещается в `static/emis-map/offline/` и ставится командой `pnpm map:assets:install` или `pnpm map:pmtiles:setup`;
- при отсутствии bundle карта уходит в controlled fallback (auto: online → offline → degraded);
- `/emis/pmtiles-spike` сохраняется как маршрут для техвалидации и наблюдаемости;
- ops guide: `docs/emis_offline_maps_ops.md`.

Оставшаяся работа: automated `pnpm emis:offline-smoke`, Range support verification в production, asset update pipeline.

## 12. BI / analytical integration

### 12.1. Что подключаем к BI в первую очередь

К существующему BI-контурy нужно подключать:

- `vw_news_flat`
- `vw_object_news_facts`
- `vw_objects_dim`

Техническое уточнение для текущего репозитория:

- `emis.vw_*` остаются EMIS-side read models в operational namespace;
- стабильный BI/BFF contract публикуем через `mart.emis_*` views;
- dataset ids для platform layer фиксируем как `emis.news_flat`, `emis.object_news_facts`, `emis.objects_dim`.

Минимальный измеримый результат:

- хотя бы один EMIS view/read-model должен быть подключен к существующему BI/BFF-контуру и отображаться в UI.

### 12.2. Где использовать dataset layer

Рекомендуемый путь:

- EMIS CRUD и map работают через `api/emis/*`;
- operational query slices вроде ship routes, catalogs и detail pages тоже по умолчанию работают через `api/emis/*`;
- BI виджеты и read models при необходимости используют `api/datasets/*`.

Так мы сохраняем совместимость с текущим проектом и не ломаем существующий BFF.

### 12.3. Что не смешивать

Не нужно:

- строить CRUD экран напрямую на BI views;
- строить BI charts напрямую на operational forms;
- делать write side зависимым от chart widgets.

## 13. Тестирование

### 13.1. Минимальный обязательный набор

- snapshot/reset smoke test
- repository tests для objects/news/links
- API contract smoke tests для:
  - `GET /api/emis/objects`
  - `GET /api/emis/news`
  - `GET /api/emis/map/objects`
- UI smoke test на загрузку `/emis`
- локальная smoke matrix командой `pnpm emis:smoke` для:
  - `/emis`
  - `/dashboard/emis`
  - `/dashboard/emis/ship-routes`
  - `/dashboard/emis/provenance`
  - `api/datasets/emis.*`
  - `GET /api/emis/health`
  - `GET /api/emis/ship-routes/vessels`
  - runtime contract checks для operational list/search meta
  - runtime contract checks для dataset BI error/meta shape

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

### 13.4. Базовый подход к audit implementation в MVE

Для MVE рекомендуемый путь - app-level audit hooks в service layer:

- service слой получает `actor_id` и provenance context явно;
- каждая write-операция пишет в доменные таблицы и append-only `audit_log` в рамках одной транзакции;
- прямые write paths мимо service layer не считаются допустимым контрактом MVE.

DB triggers не исключаются навсегда, но не считаются базовым решением первой реализации, потому что:

- они усложняют передачу actor context из SvelteKit в PostgreSQL;
- app-level hooks быстрее и прозрачнее для текущего modular monolith контура.

## 14. Порядок реализации

### Этап 0. Repo alignment

Результат:

- docs обновлены;
- namespace EMIS утвержден;
- решение по snapshot/seeds принято;
- app shell direction зафиксирован.

Текущий статус:

- выполнен.

### Этап 1. DB foundation

Задачи:

- включить PostGIS;
- создать reference tables;
- создать objects/news/links tables;
- создать indexes и views;
- реализовать snapshot/apply/seed/reset scripts.

Gate завершения:

- `pnpm db:status` показывает snapshot-first baseline и live schemas;
- `pnpm db:reset` поднимает baseline из `db/current_schema.sql`;
- `pnpm db:seed` загружает reference dictionaries;
- `pnpm db:demo` опционально загружает demo objects/news/links;
- локальный runtime с PostGIS описан и воспроизводим.

Текущий статус:

- локальный PostGIS dev runtime уже поднят на `localhost:5435`;
- snapshot, seed и scripts уже добавлены;
- дальнейшие DB-изменения должны сохранять green-сценарий `db:reset/db:seed` для reference baseline;
- demo content не должен быть обязательной частью baseline.

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
- app-level audit hooks и actor attribution уже внедрены для object/news/link flows.

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
- `map/*` и минимальные `search/*` endpoints уже есть;
- query layer для workspace уже используется в `/emis`;
- query/runtime hardening уже закрыт отдельным pass;
- отдельной задачей теперь остаются write-side/offline smoke expansion и UX/performance polish.

### Этап 4. UI workspace

Задачи:

- `/emis` page;
- shared filters for map/list;
- `EmisMap.svelte`;
- results list;
- navigation в карточки.

Правило реализации:

- весь новый EMIS UI пишется сразу в синтаксисе Svelte 5 runes (`$state`, `$derived`, `$effect`);
- не добавлять в новый домен legacy-style reactive syntax из эпохи Svelte 4 без веской причины.

Gate завершения:

- `/emis` становится рабочим экраном, а не заглушкой;
- карта и список используют один набор фильтров;
- есть выбор между объектами и новостями;
- переходы в карточки работают из списка и с карты.

Текущий статус:

- route `/emis` уже является рабочим workspace-экраном;
- есть `EmisMap.svelte`, workspace filters и results list;
- карта и список уже используют общий filter runtime;
- `layer=objects|news|all` управляет overlay fetches;
- `target=objects|news` и map/list selection уже синхронизированы внутри workspace;
- ship-route slice уже использует operational transport `/api/emis/ship-routes/*`;
- переходы в detail routes работают из списка, selection panel и map popup.

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

- `/emis/objects`, `/emis/news` и detail routes уже реализованы;
- каталоги уже поддерживают базовые filters/pagination;
- detail pages уже показывают связанные сущности;
- manual create/edit entry points уже реализованы для objects/news;
- news edit уже поддерживает минимальный attach/detach flow для связанных объектов;
- inline validation и pending states для всех manual entry forms доведены до production-shaped UX.

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
- dataset wiring подключен для:
  - `emis.news_flat`
  - `emis.object_news_facts`
  - `emis.objects_dim`
  - `emis.ship_route_vessels`
- BI/read-side уже выведен в route-level UX:
  - `/dashboard/emis`
  - `/dashboard/emis/ship-routes`
  - `/dashboard/emis/provenance`
  - `/dashboard/emis/vessel-positions`
- локальный smoke path уже закреплен командой `pnpm emis:smoke`.

## 15. Definition of Done для первой рабочей поставки

Первая рабочая поставка считается завершенной, если:

1. База поднимается с нуля из snapshot baseline.
2. Reference seed загружает словари одной командой, а demo fixtures при необходимости подключаются отдельно.
3. `/emis` показывает карту и результаты.
4. Можно открыть карточку объекта.
5. Можно открыть карточку новости.
6. Можно создать минимум один объект и одну новость вручную.
7. Можно связать новость с несколькими объектами.
8. Работают map/search endpoints.
9. BI видит хотя бы один EMIS read model/view.

## 16. Historical rollout roadmap from v1

Рекомендуемая последовательность ближайших технических волн:

- Wave A: PostGIS runtime + green `db:reset/db:seed`
- Wave B: map/search query layer + GeoJSON endpoints
- Wave C: `/emis` workspace v1 с картой, фильтрами и списком
- Wave D: catalogs/detail pages + manual create/edit flows + audit hook scaffold
- Wave E: BI wiring + smoke tests + production-shape hardening
- Wave F: offline basemap bundle + local static delivery + no-internet smoke checks

Важно:

- порядок выше важен как historical sequencing rationale, а не как current task list
- реальный статус репозитория уже может быть дальше отдельных волн
- актуальный status и practical focus смотреть в `docs/emis_session_bootstrap.md`

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
- если менялись БД-артефакты, дополнительно прогоняем `pnpm db:status`, `pnpm db:snapshot:verify`, `pnpm db:reset` и `pnpm db:seed` в доступном PostGIS-контуре;
- отдельный commit допустим и для документации, если он синхронизирует архитектурное решение и экономит контекст команде.

## 18. Как использовать spec вместе с master-doc

- Этот документ фиксирует retained implementation decisions, API/data shape и historical rollout order.
- Current ownership и placement rules смотреть в:
  - [EMIS Session Bootstrap](./emis_session_bootstrap.md)
  - [EMIS Architecture Baseline](./emis_architecture_baseline.md)
  - [EMIS Working Contract](./emis_working_contract.md)
- Runtime/API conventions смотреть в `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`.
- Текущий backlog смотреть в [EMIS Next Tasks 2026-03-22](./emis_next_tasks_2026_03_22.md).
