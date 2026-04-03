# Lead-Tactical Memory

Персистентная память Claude Opus lead-tactical между сессиями.
Обновляется в конце каждой сессии.

## Решения и контекст

### Wave ST-1..ST-10 (closed, 2026-04-03)
- All 10 structural slices accepted on `feature/emis-foundation-stabilization`
- 8 packages: platform-core, db, platform-ui, platform-datasets, platform-filters, emis-contracts, emis-server, emis-ui
- BI kept in app (bi-dashboards, bi-alerts) with justification
- ~53 MIGRATION re-export shims still in place
- Integration branch: `feature/emis-foundation-stabilization`

### Wave H (EMIS Post-Split Hardening And Boundary Cleanup)
- Integration branch: `feature/emis-post-split-hardening` (created from `feature/emis-foundation-stabilization`)
- Plan: `docs/agents/lead-strategic/current_plan.md`

#### H-1: Make emis-server transport-agnostic (DONE, 2026-04-03)
- Moved `jsonEmisList`, `jsonEmisError`, `handleEmisRoute` from `packages/emis-server/src/infra/http.ts` → `apps/web/src/lib/server/emis/infra/http.ts`
- Removed `@sveltejs/kit` from emis-server peerDependencies
- Package-level http.ts now has only framework-agnostic parsing/validation/constants/types
- `audit.ts` was already framework-agnostic (Web API `Request`), untouched
- No route files changed — all 18 handlers still import from `$lib/server/emis/infra/http`
- No API behavior changes
- Docs updated: emis-server/AGENTS.md, routes/api/emis/AGENTS.md, RUNTIME_CONTRACT.md
- Review Gate: 4/4 reviewers ran, all findings addressed
  - Key fix: restructured imports to avoid confusing `export from` + `import` pattern
  - Key fix: split RUNTIME_CONTRACT.md helpers table into package-level vs app-layer sections
- Verification: pnpm check clean, pnpm build success, lint:boundaries 3 pre-existing only

#### H-2: Remove invalid emis-ui -> platform-datasets edge (DONE, 2026-04-03)
- Relocated `JsonPrimitive` and `JsonValue` from `platform-datasets/contract.ts` to `platform-core/src/types.ts` (canonical home)
- `platform-datasets/contract.ts` now imports from `platform-core` and re-exports for backward compatibility
- Added `@dashboard-builder/platform-core` as dependency of `platform-datasets` (allowed per target graph)
- `EmisMap.svelte` now imports `JsonValue` from `@dashboard-builder/platform-core`
- Removed `@dashboard-builder/platform-datasets` from `emis-ui/package.json`
- Updated `emis-ui/AGENTS.md` to reflect corrected dependency list
- No behavioral changes, type-only relocation
- Verification: pnpm check 0 errors, pnpm build success, lint:boundaries 3 pre-existing only (no new violations)
- Review Gate: 3/3 reviewers passed (architecture, code, docs)
#### H-3: Normalize EMIS route imports (DONE, 2026-04-03)
- Replaced all `$entities/emis-*` imports with `@dashboard-builder/emis-contracts/*` (14 import lines across 14 route files)
- Replaced all `$lib/server/emis/modules/*` imports with `@dashboard-builder/emis-server/modules/*` (18 import lines)
- Replaced all `$lib/server/emis/infra/errors` imports with `@dashboard-builder/emis-server/infra/errors` (8 import lines)
- Replaced all `$lib/server/emis/infra/audit` imports with `@dashboard-builder/emis-server/infra/audit` (6 import lines)
- Replaced `$lib/server/emis/infra/mapConfig` with `@dashboard-builder/emis-server/infra/mapConfig` (1 import line)
- Kept `$lib/server/emis/infra/http` as-is in all 18 route files (app-owned transport glue)
- health/+server.ts untouched (no EMIS shim imports)
- Updated AGENTS.md to prescribe direct package imports, prohibit shim paths for new routes
- No behavioral changes — import-only normalization
- Verification: pnpm check 0 errors, pnpm build success, lint:boundaries 3 pre-existing only
- Review Gate: architecture (PASS), code (PASS), docs (PASS)
#### H-4a: Decompose EmisMap.svelte pressure (DONE, 2026-04-03)
- EmisMap.svelte reduced from 1225 to 904 lines (26% reduction, 321 lines removed)
- Extracted 3 files into `packages/emis-ui/src/emis-map/`:
  - `feature-normalizers.ts` (179 lines) — 5 pure normalizer functions
  - `overlay-fetch.ts` (130 lines) — fetch helper, URL builders, layer visibility, types
  - `DiagnosticsHud.svelte` (148 lines) — diagnostics HUD child component
- Also removed duplicate `getStatusTone()`, `getActiveBasemapLabel()` from parent
- Refactored `refreshOverlays()` to use `buildOverlayUrls`, `buildOverlayKey`, `resolveVisibleLayers`
- Refactored `handleFitBounds()` to use `resolveVisibleLayers`
- Added 2 subpath exports to package.json: `./emis-map/feature-normalizers`, `./emis-map/overlay-fetch`
- Updated AGENTS.md with new file listing and subpath table
- Verification: pnpm check 0 errors, pnpm build success, lint:boundaries 3 pre-existing only
- H-4b deferred: diff was substantial (365 lines deleted from EmisMap.svelte, 457 lines in new files)
- Review Gate (run by orchestrator): arch OK, code request-changes (fixed), docs request-changes (fixed)
  - Fixed: pre-existing bug in `resolveVisibleLayers` — `showVessels` was missing `layer === 'all'`
  - Fixed: `BasemapSource` type duplication — extracted to `overlay-fetch.ts`, imported in both components
  - Fixed: stale line count in AGENTS.md follow-up note
#### H-4b: Decompose +page.svelte route (DONE, 2026-04-03)
- +page.svelte reduced from 1559 to 767 lines (51% reduction, 792 lines extracted)
- Extracted 5 route-local files into `apps/web/src/routes/emis/`:
  - `emisPageHelpers.ts` (82 lines) — pure utility/formatting functions, type aliases (SearchResultKind, RouteMode, RouteUrlSelection), URL helpers, parsers
  - `emisPageSelection.ts` (80 lines) — selection builder functions (route point, route segment, vessel), navigation href helpers, ShipRouteVesselOption type
  - `emisPageGeoJson.ts` (55 lines) — ship route GeoJSON FeatureCollection builders (point + segment)
  - `SearchResultsPanel.svelte` (382 lines) — right-column panel: vessel catalog, object/news search results, selected feature detail
  - `ShipRoutePanel.svelte` (398 lines) — ship route slice card + latest track points card
- Also removed: `selectRouteSegment()` (unused after extraction), `isSelectedObject()`, `isSelectedNews()` (moved into SearchResultsPanel)
- Removed unused imports: `EmisShipRouteVessel`, `Skeleton`, `EMIS_SHIP_ROUTE_FILTER_IDS` from +page.svelte
- Updated AGENTS.md with new file listing
- Verification: pnpm check 0 errors, pnpm build success, lint:boundaries 3 pre-existing only
#### H-5: Close remaining boundary hardening gaps (DONE, 2026-04-03)
- Residual 1 (mapConfig boundary exception): switched BI route `vessel-positions/+page.server.ts` from shim `$lib/server/emis/infra/mapConfig` to canonical `@dashboard-builder/emis-server/infra/mapConfig`; also normalized 2 EMIS routes (`emis/+page.server.ts`, `emis/pmtiles-spike/+page.server.ts`); deleted the now-unused shim `apps/web/src/lib/server/emis/infra/mapConfig.ts`; updated `routes/api/emis/AGENTS.md` to document deletion
- Residual 2 (clampPageSize duplication): extracted `clampPageSize()` and `clampMapLimit()` to `packages/emis-server/src/infra/http.ts` using existing constants; replaced local copies in `modules/objects/queries.ts`, `modules/news/queries.ts`, `modules/map/queries.ts`; `ship-routes/queries.ts` has a different-signature `clampLimit(value, max)` -- left as-is (not duplicated)
- Residual 3 (mapVesselsQuery fragile params): replaced hardcoded `$1`..`$4` with dynamic `$${values.length}` push-and-reference pattern, matching the style used by `appendBboxConditions` and all other query builders in the module; SQL semantics unchanged
- fetchDataset: explicitly deferred (platform-level FSD gap, not this wave's scope)
- Verification: pnpm check 0 errors, pnpm build success, lint:boundaries 3 pre-existing only (fetchDataset FSD)

## Проблемы и workarounds

- `pnpm lint` not green (pre-existing Prettier drift) — not blocking
- ESLint `no-restricted-imports` flat config — each scope needs ONE combined block
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability
- `git add -A` caught `.claude/agent-memory/` and `target` — now in `.gitignore`
- `export { X } from 'Y'` does NOT bring X into local scope — reviewers may flag this as duplicate import when combined with `import { X } from 'Y'`, but both are needed

## Заметки для следующей сессии

- H-1, H-2, H-3, H-4a, H-4b, H-5 all done — wave H is complete
- Pre-existing carry-forward (all deferred, none blocking):
  - stock-alerts->routes FSD violation
  - fetchDataset FSD gap (shared imports entities)
  - cacheKeyQuery redundancy in fetchDataset
  - ~53 MIGRATION re-export shims — code removal, not this wave's scope
