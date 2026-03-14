# EMIS Server Rules

`src/lib/server/emis/` - server-only namespace для EMIS.

Это место для:

- repositories
- services
- queries
- transport helpers

## Правило по архитектуре

EMIS встраивается в текущий проект как адаптированный FSD:

- `entities/emis-*` - контракты, DTO, Zod schemas
- `server/emis/*` - write/query backend logic
- `routes/api/emis/*` - тонкий HTTP transport
- `routes/emis/*` - UI/workspace слой

То есть server-side код не нужно пытаться искусственно запихнуть в `features/` или `widgets/`.

## Правила разработки

- в `routes/api/emis/*` не писать SQL
- в `services/*` не писать HTTP-логику
- в `repositories/*` не писать Svelte/UI-код
- read scenarios держать в `queries/*`
- write scenarios держать в `services/*`
- все SQL-запросы только параметризованные
- все изменения схемы только через `db/migrations/*`
- после каждого завершенного этапа делать локальный git commit
