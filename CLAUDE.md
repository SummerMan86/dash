# Dashboard Builder — Development Guide

## Stack

SvelteKit 2 + TypeScript + TailwindCSS 4 + ECharts + GridStack

## Architecture (Feature-Sliced Design)

```
src/lib/
├── entities/     # Domain models (dataset, filter, widget, dashboard)
├── features/     # Feature modules (dashboard-edit, dashboard-builder)
├── shared/       # Reusable (ui/, api/, utils/, styles/)
├── widgets/      # Widget implementations
└── server/       # BFF (providers/, datasets/)
src/routes/       # SvelteKit pages and API endpoints
```

**Path aliases:** `$lib`, `$shared`, `$entities`, `$features`, `$widgets`

## Data Flow

```
UI → fetchDataset() → POST /api/datasets/:id → compile() → IR → Provider → Response
```

**Key contracts:**
- `DatasetQuery` — request from UI
- `DatasetIr` — intermediate representation (AST, database-agnostic)
- `DatasetResponse` — response with data
- `Provider` interface — adapter for data source

## How to Add a New Dataset

1. Add ID in `src/lib/server/datasets/definitions/`
2. Implement compile function (Query → IR)
3. Add fixture in `src/lib/shared/fixtures/`

## How to Add a New Provider

1. Implement `Provider` interface from `src/lib/entities/dataset/model/ports.ts`
2. Register in routing at `src/routes/api/datasets/[id]/+server.ts`

## How to Add a New Widget

1. Create component in `src/lib/widgets/`
2. Add type to `WidgetType` (`src/lib/features/dashboard-edit/model/types.ts`)
3. Add to toolbox (`WidgetToolbox.svelte`)

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/shared/api/fetchDataset.ts` | Data fetching facade (cache, dedup) |
| `src/lib/entities/dataset/model/ir.ts` | IR definition + builder |
| `src/lib/entities/dataset/model/ports.ts` | Provider interface |
| `src/lib/entities/filter/model/store.svelte.ts` | Global filters store |
| `src/lib/server/providers/mockProvider.ts` | Example Provider implementation |
| `src/lib/features/dashboard-edit/model/store.ts` | Dashboard editor state |
| `src/lib/features/dashboard-edit/ui/WidgetCanvas.svelte` | GridStack integration |
| `src/routes/api/datasets/[id]/+server.ts` | API endpoint (routing) |

## Conventions

- Always import via aliases (`$shared`, `$entities`, `$features`, `$widgets`)
- Stores: use explicit API (`patch()`, `reset()`), not direct access to writable
- Contracts: version them (`contractVersion: 'v1'`)
- Types: strict typing, Zod for validation at boundaries
- Components: Svelte 5 runes syntax (`$state`, `$derived`, `$effect`)

## Commands

```bash
pnpm dev      # Start dev server
pnpm build    # Build for production
pnpm check    # Type check
pnpm lint     # Lint code
```

## Environment

For PostgreSQL-backed datasets (e.g. `wildberries.*`) set:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dashboard
```

## DWH datamart and presets tables
CREATE TABLE mart.fact_product_office_day (
	nm_id int8 NOT NULL, -- НМ-ID товара
	chrt_id int8 NOT NULL, -- ID размера
	office_id int8 NOT NULL, -- ID офиса/склада
	dt date NOT NULL, -- Дата снимка
	loaded_at timestamptz NOT NULL, -- Дата загрузки ETL
	size_name text NULL, -- Название размера
	office_name text NULL, -- Название офиса/склада
	region_name text NULL, -- Название региона
	stock_count int4 NULL, -- Количество на складе
	stock_sum int8 NULL, -- Сумма остатков
	buyout_count int4 NULL, -- Количество выкупов
	buyout_sum int8 NULL, -- Сумма выкупов
	buyout_percent float8 NULL, -- Процент выкупа
	sale_rate_days float8 NULL, -- Скорость продаж (дней)
	avg_stock_turnover_days float8 NULL, -- Средняя оборачиваемость (дней)
	to_client_count int4 NULL, -- Отправлено клиентам
	from_client_count int4 NULL, -- Возвраты от клиентов
	CONSTRAINT fact_product_office_day_pkey PRIMARY KEY (nm_id, chrt_id, office_id, dt)
);
CREATE INDEX ix_fact_office_day_dt ON mart.fact_product_office_day USING btree (dt);
CREATE INDEX ix_fact_office_day_office ON mart.fact_product_office_day USING btree (office_id, dt);

CREATE TABLE mart.fact_product_period (
	nm_id int8 NOT NULL, -- НМ-ID товара
	dt date NOT NULL, -- Дата снимка
	loaded_at timestamptz NOT NULL, -- Дата загрузки ETL
	title text NULL, -- Название товара
	vendor_code text NULL, -- Артикул продавца
	brand_name text NULL, -- Бренд
	subject_id int8 NULL, -- ID категории
	subject_name text NULL, -- Название категории
	main_photo text NULL, -- Ссылка на главное фото
	stock_count int4 NULL, -- Количество на складе
	stock_sum int8 NULL, -- Сумма остатков
	sale_rate_days float8 NULL, -- Скорость продаж (дней)
	avg_stock_turnover_days float8 NULL, -- Средняя оборачиваемость (дней)
	to_client_count int4 NULL, -- Отправлено клиентам
	from_client_count int4 NULL, -- Возвраты от клиентов
	lost_orders_count int4 NULL, -- Потерянные заказы (шт)
	lost_orders_sum int8 NULL, -- Потерянные заказы (сумма)
	lost_buyouts_count int4 NULL, -- Потерянные выкупы (шт)
	lost_buyouts_sum int8 NULL, -- Потерянные выкупы (сумма)
	availability_status text NULL, -- Статус доступности
	price_min int4 NULL, -- Минимальная цена
	price_max int4 NULL, -- Максимальная цена
	open_count int4 NULL, -- Просмотры карточки
	cart_count int4 NULL, -- Добавления в корзину
	order_count int4 NULL, -- Количество заказов
	order_sum int8 NULL, -- Сумма заказов
	buyout_count int4 NULL, -- Количество выкупов
	buyout_sum int8 NULL, -- Сумма выкупов
	add_to_cart_percent float8 NULL, -- Конверсия в корзину (%)
	cart_to_order_percent float8 NULL, -- Конверсия в заказ (%)
	buyout_percent float8 NULL, -- Процент выкупа (%)
	add_to_wishlist_count int4 NULL, -- Добавления в избранное
	product_rating float8 NULL, -- Рейтинг товара
	feedback_rating float8 NULL, -- Рейтинг отзывов
	stocks_wb int4 NULL, -- Остатки на WB
	stocks_mp int4 NULL, -- Остатки на MP (продавец)
	CONSTRAINT fact_product_period_pkey PRIMARY KEY (nm_id, dt)
);
CREATE INDEX ix_fact_period_brand_subject ON mart.fact_product_period USING btree (brand_name, subject_name);
CREATE INDEX ix_fact_period_dt ON mart.fact_product_period USING btree (dt);
CREATE INDEX ix_fact_period_priority ON mart.fact_product_period USING btree (dt, lost_orders_sum DESC NULLS LAST);

-- Общие пресеты (на уровень seller)
create table if not exists conf.calc_params_common (
  seller_id bigint not null,
  preset_id bigserial,
  preset_name text not null,          -- 'Balanced', 'Aggressive', ...
  lead_time_days int not null,        -- L
  safety_days int not null,           -- S
  review_days int not null,           -- R
  demand_window_days int not null default 28,  -- W
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (seller_id, preset_id),
  unique (seller_id, preset_name)
);

create index if not exists ix_calc_params_common_default
  on conf.calc_params_common (seller_id)
  where is_default;

-- Специфичные параметры (оверрайды) — SKU/бренд/категория/все
create table if not exists conf.calc_params_specific (
  seller_id bigint not null,
  preset_id bigint not null,
  scope_type text not null check (scope_type in ('ALL','SKU','BRAND','SUBJECT')),
  scope_key text not null,            -- '*' для ALL, nm_id::text для SKU, brand_name, subject_id::text
  lead_time_days int,
  safety_days int,
  review_days int,
  demand_window_days int,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (seller_id, preset_id, scope_type, scope_key),
  foreign key (seller_id, preset_id)
    references conf.calc_params_common (seller_id, preset_id)
    on delete cascade
);