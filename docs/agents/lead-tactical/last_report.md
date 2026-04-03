# Report: ST-8 — Rationalize BI/Dashboard Packages And Remaining App Glue

## Статус
Выполнено

## Что сделано

### Packaging Verdicts

**bi-dashboards: INTENTIONALLY KEPT IN `apps/web`**

Reasons:
1. No second consumer exists — only `apps/web` routes use `dashboard-edit`
2. SvelteKit routes (the bulk of BI code) cannot be extracted to packages (framework constraint)
3. `dashboard-edit` uses `$app/environment` (SvelteKit-specific import)
4. `fetchDataset` is app-level filter composition (merges runtime filter context, legacy filters, request params) — not a reusable library function
5. Creating a package for a single consumer is speculative per plan constraints ("do not create speculative packages with no real second consumer")
6. Self-contained design of `dashboard-edit` means future extraction is trivial when a real second consumer appears

**bi-alerts: INTENTIONALLY KEPT IN `apps/web`**

Reasons:
1. No second consumer exists
2. Tied to SvelteKit app lifecycle — `hooks.server.ts` starts/stops the scheduler
3. Uses `$lib/server/db/pg` for DB access (app-level infrastructure wiring)
4. Cross-domain orchestration with env-specific config (Telegram bot tokens, cron schedules, timezone)
5. Extracting would require abstracting app lifecycle management with no concrete benefit

### BI/Dataset Canonical Placement

| Path | Status | Classification |
|------|--------|---------------|
| `apps/web/src/lib/features/dashboard-edit/` | Canonical | App-level feature (GridStack editor) |
| `apps/web/src/lib/shared/api/fetchDataset.ts` | Canonical | App-level BI data access facade |
| `apps/web/src/lib/server/datasets/definitions/` | Canonical | App-specific dataset IR definitions |
| `apps/web/src/lib/server/datasets/compile.ts` | MIGRATION shim | Re-export from `platform-datasets/server` — ST-10 cleanup candidate |
| `apps/web/src/lib/server/alerts/` | Canonical | App-level server subsystem |
| `apps/web/src/lib/server/providers/` | Mixed | mockProvider canonical; postgresProvider is MIGRATION shim (canonical in platform-datasets) |
| `apps/web/src/lib/entities/dataset/index.ts` | MIGRATION shim | Re-export from `platform-datasets` |
| `apps/web/src/lib/entities/filter/index.ts` | MIGRATION shim | Re-export from `platform-filters` |
| `apps/web/src/lib/entities/charts/` | MIGRATION shim | Re-export from `platform-ui` |
| `apps/web/src/lib/entities/emis-*/` | MIGRATION shim | Re-exports from `emis-contracts` |
| `apps/web/src/lib/widgets/filters/` | MIGRATION shim | Re-export from `platform-filters/widgets` |
| `apps/web/src/lib/widgets/emis-map/` | MIGRATION shim | Re-export from `emis-ui` |
| `apps/web/src/lib/widgets/emis-status-bar/` | MIGRATION shim | Re-export from `emis-ui` |
| `apps/web/src/lib/widgets/stock-alerts/` | Canonical | App-level WB stock alert widgets |
| `apps/web/src/lib/widgets/emis-drawer/` | Canonical | App-level EMIS glue |
| `apps/web/src/lib/features/emis-manual-entry/` | Canonical | App-level EMIS CMS forms |

### App Glue Boundaries

What intentionally stays as app glue:

- **Route composition** — all `routes/dashboard/*`, `routes/emis/*`, `routes/api/*` — SvelteKit routes must live in the app
- **App shell/navigation** — root layout, Header.svelte
- **SvelteKit-bound helpers** — `fetchDataset` (uses SvelteKit `fetch`), `dashboard-edit` (uses `$app/environment`)
- **Dashboard editor** — `features/dashboard-edit/` (no second consumer, trivial to extract later)
- **Alert runtime/scheduler** — `server/alerts/` (app lifecycle dependency via hooks.server.ts)
- **Dataset definitions** — `server/datasets/definitions/` (app-specific data layer config, not reusable)
- **Provider routing** — `server/providers/` (app-specific mock/postgres dispatch)
- **EMIS app glue** — `emis-drawer`, `emis-manual-entry` (depend on app-level composition patterns)

### EMIS/BI Separation

Verified clean:
- BI dashboard routes (strategy, wildberries, analytics) have **zero EMIS imports**
- EMIS read-side dashboards (`routes/dashboard/emis/`) access data through dataset/IR layer — correct pattern
- No `platform-*` → BI/dashboard back-dependencies
- No new cross-domain imports introduced

### Cleanup

- Deleted 7 empty placeholder directories: `entities/dashboard/`, `entities/widget/`, `widgets/chart/`, `widgets/kpi/`, `widgets/dashboard-container/`, `widgets/table/`, `shared/config/`
- Updated AGENTS.md navigation docs in: `lib/`, `entities/`, `widgets/`, `routes/dashboard/`, `features/dashboard-edit/`, `server/datasets/`, `server/alerts/`

### Pre-existing Issues (NOT ST-8 scope)

- `widgets/stock-alerts/` imports types from `routes/dashboard/wildberries/stock-alerts/` — FSD boundary violation (widgets → routes). Pre-existing.
- `fetchDataset.ts` lives in `$shared/api/` but imports from `$entities/` — 3 lint:boundaries violations. Pre-existing, documented since ST-4.
- `cacheKeyQuery` in fetchDataset.ts is redundant (identical to `query`). Pre-existing tech debt.

## Проверки

- `pnpm check`: 0 errors, 0 warnings
- `pnpm build`: success (built in 10.70s)
- `pnpm lint:boundaries`: 3 violations (all pre-existing fetchDataset.ts FSD gap, same as before ST-8)

## Review Gate

### Вердикты ревьюеров
- architecture-reviewer: **OK** — no new violations; all 5 architectural claims verified against live codebase
- docs-reviewer: **request changes** → fixed → OK (see below)
- code-reviewer: не запускался (no runtime code changes)
- security-reviewer: не запускался (no server/import/runtime changes)
- ui-reviewer: не запускался (no frontend changes)

### Findings по severity

**CRITICAL:** нет

**WARNING (fixed in d78e6d9):**
- docs-reviewer: AGENTS.md section 5 still listed 7 deleted placeholder dirs → updated to "Deleted placeholders (ST-8)"
- docs-reviewer: emis_monorepo_target_layout.md legacy table listed deleted dirs → updated
- docs-reviewer: emis_monorepo_target_layout.md listed shared/config/ as staying in app (deleted) → updated
- docs-reviewer: server/AGENTS.md Postgres how-to pointed to shim paths → updated to canonical package paths
- docs-reviewer: lib/AGENTS.md and last_report listed server/providers/ as fully canonical → annotated postgresProvider as MIGRATION shim

**INFO (fixed in d78e6d9):**
- docs-reviewer: entities/AGENTS.md emis-* section was prescriptive for shim files → simplified to redirect
- docs-reviewer: datasets/definitions/AGENTS.md missing paymentAnalytics.ts → added
- docs-reviewer: emis_monorepo_target_layout.md emis-manual-entry/emis-drawer target stale → corrected to "stays in app"

## Ветки

- integration branch: `feature/emis-foundation-stabilization`
- worker branches merged: none (executed directly as lead-tactical)
- review diff: `git diff main..feature/emis-foundation-stabilization`

## Handoff Readiness

ST-9 is safe to start because:
1. All BI/dashboard code has explicit canonical placement
2. Both conditional BI packages (`bi-alerts`, `bi-dashboards`) have explicit verdicts with concrete justification
3. EMIS/BI separation is verified clean
4. All verification passes (check 0 errors, build success, lint:boundaries only pre-existing gaps)
5. Navigation docs are updated for all touched BI/dashboard zones
6. No ambiguous "later maybe" placements remain

What moved into package boundaries (cumulative ST-6..ST-8):
- 8 packages: platform-core, platform-ui, platform-datasets, platform-filters, db, emis-contracts, emis-server, emis-ui
- 0 new packages in ST-8 (both conditional targets deferred with justification)

What intentionally remained app glue:
- Dashboard editor, fetchDataset, dataset definitions, alerts, providers, EMIS drawer/manual-entry, all routes

## Вопросы к lead-strategic

Нет. Все packaging decisions обоснованы конкретным отсутствием reuse pressure.
