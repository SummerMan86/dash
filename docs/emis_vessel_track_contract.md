# EMIS Vessel Historical Track — Behavior Contract

Frozen on 2026-04-04 as part of P1.1.

## Status

Active. This contract governs all P1 slices (P1.1 through P1.5).

## Context

Before P1, vessel mode (`layer=vessels`) showed only current vessel positions on the map overlay via `/api/emis/map/vessels`. Historical track data (points/segments) was loaded through the ShipRoutePanel, which was hidden in vessel mode. Selecting a vessel from the catalog set `selectedFeature` but did not trigger a flyTo or display historical track on the map in vessel mode.

## Goal

Extend vessel mode so that selecting a vessel from the catalog triggers:

1. Historical track loading and rendering on the map
2. Viewport centering on the selected vessel
3. Catalog awareness of the current viewport

## Behavior Contract

### 1. Track Loading Trigger

- **When:** A vessel is selected from the catalog (via `selectVesselFromCatalog()`)
- **What loads:** Historical track data for the selected vessel
- **Default route mode:** `both` (points and segments)
- **Mechanism:** The existing `shipRouteLoader` already watches `selectedShipHbkId` and loads data automatically. The fix is to ensure this data flows to the map in vessel mode, not to add a new loading mechanism.

### 2. Track Data on Map in Vessel Mode

- **Current behavior:** `routePointsData` and `routeSegmentsData` are passed as `undefined` when `isVesselMode` is true, and `routeFocusKey` is set to `null`. The ShipRoutePanel is hidden entirely.
- **Target behavior:** In vessel mode, the selected vessel's historical track (points + segments) should render on the map alongside the vessel overlay dots. The track data should flow to `EmisMap` via `routePointsData` and `routeSegmentsData` props.
- **Implementation:** Remove the `isVesselMode` guard on `routePointsData`, `routeSegmentsData`, and `routeFocusKey` in the `EmisMap` invocation. The ShipRoutePanel remains hidden in vessel mode (its information-density is more useful for the dedicated ship-route analysis, not the overview vessel mode).

### 3. Fly-To on Vessel Selection

- **When:** A vessel is selected from the catalog
- **Target:** The map centers on the vessel's last known position (`lastLatitude`, `lastLongitude`)
- **Zoom:** `6` (default, shows regional context around the vessel)
- **Mechanism:** The `flyToTarget` prop already exists on `EmisMap` and is wired to `map.flyTo()`. Derive `flyToTarget` from the selected vessel's coordinates.
- **Edge case:** If `lastLatitude` or `lastLongitude` is null, do not fly (vessel has no known position).

### 4. Vessel Catalog Viewport Awareness

- **Behavior:** The vessel catalog in `SearchResultsPanel` shows all vessels from `mart.emis_ship_route_vessels`, not filtered by viewport.
- **Target behavior:** The catalog shows vessels whose last known position is within the current map viewport.
- **Mechanism:** Pass the current map bbox to the vessel catalog fetch. The `/api/emis/ship-routes/vessels` endpoint does not currently support bbox filtering, so either:
  - (a) Add optional `bbox` parameter to the vessels endpoint (server-side filtering), or
  - (b) Client-side filter the catalog by bbox after fetch
- **Decision:** Option (a) is preferred. Add an optional `bbox` parameter to `listShipRouteVesselsQuery` that filters on `last_latitude`/`last_longitude` within the bbox. This reuses the same bbox-based pattern already established in `/api/emis/map/vessels`.
- **Fallback:** If no bbox is provided, return all vessels (backward-compatible).
- **Catalog refresh:** The catalog should refresh when the map viewport changes (debounced, like other overlays).

### 5. Default Route Mode

- **Default:** `both` (points and segments)
- **User control:** The `routeMode` filter remains available and controls what is rendered
- **No change to existing API:** Points and segments endpoints remain separate; the client fetches both in parallel when mode is `both`

## API Surface

No new endpoints. Changes to existing endpoints:

### `/api/emis/ship-routes/vessels` — add optional `bbox` parameter

- **Parameter:** `bbox` (string, format: `west,south,east,north`)
- **Behavior:** When provided, filters vessels to those whose `last_latitude`/`last_longitude` fall within the bounding box. Vessels with null coordinates are excluded when bbox is specified.
- **Validation:** Same format as existing map bbox parameters (4 comma-separated numbers, west < east, south < north)
- **Backward-compatible:** When omitted, returns all vessels (existing behavior)

## Component Responsibilities

| Component | P1 Change |
|---|---|
| `+page.svelte` | Wire `flyToTarget`, remove `isVesselMode` guard on route data props, add bbox state from map |
| `EmisMap.svelte` | Already supports `flyToTarget` — no changes needed |
| `SearchResultsPanel.svelte` | Receive refreshed catalog when viewport changes |
| `ShipRoutePanel.svelte` | No change (stays hidden in vessel mode) |
| `filters.ts` | No change |
| `/api/emis/ship-routes/vessels` | Add optional bbox parameter |
| `queries.ts` (ship-routes) | Add bbox filtering to `listShipRouteVesselsQuery` |
| `emis-ship-route/schema.ts` | Add bbox to `listEmisShipRouteVesselsQuerySchema` |

## Out of Scope

- Changing the ShipRoutePanel visibility in vessel mode
- Changing the route mode default
- Adding new map layer types (e.g., heatmap)
- Vessel clustering on the map
- Real-time vessel position updates
- Animation of historical track playback

## Verification

After P1 is complete:

- Selecting a vessel from the catalog in vessel mode centers the map on the vessel
- Historical track (points + segments) renders on the map in vessel mode
- Vessel catalog updates when map viewport changes
- All existing smoke tests remain green
- New smoke test exercises the vessel historical track behavior (bbox on vessels endpoint)
