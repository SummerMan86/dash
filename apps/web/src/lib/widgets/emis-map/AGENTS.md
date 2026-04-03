# EMIS Map Widget Navigation

Этот файл описывает правила для `src/lib/widgets/emis-map/*`.
Это map runtime слой, а не route orchestration и не server/business слой.

## 1. Scope

Здесь живут:

- `MapLibre` runtime lifecycle
- basemap mode selection: `online | offline | auto`
- overlay source/layer wiring
- PMTiles protocol integration
- popup / tooltip rendering internals
- map event handling and selection events
- typed map-facing helpers for overlay and route data

Ключевые файлы:

- `EmisMap.svelte` - основной runtime widget
- `layer-config.ts` - layer/source wiring
- `pmtiles-protocol.ts` - protocol attach/release lifecycle
- `pmtiles-style.ts` - offline style builder
- `popup-renderers.ts` - popup content helpers

## 2. What belongs here

- map-specific state and effects
- source/layer updates for objects, news, vessels, routes
- bbox-driven overlay loading contract
- feature selection / hover behavior
- map diagnostics related to basemap and overlays

## 3. What must not move here

- SvelteKit route decisions and URL orchestration
- business decisions about EMIS workflow
- server fetch handlers beyond widget-facing request calls
- SQL, repository logic, DB contracts
- broad page layout concerns

## 4. Growth control

`EmisMap.svelte` уже oversized.
Для новых changes default expectation:

- prefer extraction into helper modules over additional monolith growth
- isolate new overlay/runtime behaviors in focused files where possible
- keep popup and formatter helpers pure

Выносить в отдельный файл стоит, если появляется:

- новый overlay lifecycle
- отдельный interaction mode
- substantial popup/tooltip renderer logic
- reusable map utility that is not route-specific

## 5. Boundary with routes

Route layer owns:

- which layer/mode is active
- URL sync and page selection policy
- which queries are passed into the widget

Map widget owns:

- how the map starts
- how overlays are fetched and rendered
- how map selection is translated into emitted events

## 6. Review cues

При review смотреть:

- не растет ли `EmisMap.svelte` еще больше без justification
- нет ли route/business logic inside widget
- нет ли hidden coupling between popup rendering and server/domain layers
- не сломаны ли offline/auto fallback guarantees

## 7. Reading order

1. `../../../../docs/emis_session_bootstrap.md`
2. `../../../../docs/emis_offline_maps_ops.md` - если change касается PMTiles/offline
3. `../../../../docs/agents/workflow.md`
4. `../../../../docs/agents/templates.md`
5. `../../../../docs/emis_architecture_review.md`
6. `./EmisMap.svelte`
