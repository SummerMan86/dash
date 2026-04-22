# EMIS Workspace Navigation

Этот файл описывает правила для `src/routes/emis/*`.
Это workspace/UI слой EMIS, а не место для server business logic или SQL.

## 1. Scope

Здесь живут:

- route composition для `/emis`
- page-level loading и orchestration
- URL/search params sync
- workspace filter runtime wiring
- selection state и page-local interaction state
- интеграция с reusable widgets, в первую очередь `EmisMap`

Ключевые файлы:

- `+page.svelte` - workspace orchestration layer (state, effects, loaders, composition)
- `+page.server.ts` - server-side data needed for initial page render
- `filters.ts` - route-local filter spec wiring
- `emisPageHelpers.ts` - pure utility/formatting functions, type aliases, URL helpers
- `emisPageSelection.ts` - selection builder functions, navigation href helpers, vessel feature builder
- `emisPageGeoJson.ts` - ship route GeoJSON FeatureCollection builders
- `SearchResultsPanel.svelte` - right-column panel: vessel catalog / object+news search results
- `ShipRoutePanel.svelte` - ship route slice card + latest track points card
- child routes `news/*`, `objects/*`, `pmtiles-spike/*` - отдельные workspace slices

## 2. What is allowed in route layer

- связать filters, URL state, loaders и widgets
- держать page-local loading / error / empty states
- преобразовать server payload в route-local view state
- координировать, какой widget показывается и в каком режиме

## 3. What must not stay here

- raw SQL
- HTTP transport logic for `/api/emis/*`
- reusable map runtime internals
- shared popup rendering logic
- entity contracts and reusable Zod schemas
- heavy business logic that belongs in `src/lib/server/emis/*`

## 4. Extraction rules

`src/routes/emis/+page.svelte` was decomposed in H-4b (1559 → 767 lines). Panels and helpers are now route-local siblings.
Default expectation для новых задач:

- не добавлять еще один большой inline block, если его можно вынести
- extract reusable UI slices as route-local subcomponents first; if used by 2+ routes, promote to `src/lib/<module>/`; if reusable across domains, extract to `packages/*`
- extract non-trivial view-model shaping into route-local helpers or dedicated model files

Хороший кандидат на extraction:

- блок больше `120-150` строк с собственной state machine
- повторяемая rendering logic
- isolated selection/loading/runtime logic
- map-related logic, не относящаяся к page composition

## 5. Route vs map-runtime boundary

В `src/routes/emis/*` оставляем:

- page composition и workspace orchestration
- какой endpoint / query нужен текущей странице
- selection state и URL sync

В `packages/emis-ui/` (`@dashboard-builder/emis-ui`) выносим:

- maplibre lifecycle
- layer/source wiring
- PMTiles protocol/runtime
- popup and overlay rendering internals

## 6. Review cues

При review смотреть в первую очередь:

- route не стал еще более god-component без extraction
- URL/filter/workspace orchestration не протекла в widgets или server layer
- новые route-level decisions описаны в docs, если они меняют navigation or ownership

## 7. Reading order

1. `../../../docs/emis/README.md`
2. `../../../docs/agents/workflow.md`
3. `../../../docs/agents/templates.md`
4. `../../../docs/emis/architecture.md`
5. `../../../src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
6. `packages/emis-ui/` - если change касается map runtime (extracted from widgets/emis-map)
