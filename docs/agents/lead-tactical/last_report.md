# Report: ST-6 — Extract Shared Platform Packages

## Статус
Выполнено

## Что сделано

### Wave 1 — Leaf packages
- `packages/platform-core` — format utilities (formatNumber, formatCurrency, etc.) + useDebouncedLoader composable
- `packages/db` — getPgPool (postgres connection pooling singleton)

### Wave 2 — Dependent packages
- `packages/platform-ui` — 15 UI component families (Button, Card, Chart, DataTable, Input, Select, Sidebar, Skeleton, etc.) + styles/tokens (cn, semantic tokens, chart presets)
- `packages/platform-datasets` — dataset contracts/IR/ports + server compile + dataset definitions + postgresProvider
- `packages/platform-filters` — filter types/store/planner/registry/workspace + filter widgets (FilterPanel, DateRangeFilter, SelectFilter, etc.)

### Migration strategy
- Re-export shims at all old paths (marked `// MIGRATION: remove after {package} import migration`)
- All existing `$shared/`, `$entities/`, `$lib/server/` imports continue working through shims
- Consumers will be migrated to `@dashboard-builder/{package}` imports incrementally

### Intentionally stays in apps/web
- `mockProvider` — depends on app-specific fixtures (`$shared/fixtures/paymentAnalytics`)
- `fetchDataset` — cross-package composition (imports both datasets AND filters)
- `shared/config/`, `shared/fixtures/` — app-specific data
- `shared/styles/tokens/tokens.css` — imported by `app.css`, loaded through app's CSS pipeline

### Package configuration
- All packages export source TS/Svelte (no compilation step)
- Svelte packages: `"svelte"` field + `"exports"` with `"svelte"` condition in package.json
- Naming: `@dashboard-builder/{name}` scope, `workspace:*` protocol
- `apps/web` renamed to `@dashboard-builder/web`

### Dependency graph (packages only)
```
platform-core (leaf)
db (leaf, depends on pg)
platform-ui → clsx, tailwind-merge, echarts; peer: svelte
platform-datasets → db, pg
platform-filters → platform-datasets (JsonValue type), platform-ui (cn, Button, Input, Select); peer: svelte
```

## Verification
- `pnpm check` — 0 errors, 0 warnings
- `pnpm build` — success (10.9s)
- `pnpm lint:boundaries` — 3 pre-existing gaps only (fetchDataset.ts, unchanged since ST-4)
- 7 workspace projects recognized by pnpm

## Review Gate

### Findings по severity

**CRITICAL** (исправлено):
- architecture-reviewer: `import { browser } from '$app/environment'` в `packages/platform-filters/src/model/workspace.svelte.ts` — SvelteKit virtual module в reusable package, сломается вне контекста app → заменён на `typeof window !== 'undefined'`

**WARNING** (исправлено):
- architecture-reviewer: orphaned source files в `apps/web/src/lib/entities/filter/model/` и `dataset/model/` без MIGRATION маркеров — dead code, нарушение migration policy → удалены
- code-reviewer: dead duplicate `cn.ts` рядом с shim → удалён
- code-reviewer: dead duplicate `semantic.ts` рядом с shim → удалён
- code-reviewer: `chart/presets.ts` не конвертирован в shim → конвертирован

**INFO** (отмечено):
- code-reviewer + architecture-reviewer: `pg` в platform-datasets redundant рядом с `@dashboard-builder/db` — корректно (postgresProvider использует `pg.types.setTypeParser` напрямую), MVP coupling
- old `.svelte` component files остаются в `apps/web/src/lib/shared/ui/*/` — deep path imports (`$shared/ui/chart/presets`) всё ещё резолвятся через них; будут удалены при полной миграции импортов

### Вердикты ревьюеров
- architecture-reviewer: request changes → исправлено → OK
- code-reviewer: request changes → исправлено → OK
- security-reviewer: не запускался (no runtime behavior change, no new endpoints)
- docs-reviewer: не запускался (docs update deferred to ST-9)
- ui-reviewer: не запускался (no frontend behavior change)

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- commits: `708d9dc` (main extraction), `13aa5f3` (memory update)

## Handoff readiness
- 5 platform packages extracted and working
- ST-7 (EMIS package extraction) is unblocked
- Remaining migration work: emis-contracts, emis-server, emis-ui (ST-7)
- fetchDataset cross-package coupling is a known tech debt — resolve when filter/dataset boundary stabilizes

## Вопросы к lead-strategic
- нет
