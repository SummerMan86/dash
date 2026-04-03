# Report: ST-5 — Extract Current App Into apps/web

## Статус
Выполнено

## Что сделано

### Physical move
- `src/` → `apps/web/src/`
- `static/` → `apps/web/static/`
- `svelte.config.js` → `apps/web/svelte.config.js`
- `vite.config.ts` → `apps/web/vite.config.ts`
- `tsconfig.json` → `apps/web/tsconfig.json`
- `tailwind.config.js` → `apps/web/tailwind.config.js`

### Package split
- Created `apps/web/package.json` with app runtime deps + app-local scripts (dev, build, check)
- Root `package.json` → workspace orchestrator:
  - `pnpm dev/build/check` delegated via `pnpm -C apps/web`
  - Lint/format/boundaries stay at root (workspace-level)
  - EMIS smoke, DB, strategy scripts stay at root
  - Root devDependencies: ESLint, Prettier, typescript-eslint (workspace tools only)

### Config updates
- `vite.config.ts`: dotenv paths updated to `../../.env.map` and `../../.env`
- `eslint.config.js`: svelte config import → `./apps/web/svelte.config.js`, all file globs → `apps/web/src/`
- `scripts/lint-boundaries.mjs`: target paths → `apps/web/src/`
- `scripts/emis-smoke.mjs`: spawn CWD → `apps/web/`
- `.prettierrc`: tailwindStylesheet → `./apps/web/src/app.css`
- `.prettierignore`: static → `/apps/web/static/`
- `.gitignore`: added `apps/web/.svelte-kit`, `apps/web/build`, `apps/web/src/Examples/`

### What stays at root
- `.env*` files (shared by app and DB scripts)
- `db/`, `docs/`, `archive/`, `deploy/`
- `docker-compose*.yml`, `Dockerfile`
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- `eslint.config.js`, `.prettierrc` (workspace-level config)
- `scripts/` (all scripts, including smoke and DB)
- `AGENTS.md`, `CLAUDE.md`, `README.md`

### Docs updates
- All `../src/` relative links in docs → `../apps/web/src/`
- All `src/lib/` and `src/routes/` references in AGENTS.md → `apps/web/src/lib/` and `apps/web/src/routes/`
- Updated files: AGENTS.md, docs/AGENTS.md, docs/emis_session_bootstrap.md, docs/emis_architecture_baseline.md, docs/emis_working_contract.md, docs/emis_architecture_review.md, docs/archive/emis/emis_handoff_2026_03_17.md

### What was NOT changed
- No EMIS or BI domain logic changes
- No API contract changes
- No import paths in source code (aliases resolve from svelte.config.js, which moved with src/)
- No DB schema changes

## Verification
- `pnpm check` — 0 errors, 0 warnings (env from root picked up correctly)
- `pnpm build` — success
- `pnpm lint:boundaries` — 3 expected gaps (same as before)

## Review Gate

### Findings по severity

**CRITICAL** (исправлено):
- architecture-reviewer: stale `src/` globs в `.svelte.ts`/`.svelte.js`/`.svelte` file patterns в eslint.config.js — boundary rules для Svelte files были silently dead → все globs обновлены на `apps/web/src/`
- docs-reviewer: bare `src/lib/` и `src/routes/` references в 10+ active docs (emis_architecture_baseline, emis_working_contract, emis_session_bootstrap, workflow.md, current_plan.md и др.) → все обновлены на `apps/web/src/`

**WARNING** (исправлено):
- docs-reviewer: `docs/agents/docs-reviewer/instructions.md` scope path stale → обновлён
- docs-reviewer: `docs/agents/workflow.md` EMIS boundary reference stale → обновлён
- lead-strategic: `.claude/agent-memory/*` и `target` accidental commit → removed from git, added to .gitignore

**INFO** (отмечено):
- architecture-reviewer: package name `web` vs `@dashboard-builder/web` — rename при ST-6
- architecture-reviewer: `dotenv` in devDependencies but used in vite.config.ts — acceptable (build-time only)
- architecture-reviewer: vite.config.ts CWD-dependent env path — low risk under current workflow
- docs-reviewer: archive docs retain bare `src/` paths — intentionally not updated (historical)

### Вердикты ревьюеров
- architecture-reviewer: request changes → исправлено → OK
- docs-reviewer: request changes → исправлено → OK
- code-reviewer: не запускался (structural move, no logic changes)
- security-reviewer: не запускался (no runtime behavior change)
- ui-reviewer: не запускался (no frontend behavior change)

## Ветки
- integration branch: `feature/emis-foundation-stabilization`

## Handoff readiness
- Root is now workspace orchestrator, not the app itself
- `apps/web/` contains the full SvelteKit runtime
- All commands work from root via wrappers
- ST-6 (platform package extraction) is unblocked

## Вопросы к lead-strategic
- нет
