# @dashboard-builder/emis-ui

EMIS UI widgets: карта и status bar.

## Структура

```
src/
  emis-map/
    EmisMap.svelte           — основной map widget (MapLibre GL)
    EmisPmtilesSpikeMap.svelte — diagnostics map
    layer-config.ts          — MapLibre layer management utilities
    pmtiles-protocol.ts      — PMTiles protocol registration
    pmtiles-style.ts         — offline PMTiles style builder
    popup-renderers.ts       — HTML popup/tooltip content generators
    index.ts                 — barrel export
  emis-status-bar/
    EmisStatusBar.svelte     — map/offline status display
    index.ts                 — barrel export
```

## Subpath exports

| Subpath | Содержимое |
|---|---|
| `./emis-map` | `EmisMap`, `EmisPmtilesSpikeMap` components |
| `./emis-map/layer-config` | layer management utilities |
| `./emis-map/pmtiles-protocol` | protocol registration |
| `./emis-map/pmtiles-style` | style builder |
| `./emis-map/popup-renderers` | popup content renderers |
| `./emis-status-bar` | `EmisStatusBar` component |

## Что осталось в apps/web

- `emis-drawer` — зависит от `$widgets/filters` (app-local widget)
- `emis-manual-entry` — зависит от `$app/forms` (SvelteKit-specific)

## Правила

- Только UI-компоненты и связанные утилиты. Никакого server code.
- Deps: `emis-contracts`, `platform-core`, `platform-datasets`, `platform-ui`, `maplibre-gl`, `pmtiles`, `@protomaps/basemaps`; peer: `svelte`.
- Compatibility shims в `apps/web/src/lib/widgets/emis-map/` и `emis-status-bar/` re-exportят из этого пакета.

## Известные follow-ups

- `EmisMap.svelte` (1224 строки) — кандидат на декомпозицию: overlay-fetch logic, feature normalizers, diagnostics HUD.
