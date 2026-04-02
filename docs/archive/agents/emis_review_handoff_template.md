# EMIS Review Handoff Template

Шаблон для передачи EMIS-изменения на review.
Он дополняет `emis_mr_template.md`: MR template описывает change целиком, а этот документ фиксирует минимальный пакет данных для reviewer handoff и ответ reviewer'а.
Если нужен handoff от implementation worker к lead до review, использовать `emis_worker_handoff_template.md`.

Использовать для:

- `architecture-reviewer`
- `security-reviewer`
- `docs-reviewer` / `docs-contracts-reviewer`
- `codex-reviewer` / `code-reviewer`
- `ui-reviewer`

## Review Request Template

```md
# Review Request

- review role:
- review goal:
- severity expectation:

# Branches

- base branch:
- feature branch:
- optional commit range:

# Diff / Scope

- review command: `git diff base..feature`
- touched files:
  - [path]
  - [path]
- layers touched:
  - route UI:
  - widgets:
  - entities/contracts:
  - server/emis:
  - dataset/BI:
  - db/docs:

# Change Summary

- what changed:
- why:
- why this placement:

# Contracts / Runtime / DB Impact

- runtime contract:
- API contract:
- Zod/schema/contracts:
- db/current_schema.sql:
- db/applied_changes.md:
- docs impact:
- none:

# Checks Already Run

- command:
- result:

# Known Risks / Open Questions

- risk:
- open question:
- none:

# Reviewer Focus

- primary checks requested:
- specific files or contracts to inspect first:
```

## Required Fields

Каждый review request обязан явно заполнить:

- `review role`
- `base branch`
- `feature branch`
- `review command`
- `touched files`
- `what changed`
- `why this placement`
- `Checks Already Run`
- `Reviewer Focus`

## Reviewer Result Template

```md
# Review Result

- reviewer role:
- verdict: `OK` | `request changes` | `needs design decision`

# Findings

- [severity] [path:line] - finding
- [severity] [path:line] - finding
- none:

# Required Follow-ups

- must fix now:
- should fix before merge:
- docs/db/runtime updates needed:
- none:

# Notes

- assumptions:
- residual risk:
- positive confirmation of checked invariants:
```

## Severity Guidance

- `critical` - блокирует merge; security break, blank screen, destructive contract drift
- `warning` - should fix before merge unless lead explicitly accepts risk
- `info` - useful note, but not a merge blocker

## Review Hygiene Rules

- Всегда указывать `base branch` и `feature branch`.
- Review comments должны ссылаться на branch, file, line, contract или commit range.
- Не отправлять reviewer'у только chat summary без diff anchor.
- Для `code-reviewer` и `codex-reviewer` использовать branch-based diff, а не только prose summary.
- Для docs-only changes можно опустить UI review, но docs review должен явно сказать `up to date` или перечислить обновления.
