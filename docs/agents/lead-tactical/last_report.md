# Report: ST-2 + ST-3 — Canonical Layout And Migration Rules

## Статус
Выполнено

## Что сделано
- ST-2 (Define Canonical Repository Layout And Package Ownership): выполнено
- ST-3 (Define Migration Rules, Import Boundaries And Alias Policy): выполнено
- Объединены в один docs-only slice, выполнены lead-tactical напрямую (без workers)

### Deliverables
- Новый `docs/emis_monorepo_target_layout.md` — canonical reference:
  - target layout: `apps/web` + 10 packages (platform-core, platform-ui, platform-datasets, platform-filters, db, emis-contracts, emis-server, emis-ui, bi-alerts, bi-dashboards)
  - маппинг всех текущих active zones → target home
  - dependency graph и import direction rules (6 non-negotiable boundaries)
  - alias policy с removal timeline
  - migration policy: no big-bang, bounded slices, baseline blocker (Select.svelte)
- Обновлены cross-references в 5 существующих docs:
  - `emis_architecture_baseline.md` — section 8 (Target Layout reference), reading order
  - `emis_working_contract.md` — section 10 (Migration Discipline), reading order
  - `emis_session_bootstrap.md` — section 1, 4, 5 (canonical start, doc map, reading order)
  - `AGENTS.md` — section 6 (Target layout subsection)
  - `docs/AGENTS.md` — catalog table, reading order

## Review Gate

### Findings по severity

**CRITICAL** (блокирует merge):
- нет

**WARNING** (исправлено):
- docs-reviewer: `emis_session_bootstrap.md` не содержал ссылку на новый doc — добавлено в section 1, 4, 5
- architecture-reviewer: dependency diagram показывал `emis-ui` + `emis-server` в одном боксе — разделены как peer nodes

**INFO** (отмечено):
- docs-reviewer: `current-project-analysis.md` был outlier в reading order нового doc — убрано
- architecture-reviewer: `utils` в `platform-ui` — mild naming mismatch, acceptable as-is
- architecture-reviewer: `platform-filters` ↔ `platform-datasets` conditional dependency — уточнено в таблице

### Вердикты ревьюеров
- architecture-reviewer: OK
- docs-reviewer: request changes → исправлено → OK
- security-reviewer: не запускался (docs-only)
- code-reviewer: не запускался (docs-only)
- ui-reviewer: не запускался (docs-only)

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branches merged: нет (lead-tactical напрямую)
- review diff: `git diff main..feature/emis-foundation-stabilization`

## Готовность
Готово к merge после коммита. ST-4 unblocked.

## Post-commit follow-up
- Split `platform-ui` → `platform-core` + `platform-ui`: generic utils/helpers отделены от UI primitives. Обновлены target layout, zone mapping, dependency graph и rules table.

## Вопросы к lead-strategic
- нет
