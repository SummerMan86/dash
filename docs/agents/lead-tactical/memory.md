# Lead-Tactical Memory

Персистентная память Claude Opus lead-tactical между сессиями.
Обновляется в конце каждой сессии.

## Решения и контекст

### ST-1 + ST-2 + ST-3 (2026-04-03)
- Выполнены как docs-only slices, lead-tactical напрямую
- Коммит: `29ad37c` (ST-1+ST-2+ST-3), `e74993f` (platform-core split follow-up)
- 10 target packages: platform-core, platform-ui, platform-datasets, platform-filters, db, emis-contracts, emis-server, emis-ui, bi-alerts (conditional), bi-dashboards (conditional)

### ST-4 (2026-04-03)
- Workspace foundation + baseline cleanup, lead-tactical напрямую
- Select.svelte baseline blocker — resolved (garbled template + unescaped SVG quotes)
- pnpm-workspace.yaml — workspace globs added
- package.json — scripts annotated with migration destinations
- eslint.config.js — 6 architecture boundary rule blocks
- Known gaps documented: fetchDataset.ts (resolves at ST-6), mapConfig (resolves at extraction)
- pnpm check: 0 errors, 0 warnings

### Integration branch
- `feature/emis-foundation-stabilization` (не `feature/emis-monorepo-readiness` как в исходном плане)

## Проблемы и workarounds

- `pnpm lint` not green (pre-existing Prettier drift) — not introduced by our work, not blocking
- ESLint `no-restricted-imports` override semantics in flat config — each file scope needs ONE combined block

## Заметки для следующей сессии

- Следующий шаг: ST-5 (Extract Current App Into apps/*)
- ST-5 — первый physical move, нужен worker в tmux
- Workers в tmux начинаются с ST-5
- Все prerequisite для ST-5 закрыты: pnpm check green, workspace globs ready, boundary lint active
