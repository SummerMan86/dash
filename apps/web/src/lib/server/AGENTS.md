# Server Layer Navigation

`src/lib/server/` - server-only часть проекта. Здесь находятся:

- dataset/BFF layer для BI/read-side
- DB access
- alert scheduler
- отдельный EMIS server namespace

Важно: generic `server/` предназначен в первую очередь для BI/read-side contracts.
Новый EMIS operational backend по умолчанию должен жить в `packages/emis-server/`, а не наращивать dataset/IR слой. App-level `src/lib/server/emis/` now contains only MIGRATION re-export shims and transport glue (`infra/http.ts`).

## Structure

```text
server/
├── datasets/
│   └── definitions/
├── providers/
│   └── mockProvider.ts
├── alerts/
└── emis/
```

> **P3.6 cleanup (2026-04-04):** `datasets/compile.ts`, `providers/postgresProvider.ts` and `db/pg.ts` were removed.
> Canonical homes: `@dashboard-builder/platform-datasets/server` (compile, postgresProvider) and `@dashboard-builder/db` (pg pool).

## Локальные документы

- `datasets/AGENTS.md`
- `datasets/definitions/AGENTS.md`
- `providers/AGENTS.md`
- `alerts/AGENTS.md`
- `emis/AGENTS.md`

## Основные зоны

### `datasets/`

App-level dataset definitions for the BI/read-side pipeline.

- `definitions/` — app-specific dataset IR definitions (strategy, analytics, etc.)

Canonical compiler routing and provider runtime now live in `@dashboard-builder/platform-datasets/server`.

### `providers/`

App-level provider:

- `mockProvider.ts` — demo/mock execution for non-Postgres datasets

Canonical PostgreSQL provider lives in `@dashboard-builder/platform-datasets/server`.

### `db/` (removed in P3.6)

Low-level PostgreSQL access now lives in `@dashboard-builder/db`.

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

Compatibility shim layer for EMIS server imports. Canonical code lives in `packages/emis-server/`.

What remains here:

- `infra/http.ts` — app-owned SvelteKit transport glue (intentionally stays in app)
- `infra/RUNTIME_CONTRACT.md` — runtime conventions doc
- `modules/` — MIGRATION re-export shims → `packages/emis-server/src/modules/`

New EMIS backend logic goes into `packages/emis-server/`, not here.

## Adding a new dataset

### Mock

1. Add dataset ID constant in `definitions/your-dataset.ts`
2. Implement `compileYourDataset(id, query): DatasetIr`
3. Add fixture in `shared/fixtures/`
4. Register in `packages/platform-datasets/src/server/compile.ts`

### Postgres

1. Do the same steps 1-2
2. Add SQL mapping to `DATASETS` in `packages/platform-datasets/src/server/providers/postgresProvider.ts`
3. Register in `packages/platform-datasets/src/server/compile.ts`
4. Route to `postgresProvider` in `routes/api/datasets/[id]/+server.ts` via direct import from `@dashboard-builder/platform-datasets/server`

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
3. `packages/platform-datasets/src/server/compile.ts` (canonical compiler)
4. `datasets/definitions/*` (app-level definitions)
5. `providers/mockProvider.ts` (app-level mock provider)
6. `../../routes/api/datasets/[id]/+server.ts`

Если интересует alerting:

1. `alerts/AGENTS.md`
2. `alerts/index.ts`
3. `alerts/services/*`
4. `alerts/repository/*`
5. `../hooks.server.ts`

## На что обратить внимание

- `server/` по-прежнему в основном ориентирован на read/query flows
- EMIS write/query side должны развиваться в `packages/emis-server`; app-level `server/emis/` is a compatibility shim layer
- в `hooks.server.ts` есть boot-side effect для alert scheduler
