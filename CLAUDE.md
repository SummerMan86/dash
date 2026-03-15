# Dashboard Builder — Development Guide

## Module Documentation

Each major module has its own `CLAUDE.md` (or `AGENTS.md` for EMIS) with types, patterns, and conventions.
Read these before scanning source files:

### BI platform

| Module | Doc |
|--------|-----|
| Dataset contracts & IR | `src/lib/entities/dataset/CLAUDE.md` |
| Filter system (spec, store, planner) | `src/lib/entities/filter/CLAUDE.md` |
| Server BFF (compile, providers) | `src/lib/server/CLAUDE.md` |
| Alert system & scheduler | `src/lib/server/alerts/CLAUDE.md` |
| Dashboard editor (GridStack) | `src/lib/features/dashboard-edit/CLAUDE.md` |
| Widget catalog | `src/lib/widgets/CLAUDE.md` |
| Shared UI & utilities | `src/lib/shared/CLAUDE.md` |

### EMIS domain

| Module | Doc |
|--------|-----|
| Docs navigation (TZ, spec, analysis) | `docs/AGENTS.md` |
| Server architecture & dev rules | `src/lib/server/emis/AGENTS.md` |
| Semantic backend modules (objects, news, links, dicts) | `src/lib/server/emis/modules/AGENTS.md` |
| API transport layer rules | `src/routes/api/emis/AGENTS.md` |

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

## Server Layer (`src/lib/server/`)

BFF layer implementing data compilation and provider abstraction. Server-only code (not bundled to client).

```
src/lib/server/
├── datasets/           # Dataset registry and compilation
│   ├── compile.ts      # Query → IR compiler (routing)
│   └── definitions/    # Dataset-specific compile functions
├── providers/          # IR executors (database adapters)
│   ├── mockProvider.ts
│   └── postgresProvider.ts
└── db/                 # Database connections (infrastructure)
    └── pg.ts
```

**Dependency direction:**
```
routes/api/        → imports → server/datasets, server/providers
server/datasets    → imports → entities/dataset (types only)
server/providers   → imports → entities/dataset, server/db
server/db          → imports → nothing (leaf)
```

**SQL injection prevention:** All user input goes through parameterized queries (`$1`, `$2`). Identifiers validated via `isSafeIdent()` regex.

## How to Add a New Dataset

**Mock dataset:**
1. Add ID in `src/lib/server/datasets/definitions/`
2. Implement compile function (Query → IR)
3. Add fixture in `src/lib/shared/fixtures/`
4. Register in `src/lib/server/datasets/compile.ts`

**PostgreSQL dataset (wildberries.\*):**
1. Add compile function in `src/lib/server/datasets/definitions/`
2. Add SQL mapping in `src/lib/server/providers/postgresProvider.ts` (`DATASETS` constant)
3. Register in `src/lib/server/datasets/compile.ts`

## How to Add a New Provider

1. Implement `Provider` interface from `src/lib/entities/dataset/model/ports.ts`
2. Register in routing at `src/routes/api/datasets/[id]/+server.ts`

## How to Add a New Widget

1. Create component in `src/lib/widgets/`
2. Add type to `WidgetType` (`src/lib/features/dashboard-edit/model/types.ts`)
3. Add to toolbox (`WidgetToolbox.svelte`)

## How to Add Filters for a New Page

1. Create filter specs in page folder:
   ```typescript
   // src/routes/dashboard/[your-page]/filters.ts
   import type { FilterSpec } from '$entities/filter';

   export const pageFilters: FilterSpec[] = [
     {
       id: 'dateRange',
       type: 'dateRange',        // dateRange | select | multiSelect | text
       label: 'Период',
       scope: 'global',          // global (shared) | page (local)
       apply: 'server',          // server (SQL) | client (JS) | hybrid
       bindings: {
         'your.dataset_id': { field: 'dt' }  // datasetId → column
       }
     }
   ];
   ```

2. Register and render in page:
   ```svelte
   <script>
     import { registerFilters } from '$entities/filter';
     import { FilterPanel } from '$widgets/filters';
     import { pageFilters } from './filters';

     registerFilters(pageFilters);
   </script>

   <FilterPanel />
   ```

3. fetchDataset applies filters automatically via planner.

**Filter types:** `dateRange`, `select`, `multiSelect`, `text`

**Scope:** `global` — shared across pages, `page` — local to this page

**Apply:** `server` — SQL WHERE, `client` — JS filter after fetch, `hybrid` — both

## Filter Reactivity & Performance Notes (Svelte 5 runes)

When wiring filters to data loads, avoid triggering request storms or infinite effect loops:

- **Prefer a debounced single-flight loader**: use `useDebouncedLoader()` from `src/lib/shared/lib/useDebouncedLoader.svelte.ts` to:
  - debounce reloads on `$effectiveFilters` changes
  - prevent parallel `load()` calls (queues a single rerun)
  - ignore stale responses (only latest request commits data)

- **Do not store timers in reactive state**: putting `setTimeout` handles into `$state` and then reading/writing them inside `$effect` can cause `effect_update_depth_exceeded`.

- **Filter store emits only real changes**: `filterStoreV2.setFilter()` is a no-op if the next value is equal to the current value (prevents unnecessary reactive updates).

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/shared/api/fetchDataset.ts` | Data fetching facade (cache, dedup, filter planner) |
| `src/lib/entities/dataset/model/ir.ts` | IR definition + builder |
| `src/lib/entities/dataset/model/ports.ts` | Provider interface |
| `src/lib/entities/filter/model/types.ts` | FilterSpec, FilterValue types |
| `src/lib/entities/filter/model/store.svelte.ts` | Global filters store |
| `src/lib/entities/filter/model/registry.ts` | Filter registration (registerFilters) |
| `src/lib/entities/filter/model/planner.ts` | Filter planning (server/client routing) |
| `src/lib/widgets/filters/FilterPanel.svelte` | Filter UI container |
| `src/lib/server/providers/mockProvider.ts` | Example Provider implementation |
| `src/lib/features/dashboard-edit/model/store.ts` | Dashboard editor state |
| `src/lib/features/dashboard-edit/ui/WidgetCanvas.svelte` | GridStack integration |
| `src/routes/api/datasets/[id]/+server.ts` | API endpoint (routing) |

## Design system
For UI use 'src\lib\shared\styles\DESIGN_SYSTEM_GUIDE.md'

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
DATABASE_URL=postgresql://postgres:SSYS@localhost:5435/dashboard
```

## DWH datamart and presets tables
CREATE TABLE mart.fact_product_office_day (
	nm_id int8 NOT NULL, -- НМ-ID товара
	chrt_id int8 NOT NULL, -- ID размера
	office_id int8 NOT NULL, -- ID офиса/офиса
	dt date NOT NULL, -- Дата снимка
	loaded_at timestamptz NOT NULL, -- Дата загрузки ETL
	size_name text NULL, -- Название размера
	office_name text NULL, -- Название офиса/офиса
	region_name text NULL, -- Название региона
	stock_count int4 NULL, -- Количество на офисе
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

CREATE TABLE mart.fact_product_day (  -- NOTE: actual table name in DB (not fact_product_period)
	nm_id int8 NOT NULL, -- НМ-ID товара
	dt date NOT NULL, -- Дата снимка
	loaded_at timestamptz NOT NULL, -- Дата загрузки ETL
	title text NULL, -- Название товара
	vendor_code text NULL, -- Артикул продавца
	brand_name text NULL, -- Бренд
	subject_id int8 NULL, -- ID категории
	subject_name text NULL, -- Название категории
	main_photo text NULL, -- Ссылка на главное фото
	stock_count int4 NULL, -- Количество на офисе
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
	CONSTRAINT fact_product_day_pkey PRIMARY KEY (nm_id, dt)
);
CREATE INDEX ix_fact_period_brand_subject ON mart.fact_product_day USING btree (brand_name, subject_name);
CREATE INDEX ix_fact_period_dt ON mart.fact_product_day USING btree (dt);
CREATE INDEX ix_fact_period_priority ON mart.fact_product_day USING btree (dt, lost_orders_sum DESC NULLS LAST);

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

## Alert System (`src/lib/server/alerts/`)

Server-side alerting system for Telegram (and future Browser Push) notifications.

### Architecture

```
src/lib/server/alerts/
├── model/
│   ├── types.ts              # AlertRule, AlertCondition, Recipient types
│   └── schema.ts             # Zod validation schemas
├── repository/
│   ├── alertRuleRepository.ts    # Rules CRUD
│   ├── recipientRepository.ts    # Recipients CRUD
│   └── alertHistoryRepository.ts # Notification history
├── services/
│   ├── conditionEvaluator.ts # SQL generation for condition checks
│   ├── alertProcessor.ts     # Main processing pipeline
│   └── alertScheduler.ts     # Cron scheduler with distributed locking
├── channels/
│   └── telegramChannel.ts    # Telegram Bot API integration
└── sql/
    └── 001_alerts_schema.sql # Database migration
```

### Environment Variables

```bash
# Required for alerts
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Optional
ALERT_SCHEDULE="0 9 * * *"        # Cron expression (default: daily at 9:00)
ALERT_TIMEZONE="Europe/Moscow"    # Timezone for scheduler
PUBLIC_BASE_URL=http://localhost:5173  # For dashboard links in notifications
ENABLE_ALERT_SCHEDULER=true       # Set to 'false' to disable scheduler
```

### How to Set Up Alerts

1. **Apply database migration:**
   ```bash
   psql $DATABASE_URL < src/lib/server/alerts/sql/001_alerts_schema.sql
   ```

2. **Create Telegram bot:**
   - Message @BotFather on Telegram
   - Create new bot with /newbot
   - Copy the token to `.env` as `TELEGRAM_BOT_TOKEN`

3. **Get your chat_id:**
   - Message your bot
   - Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Find `chat.id` in the response

4. **Create alert rule via SQL:**
   ```sql
   -- Create recipient
   INSERT INTO alerts.recipients (seller_id, channel, address, name)
   VALUES (1, 'telegram', 'YOUR_CHAT_ID', 'My Telegram');

   -- Create alert rule
   INSERT INTO alerts.rules (seller_id, name, condition, dataset_id)
   VALUES (
     1,
     'Stock Deficit Alert',
     '{"metric": "stock_count", "operator": "<=", "threshold": 0}',
     'wildberries.fact_product_period'
   );

   -- Link rule to recipient
   INSERT INTO alerts.rule_recipients (rule_id, recipient_id)
   VALUES (1, 1);
   ```

### Alert Condition Format

```typescript
{
  metric: string;           // Column name (e.g., 'stock_count', 'lost_orders_sum')
  operator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  threshold: number;
  scope?: {                 // Optional filters
    brand_name?: string;
    nm_id?: number;
  };
  dateRange?: {             // Optional date range
    from: 'now' | '-7d' | '-1w' | '-1m';
    to: 'now';
  };
}
```

### Manual Alert Trigger

```typescript
import { triggerAlertCheck } from '$lib/server/alerts';

// In API endpoint or server function
const result = await triggerAlertCheck();
// { processed: 5, triggered: 2, errors: 0 }
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/alerts/index.ts` | Public API exports |
| `src/lib/server/alerts/services/alertScheduler.ts` | Cron + distributed lock |
| `src/lib/server/alerts/channels/telegramChannel.ts` | Telegram Bot API |
| `src/hooks.server.ts` | Scheduler initialization |
