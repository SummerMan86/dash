# Stock Alerts Widget

Wildberries-specific widget module: SKU stock status monitoring with scenario-based risk calculation.

## Structure

```
stock-alerts/
  index.ts              — public component exports (StatusBadge, ScenarioParams)
  types.ts              — domain types: StockStatus, ScenarioParams, OfficeAggregation, SkuDetail, KPI
  utils.ts              — calculateStatus(), getStatusColor/Label() helpers
  filters.ts            — scenario presets (balanced/aggressive/conservative), FilterSpec for dateRange
  StatusBadge.svelte    — colored status badge component (DEFICIT/RISK/OK)
  ScenarioParams.svelte — scenario parameter selector UI
```

## Domain model

- **StockStatus**: `DEFICIT` (stock = 0), `RISK` (coverage <= L+S days), `OK`
- **ScenarioParams**: L (lead time), S (safety stock), R (review period), W (demand window)
- **Presets**: balanced (L=20, S=10), aggressive (L=20, S=5), conservative (L=20, S=15)
- Data source: `wildberries.fact_product_office_day` dataset via BI pipeline

## Dependencies

- `@dashboard-builder/platform-datasets` — `JsonValue` type for row parsing
- `@dashboard-builder/platform-filters` — `FilterSpec` type for filter declarations

## Consumers

- `src/routes/dashboard/wildberries/stock-alerts/` — the stock alerts page

## Rules

- This is an app-local widget. It stays in `$widgets/`, not in packages — single consumer, Wildberries-specific.
- Types and utils are importable via subpath: `$widgets/stock-alerts/types`, `$widgets/stock-alerts/utils`, `$widgets/stock-alerts/filters`.
- Components are exported from `index.ts`.
- No server-side code here — all data comes through `fetchDataset`.
