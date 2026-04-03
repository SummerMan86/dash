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

### ST-8 (2026-04-03)
- Rationalization slice — no new packages extracted
- bi-dashboards: KEPT IN APP — no second consumer, SvelteKit routes can't be in packages, `dashboard-edit` uses `$app/environment`, `fetchDataset` is app-level filter composition
- bi-alerts: KEPT IN APP — no second consumer, tied to hooks.server.ts lifecycle, env-specific config
- Verified EMIS/BI separation clean — zero cross-imports between BI routes and EMIS packages
- Deleted 7 empty placeholder directories (entities/dashboard, entities/widget, widgets/chart/kpi/dashboard-container/table, shared/config)
- Updated 7 AGENTS.md files with canonical placement notes and package verdicts
- All MIGRATION shims classified explicitly (ST-10 cleanup candidates)
- Dataset definitions confirmed canonical in apps/web/src/lib/server/datasets/definitions/
- Pre-existing issues documented but not touched: stock-alerts→routes FSD violation, fetchDataset FSD gap, cacheKeyQuery redundancy

### ST-9 (2026-04-03)
- Verification/docs coherence slice — no structural changes
- Integrated verification: pnpm check 0 errors, pnpm build success, lint:boundaries 3 pre-existing violations
- Fixed 6 stale branch name references in current_plan.md (feature/emis-monorepo-readiness → feature/emis-foundation-stabilization)
- Fixed stale Select.svelte parse error description in emis_architecture_baseline.md (resolved in ST-4, baseline now green)
- Fixed stale README structural description — now accurately describes 8-package monorepo layout
- Added `pnpm lint:boundaries` to README commands section
- Docs audit: 28 local AGENTS.md files verified, all paths correct, reading orders consistent
- No regressions from ST-4..ST-8

### ST-10 (2026-04-03)
- Docs-only cleanup slice — no runtime code, no package topology
- Added explicit doc classification (canonical/active/reference/archive) to docs/AGENTS.md
- Fixed stale forward-tense in emis_working_contract.md (Select.svelte blocker → past tense)
- Normalized README.md "Что уже есть" with conceptual-path clarification
- Added emis_monorepo_target_layout.md to root AGENTS.md EMIS starting path
- Removed empty docs/emis/ directory
- Added missing archive/emis/emis_todo_vessel_markers.md to catalog
- Separated Agent Workflow docs into new section 3a in docs/AGENTS.md
- All 34 doc references verified — none broken

### Integration branch
- `feature/emis-foundation-stabilization`
- Commits: `a0ee817` (ST-8 main), `d78e6d9` (Review Gate fixes), ST-9/ST-10 changes uncommitted

## Проблемы и workarounds

- `pnpm lint` not green (pre-existing Prettier drift) — not blocking
- ESLint `no-restricted-imports` flat config — each scope needs ONE combined block, `replace_all` on first glob misses subsequent globs in array
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability
- `git add -A` caught `.claude/agent-memory/` and `target` — now in `.gitignore`

## Заметки для следующей сессии

- **ST-1 through ST-10 all completed** — full plan executed
- Package naming: `@dashboard-builder/{name}`, workspace:* protocol
- Current packages (8): platform-core, db, platform-ui, platform-datasets, platform-filters, emis-contracts, emis-server, emis-ui
- No BI packages created (bi-dashboards, bi-alerts both deferred with justification)
- MIGRATION shims still in place — ~53 re-export files (code cleanup, not docs scope)
- Pre-existing carry-forward (all deferred, none blocking):
  - SvelteKit coupling in emis-server (http.ts/audit.ts) — deferred from ST-7
  - EmisMap.svelte 1224 lines — decomposition candidate
  - stock-alerts→routes FSD violation
  - fetchDataset FSD gap (shared imports entities)
  - clampPageSize() duplication in news/objects queries
  - cacheKeyQuery redundancy in fetchDataset
