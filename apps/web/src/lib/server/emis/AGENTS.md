# EMIS Server Rules

`src/lib/server/emis/` - server-only namespace для EMIS.

Это место для:

- `infra/`
- `modules/`
- transport helpers и server rules
- `infra/RUNTIME_CONTRACT.md` как source of truth по runtime conventions

## Правило по архитектуре

EMIS встраивается в текущий проект как адаптированный FSD:

- `entities/emis-*` - контракты, DTO, Zod schemas
- `server/emis/infra/*` - server infrastructure helpers
- `server/emis/modules/*` - semantic backend modules
- `routes/api/emis/*` - тонкий HTTP transport
- `routes/emis/*` - UI/workspace слой

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
