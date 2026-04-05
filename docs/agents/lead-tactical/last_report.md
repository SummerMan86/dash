# P1: Vessel Historical Track Integration — Completion Report

**Package:** P1 (post-MVE feature expansion)
**Date:** 2026-04-04
**Branch:** `main`
**Backlog mapping:** P1.1 through P1.5

## Status: DONE

All 5 P1 slices completed. Vessel mode now supports selected-vessel historical track on the map, flyTo on vessel selection, viewport-aware catalog, and smoke coverage.

## P1.1: Freeze Selected-Vessel Track UX/API Contract

- Created `docs/emis_vessel_track_contract.md` as canonical behavior contract
- Analyzed existing code: 3 ship-route API endpoints (points, segments, vessels), EmisMap component with existing `flyToTarget` prop (unused), `useDebouncedLoader` for ship route data
- Key findings:
  - Historical track already loads via `shipRouteLoader` when `selectedShipHbkId` changes
  - In vessel mode (`layer=vessels`), route data was explicitly blocked from reaching the map via `isVesselMode ? undefined : ...` guards
  - `flyToTarget` prop existed on EmisMap but was never wired from the workspace page
  - Vessel catalog fetched all vessels without viewport filtering
- Contract decisions:
  - Track loads on vessel selection (existing mechanism, just unblock the data flow)
  - Default route mode: `both` (points + segments)
  - FlyTo zoom: `6` (regional context)
  - Viewport-aware catalog via optional `bbox` parameter on vessels endpoint

## P1.2: Load Historical Track on Vessel Selection

- Removed `isVesselMode` guards on `routePointsData`, `routeSegmentsData`, `routeFocusKey`, and `selectedRouteFeature` in the `EmisMap` invocation
- Before: `routePointsData={isVesselMode ? undefined : shipRoutePointFeatureCollection}`
- After: `routePointsData={shipRoutePointFeatureCollection}`
- This allows historical track to render on the map in vessel mode alongside vessel position overlays
- No new loading mechanism needed -- existing `shipRouteLoader` already watches `selectedShipHbkId`

## P1.3: Add FlyTo on Vessel Selection

- Added `vesselFlyToTarget` derived state that computes `{ lng, lat, zoom: 6 }` from `selectedShipRouteVessel`
- Wired `flyToTarget={vesselFlyToTarget}` to the `EmisMap` component
- EmisMap's existing `flyToTarget` effect handles deduplication via `lastFlyToKey`
- Edge case: if vessel has no coordinates (`lastLatitude`/`lastLongitude` is null), `vesselFlyToTarget` is null (no flyTo)

## P1.4: Make Vessel Catalog Viewport-Aware

Server-side:

- Added optional `bbox` parameter to `listEmisShipRouteVesselsQuerySchema` (reuses `mapBboxSchema` from emis-map contracts)
- Added bbox filtering to `listShipRouteVesselsQuery` in `packages/emis-server/src/modules/ship-routes/queries.ts`: when bbox is provided, filters on `last_latitude`/`last_longitude` within the bounding box
- Updated route handler `apps/web/src/routes/api/emis/ship-routes/vessels/+server.ts` to parse and pass `bbox` from URL params
- Backward-compatible: when bbox is omitted, returns all vessels

Client-side:

- Added `onBoundsChange` callback prop to `EmisMap.svelte` -- fires after each successful overlay refresh with the current bbox string
- Added `mapBbox` state to `+page.svelte`
- Added `handleBoundsChange` handler that updates `mapBbox`
- Added debounced `$effect` that reloads the catalog when `mapBbox` changes (400ms debounce)
- In vessel mode, catalog loads with bbox filter; outside vessel mode, loads without bbox
- Replaced mount-time `loadShipRouteCatalog()` call with the reactive effect (handles initial load too)

## P1.5: Add Regression Coverage

- Added 2 new smoke checks to `scripts/emis-smoke.mjs`:
  - `api:ship-routes:vessels:bbox` -- fetches vessel catalog with full-world bbox, validates response shape and that filtered rows have coordinates
  - `contract:vessels:bad-bbox` -- sends invalid bbox string, expects 400 error
- Total smoke count: 34/34 (up from 31)

## Final Verification

All 6 canonical checks green:

| Check                     | Result               |
| ------------------------- | -------------------- |
| `pnpm check`              | 0 errors, 0 warnings |
| `pnpm build`              | success              |
| `pnpm lint:boundaries`    | no violations        |
| `pnpm emis:smoke`         | 34/34 checks pass    |
| `pnpm emis:offline-smoke` | all checks pass      |
| `pnpm emis:write-smoke`   | all flows pass       |

## Files Changed

### New files

- `docs/emis_vessel_track_contract.md` — behavior contract for P1

### Modified files

- `apps/web/src/routes/emis/+page.svelte` — removed isVesselMode guards, added flyToTarget, onBoundsChange, bbox-aware catalog loader
- `packages/emis-ui/src/emis-map/EmisMap.svelte` — added `onBoundsChange` prop
- `packages/emis-contracts/src/emis-ship-route/model/schema.ts` — added optional `bbox` to vessels query schema
- `packages/emis-server/src/modules/ship-routes/queries.ts` — added bbox filtering to `listShipRouteVesselsQuery`
- `apps/web/src/routes/api/emis/ship-routes/vessels/+server.ts` — parse and pass bbox param
- `scripts/emis-smoke.mjs` — 2 new smoke checks for vessel bbox behavior
- `docs/agents/lead-tactical/last_report.md` — this report
- `docs/agents/lead-tactical/memory.md` — P1 context added
- `docs/agents/lead-strategic/current_plan.md` — P1 status updated
- `docs/emis_next_tasks_2026_03_22.md` — P1 marked completed
