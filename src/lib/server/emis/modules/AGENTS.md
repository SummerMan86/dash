# EMIS Semantic Modules

`src/lib/server/emis/modules/` - семантический backend-слой EMIS.

Здесь код группируется по доменным модулям, а не по техническим папкам верхнего уровня.

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
