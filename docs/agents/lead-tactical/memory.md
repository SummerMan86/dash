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

### Integration branch
- `feature/emis-foundation-stabilization`
- Latest commit: `8bcccbd` (ST-5 follow-up: artifact cleanup + Review Gate)

## Проблемы и workarounds

- `pnpm lint` not green (pre-existing Prettier drift) — not blocking
- ESLint `no-restricted-imports` flat config — each scope needs ONE combined block, `replace_all` on first glob misses subsequent globs in array
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability
- `git add -A` caught `.claude/agent-memory/` and `target` — now in `.gitignore`

## Заметки для следующей сессии

- **Следующий шаг: ST-6** (Extract Shared Platform Packages)
- ST-6 план: 2 волны workers в tmux
  - Волна 1 (параллельно): `platform-core` (utils/helpers) + `db` (connection/pooling) — leaf packages
  - Волна 2 (после merge волны 1): `platform-ui` + `platform-datasets` + `platform-filters`
- Workers создаются как teammates в tmux (полный контекст проекта)
- Reviewers — subagents (Agent tool, session-persistent, Sonnet)
- Каждый worker package extraction = отдельный worker branch → merge в integration → Review Gate
- При создании packages обратить внимание на:
  - package.json exports для SvelteKit consumption (source, не compiled)
  - svelte пакеты: нужен `svelte` field в package.json
  - TypeScript: tsconfig per package или shared
  - Import updates: $alias → @dashboard-builder/package-name
  - Rename `web` → `@dashboard-builder/web` при первом package addition
