# shared/ — Reusable utilities and UI primitives

## Structure
```
shared/
├── api/
│   └── fetchDataset.ts     # ONLY function UI uses to load data
├── lib/
│   └── useDebouncedLoader.svelte.ts  # Debounced reactive loader composable
├── ui/                     # Design system components
│   ├── button/
│   ├── card/               # Card, CardHeader, CardTitle, CardContent, CardFooter
│   ├── chart/              # Chart.svelte (ECharts wrapper), presets.ts
│   ├── chart-card/         # ChartCard.svelte (chart + title card)
│   ├── input/              # Input.svelte
│   ├── select/             # Select.svelte
│   ├── sidebar/            # Full sidebar system (Provider, Nav, Item, Trigger, Inset)
│   ├── skeleton/           # Skeleton.svelte (loading placeholder)
│   ├── sparkline/          # Sparkline.svelte (mini ECharts line)
│   └── stat-card/          # StatCard.svelte (KPI number + label + trend)
├── styles/
│   ├── tokens/             # Design tokens (semantic.ts, index.ts, tokens.css)
│   ├── utils/              # cn() (clsx + tailwind-merge)
│   ├── DESIGN_SYSTEM_GUIDE.md
│   └── DS_CHEATSHEET.md
├── fixtures/
│   └── paymentAnalytics.ts  # Mock data for payment datasets
└── utils/
    └── format.ts            # Number/date formatters
```

## fetchDataset
The ONLY data-fetching entry point for UI code.
```ts
import { fetchDataset } from '$shared/api';

const data = await fetchDataset({
  id: 'wildberries.fact_product_office_day',
  params: { nmId: 123, limit: 100 },
  cache: { ttlMs: 60_000 }   // optional client cache
});
```
- Auto-merges effective filters from `filterStoreV2`
- Deduplicates in-flight requests (same key → shared promise)
- Applies client-side filter fn after response if plan has one

## useDebouncedLoader
Use this for reactive data loading to avoid effect storms:
```ts
const { loading, reload } = useDebouncedLoader({
  watch: () => $effectiveFilters,   // reactive dependency
  delayMs: 250,
  load: async () => fetchDataset({ id: '...' }),
  onData: (data) => { rows = data.rows; },
  onError: (err) => console.error(err)
});
```
- Debounces watch()-triggered reloads
- Prevents parallel loads (queues one rerun)
- Ignores stale responses (latest seq wins)
- Do NOT put timer handles in $state — use non-reactive vars

## Design system
See `styles/DESIGN_SYSTEM_GUIDE.md` for token usage.
Key util: `cn(...classes)` from `$shared/styles/utils`.
