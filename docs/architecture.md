# Architecture (compatibility wrapper)

This file is kept so existing links and reading-order references continue to work.

**Canonical whole-repo architecture document is now:**

> [architecture_dashboard_builder.md](./architecture_dashboard_builder.md)

## Summary

`dashboard-builder` is a single-deployable SvelteKit 2 modular monolith organized as a pnpm workspace monorepo (`apps/web` + 8 packages in `packages/`). It hosts three domain contours -- platform/shared foundation, BI/read-side analytics (Wildberries, Strategy/BSC, EMIS BI), and EMIS operational (CRUD, map, search, ingestion) -- with server-side alerts. Two canonical execution paths: BI dataset path (`fetchDataset -> compileDataset -> IR -> Provider`) and EMIS operational path (`routes/api/emis -> emis-server modules -> PostgreSQL/PostGIS`).

For the full architecture contract -- topology, package map, execution paths, dependency rules, contract surfaces, deployment model, and verification hooks -- read [architecture_dashboard_builder.md](./architecture_dashboard_builder.md).
