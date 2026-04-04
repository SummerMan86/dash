# EMIS Semantic Modules

> **Migration note (ST-7 / H-3):** This directory now contains only `// MIGRATION` re-export shims.
> Canonical module code lives in `packages/emis-server/src/modules/`. New code goes there directly.
> Route handlers import from `@dashboard-builder/emis-server/modules/*`.

`src/lib/server/emis/modules/` - compatibility shim layer для EMIS semantic modules.

## Модули

- `objects/` - реестр объектов
- `news/` - новости
- `links/` - связи news <-> object
- `dictionaries/` - справочники
- `ship-routes/` - operational ship-route queries для workspace

Дальше сюда же логично добавлять:

- `map/`
- `geo/`
- `search/`
- `read-models/`

## Внутреннее правило

Внутри доменного модуля допустимы:

- `repository.ts`
- `service.ts`
- `queries.ts`

Но не обязательно заводить все три файла, если модулю реально нужен только один.

Важно: динамические operational queries вроде ship-route slices лучше держать здесь, а не прятать в `dictionaries/` и не тащить в dataset/IR слой без BI-необходимости.
