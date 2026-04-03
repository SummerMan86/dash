# Lead-Tactical Memory

Персистентная память Claude Opus lead-tactical между сессиями.
Обновляется в конце каждой сессии.

## Решения и контекст

### ST-1 + ST-2 + ST-3 (2026-04-03)
- Docs-only slices, lead-tactical напрямую
- 10 target packages: platform-core, platform-ui, platform-datasets, platform-filters, db, emis-contracts, emis-server, emis-ui, bi-alerts (conditional), bi-dashboards (conditional)
- Canonical layout: `docs/emis_monorepo_target_layout.md`

### ST-4 (2026-04-03)
- Select.svelte baseline blocker resolved
- ESLint 6 architecture boundary rule blocks in `eslint.config.js`
- `pnpm lint:boundaries` — canonical boundary-only verification (uses temp file for stdout reliability)

### ST-5 (2026-04-03)
- App moved to `apps/web/`: src, static, svelte.config.js, vite.config.ts, tsconfig.json, tailwind.config.js
- Root → workspace orchestrator with `pnpm -C apps/web` wrappers
- `.env*` stays at root, vite references `../../.env`
- ESLint globs, lint-boundaries targets, smoke CWD — all updated to `apps/web/src/`
- All doc `src/` references → `apps/web/src/`
- pnpm check: 0 errors, build: success, lint:boundaries: 3 expected gaps

### ST-6 (2026-04-03)
- 5 packages extracted: platform-core, db, platform-ui, platform-datasets, platform-filters
- Wave 1 (leaf): platform-core (format.ts + useDebouncedLoader) + db (pg.ts)
- Wave 2: platform-ui (15 UI families + styles/tokens), platform-datasets (contracts/IR + compile + postgresProvider), platform-filters (types/store/planner + filter widgets)
- Re-export shims at old paths (marked `// MIGRATION`) — all $alias imports continue working
- mockProvider stays in apps/web (fixture dep), fetchDataset stays in apps/web (cross-package composition)
- `$app/environment` replaced with `typeof window !== 'undefined'` in platform-filters (arch review fix)
- Orphaned model dirs deleted, dead duplicates cleaned up (code review fix)
- apps/web renamed to @dashboard-builder/web

### ST-7 (2026-04-03)
- 3 EMIS packages extracted: emis-contracts, emis-server, emis-ui
- Wave 1 (leaf): emis-contracts — 7 entity dirs with subpath exports, dep: zod
- Wave 2: emis-server — infra + modules, deps: emis-contracts, db, @sveltejs/kit (peer), zod, pg (peer), @types/pg (dev)
- Wave 3: emis-ui — emis-map widgets + emis-status-bar, deps: emis-contracts, platform-core, platform-datasets, platform-ui, maplibre-gl, pmtiles, @protomaps/basemaps
- Kept in app: emis-drawer (depends on $widgets/filters), emis-manual-entry (depends on $app/forms)
- Re-export shims at all old paths marked `// MIGRATION`
- Docs updated: AGENTS.md, emis_architecture_baseline.md, emis_session_bootstrap.md, server/emis/AGENTS.md, docs/AGENTS.md, routes/emis/AGENTS.md

### Integration branch
- `feature/emis-foundation-stabilization`
- Latest commit: `76d37e1` (ST-7: extract EMIS packages)

## Проблемы и workarounds

- `pnpm lint` not green (pre-existing Prettier drift) — not blocking
- ESLint `no-restricted-imports` flat config — each scope needs ONE combined block, `replace_all` on first glob misses subsequent globs in array
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability
- `git add -A` caught `.claude/agent-memory/` and `target` — now in `.gitignore`

## Заметки для следующей сессии

- **Следующий шаг: ST-8** (Rationalize BI/Dashboard Packages And Remaining App Glue)
- ST-7 lessons:
  - Same wave approach (leaf first) continued to work well
  - `$app/forms` prevents extraction of Svelte forms to packages — keep in app
  - `$widgets/filters` cross-widget dep prevents EmisDrawer extraction — keep in app
  - emis-server has SvelteKit coupling (http.ts `handleEmisRoute`, audit.ts `resolveEmisWriteContext`) — valid arch concern, deferred to avoid behavior change in extraction slice
  - EmisMap.svelte is 1224 lines — decomposition candidate for future slice, not ST-7 scope
  - clampPageSize() duplicated in news/objects queries — pre-existing, not ST-7 scope
  - Top-level `svelte`/`types` fields in package.json removed when subpath exports are authoritative
  - Working directory matters with symlinks — use absolute paths for cp/mkdir
- Package naming: `@dashboard-builder/{name}`, workspace:* protocol
- Current packages: platform-core, db, platform-ui, platform-datasets, platform-filters, emis-contracts, emis-server, emis-ui
- Review Gate findings accepted/deferred:
  - SvelteKit coupling in emis-server — follow-up, not same slice
  - EmisMap decomposition — follow-up for ST-8 or later
  - Pre-existing code issues (clampPageSize dup, bbox hardcoded indices) — not ST-7 scope
