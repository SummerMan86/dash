# entities/dataset — Domain contracts & IR

## Purpose
Core domain types for the data layer. No side effects, no I/O. Imported by both client and server.

## Key files
| File | Role |
|------|------|
| `model/contract.ts` | `DatasetQuery`, `DatasetResponse`, `DatasetField` — HTTP contract between UI and BFF |
| `model/ir.ts` | `DatasetIr` (SelectIr) + `ir.*` builder helpers — DB-agnostic AST |
| `model/ports.ts` | `Provider` interface + `ServerContext` — adapter port for server providers |
| `index.ts` | Re-exports everything above |

## Types at a glance

```ts
// UI sends this
DatasetQuery = { contractVersion: 'v1', filters?, params? }

// BFF returns this
DatasetResponse = { contractVersion: 'v1', datasetId, fields, rows, meta? }

// Server compiles query into this (then provider executes it)
DatasetIr = SelectIr = { kind: 'select', from, select, where?, groupBy?, orderBy?, limit? }

// Provider interface (ports.ts)
Provider.execute(ir: DatasetIr, ctx: ServerContext): Promise<DatasetResponse>
```

## IR builder helpers (`ir.*`)
```ts
ir.col('dt')                     // column reference
ir.lit('2024-01-01')             // literal value (always parameterized in SQL)
ir.eq(ir.col('nm_id'), ir.lit(123))
ir.gte / ir.lte / ir.inList
ir.and([...]) / ir.or([...]) / ir.not(...)
ir.call('sum', [ir.col('stock_count')])  // NOTE: call() throws in postgresProvider MVP
```

## Rules
- UI code must NEVER import IR directly — only `DatasetQuery`/`DatasetResponse`
- `entities/dataset` imports nothing from features/server/widgets
- `contractVersion` must always be `CONTRACT_VERSION` ('v1')
- `ServerContext` (tenant/user) comes from server auth — NEVER from DatasetQuery
