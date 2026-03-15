# EMIS Offline Maps Ops Guide

Этот документ описывает, как работает offline basemap bundle для EMIS и как его поставить на сервер один раз без зависимости от внешнего интернета.

## 1. Что входит в текущую реализацию

В проекте уже добавлены:

- `MapLibre GL JS` runtime для EMIS map widget;
- server-resolved `mapConfig`;
- режимы `online` и `offline`;
- локальная раздача assets из `static/emis-map/offline`;
- команды:
  - `pnpm map:assets:status`
  - `pnpm map:assets:install -- --source /abs/path/to/offline-bundle`

Важно:

- offline bundle относится к отдельной post-MVE wave;
- отсутствие offline bundle не ломает весь EMIS, если есть online style или controlled fallback;
- объекты и новости EMIS уже локальны сами по себе и не зависят от внешнего basemap provider.

## 2. Ожидаемая структура offline bundle

Команда install ожидает готовую папку следующего вида:

```text
offline-bundle/
  style.json
  tiles/
  sprites/
  fonts/
```

После установки она копируется в:

```text
static/
  emis-map/
    offline/
      style.json
      tiles/
      sprites/
      fonts/
      manifest.json
```

Текущая реализация рассчитана на **pre-extracted static bundle**. Если позже понадобится поддержка `MBTiles` через отдельный tile-serving runtime, это будет следующая итерация, а не обязательная часть текущего слоя.

## 3. Команды

Проверить bundle:

```bash
pnpm map:assets:status
```

Установить bundle:

```bash
pnpm map:assets:install -- --source /abs/path/to/offline-bundle
```

Что делает install:

- проверяет наличие `style.json`, `tiles/`, `sprites/`, `fonts/`;
- копирует bundle в `static/emis-map/offline`;
- обновляет `manifest.json` с `installedAt` и `sourcePath`.

## 4. Переменные окружения

Поддерживаются:

- `EMIS_MAP_MODE=online|offline`
- `EMIS_MAP_STYLE_URL`
- `EMIS_MAP_OFFLINE_STYLE_URL`
- `EMIS_MAP_TILES_URL`
- `EMIS_MAP_INITIAL_CENTER=lon,lat`
- `EMIS_MAP_INITIAL_ZOOM=number`

Рекомендуемые сценарии:

### Online

```env
EMIS_MAP_MODE=online
EMIS_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

### Offline

```env
EMIS_MAP_MODE=offline
EMIS_MAP_OFFLINE_STYLE_URL=/emis-map/offline/style.json
EMIS_MAP_TILES_URL=/emis-map/offline/tiles/{z}/{x}/{y}.pbf
```

## 5. Как проверить, что карта действительно работает офлайн

Минимальный smoke checklist:

1. Сервер доступен пользователям по сети.
2. Внешний интернет для сервера или браузера отключен.
3. `EMIS_MAP_MODE=offline`.
4. `/api/emis/map-config` показывает `effectiveMode=offline`.
5. В DevTools нет запросов к внешним tile/style/font CDN.
6. `/emis` продолжает открываться и рендерить basemap.

Если bundle неполный, ожидаемое поведение:

- `map-config` возвращает `fallback-online` или `missing-assets`;
- UI не падает;
- пользователь видит диагностическое сообщение.

## 6. Размеры и эксплуатационные заметки

Размер offline basemap bundle зависит от покрытия, формата и уровня zoom. Практически это может быть:

- от нескольких гигабайт для небольшого покрытия;
- до десятков гигабайт для регионального или более плотного набора tiles.

Поэтому перед эксплуатацией стоит заранее определить:

- географический охват;
- максимальный zoom;
- формат tiles;
- место хранения и обновления bundle.

## 7. Что ещё не входит в текущую реализацию

Сейчас специально не делаем:

- offline geocoding;
- routing;
- time slider;
- map editing tools;
- отдельный MBTiles tile server внутри приложения.

Это оставлено на следующую волну, если offline contour покажет реальную ценность после запуска базового EMIS workflow.
