# @dashboard-builder/platform-filters

Filter specification, planning, registry, store, and filter UI widgets. FSD-compatible package used by all dashboard workspaces.

## Structure

```
src/
  model/
    types.ts             — FilterSpec, FilterPlan, FilterScope types
    planner.ts           — planFiltersForDataset (splits filters into server/client)
    registry.ts          — filter registry (spec lookup by id)
    store.svelte.ts      — filter store (Svelte stores + runes)
    workspace.svelte.ts  — workspace-scoped filter state
    serialization.ts     — filter state serialization/deserialization
    planner.test.ts      — planner unit tests
  widgets/               — filter UI widgets (select, date-range, etc.)
  index.ts               — public re-exports
```

## Dependencies

- `@dashboard-builder/platform-core` — shared types
- `@dashboard-builder/platform-ui` — UI primitives for filter widgets
- `@dashboard-builder/platform-datasets` — dataset types for planner integration
- Svelte (peer)

## Rules

- Filter planner is a pure function — keep it testable with no side effects.
- This package must NOT import from `emis-*`, `bi-*`, or `apps/web`.
- Domain-specific filter specs (strategy filters, EMIS filters) are defined in their respective route modules, not here.
- Filter store uses Svelte 4 writable/derived (intentional for server/module compatibility).
