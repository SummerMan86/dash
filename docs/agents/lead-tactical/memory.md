# Lead-Tactical Memory

Персистентная память Claude Opus lead-tactical между сессиями.
Обновляется в конце каждой сессии.

## Решения и контекст

### ST-2 + ST-3 (2026-04-03)
- Выполнены как один docs-only slice (без workers, lead-tactical напрямую)
- Создан `docs/emis_monorepo_target_layout.md` — canonical target layout
- Обновлены: `emis_architecture_baseline.md`, `emis_working_contract.md`, `AGENTS.md`, `docs/AGENTS.md`
- Integration branch: `feature/emis-foundation-stabilization` (не `feature/emis-monorepo-readiness` как в плане — branch name менялся)
- Review Gate: docs-reviewer + architecture-reviewer (по плану для ST-1..ST-4)

### Ключевые решения по layout
- 9 target packages: platform-ui, platform-datasets, platform-filters, db, emis-contracts, emis-server, emis-ui, bi-alerts (conditional), bi-dashboards (conditional)
- `bi-alerts` и `bi-dashboards` — создаются только при доказанном reuse pressure
- Routes всегда остаются в `apps/web/`
- Legacy placeholders не участвуют в migration plan
- Select.svelte baseline blocker явно зафиксирован как prerequisite для ST-4

## Проблемы и workarounds

- `emis_architecture_baseline.md` и `emis_working_contract.md` — untracked files (созданы в ST-1, ещё не закоммичены)
- Все изменения ветки ещё unstaged/uncommitted — нужен коммит после Review Gate

## Заметки для следующей сессии

- Следующий шаг: ST-4 (Workspace Foundation + Baseline Cleanup Plan)
- ST-4 потребует: pnpm-workspace.yaml, package.json, docs — и начнёт implementation planning
- Select.svelte blocker должен быть resolved в ST-4 или раньше
- Workers в tmux — начиная с ST-5 (app extraction)
