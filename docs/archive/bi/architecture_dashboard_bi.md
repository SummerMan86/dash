# Architecture: Dashboard / BI Vertical

Archived pre-refactor BI architecture.
Historical context only; this file is not source of truth for active BI work.
Current BI architecture lives in [../../bi/architecture.md](../../bi/architecture.md).
Completed rollout sequencing lives in [bi_refactor_rollout.md](./bi_refactor_rollout.md).

BI-specific architecture for dashboard-builder. Current-state only.
For repo-wide foundation see [../../architecture.md](../../architecture.md).

## Scope
- Covers: dataset IR path, providers, filters, widgets, DWH integrations, extension points for Oracle/CubeJS
- Does not cover: EMIS operational paths (see [../../emis/architecture.md](../../emis/architecture.md)), repo-wide rules (see [../../architecture.md](../../architecture.md))

## 1. BI Dataset Path

```
Widget
  -> fetchDataset({ id, params })          [client: $shared/api/fetchDataset.ts]
  -> POST /api/datasets/:id                [route: apps/web/src/routes/api/datasets/[id]/+server.ts]
  -> compileDataset(datasetId, query)       [packages/platform-datasets/src/server/compile.ts]
  -> DatasetIr                              [typed AST, packages/platform-datasets/src/model/ir.ts]
  -> Provider.execute(ir, ctx)              [postgresProvider or mockProvider]
  -> DatasetResponse                        [returned to widget as JSON]
```

Provider routing: `wildberries.*`, `emis.*`, `strategy.*` prefixes route to `postgresProvider`. Everything else routes to `mockProvider` (fixtures in `$shared/fixtures/`).

Filter integration: `fetchDataset` calls `planFiltersForDataset()` to split filters into server params (become WHERE clauses via IR) and client-side matchers (applied post-fetch).

Dataset compiler routing in `compile.ts` dispatches to domain-specific definition modules: `paymentAnalytics`, `wildberriesOfficeDay`, `wildberriesProductPeriod`, `emisMart`, `strategyMart`.

## 2. Alert / Scheduler Path

```
hooks.server.ts (on boot)
  -> startAlertScheduler()                  [apps/web/src/lib/server/alerts/services/alertScheduler.ts]
  -> node-cron job (configurable schedule)
  -> processAlerts()                        [alertProcessor.ts]
  -> conditionEvaluator: SQL condition -> pg
  -> telegramChannel: send notification
  -> alertHistoryRepository: record result
```

Distributed lock via `alerts.scheduler_locks` prevents duplicate runs across instances. Scheduler disables itself gracefully if the alerts schema is not applied.

## 3. Wildberries Price Proxy

```
Client
  -> POST /api/wb/prices                    [apps/web/src/routes/api/wb/prices/+server.ts]
  -> server-side fetch to WB Prices API     [discounts-prices.wb.ru]
  -> proxied response
```

Keeps `WB_API_TOKEN` server-side. No dataset/IR involvement.

## 4. Data / Storage Ownership (BI-relevant)

### App-owned schemas

| Schema | Purpose | Key objects |
|---|---|---|
| `mart` | Published BI-facing views | `emis_news_flat`, `emis_object_news_facts`, `emis_objects_dim`, `emis_ship_route_vessels` |
| `alerts` | Alert rules, recipients, history, locks | `rules`, `recipients`, `rule_recipients`, `history`, `scheduler_locks` |

Snapshot-first management: `db/current_schema.sql` is the active DDL truth; changes tracked in `db/applied_changes.md`; live deltas in `db/pending_changes.sql`.

### External: Wildberries DWH (`mart_marketplace`)

Managed by external DWH team. Tables: `fact_product_office_day`, `fact_product_day`. View: `v_product_office_day`. Consumed via `postgresProvider` mappings. DDL contract in `../../apps/web/src/routes/dashboard/wildberries/dwh_for_wildberries_requirements.md`.

### External: Strategy DWH (`mart_strategy`)

Published views (`slobi_*`) managed by external `agent_pack`. App reads through `postgresProvider` dataset definitions. Local app does not own DDL.

## 5. Client/Server Contract Surfaces (BI-relevant)

| Contract | Location | Direction | Purpose |
|---|---|---|---|
| `DatasetQuery` / `DatasetResponse` | `platform-datasets/src/model/contract.ts` | Client -> Server -> Client | Versioned BI data contract. UI sends query, server returns typed rows |
| `DatasetIr` (`SelectIr`) | `platform-datasets/src/model/ir.ts` | Server-internal | Typed relational AST: select, where, groupBy, orderBy, limit. Never crosses HTTP boundary |
| `Provider` interface | `platform-datasets/src/model/ports.ts` | Server-internal | `execute(ir, ctx) -> DatasetResponse`. Adapters: `postgresProvider`, `mockProvider` |
| `ServerContext` | `platform-datasets/src/model/ports.ts` | Server-internal | `tenantId`, `userId`, `scopes`. Derived from auth, not from client |
| `FilterSpec` / `FilterPlan` | `platform-filters/src/model/types.ts`, `planner.ts` | Client + Server | Declarative filter definitions. Planner splits into server params + client matchers |
| Route/BFF boundary | `apps/web/src/routes/api/` | HTTP | Routes are thin transport. Business logic lives in packages or `src/lib/server/` |

## 6. Extension Points

### Provider interface

`Provider.execute(ir, ctx)` is the primary extension point for new data backends. Current implementations: `postgresProvider` (production), `mockProvider` (fixtures). The interface supports Oracle, CubeJS, or any backend that can interpret `DatasetIr`.

### IR capability policy

`DatasetIr` currently supports: `select`, `where` (with `col`, `lit`, `bin`, `and`, `or`, `not`, `call`), `groupBy`, `orderBy`, `limit`. Known limitation: `call()` aggregations and `groupBy` throw in `postgresProvider` (MVP limitation). New IR node kinds can be added to `IrExpr` union.

### Dataset definitions

New dataset: add a definition module in `platform-datasets/src/server/definitions/`, register in `compile.ts`, add relation mapping in `postgresProvider`.

## Read Next

- [../../architecture.md](../../architecture.md) — repo-wide foundation, package map, import rules
- [../../emis/architecture.md](../../emis/architecture.md) — EMIS operational vertical
- [../../bi/architecture.md](../../bi/architecture.md) — current BI architecture
