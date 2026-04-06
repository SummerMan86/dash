# @dashboard-builder/emis-server

EMIS server-side business logic: infra helpers и domain modules.

## Структура

```
src/
  infra/          — server infrastructure
    db.ts           getDb(), withTransaction() — PostgreSQL access via @dashboard-builder/db
    errors.ts       EmisError class
    http.ts         request parsing, list helpers, clampPageSize/clampMapLimit (framework-agnostic only)
    audit.ts        audit logging, write context resolution
    mapConfig.ts    map configuration assembly (env + PMTiles status)
    pmtilesBundle.ts  offline PMTiles asset detection
    pmtilesSpike.ts   PMTiles diagnostics
  modules/        — domain backend modules
    news/           queries, repository, service
    objects/        queries, repository, service
    links/          repository, service
    dictionaries/   repository (read-only reference data)
    map/            queries (GeoJSON feature collections)
    ship-routes/    queries (vessel/point/segment)
    ingestion/      service, matchEngine, queries, repository
      adapters/     types, osmAdapter, gemAdapter, registry
```

## Паттерн модуля

- `queries.ts` — read scenarios (SELECT, возвращает typed results)
- `repository.ts` — write scenarios (INSERT/UPDATE/DELETE, parameterized SQL)
- `service.ts` — business logic (transactions, validation, audit)

## Правила

- Все SQL-запросы только параметризованные (`$1`, `$2`, ...).
- Не писать HTTP-логику в `service.ts`.
- Не писать SQL в route handlers (те остаются в `apps/web/src/routes/api/emis/`).
- Deps: `emis-contracts`, `db`, `zod`; peers: `pg`.
- Most legacy shims в `apps/web/src/lib/server/emis/` re-exportят из этого пакета.
- App-owned exception: `apps/web/src/lib/server/emis/infra/http.ts` — SvelteKit transport glue, не shim.
- Direct-import exception: `mapConfig` shim удален; consumers импортируют `@dashboard-builder/emis-server/infra/mapConfig` напрямую.

## Transport ownership

- This package is **framework-agnostic**: no SvelteKit imports, no HTTP response construction.
- SvelteKit transport glue (`handleEmisRoute`, `jsonEmisList`, `jsonEmisError`) lives in the app layer: `apps/web/src/lib/server/emis/infra/http.ts`.
- `audit.ts` uses standard Web API `Request` — already framework-agnostic, no coupling.
