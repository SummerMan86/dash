# @dashboard-builder/platform-ui

Reusable UI primitives, ECharts chart presets, and TailwindCSS design tokens.

No domain knowledge. No EMIS, Wildberries, or Strategy awareness.

## Structure

```
src/
  badge/          button/         card/            chart/
  chart-card/     data-table/     input/           metric-card/
  progress-bar/   progress-circle/ select/         sidebar/
  skeleton/       sparkline/      stat-card/       styles/
  index.ts        — public re-exports
```

## Dependencies

- `@dashboard-builder/platform-core` (via workspace, implicit)
- `clsx`, `tailwind-merge` — class name utilities
- `echarts` — chart rendering
- Svelte (peer)

## Rules

- This package must NOT import from `emis-*`, `platform-datasets`, `platform-filters`, `db`, or `apps/web`.
- Components here are generic primitives. Domain-specific UI (EMIS map, strategy nav) belongs in domain packages or app routes.
- Design tokens live in `src/styles/`. All token changes must be backward-compatible.
- New components should follow existing patterns: default export from component directory with `index.ts` barrel.
