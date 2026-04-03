# Library Layer Navigation

`src/lib/` - это основное внутреннее пространство приложения. Здесь лежат reusable и server-side модули.

## Как мыслить эту папку

- `shared/` - platform shared layer
- `entities/` - контракты и базовые domain primitives
- `features/` - крупные пользовательские функции
- `widgets/` - composite UI widgets
- `server/` - server-only логика, BFF и инфраструктура

## Что читать в первую очередь

1. `shared/AGENTS.md`
2. `entities/AGENTS.md`
3. `server/AGENTS.md`
4. `features/AGENTS.md`
5. `widgets/AGENTS.md`

## Где сейчас центр тяжести

Наиболее зрелые и реально используемые части:

- `shared/`
- `entities/dataset/`
- `entities/filter/`
- `server/`
- `features/dashboard-edit/`
- `widgets/filters/`
- `widgets/stock-alerts/`

## Как сюда встраивается EMIS

Для EMIS в `lib/` фиксируем такую модель:

- `entities/emis-*` - contracts и domain DTO
- `server/emis/infra/*` - backend infrastructure
- `server/emis/modules/*` - semantic backend modules
- будущие client-side feature/widgets EMIS появятся только когда начнется UI-слой workspace и карточек

Это помогает не размывать границу между shared platform и новым доменом.

## Что здесь пока не стоит переоценивать

Внутри `lib/` есть несколько пустых пространств, которые пока не дают архитектурной ценности сами по себе:

- `entities/dashboard/`
- `entities/widget/`
- `features/dashboard-builder/`
- `widgets/chart/`
- `widgets/dashboard-container/`
- `widgets/kpi/`
- `widgets/table/`

Если ищешь рабочий код, начинай не с них.
