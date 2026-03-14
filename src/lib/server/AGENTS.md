# Server Layer Navigation

`src/lib/server/` - server-only часть проекта. Здесь находится BFF, DB access и фоновые задачи.

Есть локальные документы:

- `CLAUDE.md`
- `alerts/CLAUDE.md`

## Основные зоны

### `datasets/`

Routing layer для dataset definitions.

Ключевая роль:

- по `datasetId` выбрать compile function;
- собрать `DatasetIr` из `DatasetQuery`.

Это точка входа в read/query pipeline.

### `providers/`

Исполнители IR:

- `mockProvider.ts`
- `postgresProvider.ts`

Это bridge между абстрактным контрактом датасета и конкретным источником данных.

### `db/`

Низкоуровневый PostgreSQL access.

### `alerts/`

Отдельный server-side модуль:

- repositories
- services
- channels
- scheduler
- SQL schema

Это уже не просто helper, а почти самостоятельная подсистема.

### `emis/`

Новый server-only namespace для EMIS.

Содержит:

- `repositories/`
- `services/`
- `queries/`
- `sql/`
- transport helpers и errors

Это правильное место для EMIS backend-логики в текущей архитектуре проекта.

## Как читать server layer

Если интересует BFF:

1. `CLAUDE.md`
2. `datasets/compile.ts`
3. `datasets/definitions/*`
4. `providers/*`
5. `../../routes/api/datasets/[id]/+server.ts`

Если интересует alerting:

1. `alerts/CLAUDE.md`
2. `alerts/index.ts`
3. `alerts/services/*`
4. `alerts/repository/*`
5. `../hooks.server.ts`

## На что обратить внимание

- `server/` сейчас в основном ориентирован на read/query flows.
- Для EMIS write side и query side должны развиваться в `server/emis`, а не размазываться по существующим BI/BFF модулям.
- В `hooks.server.ts` есть boot-side effect для alerts scheduler; это важно помнить при изменении server lifecycle.
