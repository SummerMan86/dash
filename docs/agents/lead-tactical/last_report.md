# Report: ST-7 — Extract EMIS Packages And Isolate EMIS Ownership

## Статус
Выполнено

## Что сделано

### Wave 1 — emis-contracts (leaf)
- `packages/emis-contracts` — 7 entity dirs с subpath exports:
  - emis-geo, emis-dictionary, emis-news, emis-object, emis-link, emis-ship-route, emis-map
  - Internal cross-entity imports (emis-news/emis-object → emis-geo) переведены на relative paths
  - Dep: zod

### Wave 2 — emis-server
- `packages/emis-server` — infra (7 файлов) + modules (6 доменов):
  - infra: db, errors, http, audit, mapConfig, pmtilesBundle, pmtilesSpike
  - modules: news, objects, links, dictionaries, map, ship-routes
  - `$lib/server/db/pg` заменён на `@dashboard-builder/db`
  - `$entities/emis-*` заменены на `@dashboard-builder/emis-contracts/emis-*`
  - Deps: emis-contracts, db, zod; peers: @sveltejs/kit, pg; dev: @types/pg

### Wave 3 — emis-ui
- `packages/emis-ui` — 2 widget группы:
  - emis-map: EmisMap.svelte, EmisPmtilesSpikeMap.svelte, layer-config.ts, pmtiles-protocol.ts, pmtiles-style.ts, popup-renderers.ts
  - emis-status-bar: EmisStatusBar.svelte
  - `$entities/emis-*` → `@dashboard-builder/emis-contracts/emis-*`
  - `$shared/styles/utils` → `@dashboard-builder/platform-ui`
  - `$shared/utils` → `@dashboard-builder/platform-core`
  - `$entities/dataset` → `@dashboard-builder/platform-datasets`
  - Deps: emis-contracts, platform-core, platform-datasets, platform-ui, @protomaps/basemaps, maplibre-gl, pmtiles; peer: svelte

### Intentionally stays in apps/web
- `emis-drawer` — зависит от `$widgets/filters` (FilterPanel, app-local widget)
- `emis-manual-entry` — зависит от `$app/forms` (SvelteKit-specific)
- Все `routes/api/emis/*` — thin HTTP transport (stays in app per addendum)
- Все `routes/emis/*` и `routes/dashboard/emis/*` — UI/workspace layer

### Migration strategy
- Re-export shims at all old paths (marked `// MIGRATION`)
- All existing `$entities/emis-*`, `$lib/server/emis/*`, `$widgets/emis-map/*` imports continue working through shims

### Dependency graph (EMIS packages)
```
emis-contracts (leaf, depends on zod)
emis-server → emis-contracts, db, zod; peers: @sveltejs/kit, pg
emis-ui → emis-contracts, platform-core, platform-datasets, platform-ui, maplibre-gl, pmtiles, @protomaps/basemaps; peer: svelte
```

Boundary invariants verified:
- emis-server does NOT import from emis-ui
- emis-ui does NOT import from emis-server
- Both depend on emis-contracts

### Docs updated
- `AGENTS.md` — EMIS active zones updated to reflect packages as canonical, old paths as shims
- `docs/emis_architecture_baseline.md` — placement rules updated to point to packages
- `docs/emis_session_bootstrap.md` — broken reference to widgets/emis-map/AGENTS.md fixed
- `docs/AGENTS.md` — catalog entry updated
- `apps/web/src/routes/emis/AGENTS.md` — broken reference fixed
- `apps/web/src/lib/server/emis/AGENTS.md` — migration note added, placement rules updated

## Verification
- `pnpm check` — 0 errors, 0 warnings
- `pnpm build` — success (11.6s)
- `pnpm lint:boundaries` — 3 pre-existing gaps only (fetchDataset.ts, unchanged since ST-4)
- 10 workspace projects recognized by pnpm

## Review Gate

### Вердикты ревьюеров
- security-reviewer: **OK** — no issues; all SQL parameterized, no secrets in source, write-side guardrails preserved
- code-reviewer: **OK** — migration structure fully correct; 2 pre-existing warnings noted (not ST-7 scope)
- docs-reviewer: **request changes** → исправлено → OK (broken references to widgets/emis-map/AGENTS.md, stale zone descriptions)
- architecture-reviewer: **request changes** → deferred (see below)

### Findings по severity

**Deferred (valid but out of ST-7 scope per addendum):**
- architecture-reviewer: SvelteKit coupling in emis-server — `handleEmisRoute`, `jsonEmisList`, `jsonEmisError` import from `@sveltejs/kit`; `resolveEmisWriteContext` accepts `Request` object. Valid concern, but fixing requires splitting http.ts into framework-agnostic (package) vs SvelteKit (app shim) parts — this is a behavior-adjacent refactor, deferred per "do NOT fix заодно unless blocker"
- architecture-reviewer: EmisMap.svelte 1224 lines — decomposition candidate (extract overlay-fetch, feature normalizers, diagnostics HUD). Pre-existing, not introduced by ST-7. Candidate for ST-8 or dedicated follow-up

**Pre-existing (not ST-7 scope):**
- code-reviewer: `clampPageSize()` duplicated in news/queries.ts and objects/queries.ts
- code-reviewer: hardcoded bbox param indices in `mapVesselsQuery` (fragile under future edits)

**Fixed in this slice:**
- docs-reviewer: 3 broken references to `widgets/emis-map/AGENTS.md` → fixed in docs/AGENTS.md, emis_session_bootstrap.md, routes/emis/AGENTS.md
- docs-reviewer: stale zone descriptions in AGENTS.md and emis_architecture_baseline.md → updated
- docs-reviewer: stale placement rules in server/emis/AGENTS.md → updated with migration note
- architecture-reviewer: top-level `svelte`/`types` fields in emis-ui package.json → removed (subpath exports authoritative)

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- commits: `76d37e1` (main extraction), `be6f660` (memory update)

## Handoff readiness
- 8 packages total (5 platform + 3 EMIS) extracted and working
- ST-8 (Rationalize BI/Dashboard Packages) is unblocked
- Known follow-ups for future slices:
  - SvelteKit coupling in emis-server (http.ts/audit.ts) — refactor when behavior changes are allowed
  - EmisMap.svelte decomposition — decompose when touching map functionality
  - emis-drawer/emis-manual-entry — extract if app-local deps are resolved
  - fetchDataset cross-package coupling — resolve when filter/dataset boundary stabilizes

## Вопросы к lead-strategic
- нет
