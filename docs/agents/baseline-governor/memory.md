# Baseline-Governor Memory

Персистентная память governance-role между сессиями.

## Текущий статус

- Роль введена для wave `EMIS Foundation Stabilization And Architecture Control`.
- Основная задача роли:
  - держать truthful baseline status
  - валидировать known exceptions
  - блокировать premature return to large feature work

## Первый expected focus

- root EMIS smoke commands должны быть runnable
- `pnpm lint:boundaries` должен стать green
- docs/code ownership contradictions должны быть сокращены до явно учтённых exceptions
- должен появиться canonical baseline command `pnpm emis:baseline`

## Рабочее правило

- Если baseline ещё red, не называть его “в целом стабильным”.
- Любое исключение без owner и expiry — invalid.
- `Green` не выдаётся по совокупности хороших впечатлений; только по machine-verified and documented baseline.
