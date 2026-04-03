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

### Integration branch
- `feature/emis-foundation-stabilization`
- Latest commit: `708d9dc` (ST-6: extract shared platform packages)

## Проблемы и workarounds

- `pnpm lint` not green (pre-existing Prettier drift) — not blocking
- ESLint `no-restricted-imports` flat config — each scope needs ONE combined block, `replace_all` on first glob misses subsequent globs in array
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability
- `git add -A` caught `.claude/agent-memory/` and `target` — now in `.gitignore`

## Заметки для следующей сессии

- **Следующий шаг: ST-7** (Extract EMIS Packages And Isolate EMIS Ownership)
- ST-6 lessons:
  - Wave approach (leaf packages first, dependents second) worked well
  - Re-export shims are the safest extraction strategy — no consumer changes needed
  - Packages export source TS/Svelte (no compilation), `svelte` field + exports in package.json
  - `$app/environment` can't be used in packages — use `typeof window !== 'undefined'`
  - Delete orphaned source files after extraction, don't leave unmarked dead code
  - mockProvider (fixture dep) and fetchDataset (cross-package composition) correctly stayed in app
- Package naming: `@dashboard-builder/{name}`, workspace:* protocol
- Current packages: platform-core, db, platform-ui, platform-datasets, platform-filters
- Still needed: emis-contracts, emis-server, emis-ui (ST-7)

### ST-7 tactical addendum (from lead-strategic)
- Focus only on extracting `emis-contracts`, `emis-server`, `emis-ui`
- Do NOT move `apps/web/src/routes/*` out of app layer
- Do NOT change EMIS API/runtime behavior in the same slice
- `routes/api/emis/*` stays thin transport; move contracts → emis-contracts, backend logic → emis-server, widgets/forms → emis-ui
- `/dashboard/emis/*` must NOT import operational EMIS packages directly (BI vs operational boundary)
- emis-server must NOT import from emis-ui (and vice versa) — both depend on emis-contracts
- Shims: explicit and temporary, no silent duplicate code, each marked `// MIGRATION`
- fetchDataset transitional gap: do NOT fix "заодно" unless it's a blocker
- Review Gate: architecture-reviewer + code-reviewer + docs-reviewer + security-reviewer (server code moves)
