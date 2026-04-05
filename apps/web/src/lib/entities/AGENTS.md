# Entities Navigation

`src/lib/entities/` is now empty of shim re-exports.

All MIGRATION re-export shims (`dataset/`, `filter/`, `charts/`, `emis-*`) were removed in TD-2.
Consumers now import directly from packages:

- `@dashboard-builder/platform-datasets` (was `$entities/dataset`)
- `@dashboard-builder/platform-filters` (was `$entities/filter`)
- `@dashboard-builder/platform-ui` (was `$entities/charts`)
- `@dashboard-builder/emis-contracts/*` (was `$entities/emis-*`)
