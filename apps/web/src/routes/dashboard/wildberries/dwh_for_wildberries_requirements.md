# Требования к DWH — Dashboard Builder

> Документ описывает, какие данные дашборд ожидает от DWH,
> какие таблицы используются, какие колонки обязательны,
> и как устроены настраиваемые параметры расчёта.

---

## 1. Обзор архитектуры потребления данных

```
DWH / BI source
  └── PostgreSQL mart_marketplace.*   ← текущая реализация
  └── Oracle / Cube                   ← допустимые future adapters
        │
        ▼
Dashboard BFF (SvelteKit server)
  └── /api/datasets/:id
      └── compile(query) → DatasetIr → Provider → source-specific execution
        │
        ▼
Client (browser)
  └── fetchDataset(...)            ← canonical UI entrypoint
  └── aggregation.ts — группировка, KPI, статусы, рекомендации
```

Для non-EMIS BI/read-side это считается обязательным platform contract, а не локальной реализационной деталью.

- UI получает данные только через `fetchDataset(...)` и `DatasetResponse`, а не через прямое знание SQL, названий таблиц или backend-specific payloads.
- `DatasetQuery`, `DatasetIr`, `Provider` и `/api/datasets/:id` считаются canonical path для dashboard datasets и DWH-backed read models.
- Текущий runtime использует `postgresProvider`, но сам contract намеренно остается source-agnostic и не закрывает дорогу для будущего `oracle` или `cube` adapter.
- Это не означает, что нужно заранее добавлять новые IR features или provider capabilities: до реального второго backend слой считается законсервированным.
- Это правило относится только к non-EMIS BI/read-side и не распространяется на EMIS transport/modules, alerts scheduler/repositories и operational proxy endpoints вроде `/api/wb/*`.

### 1.1. Anti-goals для этого слоя

- Не внедряем `oracle` или `cube` provider заранее, если под них нет реального бизнес-сценария.
- Не расширяем `DatasetIr`/`Provider` "про запас", пока нет реального второго backend и concrete migration target.
- Не пытаемся насильно переводить EMIS на dataset layer.
- Не строим новые non-EMIS BI screens через bespoke read endpoints, если тот же сценарий можно выразить через `DatasetQuery -> IR -> Provider`.

Дашборд **не выполняет** GROUP BY / агрегации на стороне SQL (ограничение MVP провайдера).
Все агрегации происходят на клиенте в TypeScript после получения сырых строк.

---

## 2. Таблицы витрин (mart_marketplace)

### 2.1. `mart_marketplace.fact_product_office_day`

**Потребитель:** страницы «Оперативный анализ складов» (`/dashboard/wildberries/stock-alerts`) и «Офисные остатки» (`/dashboard/wildberries/office-day`)

**Dataset ID:** `wildberries.fact_product_office_day`

**Также в схеме:** view `mart_marketplace.v_product_office_day` — агрегирует по `(seller_id, nm_id, office_id, dt)`, сворачивая `chrt_id`.

| Колонка                   | Тип         | Обязательна | Описание              | Использование в UI                          |
| ------------------------- | ----------- | :---------: | --------------------- | ------------------------------------------- |
| `seller_id`               | bigint      |    ✅ PK    | ID продавца           | Multi-tenant фильтрация                     |
| `nm_id`                   | bigint      |    ✅ PK    | НМ-ID товара          | Идентификация SKU                           |
| `chrt_id`                 | bigint      |    ✅ PK    | ID размера            | Идентификация SKU+размер                    |
| `office_id`               | bigint      |    ✅ PK    | ID склада             | Группировка по складам                      |
| `dt`                      | date        |    ✅ PK    | Дата снимка           | Фильтр по периоду, определение «даты среза» |
| `office_name`             | text        |     ⚠️      | Название склада       | Отображение в таблице складов               |
| `region_name`             | text        |     ⚠️      | Регион                | Client-side фильтр по регионам              |
| `size_name`               | text        |      —      | Название размера      | Drill-down по SKU                           |
| `stock_count`             | int         |     ✅      | Остаток (шт)          | **Ключевая метрика**: DEFICIT если ≤ 0      |
| `stock_sum`               | bigint      |      —      | Сумма остатков (руб)  | —                                           |
| `sale_rate_days`          | float       |     ⚠️      | Скорость продаж (дни) | Fallback для расчёта покрытия               |
| `avg_stock_turnover_days` | float       |    ✅\*     | Оборачиваемость (дни) | **Ключевая метрика**: RISK если ≤ L+S       |
| `to_client_count`         | int         |      —      | Отправлено клиентам   | Информационное                              |
| `from_client_count`       | int         |      —      | Возвраты              | Информационное                              |
| `buyout_count`            | int         |      —      | Выкупы (шт)           | —                                           |
| `buyout_sum`              | bigint      |      —      | Выкупы (руб)          | —                                           |
| `buyout_percent`          | float       |      —      | Процент выкупа        | —                                           |
| `loaded_at`               | timestamptz |      —      | Дата загрузки ETL     | —                                           |

> ✅\* `avg_stock_turnover_days` — основная метрика покрытия. Если NULL, используется `sale_rate_days` как fallback.
> Хотя бы одна из двух должна быть заполнена для корректного определения статуса RISK.

**Фильтры при запросе:**

- `seller_id = :sellerId` — обязательный (multi-tenant)
- `dt BETWEEN :dateFrom AND :dateTo` — серверный фильтр по дате
- `nm_id = :nmId` — опциональный
- `office_id = :officeId` — опциональный
- `chrt_id = :chrtId` — опциональный
- `region_name = :regionName` — опциональный
- `LIMIT` — по умолчанию 500, максимум 50 000

**Индексы (актуальные):**

- PK: `(seller_id, nm_id, chrt_id, office_id, dt)`
- `ix_fact_office_day_dt` — по `(dt)`
- `ix_fact_office_day_nm_office_dt` — по `(nm_id, office_id, dt DESC)`
- `ix_fact_office_day_office` — по `(office_id, dt)`

---

### 2.2. `mart_marketplace.fact_product_day`

**Потребитель:** страница «Аналитика товаров» (`/dashboard/wildberries/product-analytics`)

**Dataset ID:** `wildberries.fact_product_period`

> ⚠️ Обратите внимание: dataset ID — `fact_product_period`, но реальное имя таблицы в БД — `fact_product_day`.

| Колонка                   | Тип         | Обязательна | Описание                 | Использование в UI              |
| ------------------------- | ----------- | :---------: | ------------------------ | ------------------------------- |
| `seller_id`               | bigint      |    ✅ PK    | ID продавца              | Multi-tenant фильтрация         |
| `nm_id`                   | bigint      |    ✅ PK    | НМ-ID товара             | Группировка по товарам          |
| `dt`                      | date        |    ✅ PK    | Дата снимка              | Фильтр, временные ряды          |
| `title`                   | text        |     ⚠️      | Название товара          | Отображение в карточке товара   |
| `vendor_code`             | text        |      —      | Артикул продавца         | Отображение                     |
| `brand_name`              | text        |     ⚠️      | Бренд                    | Фильтр, группировка             |
| `subject_id`              | bigint      |      —      | ID категории             | —                               |
| `subject_name`            | text        |     ⚠️      | Категория                | Фильтр, группировка             |
| `main_photo`              | text        |      —      | URL фото                 | Аватар товара                   |
| `stock_count`             | int         |     ✅      | Остаток (шт)             | Рекомендация «Restock» если ≤ 0 |
| `stock_sum`               | bigint      |      —      | Сумма остатков           | —                               |
| `stocks_wb`               | int         |      —      | Остатки на WB            | Разбивка по источнику           |
| `stocks_mp`               | int         |      —      | Остатки на MP (продавец) | Разбивка по источнику           |
| `availability_status`     | text        |      —      | Статус доступности       | Отображение                     |
| `price_min`               | int         |      —      | Мин. цена                | Ценовой диапазон                |
| `price_max`               | int         |      —      | Макс. цена               | Ценовой диапазон                |
| `open_count`              | int         |     ✅      | Просмотры карточки       | Воронка конверсии               |
| `cart_count`              | int         |     ✅      | Добавления в корзину     | Воронка конверсии               |
| `order_count`             | int         |     ✅      | Заказы (шт)              | KPI, воронка, графики           |
| `order_sum`               | bigint      |     ✅      | Заказы (руб)             | KPI, графики                    |
| `buyout_count`            | int         |     ✅      | Выкупы (шт)              | KPI, воронка                    |
| `buyout_sum`              | bigint      |     ✅      | Выкупы (руб)             | KPI — итоговая выручка          |
| `add_to_cart_percent`     | float       |      —      | Конверсия в корзину (%)  | Рекомендации                    |
| `cart_to_order_percent`   | float       |      —      | Конверсия в заказ (%)    | —                               |
| `buyout_percent`          | float       |      —      | Процент выкупа (%)       | Рекомендации                    |
| `lost_orders_count`       | int         |     ⚠️      | Потерянные заказы (шт)   | KPI, рекомендации               |
| `lost_orders_sum`         | bigint      |     ⚠️      | Потерянные заказы (руб)  | KPI «Потерянные продажи»        |
| `lost_buyouts_count`      | int         |      —      | Потерянные выкупы (шт)   | —                               |
| `lost_buyouts_sum`        | bigint      |      —      | Потерянные выкупы (руб)  | —                               |
| `product_rating`          | float       |     ⚠️      | Рейтинг товара           | KPI, рекомендации               |
| `feedback_rating`         | float       |      —      | Рейтинг отзывов          | —                               |
| `sale_rate_days`          | float       |      —      | Скорость продаж (дни)    | Рекомендации                    |
| `avg_stock_turnover_days` | float       |      —      | Оборачиваемость (дни)    | Рекомендация «Overstock»        |
| `to_client_count`         | int         |      —      | Отправлено клиентам      | Агрегация                       |
| `from_client_count`       | int         |      —      | Возвраты                 | Агрегация                       |
| `add_to_wishlist_count`   | int         |      —      | Добавления в избранное   | Агрегация                       |
| `loaded_at`               | timestamptz |      —      | Дата загрузки ETL        | —                               |

**ETL-контракт: значения-сентинели**

- Отрицательные значения (например, `-3`) трактуются как «данные недоступны» и клампятся до `0`.
- Это касается: `lost_orders_count`, `lost_orders_sum`, `lost_buyouts_count`, `lost_buyouts_sum`.

**Фильтры при запросе:**

- `seller_id = :sellerId` — обязательный (multi-tenant)
- `dt BETWEEN :dateFrom AND :dateTo` — серверный фильтр по дате
- `nm_id = :nmId` — опциональный
- `brand_name = :brandName` — опциональный (из фильтров или params)
- `subject_name = :subjectName` — опциональный (из фильтров или params)
- `LIMIT` — по умолчанию 1 000, максимум 50 000

**Индексы (актуальные):**

- PK: `(seller_id, nm_id, dt)`
- `ix_fact_product_day_dt` — по `(dt)`
- `ix_fact_product_day_nm_dt` — по `(nm_id, dt DESC)`
- `ix_fact_product_day_brand_subject` — по `(brand_name, subject_name)`
- `ix_fact_product_day_priority` — по `(dt, lost_orders_sum DESC NULLS LAST)`

---

## 3. Настраиваемые параметры расчёта (mart_marketplace)

### 3.1. Текущее состояние

Сейчас параметры **захардкожены** в клиентском коде (`stock-alerts/filters.ts`).
Пользователь выбирает один из трёх пресетов — параметры применяются на клиенте при агрегации.

### 3.2. Параметры и их смысл

| Параметр          | Имя в коде | Описание                                           | Где используется                  |
| ----------------- | ---------- | -------------------------------------------------- | --------------------------------- |
| **Lead time**     | `L`        | Время доставки от поставщика (дни). Для Китая ≈ 20 | Порог риска = L + S               |
| **Safety stock**  | `S`        | Страховой запас (дни)                              | Порог риска = L + S               |
| **Review period** | `R`        | Период пересмотра заказа (дни)                     | Расчёт ROP/ROQ (будущее)          |
| **Demand window** | `W`        | Окно для расчёта среднего спроса (дни)             | Расчёт средней скорости (будущее) |

### 3.3. Формула статуса SKU

```
DEFICIT  — stock_count ≤ 0
RISK     — avg_stock_turnover_days ≤ (L + S)    // покрытие меньше порога
OK       — иначе
```

Пример с пресетом «Сбалансированный» (L=20, S=10):

- Если `avg_stock_turnover_days` ≤ 30 → **RISK**
- Если `stock_count` = 0 → **DEFICIT**

### 3.4. Текущие пресеты (hardcoded)

| Пресет           | L (дни) | S (дни) | R (дни) | W (дни) | Порог риска (L+S) |
| ---------------- | :-----: | :-----: | :-----: | :-----: | :---------------: |
| Сбалансированный |   20    |   10    |    7    |   28    |    **30 дней**    |
| Агрессивный      |   20    |    5    |    5    |   21    |    **25 дней**    |
| Консервативный   |   20    |   15    |   10    |   35    |    **35 дней**    |

### 3.5. Ожидаемые таблицы DWH для параметров

#### `mart_marketplace.calc_params_common` — общие пресеты (уровень seller)

```sql
CREATE TABLE mart_marketplace.calc_params_common (
  seller_id        bigint    NOT NULL,
  preset_id        bigserial,
  preset_name      text      NOT NULL,          -- 'Balanced', 'Aggressive', ...
  lead_time_days   int       NOT NULL,          -- L
  safety_days      int       NOT NULL,          -- S
  review_days      int       NOT NULL,          -- R
  demand_window_days int     NOT NULL DEFAULT 28, -- W
  is_default       boolean   NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seller_id, preset_id),
  UNIQUE (seller_id, preset_name)
);
```

**Что ожидаем от DWH:**

- Таблица должна содержать пресеты по `seller_id`
- Один пресет должен быть помечен `is_default = true`
- При загрузке страницы дашборд будет читать пресеты для текущего seller
- Пользователь выбирает пресет → параметры L, S, R, W используются для расчёта статусов

#### `mart_marketplace.calc_params_specific` — переопределения (SKU/бренд/категория)

```sql
CREATE TABLE mart_marketplace.calc_params_specific (
  seller_id        bigint  NOT NULL,
  preset_id        bigint  NOT NULL,
  scope_type       text    NOT NULL CHECK (scope_type IN ('ALL','SKU','BRAND','SUBJECT')),
  scope_key        text    NOT NULL,   -- '*' для ALL, nm_id для SKU, brand_name, subject_id
  lead_time_days   int,                -- NULL = наследуем из common
  safety_days      int,
  review_days      int,
  demand_window_days int,
  enabled          boolean NOT NULL DEFAULT true,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seller_id, preset_id, scope_type, scope_key),
  FOREIGN KEY (seller_id, preset_id) REFERENCES mart_marketplace.calc_params_common ON DELETE CASCADE
);
```

**Что ожидаем от DWH:**

- Конкретные переопределения параметров на уровне scope
- Приоритет разрешения (от частного к общему): `SKU → BRAND → SUBJECT → ALL → common`
- `NULL`-поля означают «наследовать из родительского уровня»
- `enabled = false` — переопределение отключено (используется common)

### 3.6. Планируемый поток интеграции

```
1. Дашборд загружает пресеты:
   SELECT * FROM mart_marketplace.calc_params_common WHERE seller_id = :sellerId

2. Пользователь выбирает пресет (или используется is_default)

3. Дашборд загружает специфичные переопределения:
   SELECT * FROM mart_marketplace.calc_params_specific
   WHERE seller_id = :sellerId AND preset_id = :presetId AND enabled = true

4. Для каждого SKU при расчёте статуса:
   a. Ищем override по scope_type = 'SKU', scope_key = nm_id::text
   b. Если нет — по scope_type = 'BRAND', scope_key = brand_name
   c. Если нет — по scope_type = 'SUBJECT', scope_key = subject_id::text
   d. Если нет — по scope_type = 'ALL', scope_key = '*'
   e. Если нет — берём из common preset
   f. Мержим: NULL-поля заполняются из common

5. Результат: для SKU имеем эффективные L, S, R, W → рассчитываем статус
```

---

## 4. Система алертов

Алертная система использует те же витрины для проверки условий.

### 4.1. Формат условий алерта

```json
{
	"metric": "stock_count",
	"operator": "<=",
	"threshold": 0,
	"scope": {
		"brand_name": "MyBrand"
	},
	"dateRange": {
		"from": "-7d",
		"to": "now"
	}
}
```

### 4.2. Что ожидаем от DWH

- Алертная система делает `SELECT ... FROM <table> WHERE <condition>` напрямую
- Метрика (`metric`) — это имя колонки из витрины
- Scope-фильтры — дополнительные WHERE-условия по колонкам витрины
- DateRange — ссылки на `CURRENT_DATE` с интервалами (`-7d` → `CURRENT_DATE - INTERVAL '7 days'`)
- Результат: количество и sample строк, удовлетворяющих условию

**Доступные метрики для алертов** (колонки из витрин):

- Из `fact_product_day`: `stock_count`, `lost_orders_sum`, `lost_orders_count`, `order_count`, `buyout_percent`, `product_rating` и др.
- Из `fact_product_office_day`: `stock_count`, `sale_rate_days`, `avg_stock_turnover_days`, `buyout_percent` и др.

---

## 5. Рекомендации (правила на основе данных)

Страница product-analytics генерирует рекомендации для каждого товара. Для их корректной работы требуются следующие данные из `mart_marketplace.fact_product_day`:

| Правило                             | Условие                                              | Требуемые колонки                        |
| ----------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| **Restock** (пополнить)             | `stock_count ≤ 0`                                    | `stock_count`                            |
| **Lost Sales** (потерянные продажи) | `lost_orders_sum > 0` при `stock_count > 0`          | `lost_orders_sum`, `stock_count`         |
| **Price Up** (повысить цену)        | `buyout_percent > 60%` + `order_count ≥ 5`           | `buyout_percent`, `order_count`          |
| **Price Down** (снизить цену)       | `add_to_cart_percent < 3%` + `open_count > 50`       | `add_to_cart_percent`, `open_count`      |
| **Optimize Listing**                | `add_to_cart_percent ∈ [3%, 7%]` + `open_count > 30` | `add_to_cart_percent`, `open_count`      |
| **Review Quality** (качество)       | `product_rating < 4.0`                               | `product_rating`                         |
| **Overstock** (избыток)             | `avg_stock_turnover_days > 90` + `stock_count > 20`  | `avg_stock_turnover_days`, `stock_count` |
| **Promote** (продвигать)            | `product_rating ≥ 4.5` + `open_count < 30`           | `product_rating`, `open_count`           |

---

## 6. Требования к качеству данных

### Обязательные условия

1. **Ежедневное обновление** — данные за предыдущий день должны быть доступны к утру (алерты запускаются в 09:00 MSK по умолчанию)
2. **Полнота PK** — строки без `seller_id`, `nm_id`, `dt` или (для office-day) `office_id` не должны попадать в витрину
3. **Корректные числовые значения** — `stock_count`, `order_count` и др. должны быть `>= 0` (кроме sentinel-значений)
4. **Sentinel-значения** — если метрика недоступна, допускается отрицательное значение (напр. `-3`); клиент клампит в 0

### Желательные условия

5. **Заполненность текстовых полей** — `office_name`, `region_name`, `brand_name`, `title` — улучшают UX
6. **`avg_stock_turnover_days`** — заполненность критична для расчёта статуса RISK; если NULL, используется `sale_rate_days`
7. **Дедупликация** — не должно быть дубликатов по PK (иначе агрегация на клиенте удвоит метрики)

---

## 7. Объёмы и лимиты

| Параметр                      | Текущее значение | Максимум |
| ----------------------------- | :--------------: | :------: |
| LIMIT fact_product_office_day |       500        |  50 000  |
| LIMIT fact_product_day        |      1 000       |  50 000  |
| Кэш на клиенте                |      60 сек      |    —     |
| Обработка на клиенте          |    Все строки    |    —     |

> ⚠️ Все агрегации выполняются в браузере. При > 50K строк возможны проблемы с производительностью.
> В будущем планируется перенос агрегаций на сторону SQL (снятие ограничения MVP провайдера).

---

## 8. Резюме: минимальный контракт с DWH

### Чтобы всё работало, DWH должен предоставить:

**Обязательно (сейчас):**

1. ✅ `mart_marketplace.fact_product_office_day` — с заполненными PK (включая `seller_id`), `stock_count`, и хотя бы одной из `avg_stock_turnover_days` / `sale_rate_days`
2. ✅ `mart_marketplace.fact_product_day` — с заполненными PK (включая `seller_id`), метриками воронки (`open_count`, `cart_count`, `order_count`, `order_sum`, `buyout_count`, `buyout_sum`), и `stock_count`
3. ✅ Ежедневное обновление данных

**Ожидаем (следующий этап):** 4. ⏳ `mart_marketplace.calc_params_common` — пресеты параметров расчёта по seller_id 5. ⏳ `mart_marketplace.calc_params_specific` — переопределения параметров по SKU/бренд/категории 6. ⏳ Перенос агрегаций на SQL (GROUP BY в провайдере)
