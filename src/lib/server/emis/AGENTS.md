# EMIS Server Rules

`src/lib/server/emis/` - server-only namespace для EMIS.

Это место для:

- `infra/`
- `modules/`
- transport helpers и server rules

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
- все изменения схемы только через `db/migrations/*`
- после каждого завершенного этапа делать локальный git commit
