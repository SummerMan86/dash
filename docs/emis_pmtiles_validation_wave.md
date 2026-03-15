# EMIS PMTiles Validation Wave

Этот документ фиксирует временный spike-подход для `PMTiles` без немедленной замены текущего
offline bundle contract.

## 1. Что это значит

Сейчас `PMTiles` рассматривается как **validation wave**, а не как уже принятый production default.

До прохождения валидации сохраняются текущие правила:

- основным safe default остается `pre-extracted static bundle`;
- основной runtime в `/emis` не переключается на `PMTiles`;
- remote PMTiles URL не считаются "true offline" вариантом;
- изменение source-of-truth docs и архитектурного contract допустимо только после прохождения gates.

## 2. Что уже есть в репозитории

Для spike добавлены:

- отдельный маршрут `"/emis/pmtiles-spike"`;
- отдельный PMTiles runtime path, не влияющий на основной `EmisMap`;
- повторяемый CLI probe:

```bash
pnpm map:pmtiles:probe -- --url http://127.0.0.1:4173/emis-map/offline/example.pmtiles
```

Этот probe проверяет:

- `206 Partial Content`;
- `Accept-Ranges: bytes`;
- корректный `Content-Range`;
- малый range-response без скачивания большого файла;
- стабильность `ETag`, если сервер его отдает.

## 3. Как подготовить локальный spike

1. Положить реальный `.pmtiles` файл напрямую в:

```text
static/emis-map/offline/
```

2. Убедиться, что рядом есть локальные:

- `fonts/`
- `sprites/`

3. Поднять приложение через `pnpm dev` или `pnpm preview`.
4. Открыть `/emis/pmtiles-spike`.
5. Прогнать `map:pmtiles:probe` по candidate URL.

Важно: это не меняет текущий install-flow `offline-bundle -> static/emis-map/offline` для
основного runtime. PMTiles spike сейчас живет отдельно, чтобы не ломать текущий contract раньше времени.

## 4. Validation gates

### Gate 1. Node-serving path

Нужно подтвердить:

- `Range` запросы работают;
- сервер отвечает `206`;
- `Content-Range` корректен;
- `Accept-Ranges: bytes` присутствует.

### Gate 2. Browser smoke

Нужно подтвердить:

- `MapLibre + pmtiles.Protocol` реально открывают архив;
- нет style parsing errors;
- нет скачивания всего архива целиком;
- overlay endpoints продолжают рисоваться поверх basemap.

### Gate 3. Offline semantics

Нужно подтвердить:

- локальный `.pmtiles` + локальные `fonts/sprites` переживают сценарий без внешнего интернета;
- remote PMTiles URL не попадают в offline-ready semantics.

### Gate 4. Ops consistency

До архитектурного pivot:

- `pnpm map:assets:status` и `/api/emis/map-config` продолжают жить по текущему contract;
- отдельная PMTiles validation wave не должна подменять эти semantics незаметно.

### Gate 5. Docs + contract switch

Только после прохождения всех gates можно переходить к следующей волне:

- менять `mapConfig`;
- менять основной `EmisMap.svelte`;
- менять `map:assets:*`;
- менять source-of-truth docs под PMTiles contract.
