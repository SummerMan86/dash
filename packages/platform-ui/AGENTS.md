# @dashboard-builder/platform-ui

Reusable UI primitives, ECharts chart presets, and generic component-level styling contracts.

No domain knowledge. No EMIS, Wildberries, or Strategy awareness.

## Structure

```
src/
  badge/          button/         card/            chart/
  chart-card/     data-table/     input/           metric-card/
  progress-bar/   progress-circle/ select/         sidebar/
  skeleton/       sparkline/      stat-card/
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
- App-level global token CSS and the design-system guide live in `apps/web/src/lib/shared/styles/` today and are planned to move to `apps/web/src/lib/styles/` during the app-local refactor wave. This package should not depend on those app-owned files.
- If a token, preset, or styling contract becomes reusable beyond the app shell, then it can be promoted into `platform-ui` in a package-safe form.
- New components should follow existing patterns: default export from component directory with `index.ts` barrel.
