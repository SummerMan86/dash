# Entities Navigation

`src/lib/entities/` сейчас состоит не из большого набора бизнес-доменов, а в первую очередь из двух реально используемых platform-подсистем:

- `dataset/`
- `filter/`

Также есть:

- `charts/` — re-export from `@dashboard-builder/platform-ui/chart/presets`
- `emis-*` — MIGRATION re-exports from `@dashboard-builder/emis-contracts`

## Что здесь важно

### `dataset/`

Это core contract layer для data/BFF контура:

- `DatasetQuery`
- `DatasetResponse`
- `DatasetIr`
- provider ports

Если нужно понять, как UI общается с сервером по датасетам, начинай отсюда.

Есть локальный документ:

- `dataset/AGENTS.md`

### `filter/`

Это декларативная система фильтров:

- specs
- registry
- store
- planner
- serialization

Если нужно понять, как фильтры синхронизируются между страницами и запросами, читай это сразу после `dataset/`.

Есть локальный документ:

- `filter/AGENTS.md`

### `charts/`

Это вспомогательный presentation layer:

- chart presets
- series builders

Полезно для визуализации, но это не data contract слой.

### `emis-*`

MIGRATION re-exports from `@dashboard-builder/emis-contracts`.
Canonical code lives in `packages/emis-contracts/`.
No new code should be added here — use the package directly.

## Порядок чтения

1. `dataset/AGENTS.md`
2. `dataset/model/*`
3. `filter/AGENTS.md`
4. `filter/model/*`
5. `charts/*`

## На что обратить внимание

- `dataset/` и `filter/` — MIGRATION re-exports from `platform-datasets` / `platform-filters`
- `emis-*` — MIGRATION re-exports from `emis-contracts`
- `charts/` — re-export from `platform-ui`
- All entity files here are compatibility shims. Canonical code lives in `packages/`.
- These shims will be removed when all consumers migrate to direct package imports (ST-10 cleanup candidate).
