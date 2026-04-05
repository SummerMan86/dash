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
- fetchDataset: was explicitly deferred in `H-5`; closed later in `P3.2` as a platform-level boundary fix
- Verification: pnpm check 0 errors, pnpm build success, lint:boundaries 3 pre-existing only at that time (`fetchDataset` was closed later in `P3.2`)

## Проблемы и workarounds

- `pnpm lint` not green (pre-existing Prettier drift) — not blocking
- ESLint `no-restricted-imports` flat config — each scope needs ONE combined block
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability
- `git add -A` caught `.claude/agent-memory/` and `target` — now in `.gitignore`
- `export { X } from 'Y'` does NOT bring X into local scope — reviewers may flag this as duplicate import when combined with `import { X } from 'Y'`, but both are needed

### Wave P3 (EMIS Phase 2 Baseline Truthfulness And Boundary Enforcement)

All P3 slices completed on `2026-04-04`:

- `P3.1` — docs-only baseline routine and verdict alignment
- `P3.2` — `fetchDataset.ts` boundary gap closed, `EXC-ARCH-002` removed
- `P3.3` — package-aware enforcement in `eslint.config.js` and `lint-boundaries.mjs`
- `P3.4` — `EmisMap.svelte` decomposed to 695 lines, `EXC-ARCH-004` closed
- `P3.5` — root smoke harness drift repaired, dev-SSR resolution fixed
- `P3.6` — dead app-side server shims removed (`datasets/compile.ts`, `providers/postgresProvider.ts`, `db/pg.ts`)

Baseline verdict after P3.5 rerun: **Green / baseline closed**.

### DS-1..DS-4 (Repo-Wide Doc Sync Follow-up)

Completed on `2026-04-04` as a docs-only bounded package:

- Active docs synced with `docs/architecture.md` canonical contract
- Stale "FSD as architecture" wording removed from active memory/reviewer docs
- Stale "fetchDataset live blocker" wording removed from active docs
- Deleted shim paths removed from active navigation docs
- EMIS operational path in root `AGENTS.md` corrected to package path
- `server/AGENTS.md` structure diagram updated to reflect P3.6 deletions
- Historical slice logs in reviewer memory explicitly framed as historical

### NW-1: Access Model Freeze and Write-Policy Design (DONE, 2026-04-04)

Docs/design only, no code changes. Backlog mapping: M1.1, M1.2.

- Rewrote `docs/emis_access_model.md` as canonical access model reference:
  - Operating model: trusted internal network (explicit, accepted limitation)
  - Role semantics: `viewer` (read-only, implicit), `editor` (writes with actor), `admin` (deferred)
  - Full auth/RBAC/sessions explicitly deferred beyond MVE
  - One-paragraph summary for quick reference
- Designed `assertWriteContext()` write-policy helper contract:
  - Signature: `assertWriteContext(request, source): EmisWriteContext`
  - Strict mode (`EMIS_WRITE_POLICY=strict` or production): 403 `WRITE_NOT_ALLOWED` if no actor header
  - Permissive mode (dev/local default): backward-compatible auto-default actor
  - Ownership: `apps/web/src/lib/server/emis/infra/writePolicy.ts` (app-level)
  - Drop-in replacement for `resolveEmisWriteContext()` in routes
- Added write-policy contract section and helper table to `RUNTIME_CONTRACT.md`
- Updated `emis_session_bootstrap.md` with access model status
- Previous version of `emis_access_model.md` implied future `requireEmisRole()` RBAC — removed, replaced with frozen MVE contract

### NW-2: Centralized Write Guardrails Rollout (DONE, 2026-04-04)

Code implementation of frozen NW-1 design. Backlog mapping: M1.3, M1.4, M1.5.

- Created `apps/web/src/lib/server/emis/infra/writePolicy.ts` (82 lines):
  - `assertWriteContext(request, source)` wraps `resolveEmisWriteContext()` with policy enforcement
  - Strict mode (`EMIS_WRITE_POLICY=strict`): requires explicit actor header, throws `EmisError(403, 'WRITE_NOT_ALLOWED')` if missing
  - Permissive mode (default): delegates to `resolveEmisWriteContext()` unchanged (backward-compatible)
  - No SQL, no `@sveltejs/kit` imports, no business logic beyond policy
- Replaced `resolveEmisWriteContext()` with `assertWriteContext()` in all 10 write entry points:
  - 6 API route files (source `'api'`)
  - 4 form action files (source `'manual-ui'`)
  - Zero remaining direct `resolveEmisWriteContext()` calls in routes
- Added `write-policy` check to `scripts/emis-write-smoke.mjs`:
  - Permissive mode: POST without actor -> 201 (auto-default actor, cleanup probe entity)
  - Strict mode: POST without actor -> 403 WRITE_NOT_ALLOWED
- Updated docs: `RUNTIME_CONTRACT.md` and `emis_access_model.md` — removed "NW-2 target"/"not yet implemented" markers
- Verification: `pnpm check` 0 errors, `pnpm build` success, `pnpm lint:boundaries` no violations

### NW-4: Health/Readiness and API Error Logging Hardening (DONE, 2026-04-05)

Observability package for EMIS operational routes. Backlog mapping: M3.1, M3.2, M3.3, M3.4.

- Created `apps/web/src/routes/api/emis/readyz/+server.ts`:
  - DB-backed runtime readiness: DATABASE_URL, PG connectivity, required schemas (`emis`, `stg_emis`, `mart_emis`, `mart`), published views (6 views)
  - Published-view identifiers validated at module load via regex guard
  - Returns `200 { status: 'ready', checks, durationMs }` or `503 { status: 'not_ready', checks, failures, durationMs }`
- Enhanced `handleEmisRoute()` in `$lib/server/emis/infra/http.ts`:
  - Request correlation: accepts `x-request-id` from incoming headers (truncated to 128 chars), generates UUID if missing, returns in all responses
  - Structured error logging: JSON log entry on every 4xx/5xx with `service`, `level`, `requestId`, `method`, `path`, `status`, `code`, `durationMs`, optional `actorId` and `message`
  - `jsonEmisError()` now accepts optional `headers` param for correlation
  - Correlation headers constructed only in error path (success path sets header directly on response)
- Added 4 smoke checks to `scripts/emis-smoke.mjs`:
  - `api:readyz` — shape validation for both 200 and 503
  - `contract:request-id:generated` — server generates x-request-id when not sent
  - `contract:request-id:echo` — server echoes back client-sent x-request-id
  - `contract:error-correlation` — error responses include x-request-id
- Updated docs:
  - `RUNTIME_CONTRACT.md` — added request correlation, structured error logging, health/readiness sections
  - `docs/emis_observability_contract.md` — upgraded from target to implemented status, added response shape examples
  - `current_plan.md` — NW-4 marked completed, next steps updated to NW-5 only
- Verification: `pnpm check` green, `pnpm build` green, `pnpm lint:boundaries` green, `pnpm emis:smoke` green

### NW-5: MVE Acceptance Audit and Sign-Off (DONE, 2026-04-05)

Docs/audit + verification only, no code changes. Backlog mapping: M4.1, M4.2, M4.3.

- Audited every acceptance criterion from `docs/emis_mve_product_contract.md` section 7:
  - Data/platform: 6/6 done (snapshot DB truth, seeds, PostGIS+indexes, published read-models, Docker Compose, health/readiness)
  - Objects/news/links: 5/5 done (CRUD objects, CRUD news, manage links, related news on object detail, related objects on news detail)
  - Workspace/map: 5/5 done (map objects, map news, filter sync, bbox endpoints, real workspace scenario)
  - BI integration: 3/3 done (4 datasets in UI, read-models documented, coexistence with BI)
- Explicit deferrals (accepted, not blocking): auth/RBAC, admin CRUD, admin role, news soft-delete UI button
- Updated `emis_session_bootstrap.md` — MVE accepted status, verification date, explicit deferrals
- Updated `emis_next_tasks_2026_03_22.md` — M3/M4 completed, active order starts from P1
- Final verification pass: all 6 canonical checks green (check, build, lint:boundaries, emis:smoke 31/31, offline-smoke, write-smoke)
- MVE verdict: **accepted with explicit deferrals**

### P1: Vessel Historical Track Integration (DONE, 2026-04-04)

All 5 P1 slices completed on `main`. Backlog mapping: P1.1 through P1.5.

- P1.1 — Behavior contract frozen in `docs/emis_vessel_track_contract.md`
- P1.2 — Removed `isVesselMode` guards on route data props in EmisMap invocation; historical track now renders in vessel mode
- P1.3 — Added `vesselFlyToTarget` derived from selected vessel coordinates; wired `flyToTarget` prop to EmisMap
- P1.4 — Added optional `bbox` parameter to `/api/emis/ship-routes/vessels` endpoint; added `onBoundsChange` callback to EmisMap; catalog refreshes on viewport change in vessel mode
- P1.5 — Added 2 smoke checks: `api:ship-routes:vessels:bbox` (bbox filtering) and `contract:vessels:bad-bbox` (error shape on invalid bbox)
- Key files changed:
  - `+page.svelte` — route data flow, flyToTarget, bbox state, viewport-aware catalog loader
  - `EmisMap.svelte` — `onBoundsChange` prop
  - `emis-ship-route/model/schema.ts` — optional `bbox` in vessels query schema
  - `ship-routes/queries.ts` — bbox filtering in `listShipRouteVesselsQuery`
  - `ship-routes/vessels/+server.ts` — bbox URL param parsing
  - `emis-smoke.mjs` — 2 new checks
- Verification: all 6 canonical checks green (34/34 smoke checks)

### Phase 3: Tech Debt Cleanup (DONE, 2026-04-05)

All 5 TD slices completed on `feature/emis-phase3-tech-debt-cleanup`. Branch stats: 235 files changed, net -2507 lines.

- TD-1 — `+page.svelte` decomposed from 799 to 639 lines (extracted `emisPageDataLoaders.ts`, `emisPageVesselMode.ts`, `EmisInfoCards.svelte`)
- TD-2 — 72 MIGRATION re-export shims removed from `entities/`, `shared/`, `widgets/` (-3280 lines)
- TD-3 — stock-alerts widget-to-routes boundary violation fixed (moved route-dependent code to widget-local helper)
- TD-4 — Prettier formatting drift fixed across 90 files (32 re-drifted from subsequent TD-1/TD-2/TD-3 commits — cosmetic only)
- TD-5 — Final baseline verdict: Green / baseline closed, zero carry-forward

Key observations:

- 16 server-side MIGRATION re-export shims remain in `apps/web/src/lib/server/emis/` — active re-exports with 9+ route consumers, explicitly out of TD-2 scope
- `pnpm lint` (Prettier) not green due to re-drift from post-TD-4 commits — not in canonical 6 checks
- All 6 canonical checks green: check, build, lint:boundaries, emis:smoke (33/33), emis:offline-smoke (9/9), emis:write-smoke (7/7)

### Phase 4: MVE Deferrals Implementation (DONE, 2026-04-05)

All DF slices completed on `feature/emis-phase3-tech-debt-cleanup`.

- DF-1 — Soft-delete UI buttons for objects and news detail pages (confirmation dialog, redirect, error handling)
- DF-2 — Admin CRUD for dictionaries: `/emis/admin/dictionaries` page, 6 API endpoints for countries/object_types/sources
- DF-3 — Session-based auth: login page at `/emis/login`, cookie-based sessions (`auth.ts`), role enforcement in hooks + writePolicy, admin route protection
- DF-5 — Governance closure: all MVE deferrals resolved, baseline Green, docs updated

Key files added/modified:
- `apps/web/src/lib/server/emis/infra/auth.ts` — session auth module (auth mode, user store, session store, role hierarchy, route classification)
- `apps/web/src/lib/server/emis/infra/writePolicy.ts` — extended to support session-based actor resolution
- `apps/web/src/routes/emis/login/` — login page (GET/POST)
- `apps/web/src/routes/emis/admin/dictionaries/` — admin CRUD UI
- `apps/web/src/routes/api/emis/dictionaries/` — 6 API endpoints (countries, object_types, sources)
- `apps/web/src/routes/emis/objects/[id]/+page.svelte` — delete button added
- `apps/web/src/routes/emis/news/[id]/+page.svelte` — delete button added
- `hooks.server.ts` — session resolution middleware, auth enforcement

MVE verdict: **accepted, no remaining deferrals** (upgraded from "accepted with explicit deferrals").

Verification: all 6 canonical checks green (check, build, lint:boundaries, emis:smoke 38/38, offline-smoke 9/9, write-smoke 7/7).

## Заметки для следующей сессии

- H-1..H-5 all done — wave H is complete
- P3.1..P3.6 all done — phase 2 is complete
- DS-1..DS-4 done — active docs layer synced with canonical architecture
- NW-1..NW-5 done — access model, write-policy, dictionaries, observability, MVE acceptance
- **MVE is closed. All deferrals resolved.**
- **P1 done** — vessel historical track integration
- **P2 done** — offline maps ops hardening
- **Phase 3 done** — tech debt cleanup, baseline Green / closed
- **Phase 4 done** — MVE deferrals (DF-1 soft-delete UI, DF-2 admin CRUD, DF-3 auth, DF-5 governance)
- All carry-forward items from P1/P2 era are resolved
- Remaining optional future cleanup:
  - 16 server-side MIGRATION re-export shims (active, not dead code)
  - `pnpm lint` Prettier re-drift (cosmetic)
- Codebase is ready for next product planning cycle
