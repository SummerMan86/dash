# App DB Schema Catalog

Текущий DB-контур этого репозитория ведется в режиме snapshot-first.

## Reading Order

1. `db/schema_catalog.md`
2. `db/current_schema.sql`
3. `db/applied_changes.md`
4. при необходимости - `db/pending_changes.sql`

## Scope

Snapshot в этом репозитории покрывает только активные app schemas:

- `emis`
- `stg_emis`
- `mart_emis`
- `mart`

Strategy/BSC snapshot-first source of truth живет во внешнем `agent_pack`, а не здесь.
При этом локальный app runtime может зависеть от опубликованных live wrappers в `mart_strategy`
для dataset-backed strategy pages; такие wrappers не заменяют полный внешний DWH snapshot.

Wildberries DWH-объекты живут в схеме `mart_marketplace` (managed by external DWH).
Приложение потребляет их через `postgresProvider`, но не управляет их DDL.
При расхождении см. [`dwh_for_wildberries_requirements.md`](../src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md).

## Schemas

### `emis`

Write-side и reusable operational contracts для EMIS.

Основные таблицы:

- `emis.countries`
- `emis.object_types`
- `emis.sources`
- `emis.objects`
- `emis.news_items`
- `emis.news_object_links`
- `emis.audit_log`
- `emis.users` — user accounts for session-based auth (AUTH-2)
- `emis.sessions` — persistent auth sessions (AUTH-2)

Operational views:

- `emis.vw_news_flat`
- `emis.vw_object_news_facts`
- `emis.vw_objects_dim`

### `stg_emis`

Landing / staging слой для судового ingestion-контура.

Основные объекты:

- `stg_emis.vsl_load_batch`
- `stg_emis.vsl_position_raw`
- `stg_emis.vsl_scraper_run_log`
- `stg_emis.vsl_ships_hbk`
- `stg_emis.vsl_position_latest`

### `mart_emis`

Derived ship-route read models поверх `stg_emis`.

Основные views:

- `mart_emis.vsl_route_point_hist`
- `mart_emis.vsl_route_segment_hist`

### `mart`

Published read-side / BI-facing SQL contracts, которые потребляет приложение.

EMIS views (управляются этим репозиторием):

- `mart.emis_news_flat`
- `mart.emis_object_news_facts`
- `mart.emis_objects_dim`
- `mart.emis_ship_route_vessels`

### `mart_marketplace`

Wildberries DWH-витрины (управляются внешним DWH, потребляются приложением).

Таблицы:

- `mart_marketplace.fact_product_office_day` — ежедневный снимок остатков по SKU × склад. PK: `(seller_id, nm_id, chrt_id, office_id, dt)`. Потребитель: stock-alerts, office-day
- `mart_marketplace.fact_product_day` — ежедневный снимок метрик товара (воронка, выручка, остатки). PK: `(seller_id, nm_id, dt)`. Потребитель: product-analytics

Views:

- `mart_marketplace.v_product_office_day` — агрегация `fact_product_office_day` по `(seller_id, nm_id, office_id, dt)`, сворачивает `chrt_id`

Ожидаемые (следующий этап):

- `mart_marketplace.calc_params_common` — пресеты параметров расчёта (L, S, R, W) по seller_id
- `mart_marketplace.calc_params_specific` — переопределения параметров по SKU/бренд/категории

> DDL и полный контракт колонок описан в [`dwh_for_wildberries_requirements.md`](../src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md).
> Эти объекты не входят в `db/current_schema.sql`, т.к. их DDL принадлежит внешнему DWH-контуру.
> При расхождении реальной структуры с контрактом — сверять с DWH-командой.

## Intentionally Excluded

В snapshot намеренно не входят:

- `emis.schema_migrations`
- legacy archive schemas вроде `staging_back2103` и `mart_back2103`
- одноразовые backup-таблицы в `staging`
- длинная migration-лента как основной navigation layer

## Change Rule

- `schema change` меняет DDL или published SQL contract -> обновить `db/current_schema.sql`, `db/applied_changes.md`, при необходимости этот каталог
- `live delta needed` для уже существующей БД -> положить SQL в `db/pending_changes.sql`
- `data patch` не использовать как описание текущей структуры

## Historical Note

Старые migration-файлы намеренно удалены из рабочего дерева этого репозитория, чтобы не засорять навигацию.
