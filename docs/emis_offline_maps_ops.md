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

Чтобы добавить новый регион (например, Сахалин):

1. Открыть `scripts/emis-pmtiles-setup.mjs` и изменить bbox для нужного региона, либо запустить `go-pmtiles extract` вручную:

   ```bash
   # go-pmtiles должен быть установлен (pnpm map:pmtiles:setup его ставит)
   go-pmtiles extract /path/to/protomaps-daily.pmtiles sakhalin.pmtiles \
     --bbox=141.5,46.5,145.0,51.5
   ```

2. Скопировать новый архив в `static/emis-map/offline/`.

3. Обновить `manifest.json` — добавить новый файл в массив `pmtiles`:

   ```json
   "pmtiles": [
     { "file": "world-z7.pmtiles", "bbox": "-180,-85,180,85", "maxzoom": 7 },
     { "file": "moscow.pmtiles",   "bbox": "37.3,55.55,37.85,55.92", "maxzoom": 15 },
     { "file": "sakhalin.pmtiles", "bbox": "141.5,46.5,145.0,51.5",  "maxzoom": 15 }
   ]
   ```

4. Проверить готовность: `pnpm map:assets:status`.

5. Запустить offline smoke: `CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke` — должно быть 9/9.

Порядок файлов в `manifest.pmtiles` важен: runtime выбирает первый файл с наибольшим покрытием bbox из запроса. Для coarse world coverage + detail AOI держите более детальный регион после world-z7.

## 8. Как проверять свежесть assets

Свежесть offline bundle определяется полем `manifest.json::createdAt`.

Проверить вручную:

```bash
cat static/emis-map/offline/manifest.json | python3 -c "import sys,json; m=json.load(sys.stdin); print(m.get('createdAt','unknown'))"
```

Для обновления bundle:

- Если используется `pnpm map:pmtiles:setup` (скачивает из Protomaps daily build):
  - Дата обновления указана в `createdAt` после setup.
  - Protomaps daily build обновляется ежесуточно по UTC; `source` в manifest содержит URL сборки.
- Если используется `pnpm map:assets:install` из внешней папки:
  - `install` перезаписывает `manifest.json` с новым `createdAt`.

Рекомендация: обновлять bundle не реже 1 раза в квартал или после значительных изменений инфраструктуры региона.

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

В production важно убедиться, что выбранный adapter поддерживает Range requests:

- **`@sveltejs/adapter-node`** — использует базовый Node.js http server. Начиная с SvelteKit 2.x, статика обслуживается через Vite-generated `handler.js`. Проверить Range support:

  ```bash
  # После pnpm build + node build/index.js
  pnpm map:pmtiles:probe -- --url http://127.0.0.1:3000/emis-map/offline/world-z7.pmtiles
  ```

  Если probe возвращает 200 вместо 206 — нужно перед SvelteKit поставить nginx/caddy с поддержкой Range.

- **Nginx** / **Caddy** — поддерживают Range нативно. Рекомендуется для production deployments с PMTiles.

- **`@sveltejs/adapter-static`** — статика сама по себе не сервит файлы; нужен отдельный HTTP server (nginx / object storage с Range).

После deploy проверять Range поддержку командой:

```bash
curl -I -H 'Range: bytes=0-9' https://your.domain/emis-map/offline/world-z7.pmtiles
# Ожидаемый ответ: HTTP/1.1 206 Partial Content + Accept-Ranges: bytes
```

## 11. Что не входит в текущий слой

Сейчас специально не делаем:

- offline geocoding;
- routing;
- map editing tools;
- time slider;
- встроенный MBTiles tile server.

Для технической диагностики и повторного smoke check сохраняется отдельный маршрут:

- `/emis/pmtiles-spike`
