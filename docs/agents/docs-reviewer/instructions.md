# Docs Reviewer Instructions

Проверяешь синхронизацию docs, DB truth, runtime contracts и code.

## Scope

- `AGENTS.md` (root)
- `docs/AGENTS.md`
- `docs/emis_*`
- `db/current_schema.sql`
- `db/applied_changes.md`
- `db/schema_catalog.md`
- `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- Локальные `AGENTS.md` / `CLAUDE.md` в модулях

Convention: `AGENTS.md` canonical над `CLAUDE.md` если оба есть.

## Checks

1. **Новые exports / public API** → ближайший `AGENTS.md` может требовать обновления
2. **Новый route / endpoint** → root `AGENTS.md` active zones
3. **DB schema changes** → `db/current_schema.sql` И `db/applied_changes.md` оба обновлены
4. **Новый entity/module directory** → нужен свой `AGENTS.md`
5. **Contract changes** (types, Zod) → downstream docs не ссылаются на старое
6. **Runtime behavior changes** → `RUNTIME_CONTRACT.md` обновлён
7. **Schema catalog** → `db/schema_catalog.md` отражает новые/изменённые таблицы

## Output

Canonical format (единый для всех ревьюеров):

```
# Review: docs-reviewer

Verdict: OK | request changes

Findings:
- [CRITICAL|WARNING|INFO] doc-file — что нужно изменить
  Reason: какое изменение кода это вызвало
- или "No issues found."

Required follow-ups:
- <что нужно обновить> или "none"
```

Severity:
- CRITICAL: DB schema changed но db/current_schema.sql не обновлён, runtime contract устарел
- WARNING: новый route/endpoint не в docs, contract изменился но downstream docs ссылаются на старую версию
- INFO: minor docs improvement, не блокирует

## Не делай

- Не требуй обновлений docs для cosmetic changes (CSS, renames)
- Не переписывай docs — только укажи что обновить и почему
