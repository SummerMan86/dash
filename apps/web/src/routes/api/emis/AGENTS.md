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

`routes/api/emis/* -> $entities/emis-* + $lib/server/emis/infra/* + $lib/server/emis/modules/*`

Это должен быть тонкий слой над server namespace.

## Runtime contract

See `src/lib/server/emis/infra/RUNTIME_CONTRACT.md` for canonical conventions:
limits, error shape, meta format, sort defaults, parameter parsing rules.
