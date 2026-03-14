# Entities Navigation

`src/lib/entities/` сейчас состоит не из большого набора бизнес-доменов, а в первую очередь из двух реально используемых platform-подсистем:

- `dataset/`
- `filter/`

Также есть:

- `charts/` - набор chart presets и helpers
- `emis-*` - новый набор сущностей и контрактов для EMIS
- пустые заготовки `dashboard/` и `widget/`

## Что здесь важно

### `dataset/`

Это core contract layer для data/BFF контура:

- `DatasetQuery`
- `DatasetResponse`
- `DatasetIr`
- provider ports

Если нужно понять, как UI общается с сервером по датасетам, начинай отсюда.

Есть локальный документ:

- `dataset/CLAUDE.md`

### `filter/`

Это декларативная система фильтров:

- specs
- registry
- store
- planner
- serialization

Если нужно понять, как фильтры синхронизируются между страницами и запросами, читай это сразу после `dataset/`.

Есть локальный документ:

- `filter/CLAUDE.md`

### `charts/`

Это вспомогательный presentation layer:

- chart presets
- series builders

Полезно для визуализации, но это не data contract слой.

### `emis-*`

Это новый доменный contract layer для EMIS.

Здесь должны жить:

- input/output types
- DTO
- geometry contracts
- link contracts
- Zod validation schemas

Здесь не должно быть:

- SQL
- сервисов
- Svelte components
- route-specific logic

## Порядок чтения

1. `dataset/CLAUDE.md`
2. `dataset/model/*`
3. `filter/CLAUDE.md`
4. `filter/model/*`
5. `charts/*`

## На что обратить внимание

- `dataset/` и `filter/` фактически играют роль platform-модулей, а не прикладных доменов.
- Для будущего EMIS именно эти два модуля сейчас важнее всего для read/query части.
- `dashboard/` и `widget/` пока можно игнорировать: рабочего кода там нет.
- для EMIS именно `entities/emis-*` теперь является правильной точкой расширения domain contracts.
