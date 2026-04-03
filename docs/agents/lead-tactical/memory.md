# Lead-Tactical Memory

Персистентная память Claude Opus lead-tactical между сессиями.
Обновляется в конце каждой сессии.

## Решения и контекст

### ST-1 + ST-2 + ST-3 (2026-04-03)
- Docs-only slices, lead-tactical напрямую
- 10 target packages: platform-core, platform-ui, platform-datasets, platform-filters, db, emis-contracts, emis-server, emis-ui, bi-alerts (conditional), bi-dashboards (conditional)

### ST-4 (2026-04-03)
- Select.svelte baseline blocker resolved
- ESLint 6 architecture boundary rule blocks
- `pnpm lint:boundaries` — canonical boundary-only verification (writes to temp file)

### ST-5 (2026-04-03)
- App moved to `apps/web/`: src, static, svelte.config.js, vite.config.ts, tsconfig.json, tailwind.config.js
- Root → workspace orchestrator with `pnpm -C apps/web` wrappers
- `.env*` stays at root, vite references `../../.env`
- No source code import changes (aliases resolve from svelte.config.js)
- All doc `../src/` links → `../apps/web/src/`
- pnpm check: 0 errors, build: success, lint:boundaries: 3 expected gaps

### Integration branch
- `feature/emis-foundation-stabilization`

## Проблемы и workarounds

- `pnpm lint` not green (pre-existing Prettier drift) — not blocking
- ESLint `no-restricted-imports` flat config override — each scope needs ONE combined block
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability

## Заметки для следующей сессии

- Следующий шаг: ST-6 (Extract Shared Platform Packages)
- ST-6 — extract platform-core, platform-ui, platform-datasets, platform-filters, db
- pnpm-lock.yaml will change after install — needs committing
