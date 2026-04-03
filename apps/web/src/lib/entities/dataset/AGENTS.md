# Dataset Contracts & IR

`src/lib/entities/dataset/` - core contract layer для dataset-backed BI/read-side.
Это чистый domain/contracts namespace без I/O и side effects.

## Purpose

- хранить HTTP contract между UI и BFF
- хранить DB-agnostic IR
- хранить provider ports для server providers

UI и server могут импортировать эти типы, но модуль сам не должен зависеть от `features/`, `widgets/` или `server/`.

## Key files

| File                | Role                                              |
| ------------------- | ------------------------------------------------- |
| `model/contract.ts` | `DatasetQuery`, `DatasetResponse`, `DatasetField` |
| `model/ir.ts`       | `DatasetIr` / `SelectIr` и `ir.*` builder helpers |
| `model/ports.ts`    | `Provider` interface и `ServerContext`            |
| `index.ts`          | public re-exports                                 |

## Types at a glance

```ts
DatasetQuery = { contractVersion: 'v1', filters?, params? }

DatasetResponse = { contractVersion: 'v1', datasetId, fields, rows, meta? }

DatasetIr = SelectIr = {
  kind: 'select',
  from,
  select,
  where?,
  groupBy?,
  orderBy?,
  limit?
}

Provider.execute(ir: DatasetIr, ctx: ServerContext): Promise<DatasetResponse>
```

## IR builder helpers

```ts
ir.col('dt')
ir.lit('2024-01-01')
ir.eq(ir.col('nm_id'), ir.lit(123))
ir.gte(...)
ir.lte(...)
ir.inList(...)
ir.and([...])
ir.or([...])
ir.not(...)
ir.call('sum', [ir.col('stock_count')])
```

`call()` существует в IR, но в текущем `postgresProvider` MVP по-прежнему ограничен.

## Rules

- UI code не должно импортировать IR напрямую; для UI boundary использовать `DatasetQuery` / `DatasetResponse`
- `entities/dataset` не должен импортировать код из `features/`, `widgets/` или `server/`
- `contractVersion` всегда должен быть `CONTRACT_VERSION` (`'v1'`)
- `ServerContext` приходит из server auth / runtime, а не из `DatasetQuery`

## When to read this folder

- когда нужно понять dataset-backed BI/read-side contract
- когда нужно добавить новый dataset compiler или provider
- когда нужно проверить shape `DatasetResponse.meta`
