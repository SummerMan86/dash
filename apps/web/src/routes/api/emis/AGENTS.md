# EMIS API Rules

`src/routes/api/emis/` - transport layer для EMIS.

## Что здесь допустимо

- разбор request/params/search params
- вызов schema validation
- вызов services/queries
- возврат HTTP response

## Что здесь не должно появляться

- SQL
- бизнес-правила
- PostGIS-логика
- UI/view-model calculations

## Направление зависимостей

New routes MUST import directly from canonical packages:

```
routes/api/emis/* ->
  @dashboard-builder/emis-contracts/*   (schemas, types, zod validators)
  @dashboard-builder/emis-server/*      (modules/*, infra/errors, infra/audit, infra/mapConfig)
  $lib/server/emis/infra/http           (app-owned SvelteKit transport glue)
  @sveltejs/kit                         (json, RequestHandler)
```

Do NOT use legacy shim paths (`$entities/emis-*`, `$lib/server/emis/modules/*`, `$lib/server/emis/infra/errors`, `$lib/server/emis/infra/audit`) in new route code. Those re-export shims exist only for backward compatibility of code outside this directory. The `$lib/server/emis/infra/mapConfig` shim has been deleted; all consumers now import directly from `@dashboard-builder/emis-server/infra/mapConfig`.

Это должен быть тонкий слой над server namespace.

## Transport ownership

SvelteKit transport glue (`handleEmisRoute`, `jsonEmisList`, `jsonEmisError`) is app-owned and lives in `$lib/server/emis/infra/http.ts`, not in `@dashboard-builder/emis-server`.
The package provides only framework-agnostic parsing, validation, constants, and types.

## Runtime contract

See `src/lib/server/emis/infra/RUNTIME_CONTRACT.md` for canonical conventions:
API design rules, limits, error shape, meta format, sort defaults, parameter parsing rules.

For the FE/BE contract entrypoint on errors and logging:

- `docs/emis/operations.md`
