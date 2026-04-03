# Server Layer Navigation

`src/lib/server/` - server-only часть проекта. Здесь находятся:

- dataset/BFF layer для BI/read-side
- DB access
- alert scheduler
- отдельный EMIS server namespace

Важно: generic `server/` предназначен в первую очередь для BI/read-side contracts.
Новый EMIS operational backend по умолчанию должен жить в `src/lib/server/emis/`, а не наращивать dataset/IR слой.

## Structure

```text
server/
├── datasets/
│   ├── compile.ts
│   └── definitions/
├── providers/
│   ├── mockProvider.ts
│   └── postgresProvider.ts
├── db/
│   └── pg.ts
├── alerts/
└── emis/
```

## Локальные документы

- `datasets/AGENTS.md`
- `datasets/definitions/AGENTS.md`
- `providers/AGENTS.md`
- `alerts/AGENTS.md`
- `emis/AGENTS.md`

## Основные зоны

### `datasets/`

Routing layer для dataset definitions:

- по `datasetId` выбирает compile function
- собирает `DatasetIr` из `DatasetQuery`

Это точка входа в BFF/read/query pipeline.

### `providers/`

Исполнители IR:

- `mockProvider.ts`
- `postgresProvider.ts`

Это bridge между abstract dataset contract и конкретным data source.

### `db/`

Низкоуровневый PostgreSQL access.

Если задача связана со схемой `strategy`, дополнительно смотреть:

- `../../../db/AGENTS.md`

### `alerts/`

Отдельная server-side подсистема:

- repositories
- services
- channels
- scheduler
- SQL schema

Читать через `alerts/AGENTS.md`.

### `emis/`

Новый server-only namespace для EMIS:

- `infra/`
- `modules/`
- transport helpers и runtime rules

Это правильное место для EMIS backend-логики в текущей архитектуре.

## Adding a new dataset

### Mock

1. Add dataset ID constant in `definitions/your-dataset.ts`
2. Implement `compileYourDataset(id, query): DatasetIr`
3. Add fixture in `shared/fixtures/`
4. Register in `datasets/compile.ts`

### Postgres

1. Do the same steps 1-2
2. Add SQL mapping to `DATASETS` in `providers/postgresProvider.ts`
3. Register in `datasets/compile.ts`
4. Route to `postgresProvider` in `routes/api/datasets/[id]/+server.ts`

## Provider routing

Currently hardcoded:

- stable PostgreSQL-backed BI datasets like `wildberries.*` and `emis.*` read-model ids -> `postgresProvider`
- everything else -> `mockProvider`

Новые EMIS operational flows по умолчанию не нужно гнать через этот слой.

## SQL safety

- all user values -> parameterized placeholders
- all identifiers -> validated via `isSafeIdent()` + quoted
- limit clamped to safe bounds
- advanced IR features like heavy aggregation remain intentionally constrained in MVP provider

## How to read server layer

Если интересует BFF:

1. этот `AGENTS.md`
2. `datasets/AGENTS.md`
3. `datasets/compile.ts`
4. `datasets/definitions/*`
5. `providers/*`
6. `../../routes/api/datasets/[id]/+server.ts`

Если интересует alerting:

1. `alerts/AGENTS.md`
2. `alerts/index.ts`
3. `alerts/services/*`
4. `alerts/repository/*`
5. `../hooks.server.ts`

## На что обратить внимание

- `server/` по-прежнему в основном ориентирован на read/query flows
- EMIS write/query side должны развиваться в `server/emis`
- в `hooks.server.ts` есть boot-side effect для alert scheduler
