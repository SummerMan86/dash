# EMIS Operations

Текущий ops/runbook документ для EMIS.  
Здесь собраны только те вещи, которые реально нужны для эксплуатации и диагностики:

- readiness и health;
- structured error logging и request correlation;
- offline maps contract;
- runtime и post-deploy проверки.

## 1. Health and readiness

### `GET /api/emis/health`

Назначение:

- быстрый repo/snapshot sanity check;
- без подключения к Postgres;
- стабильный smoke marker.

Этот endpoint проверяет файловую и документационную “собранность” EMIS-контуров, а не runtime connectivity.

### `GET /api/emis/readyz`

Назначение:

- runtime readiness для EMIS.

Минимум, что должно проверяться:

- `DATABASE_URL` задан;
- есть подключение к Postgres;
- доступны схемы `emis`, `stg_emis`, `mart_emis`, `mart`;
- доступны published contracts, которые читает UI/BI.

Ожидаемые статусы:

- `ready` — все критические проверки прошли;
- `not_ready` — хотя бы одна критическая проверка упала.

`readyz` — DB-backed сигнал для deploy/runtime готовности;  
`health` — быстрый файловый сигнал, не заменяющий `readyz`.

## 2. Request correlation and error logging

### 2.1. Request id

Для каждого EMIS request должен существовать `x-request-id`:

- входящий `x-request-id` принимается;
- если заголовка нет — он генерируется на сервере;
- он возвращается в response headers и на success, и на error.

### 2.2. Structured logs

Каждая 4xx/5xx ошибка должна порождать structured JSON log минимум с полями:

- `service`
- `level`
- `requestId`
- `method`
- `path`
- `status`
- `code`
- `durationMs`
- `actorId` — если доступен
- `message` — если нужен для чтения человеком

Принципиально не логируем:

- большие GeoJSON payloads;
- чувствительные данные;
- сырой request body без нормализации.

### 2.3. Canonical home

Единая app-level точка логирования и error boundary должна оставаться в transport glue, а не в `emis-server`.

## 3. Basemap operating modes

EMIS поддерживает три basemap режима:

| Mode | Назначение |
|---|---|
| `online` | использовать remote style |
| `offline` | использовать локальный PMTiles bundle |
| `auto` | стартовать как online, при startup failure переключиться на local PMTiles |

`auto` — production-like default, если есть и online style, и offline bundle.

## 4. Offline-ready bundle

Bundle считается готовым, если в `static/emis-map/offline` присутствуют:

```text
offline/
  *.pmtiles
  sprites/
  fonts/
  manifest.json
```

Готовность должна читаться одинаково в:

- `pnpm map:assets:status`
- `/api/emis/map-config`
- основном EMIS runtime

Если `manifest.json` есть, но повреждён, bundle не считается готовым.

## 5. Core commands

### Status / install / build assets

```bash
pnpm map:assets:status
pnpm map:assets:install -- --source /abs/path/to/offline-bundle
pnpm map:pmtiles:setup
pnpm map:pmtiles:probe -- --url http://127.0.0.1:4173/emis-map/offline/moscow.pmtiles
```

### Smoke checks

```bash
pnpm emis:smoke
pnpm emis:write-smoke
pnpm emis:offline-smoke
pnpm emis:auth-smoke
```

## 6. Map environment variables

| Variable | Purpose |
|---|---|
| `EMIS_MAP_MODE` | `auto`, `online`, `offline` |
| `EMIS_MAP_ONLINE_STYLE_URL` | override remote style URL |
| `EMIS_MAP_STYLE_URL` | style URL override |
| `EMIS_MAPTILER_KEY` | online basemap key |
| `EMIS_MAPTILER_STYLE_ID` | online style id |
| `EMIS_MAP_INITIAL_CENTER` | initial `lon,lat` |
| `EMIS_MAP_INITIAL_ZOOM` | initial zoom |

### Typical scenarios

Production-like:

```env
EMIS_MAP_MODE=auto
EMIS_MAPTILER_KEY=...
EMIS_MAPTILER_STYLE_ID=streets-v2
```

Forced offline:

```env
EMIS_MAP_MODE=offline
```

Forced online:

```env
EMIS_MAP_MODE=online
```

## 7. Runtime verification

### 7.1. Online / auto

1. Открыть `/emis`.
2. Проверить `/api/emis/map-config`.
3. Убедиться, что online style резолвится и карта загружается.

### 7.2. Offline

1. Проверить `pnpm map:assets:status`.
2. Поставить `EMIS_MAP_MODE=offline`.
3. Отключить внешний интернет для браузера или сервера.
4. Проверить, что `effectiveMode=offline`.
5. Убедиться, что `/emis` продолжает рендерить карту и overlays.

### 7.3. Auto fallback

1. Поставить `EMIS_MAP_MODE=auto`.
2. Убедиться, что online style сконфигурирован и local bundle готов.
3. Спровоцировать startup failure online basemap.
4. Проверить, что runtime один раз переключился в local PMTiles.
5. Проверить, что в рамках сессии нет автоматического возврата в online.

## 8. Offline maps maintenance

### 8.1. Add or update region

Минимальный рецепт:

1. Extract/download новый `.pmtiles`.
2. Положить файл в `apps/web/static/emis-map/offline/`.
3. Обновить `manifest.json`:
   - файл;
   - `bbox`;
   - `maxzoom`;
   - `createdAt`;
   - `source`.
4. Запустить:
   - `pnpm map:assets:status`
   - `CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke`
5. Пересобрать и задеплоить.

### 8.2. Freshness

Минимум отслеживать:

- `manifest.createdAt`
- `manifest.source`
- фактический набор `.pmtiles` файлов

Рекомендуемая cadence обновления: не реже квартала или после значимых изменений покрытия.

### 8.3. File order semantics

Если bundle содержит несколько `.pmtiles` архивов, порядок в manifest важен.  
Coarse world coverage может идти раньше, а более детальные региональные файлы — позже как high-zoom refinement.

## 9. Range support

PMTiles требуют HTTP Range requests (`206 Partial Content`).

Критический post-deploy признак корректности:

```bash
curl -s -D - -H 'Range: bytes=0-9' https://your.domain/emis-map/offline/world-z7.pmtiles -o /dev/null
```

Ожидается:

- `206 Partial Content`
- `Accept-Ranges: bytes`
- `Content-Range`
- `Content-Length: 10`

Если приходит `200` с полным файлом, Range support сломан.

## 10. Post-deploy checklist

После выкладки в новое окружение проверить:

1. **Assets served**  
   `manifest.json` доступен по HTTP и отдаёт `200`.

2. **Range requests**  
   PMTiles URL отвечает `206 Partial Content`.

3. **Map config API**  
   `/api/emis/map-config` показывает ожидаемые `effectiveMode`, `runtimeStatus`, `offlinePmtilesUrl`.

4. **Spike page**  
   `/emis/pmtiles-spike` отдаёт `200`.

5. **Readiness**  
   `/api/emis/readyz` возвращает `status: "ready"`.

### Typical failure mapping

| Symptom | Likely cause | Fix |
|---|---|---|
| 404 on pmtiles | assets not in build | rebuild, check `static/emis-map/offline/` |
| 200 instead of 206 | reverse proxy strips Range | preserve Range headers |
| `missing-assets` | incomplete bundle | run `pnpm map:assets:status` |
| `misconfigured` | no online style and no offline bundle | configure online style or install bundle |
| spike page 500 | server-side error | inspect server logs |

## 11. Automated verification

### Offline smoke

```bash
CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke
```

Проверяет как минимум:

- bundle completeness;
- valid manifest;
- file presence;
- readiness;
- PMTiles HTTP Range behavior;
- technical spike route.

### Baseline by change type

- read-side/runtime: `pnpm emis:smoke`
- write-side/audit: `pnpm emis:write-smoke`
- auth/session/rbac: `pnpm emis:auth-smoke`
- offline maps/assets: `pnpm emis:offline-smoke`

## 12. Что не входит в текущий ops слой

Сейчас intentionally не считаются частью базового ops слоя:

- offline geocoding;
- routing;
- map editing tools;
- встроенный MBTiles tile server;
- отдельный infra stack ради basemap, если текущий runtime уже корректно обслуживает Range.

## 13. Related sources

- `access_model.md` — auth/session/write-mode;
- `architecture.md` — границы модуля и storage ownership;
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — runtime/API conventions.
