# EMIS Offline Maps Ops Guide

Этот документ описывает текущий basemap contract для EMIS:

- `online` - remote style, по умолчанию `MapTiler` при наличии ключа;
- `offline` - локальный `PMTiles` bundle из `static/emis-map/offline`;
- `auto` - старт online с одноразовым fallback в local `PMTiles`, если online basemap не поднялся на старте.

## 1. Что считается offline-ready

Для offline runtime bundle считается готовым, если в `static/emis-map/offline` есть:

```text
offline/
  *.pmtiles
  sprites/
  fonts/
  manifest.json
```

Готовность считается одинаково в:

- `pnpm map:assets:status`
- `/api/emis/map-config`
- основном `/emis` runtime

Если `manifest.json` есть, но битый, bundle не считается `ready`.

## 2. Основные команды

Проверить готовность локального bundle:

```bash
pnpm map:assets:status
```

Установить готовый bundle из внешней папки:

```bash
pnpm map:assets:install -- --source /abs/path/to/offline-bundle
```

Собрать/скачать локальный bundle прямо в проект:

```bash
pnpm map:pmtiles:setup
```

Проверить byte-serving для конкретного PMTiles URL:

```bash
pnpm map:pmtiles:probe -- --url http://127.0.0.1:4173/emis-map/offline/moscow.pmtiles
```

## 3. Что делает setup/install

### `map:pmtiles:setup`

- ставит `go-pmtiles` CLI локально;
- вырезает регион из Protomaps daily build;
- подтягивает локальные `fonts` и `sprites`;
- генерирует `manifest.json`.

### `map:assets:install`

- ожидает bundle с `*.pmtiles`, `sprites/`, `fonts/`;
- копирует его в `static/emis-map/offline`;
- дописывает/обновляет `manifest.json`;
- восстанавливает локальный `.gitignore` для `*.pmtiles`.

## 4. Переменные окружения

Поддерживаются:

- `EMIS_MAP_MODE=auto|online|offline`
- `EMIS_MAP_ONLINE_STYLE_URL`
- `EMIS_MAP_STYLE_URL`
- `EMIS_MAPTILER_KEY`
- `EMIS_MAPTILER_STYLE_ID`
- `EMIS_MAP_INITIAL_CENTER=lon,lat`
- `EMIS_MAP_INITIAL_ZOOM=number`

Рекомендуемый production-like сценарий:

```env
EMIS_MAP_MODE=auto
EMIS_MAPTILER_KEY=...
EMIS_MAPTILER_STYLE_ID=streets-v2
```

Если нужен forced offline:

```env
EMIS_MAP_MODE=offline
```

Если нужен forced online без auto fallback:

```env
EMIS_MAP_MODE=online
```

## 5. Как проверять runtime

### Online / auto

1. Открыть `/emis`.
2. Убедиться, что `/api/emis/map-config` возвращает ожидаемый `requestedMode`.
3. Проверить, что online style резолвится и basemap загружается.

### Offline

1. Убедиться, что `pnpm map:assets:status` возвращает `ready: true`.
2. Поставить `EMIS_MAP_MODE=offline`.
3. Отключить внешний интернет для браузера или сервера.
4. Проверить, что `/api/emis/map-config` показывает `effectiveMode=offline`.
5. Убедиться, что `/emis` продолжает рендерить basemap и overlays без внешних CDN.

### Auto fallback

1. Поставить `EMIS_MAP_MODE=auto`.
2. Убедиться, что online style сконфигурирован, а local PMTiles bundle готов.
3. Спровоцировать startup-failure online basemap.
4. Проверить, что `/emis` один раз переключился в local PMTiles runtime.
5. Проверить, что в рамках одной сессии нет автоматического возврата обратно в online.

## 6. Эксплуатационные заметки

- Если offline coverage ограничен регионом, стартовый viewport лучше брать из `manifest.json` или через env override.
- Если используется несколько `.pmtiles` архивов, runtime уважает порядок из `manifest.json`.
- Для coarse world coverage + detail AOI можно держать несколько архивов с разными `maxzoom`.
- Remote PMTiles URL не считаются доказательством “true offline”.

## 7. Как добавить новый регион PMTiles

### 7.1. Extract a new region

Use `go-pmtiles` to extract a region from a Protomaps daily build:

```bash
# go-pmtiles is installed by pnpm map:pmtiles:setup
# Or install manually: https://github.com/protomaps/go-pmtiles/releases

# Example: extract Sakhalin region
go-pmtiles extract \
  https://build.protomaps.com/20260404.pmtiles \
  sakhalin.pmtiles \
  --bbox=141.5,46.5,145.0,51.5 \
  --maxzoom=15
```

Alternatively, modify `scripts/emis-pmtiles-setup.mjs` parameters and run `pnpm map:pmtiles:setup`.

### 7.2. Place the file

Copy the new archive into the offline assets directory:

```bash
cp sakhalin.pmtiles apps/web/static/emis-map/offline/
```

The `.gitignore` in the offline directory excludes `*.pmtiles` from version control. This is intentional: pmtiles files are large binary assets managed outside git.

### 7.3. Update manifest.json

Add the new file entry to the `pmtiles` array in `apps/web/static/emis-map/offline/manifest.json`:

```json
{
	"version": 1,
	"createdAt": "2026-04-05T10:00:00.000Z",
	"source": "https://build.protomaps.com/20260404.pmtiles",
	"pmtiles": [
		{ "file": "world-z7.pmtiles", "bbox": "-180,-85,180,85", "maxzoom": 7 },
		{ "file": "moscow.pmtiles", "bbox": "37.3,55.55,37.85,55.92", "maxzoom": 15 },
		{ "file": "sakhalin.pmtiles", "bbox": "141.5,46.5,145.0,51.5", "maxzoom": 15 }
	],
	"fonts": ["Noto Sans Italic", "Noto Sans Medium", "Noto Sans Regular"],
	"sprites": ["v4/light", "v4/light@2x"]
}
```

Update `createdAt` to reflect the modification time. Update `source` if the daily build URL changed.

### 7.4. Verify

```bash
# Check bundle completeness
pnpm map:assets:status

# Full smoke (starts dev server automatically)
CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke
```

All 9 checks should pass.

### 7.5. Rebuild and deploy

```bash
pnpm build
# New pmtiles file is now in build/client/emis-map/offline/
```

After deploy, run the post-deploy verification checklist (section 11).

### File order semantics

The order of entries in `manifest.pmtiles` matters:

- The runtime selects the **first** file whose name matches a local `.pmtiles` file on disk.
- For coarse world coverage + detailed AOI, list the detailed region **after** the world file.
- The world file provides fallback coverage; regional files provide high-zoom detail.

### Removing a region

1. Delete the `.pmtiles` file from `static/emis-map/offline/`.
2. Remove its entry from `manifest.json`.
3. Update `createdAt` in manifest.
4. Run `pnpm map:assets:status` to confirm no missing-file warnings.
5. Rebuild and deploy.

### Replacing a region (safe procedure)

To update an existing region file (e.g., fresher data for Moscow):

1. Extract the new file with a temporary name: `moscow-new.pmtiles`.
2. Verify it locally:
   - Rename `moscow.pmtiles` to `moscow-old.pmtiles`.
   - Rename `moscow-new.pmtiles` to `moscow.pmtiles`.
   - Run `CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke`.
3. If smoke passes, delete `moscow-old.pmtiles`.
4. If smoke fails, restore from `moscow-old.pmtiles` and investigate.
5. Update `createdAt` in `manifest.json`.
6. Rebuild and deploy.

## 8. Как проверять свежесть assets

### Manifest freshness fields

| Field       | Purpose                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| `createdAt` | When the manifest was last written. Primary freshness indicator.                   |
| `source`    | URL of the Protomaps daily build used. Contains the build date (e.g., `20260404`). |
| `version`   | Manifest schema version. Currently `1`.                                            |

### Check freshness

```bash
# Quick check
cat apps/web/static/emis-map/offline/manifest.json | python3 -c \
  "import sys,json; m=json.load(sys.stdin); print('createdAt:', m.get('createdAt','unknown')); print('source:', m.get('source','unknown'))"
```

Or via the status command:

```bash
pnpm map:assets:status
# Output includes manifestData with createdAt
```

Or via the map-config API (requires running server):

```bash
curl -s http://127.0.0.1:3000/api/emis/map-config | python3 -c \
  "import sys,json; m=json.load(sys.stdin); om=m.get('offlineManifest',{}); print('createdAt:', om.get('createdAt','unknown'))"
```

### When to update

- **Minimum cadence:** once per quarter, or after significant regional infrastructure changes.
- **Protomaps daily build:** updates daily (UTC). The `source` field contains the build URL including the date.
- **After adding/removing regions:** always update `createdAt` in `manifest.json`.

### How to update

Using the setup script (re-downloads from Protomaps):

```bash
# Delete existing pmtiles to force re-download
rm apps/web/static/emis-map/offline/*.pmtiles
pnpm map:pmtiles:setup
```

Using the install script (from a pre-built bundle):

```bash
pnpm map:assets:install -- --source /abs/path/to/new-bundle
# This overwrites the target dir and updates createdAt automatically
```

Manual update:

1. Replace the `.pmtiles` files.
2. Edit `manifest.json`: update `createdAt`, `source`, and file entries.
3. Run `pnpm map:assets:status` to verify.

## 9. Automated offline smoke

```bash
CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke
```

Выполняет 9 проверок без `DATABASE_URL`:

| Check                  | Что проверяется                                            |
| ---------------------- | ---------------------------------------------------------- |
| `assets:manifest-file` | `manifest.json` существует                                 |
| `assets:pmtiles`       | хотя бы один `.pmtiles` файл                               |
| `assets:sprites`       | sprites/ dir не пустой                                     |
| `assets:fonts`         | fonts/ dir не пустой                                       |
| `manifest:valid`       | парсится, есть `version` и `pmtiles[]`                     |
| `manifest:files`       | каждый файл из manifest существует на диске                |
| `bundle:ready`         | все 4 компонента готовы (статус не `missing-assets`)       |
| `http:spike-page`      | `/emis/pmtiles-spike` → 200                                |
| `http:range:pmtiles`   | Range запрос к первому pmtiles → 206, Accept-Ranges: bytes |

Exit code 1 если есть FAIL. Формат вывода: `PASS/FAIL` на каждый check + JSON report.

## 10. Range support в production (adapter-node)

PMTiles требует HTTP Range requests (206 Partial Content). В dev режиме Vite обслуживает static files с поддержкой Range из коробки.

### Verified: adapter-node supports Range requests

`@sveltejs/adapter-node` (>= 5.5.4) embeds `sirv` for static file serving. `sirv` has built-in Range request support: it checks `req.headers.range`, returns 206 with correct `Content-Range`, `Accept-Ranges: bytes`, and uses `fs.createReadStream` with byte offsets.

This was verified on `2026-04-05` against a production-shaped `pnpm build` + `node build/index.js`:

```
HTTP/1.1 206 Partial Content
Content-Length: 10
Content-Range: bytes 0-9/184518226
Accept-Ranges: bytes
```

No reverse proxy (nginx/caddy) is required for Range support. A reverse proxy may still be desired for TLS termination, caching, or rate limiting.

### Runtime matrix

| Runtime path                | Range support | Notes                                                         |
| --------------------------- | ------------- | ------------------------------------------------------------- |
| `vite dev` (dev)            | Yes           | Vite built-in                                                 |
| `adapter-node` (production) | Yes           | Via embedded `sirv`                                           |
| nginx / caddy reverse proxy | Yes           | Native; if used, ensure `proxy_pass` preserves Range headers  |
| `adapter-static`            | N/A           | No built-in server; host must support Range (nginx, S3, etc.) |

### Verifying Range support after deploy

```bash
curl -s -D - -H 'Range: bytes=0-9' https://your.domain/emis-map/offline/world-z7.pmtiles -o /dev/null
```

Expected:

- `HTTP/1.1 206 Partial Content`
- `Accept-Ranges: bytes`
- `Content-Range: bytes 0-9/<total-size>`
- `Content-Length: 10`

If the response is `200` with the full file body, Range requests are broken (likely a misconfigured reverse proxy stripping Range headers).

## 11. Post-deploy verification checklist

After deploying to a new environment (staging, production, new VPS), run this checklist to confirm the offline maps infrastructure works.

### Prerequisites

- The app is built (`pnpm build`) and running (`node build/index.js` or via process manager)
- Offline assets are present in `build/client/emis-map/offline/` (they are copied from `static/` during build)

### Step 1: Verify assets are served

```bash
BASE=https://your.domain  # or http://127.0.0.1:3000

# Manifest should return 200 with JSON body
curl -s -o /dev/null -w "%{http_code}" $BASE/emis-map/offline/manifest.json
# Expected: 200
```

Success: `200`. Failure: `404` means assets were not copied into the build, or the static file path is wrong.

### Step 2: Verify Range requests (critical for PMTiles)

```bash
curl -s -D - -H 'Range: bytes=0-9' $BASE/emis-map/offline/world-z7.pmtiles -o /dev/null
```

Success signals:

- `HTTP/1.1 206 Partial Content`
- `Accept-Ranges: bytes`
- `Content-Range: bytes 0-9/<file-size>`
- `Content-Length: 10`

Failure signals:

- `200 OK` with full file body: reverse proxy is stripping Range headers
- `404`: pmtiles file not in build output
- `416 Range Not Satisfiable`: byte range exceeds file size (check file integrity)

### Step 3: Verify map config API

```bash
curl -s $BASE/api/emis/map-config | python3 -m json.tool | head -20
```

Check:

- `effectiveMode` is `auto`, `online`, or `offline` as expected
- `runtimeStatus` is `ready` or `degraded` (not `missing-assets` or `misconfigured`)
- `offlinePmtilesUrl` is not null (offline bundle detected)
- `warnings` array is empty or contains only expected items

### Step 4: Verify spike page loads

```bash
curl -s -o /dev/null -w "%{http_code}" $BASE/emis/pmtiles-spike
# Expected: 200
```

### Step 5: Verify readiness endpoint

```bash
curl -s $BASE/api/emis/readyz | python3 -m json.tool
```

Success: `status: "ready"`. If `status: "not_ready"`, check `failures` array for specific issues (DB, schemas, views).

### Automated alternative

If the app is accessible at `$BASE`, use the probe script:

```bash
pnpm map:pmtiles:probe -- --url $BASE/emis-map/offline/world-z7.pmtiles
```

For a full offline smoke (starts its own dev server if no `--base-url`):

```bash
CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke
# Or against a running instance:
pnpm emis:offline-smoke -- --base-url $BASE
```

### Decision tree for failures

| Symptom                        | Likely cause                        | Fix                                                             |
| ------------------------------ | ----------------------------------- | --------------------------------------------------------------- |
| 404 on pmtiles file            | Assets not in build                 | Re-run `pnpm build`; check `static/emis-map/offline/` has files |
| 200 instead of 206             | Reverse proxy strips Range          | Configure nginx: `proxy_set_header Range $http_range;`          |
| `missing-assets` in map-config | Incomplete bundle                   | Run `pnpm map:assets:status` to see what is missing             |
| `misconfigured` in map-config  | No online style + no offline bundle | Set `EMIS_MAPTILER_KEY` or install offline bundle               |
| Spike page 500                 | Server-side error                   | Check server logs for stack trace                               |

## 12. Что не входит в текущий слой

Сейчас специально не делаем:

- offline geocoding;
- routing;
- map editing tools;
- time slider;
- встроенный MBTiles tile server.

Для технической диагностики и повторного smoke check сохраняется отдельный маршрут:

- `/emis/pmtiles-spike`
