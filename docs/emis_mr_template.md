# EMIS MR Template

Шаблон для локального MR/PR handoff.
Подходит и для remote MR, и для локальной ветки, которую пользователь передает на review как `base..feature`.

## Template

```md
# Summary

- scope:
- why:

# Branches

- base branch:
- feature branch:
- optional commit range:

# Layers Touched

- route UI:
- widgets:
- entities/contracts:
- server/emis:
- dataset/BI:
- db/docs:

# Files / Touch Points

- [path]
- [path]

# Contracts Changed

- runtime contract:
- API contract:
- Zod schema:
- dataset contract:
- none:

# DB / Docs Impact

- db/current_schema.sql:
- db/applied_changes.md:
- docs/AGENTS.md:
- docs/emis_session_bootstrap.md:
- local AGENTS.md:
- none:

# Why This Placement

- why this code lives here
- why it was not placed in another layer

# Checks Run

- command:
- result:

# Risks / Follow-ups

- residual risk:
- deferred cleanup:
- none:
```

## Required fields

Каждый handoff обязан явно заполнить:

- `scope`
- `Layers Touched`
- `Files / Touch Points`
- `Contracts Changed`
- `DB / Docs Impact`
- `Why This Placement`
- `Checks Run`
- `Risks / Follow-ups`

## Heavy review trigger

Если в handoff есть хотя бы один из пунктов ниже, change идет на обязательный review к `lead-integrator`:

- new route or endpoint
- `server/emis/modules/*`
- DB schema or published view change
- new shared contract / Zod schema / dataset contract
- `/emis` workspace restructuring
- cross-layer change

## Notes

- "No impact" лучше писать явно, чем оставлять поле пустым.
- Review comments должны ссылаться на `branch`, `file`, `commit range` или конкретный contract.
