# Dataset Layer Navigation

`src/lib/server/datasets/` - routing layer для dataset definitions.

Здесь решается, какой compiler обрабатывает конкретный `datasetId`.

## Основные файлы

- `compile.ts` - центральный registry/dispatcher
- `definitions/` - доменные dataset compilers

## Что важно

Legacy strategy v1 по-прежнему архивный, но current runtime снова использует namespace
`strategy.*` для нового app-facing strategy/BSC slice.

Этот namespace больше не означает старый `strategy-drive`.
Теперь он означает dashboard-ready datasets поверх published views:

- `strategy.entity_overview`
- `strategy.scorecard_overview`
- `strategy.performance_detail`
- `strategy.cascade_detail`

Источник данных для них:

- `mart_strategy.slobi_*`

## Практические правила

- dataset compiler должен оставаться flat/filterable и опираться на `mart`, а не собирать тяжелую аналитику в runtime.
- новый strategy dashboard сначала ищет подходящий существующий grain;
- если grain новый, сначала публикуется новый `slobi_*` view, потом добавляется dataset compiler;
- `entity_overview` должен оставаться `one row = one entity`, иначе UI начинает тормозить на client-side переагрегации.
