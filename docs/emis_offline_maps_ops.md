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

## 7. Что не входит в текущий слой

Сейчас специально не делаем:

- offline geocoding;
- routing;
- map editing tools;
- time slider;
- встроенный MBTiles tile server.

Для технической диагностики и повторного smoke check сохраняется отдельный маршрут:

- `/emis/pmtiles-spike`
