# @dashboard-builder/emis-ui

EMIS UI widgets: карта и status bar.

## Структура

```
src/
  emis-map/
    EmisMap.svelte           — основной map widget (MapLibre GL)
    DiagnosticsHud.svelte    — map diagnostics overlay (config, status, overlay counts)
    EmisPmtilesSpikeMap.svelte — diagnostics map
    feature-normalizers.ts   — pure GeoJSON → typed EMIS feature converters
    layer-config.ts          — MapLibre layer management utilities
    map-bounds.ts            — fitBounds and route-focus helpers
    map-interactions.ts      — popup, tooltip and layer interaction wiring
    overlay-fetch.ts         — overlay URL construction, typed fetch, layer visibility helpers
    pmtiles-protocol.ts      — PMTiles protocol registration
    pmtiles-style.ts         — offline PMTiles style builder
    popup-renderers.ts       — HTML popup/tooltip content generators
    index.ts                 — barrel export
  emis-status-bar/
    EmisStatusBar.svelte     — map/offline status display
    index.ts                 — barrel export
```

## Subpath exports

| Subpath                          | Содержимое                                   |
| -------------------------------- | -------------------------------------------- |
| `./emis-map`                     | `EmisMap`, `EmisPmtilesSpikeMap` components  |
| `./emis-map/layer-config`        | layer management utilities                   |
| `./emis-map/pmtiles-protocol`    | protocol registration                        |
| `./emis-map/pmtiles-style`       | style builder                                |
| `./emis-map/feature-normalizers` | GeoJSON feature normalizer functions         |
| `./emis-map/overlay-fetch`       | overlay fetch utilities and layer mode types |
| `./emis-map/popup-renderers`     | popup content renderers                      |
| `./emis-status-bar`              | `EmisStatusBar` component                    |

## Что осталось в apps/web

- `emis-drawer` — зависит от `$widgets/filters` (app-local widget)
- `emis-manual-entry` — зависит от `$app/forms` (SvelteKit-specific)

## Правила

- Только UI-компоненты и связанные утилиты. Никакого server code.
- Deps: `emis-contracts`, `platform-core`, `platform-ui`, `maplibre-gl`, `pmtiles`, `@protomaps/basemaps`; peer: `svelte`.
- `platform-datasets` is NOT a dependency — generic types like `JsonValue` come from `platform-core`.
- Compatibility shims в `apps/web/src/lib/widgets/emis-map/` и `emis-status-bar/` re-exportят из этого пакета.

## Известные follow-ups

- `EmisMap.svelte` was reduced to `695` lines in `P3.4` via package-local extraction of bounds and interaction helpers; no live complexity waiver remains.
