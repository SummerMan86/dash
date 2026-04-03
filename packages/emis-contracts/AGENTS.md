# @dashboard-builder/emis-contracts

EMIS entity types, Zod validation schemas и shared DTO.

## Структура

Каждая entity — отдельный subpath export:

| Subpath | Содержимое |
|---|---|
| `./emis-geo` | `EmisPointGeometry`, `pointGeometrySchema` |
| `./emis-dictionary` | `EmisCountry`, `EmisObjectType`, `EmisSource` |
| `./emis-news` | news summary/detail types, create/update/list schemas |
| `./emis-object` | object summary/detail types, create/update/list schemas |
| `./emis-link` | news-object link types, attach/update schemas |
| `./emis-ship-route` | vessel/point/segment types, list query schemas |
| `./emis-map` | map config/feature/query types, bbox/filter schemas |

## Внутренние зависимости

`emis-news` и `emis-object` импортируют `EmisPointGeometry` из `emis-geo` через relative path (`../../emis-geo`).

## Правила

- Только types и Zod schemas. Никакой runtime-логики, server code или UI.
- Новые entity — новый subpath в `src/` + запись в `package.json` exports.
- Внешние deps: только `zod`.
- Compatibility shims в `apps/web/src/lib/entities/emis-*/` re-exportят из этого пакета.
