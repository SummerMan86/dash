# Architecture: Dashboard / BI Vertical -- Target State

Target-state architecture for the BI vertical. This is a design doc, not current state.
For current state see [architecture_dashboard_bi.md](./architecture_dashboard_bi.md).

## Scope

- Covers: target provider model, target filter contract, IR capability policy, Oracle/CubeJS extension path
- Does not cover: EMIS operational paths, repo-wide rules, implementation timeline

---

## 1. Target Provider Model

### Problem (current state)

- `compile.ts` is a manual switch over dataset family enums -- adding a dataset family requires editing the central switch.
- `+server.ts` routes to providers by prefix (`wildberries.*` / `emis.*` / `strategy.*` -> postgres, everything else -> mock).
- `postgresProvider` contains both the SQL builder AND the full dataset catalog (`DATASETS` record with ~300 lines of column mappings).

### Target: Dataset Registry with Pluggable Providers

Provider selection moves from ad-hoc prefix checks to a **dataset registry** -- a static lookup table where each dataset declares its compiler, backend, source metadata, and capability profile.

```
DatasetRegistryEntry = {
  datasetId:          DatasetId
  compile:            (query: DatasetQuery) => DatasetIr
  backendKind:        'postgres' | 'oracle' | 'cube' | 'mock'
  sourceMetadata:     { schema: string; table: string; columns: Record<string, ColumnType> }
  capabilityProfile:  CapabilityProfile
}
```

`CapabilityProfile` declares what IR features a provider supports for this dataset:

```
CapabilityProfile = {
  supportsOrderBy:   boolean
  supportsLimit:     boolean
  maxLimit?:         number
}
```

**Provider interface stays unchanged**: `Provider.execute(ir, ctx) -> DatasetResponse`. The change is entirely in how the route handler picks the provider and validates IR against capabilities.

**Route handler becomes thin**:

```
POST /api/datasets/:id
  1. entry = registry.get(datasetId)       // O(1) lookup
  2. ir = entry.compile(query)             // dataset-specific compiler
  3. validate ir against entry.capabilityProfile
  4. provider = providers[entry.backendKind]
  5. response = provider.execute(ir, ctx)
```

**Registration is static code** -- each dataset family has a definition module that exports its entries, and the registry is assembled at import time (no dynamic discovery, no runtime plugin loading).

---

## 2. Target Filter Contract

### Problem (current state)

- `fetchDataset` merges three filter sources: legacy `getFilterSnapshot()`, planner-produced `serverParams`, and explicit `args.filters` overrides -- layered with spread semantics.
- `DatasetQuery` carries both `.filters` and `.params`, with no clear boundary between planner-produced server params and legacy filter state.
- Compilers receive ad-hoc string keys from the merged bag, not typed params.

### Target: One Canonical Wire Contract

**Canonical path**:

```
FilterSpec
  -> planFiltersForDataset(datasetId, filterValues, runtimeCtx)
  -> FilterPlan { serverParams, clientFilterFn }
  -> serverParams become DatasetQuery.params entries
```

**Rules**:

- `fetchDataset` sends ONLY planner-produced `serverParams` plus widget-specific `params`. No implicit legacy merge.
- `DatasetQuery.filters` field: deprecated. Kept for backward compat during migration but ignored by new compilers. `DatasetQuery.params` is the single canonical input bag.
- Compilers receive clean, typed params -- date ranges as `{ dateFrom: string, dateTo: string }`, multi-selects as `string[]`, etc.
- Legacy `FilterState` adapter: allowed as a thin wrapper OUTSIDE the canonical path (e.g. in old widgets that haven't migrated) -- it calls `planFiltersForDataset` internally and produces the same `serverParams`.

---

## 3. IR Capability Policy

### Problem (current state)

- `SelectIr` declares `groupBy` and `call()` in its type, but `postgresProvider` throws on both.
- This creates false promises: a definition module can compile IR that no provider can execute.

### Target: Read-Model Fetch Contract

`SelectIr` stays as the **read-model fetch contract**: SELECT columns FROM source WHERE filters ORDER BY limit.

- `groupBy` and `call()` are removed from `SelectIr`. They are not part of the read-model contract.
- Client-side reshaping (aggregation, pivoting, computed columns) is the BI widget's responsibility for the current generation.
- Aggregation is NOT part of `SelectIr` or `CapabilityProfile`. If needed in the future, it belongs to a separate analytical IR type and execution path.

**Future analytical query layer** (if needed):

- Separate IR type (`AnalyticalIr` or similar) with its own execution path.
- NOT an extension of `SelectIr` -- a distinct contract with distinct providers.
- Decision rationale: keeping `SelectIr` honest prevents false promises to new providers and keeps compilers simple.

---

## 4. Oracle / CubeJS Extension Path

All extension follows **static code registration**, not a runtime plugin system.

### Adding a new provider (e.g. Oracle)

1. Implement the `Provider` interface (`execute(ir, ctx) -> DatasetResponse`).
2. Handle its own SQL dialect inside the provider (Oracle SQL builder, bind variables, connection pooling).
3. Register the provider under a `backendKind` key (e.g. `'oracle'`).

### Adding a new dataset family

1. Create a definition module exporting `DatasetRegistryEntry[]`.
2. Each entry declares `backendKind`, `sourceMetadata`, `capabilityProfile`, and a `compile` function.
3. Import and spread entries into the central registry at build time.

### CubeJS path

CubeJS can enter as either:

- **A provider**: translates `SelectIr` into Cube.js REST/SQL queries, returns `DatasetResponse`. Registered under `backendKind: 'cube'`.
- **A data source with its own definition modules**: Cube semantic layer handles query planning, and definition modules emit IR that maps to Cube dimensions/measures.

Both approaches use the same registry and provider interface. Choice depends on whether CubeJS owns the query semantics or just acts as an execution backend.

### No dynamic loading

- No plugin discovery at runtime.
- No dynamic `import()` of providers.
- Registration happens at module import time -- the registry is fully known at build.

---

## 5. Migration Strategy (high-level)

Incremental path from current state to target, each step additive:

1. **Introduce dataset registry alongside `compile.ts`** -- new `DatasetRegistry` module, existing datasets registered in it, `compile.ts` delegates to registry for registered datasets, falls back to current switch for unregistered ones.
2. **Migrate dataset families one by one** -- move `paymentAnalytics`, `wildberriesOfficeDay`, `wildberriesProductPeriod`, `emisMart`, `strategyMart` into registry entries. Each migration is a standalone commit.
3. **Move SQL mappings out of `postgresProvider`** -- `sourceMetadata` lives in registry entries, `postgresProvider` receives it via the entry, not from its internal `DATASETS` record.
4. **Change route handler to use registry** -- replace `isPostgresDataset()` prefix check with `registry.get(id).backendKind`.
5. **Remove legacy filter merge from `fetchDataset`** -- drop `getFilterSnapshot()` call, send only planner-produced params. Deprecate `DatasetQuery.filters`.
6. **Narrow IR** -- remove `groupBy` and `call()` from `SelectIr` type. Hard removal, no capability gate.
7. **Add first non-Postgres provider** -- Oracle or CubeJS, proving the registry + provider interface works end-to-end.

---

## 6. Read Next

- [architecture_dashboard_bi.md](./architecture_dashboard_bi.md) -- current state
- [architecture.md](./architecture.md) -- repo-wide foundation
