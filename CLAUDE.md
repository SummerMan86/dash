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
