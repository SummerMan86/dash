# EMIS Server Rules

> **Migration note (ST-7):** This directory now contains only `// MIGRATION` re-export shims.
> Canonical server code lives in `packages/emis-server/`. New code goes there directly.
> Entity contracts live in `packages/emis-contracts/`.

`src/lib/server/emis/` - compatibility shim layer for EMIS server imports.

Runtime contract: `infra/RUNTIME_CONTRACT.md` (still here, source of truth for runtime conventions).

## Правило по архитектуре

EMIS встраивается в текущий проект как package-owned operational contour внутри modular monolith:

- `packages/emis-contracts/` - контракты, DTO, Zod schemas
- `packages/emis-server/src/infra/*` - server infrastructure helpers
- `packages/emis-server/src/modules/*` - semantic backend modules
- `routes/api/emis/*` - тонкий HTTP transport (stays in app)
- `routes/emis/*` - UI/workspace слой (stays in app)

То есть server-side код не нужно пытаться искусственно запихнуть в `features/` или `widgets/`.

## Правила разработки

- в `routes/api/emis/*` не писать SQL
- в `modules/*/service.ts` не писать HTTP-логику
- в `modules/*/repository.ts` не писать Svelte/UI-код
- read scenarios держать в `modules/*/queries.ts`
- write scenarios держать в `modules/*/service.ts`
- все SQL-запросы только параметризованные
- текущую структуру БД читать по `db/current_schema.sql`
- schema change фиксировать обновлением `db/current_schema.sql` и `db/applied_changes.md`
- если live DB нужен промежуточный delta before next snapshot export, использовать `db/pending_changes.sql`
- после каждого завершенного этапа делать локальный git commit
