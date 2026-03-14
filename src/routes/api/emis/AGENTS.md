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

`routes/api/emis/* -> $entities/emis-* + $lib/server/emis/*`

Это должен быть тонкий слой над server namespace.
