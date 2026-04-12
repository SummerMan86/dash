# @dashboard-builder/db

Leaf infrastructure package: PostgreSQL connection pool singleton.

## Structure

```
src/
  pg.ts       — getPgPool(): lazy Pool singleton from DATABASE_URL
  index.ts    — public re-export
```

## Dependencies

- `pg` (runtime)
- No other workspace dependencies (leaf package)

## Rules

- This is a leaf infrastructure package. It must NOT import from any other workspace package.
- No domain logic, no SQL queries, no schema definitions — only connection management.
- All consumers import `getPgPool()` and run their own queries.
- `DATABASE_URL` env var is required at runtime; the pool throws if it is not set.

## Consumers

- `@dashboard-builder/platform-datasets` — postgresProvider uses the pool for BI dataset queries
- `@dashboard-builder/emis-server` — EMIS backend modules use the pool for operational queries
- `apps/web/src/lib/server/alerts/` — alert scheduler uses the pool

## What NOT to put here

- SQL schemas or migrations — those live in `db/` (root level)
- Query builders or ORM abstractions — consumers write plain SQL
- Connection config beyond `DATABASE_URL` — keep it minimal for now
