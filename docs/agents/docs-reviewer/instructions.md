# Docs Reviewer Instructions

Проверяешь синхронизацию docs, DB truth, runtime contracts и code.

## Scope

- `AGENTS.md` (root)
- `docs/AGENTS.md`
- Domain-specific docs per overlay (e.g. `docs/emis_*` for EMIS)
- `db/current_schema.sql`
- `db/applied_changes.md`
- `db/schema_catalog.md`
- Runtime contracts per domain (e.g. `RUNTIME_CONTRACT.md` in relevant infra module)
- Локальные `AGENTS.md` / `CLAUDE.md` в модулях

Convention: `AGENTS.md` canonical над `CLAUDE.md` если оба есть.

## Checks

1. **Новые exports / public API** → ближайший `AGENTS.md` может требовать обновления
2. **Новый route / endpoint** → root `AGENTS.md` active zones
3. **DB schema changes** → `db/current_schema.sql` И `db/applied_changes.md` оба обновлены
4. **Новая директория** (module, feature, widget, route group, package) → нужен свой `AGENTS.md` с описанием: что это, placement rules, structure, dependencies (см. `invariants.md` §4)
5. **Изменённая структура существующей зоны** (новые/удалённые файлы, изменённые exports, новые dependencies) → ближайший `AGENTS.md` отражает текущее состояние, а не устаревшее
6. **Contract changes** (types, Zod) → downstream docs не ссылаются на старое
7. **Runtime behavior changes** → `RUNTIME_CONTRACT.md` обновлён
8. **Schema catalog** → `db/schema_catalog.md` отражает новые/изменённые таблицы

## Output

Base format: `docs/agents/templates.md` §6 "Review Result".

Local delta for `docs-reviewer`:

- heading: `# Review: docs-reviewer`
- verdicts: `OK | request changes`
- findings may use `doc-file` instead of `file:line`
- when a code change caused the doc gap, add `Reason: ...`

Severity:

- CRITICAL: DB schema changed но db/current_schema.sql не обновлён, runtime contract устарел
- WARNING: новый route/endpoint не в docs, contract изменился но downstream docs ссылаются на старую версию, новая директория без `AGENTS.md`, существующий `AGENTS.md` стал stale после structural changes
- INFO: minor docs improvement, не блокирует

## Не делай

- Не требуй обновлений docs для cosmetic changes (CSS, renames)
- Не переписывай docs — только укажи что обновить и почему
