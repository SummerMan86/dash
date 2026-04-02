# EMIS Worker Handoff Template

Шаблон для передачи bounded implementation slice от `worker` к `lead-integrator`.
Использовать до reviewer pass и не дублировать сюда полный review output.

Как соотносится с другими шаблонами:

- `emis_worker_handoff_template.md` - что сделал worker и с какими допущениями
- `emis_review_handoff_template.md` - что именно отправляем reviewer'у и что reviewer возвращает
- `emis_mr_template.md` - итоговый branch/MR summary для локального review или merge handoff

## Template

```md
# Worker Handoff

- task:
- worker role:
- scope boundary:

# Branches

- base branch:
- feature branch:
- optional commit range:

# Ownership

- owned files:
  - [path]
  - [path]
- layers touched:
  - route UI:
  - widgets:
  - entities/contracts:
  - server/emis:
  - dataset/BI:
  - db/docs:

# What Changed

- implemented:
- key files:
- why this placement:

# Assumptions

- assumption:
- assumption:
- none:

# Contracts / DB / Docs Impact

- runtime/API contract:
- Zod/schema/contracts:
- db/current_schema.sql:
- db/applied_changes.md:
- docs/local AGENTS:
- none:

# Checks Run

- command:
- result:

# Risks / Escalations

- unresolved risk:
- reason to escalate:
- follow-up suggested:
- none:
```

## Required Fields

Каждый worker handoff обязан явно заполнить:

- `task`
- `scope boundary`
- `base branch`
- `feature branch`
- `owned files`
- `implemented`
- `why this placement`
- `Checks Run`
- `Risks / Escalations`

## Handoff Rules

- Worker handoff описывает implementation slice, а не полный merge verdict.
- Если worker вышел за исходный scope, это должно быть явно записано в `Risks / Escalations`.
- Если были затронуты DB/docs/contracts, это должно быть перечислено даже если изменение маленькое.
- Если impact отсутствует, писать `none`, а не оставлять поле пустым.
