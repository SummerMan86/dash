# Baseline-Governor Memory

Персистентная память governance-role между сессиями.

## Текущий статус

- Роль введена для stabilization / baseline-control waves и сейчас применяется к EMIS post-freeze phase 2.
- Основная задача роли:
  - держать truthful baseline status
  - валидировать known exceptions
  - блокировать premature return to large feature work
- Freeze-wave `A0-A5` закрыта и архивирована.
- `P3.1` завершён `2026-04-04` как docs-only slice.
- `P3.2` завершён `2026-04-04` как bounded boundary-fix slice.
- `P3.3` завершён `2026-04-04` как package-aware guardrail slice.
- `P3.4` завершён `2026-04-04` как bounded EMIS UI decomposition slice.
- Текущий truthful baseline verdict остаётся:
  - status: `Green`
  - verdict: `baseline closed`
  - live blockers:
    - none

## Текущий expected focus

- root EMIS smoke commands должны быть runnable
- `pnpm lint:boundaries` уже green после `P3.2` и не должен деградировать обратно
- docs/code ownership contradictions должны быть сокращены до явно учтённых exceptions
- canonical baseline routine уже зафиксирован как ordered root command set:
  - `pnpm check`
  - `pnpm build`
  - `pnpm lint:boundaries`
  - `pnpm emis:smoke`
  - `pnpm emis:offline-smoke`
  - `pnpm emis:write-smoke` when write-side relevant
- full-routine rerun is now done on `2026-04-04`
- verified results:
  - `pnpm check` — green
  - `pnpm build` — green
  - `pnpm lint:boundaries` — green
  - `pnpm emis:offline-smoke` — green
  - `pnpm emis:write-smoke` — green
  - `pnpm emis:smoke` — green
- next baseline-governor focus is later hygiene only; the baseline is closed

## Рабочее правило

- Если baseline ещё red, не называть его “в целом стабильным”.
- Любое исключение без owner и expiry — invalid.
- `Green` не выдаётся по совокупности хороших впечатлений; только по machine-verified and documented baseline.
