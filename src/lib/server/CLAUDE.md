# server/ — BFF layer (server-only)

## Purpose
Backend-for-frontend: compiles DatasetQuery → IR, executes IR via providers, returns DatasetResponse.
All code here runs server-side only (never bundled to client).

## Structure
```
server/
├── datasets/
│   ├── compile.ts                    # Router: datasetId → compile function
│   └── definitions/
│       ├── paymentAnalytics.ts       # PAYMENT_DATASETS, compilePaymentDataset
│       └── wildberriesOfficeDay.ts   # WILDBERRIES_DATASETS, compileWildberriesDataset
├── providers/
│   ├── mockProvider.ts               # Returns fixture data (payment datasets)
│   └── postgresProvider.ts           # Executes IR as SQL on pg pool
├── db/
│   └── pg.ts                         # getPgPool() — lazy singleton Pool
└── alerts/                           # See alerts/CLAUDE.md
```

## Adding a new dataset (quick ref)

**Mock:**
1. Add ID constant in `definitions/your-dataset.ts`
2. Implement `compileYourDataset(id, query): DatasetIr`
3. Add fixture in `shared/fixtures/`
4. Register in `compile.ts`

**Postgres:**
1. Same as mock steps 1–2
2. Add SQL mapping to `DATASETS` in `postgresProvider.ts`
3. Register in `compile.ts`
4. Route to `postgresProvider` in `routes/api/datasets/[id]/+server.ts`

## Provider routing (in +server.ts)
Currently hardcoded: `datasetId.startsWith('wildberries.')` → postgresProvider, else mockProvider.
Add more prefixes or a registry when needed.

## SQL safety
- All user values → parameterized (`$1, $2, ...`)
- All identifiers → `isSafeIdent()` regex + `qIdent()` quoting
- Limit clamped to 0–50,000
- `call()` (aggregations) and `groupBy` throw in postgresProvider MVP

## postgresProvider DATASETS registry
Currently registered:
- `wildberries.fact_product_office_day` → `mart.fact_product_office_day`

NOT yet registered (in DB schema, needs adding):
- `wildberries.fact_product_period` → `mart.fact_product_period`

## Environment
- `DATABASE_URL` — required for postgres provider and alert scheduler
- If missing: postgres queries throw, mockProvider still works
