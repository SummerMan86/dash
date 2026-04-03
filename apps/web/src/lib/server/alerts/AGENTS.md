# Alert System

`src/lib/server/alerts/` - server-side alerting subsystem.

## Purpose

- evaluate SQL conditions against mart data
- send notifications via Telegram
- keep alert history
- run scheduler safely with distributed pg lock

## Structure

```text
alerts/
├── model/
│   ├── types.ts
│   └── schema.ts
├── repository/
│   ├── alertRuleRepository.ts
│   ├── recipientRepository.ts
│   └── alertHistoryRepository.ts
├── services/
│   ├── conditionEvaluator.ts
│   ├── alertProcessor.ts
│   └── alertScheduler.ts
├── channels/
│   ├── types.ts
│   └── telegramChannel.ts
├── sql/
│   └── 001_alerts_schema.sql
└── index.ts
```

## Lifecycle

1. `hooks.server.ts` calls `startAlertScheduler()` on boot unless `ENABLE_ALERT_SCHEDULER=false`
2. scheduler runs on cron
3. distributed lock via `alerts.scheduler_locks` prevents duplicate runs
4. `processAlerts()` loads rules, evaluates conditions, sends notifications and logs history

## DB tables

- `alerts.rules`
- `alerts.recipients`
- `alerts.rule_recipients`
- `alerts.history`
- `alerts.scheduler_locks`

## IMPORTANT

Schema migration must be applied before scheduler runs:

```bash
psql $DATABASE_URL < src/lib/server/alerts/sql/001_alerts_schema.sql
```

If not applied, scheduler disables itself with a warning and the server stays up.

## Environment variables

| Var                      | Default                 | Purpose                       |
| ------------------------ | ----------------------- | ----------------------------- |
| `TELEGRAM_BOT_TOKEN`     | —                       | required for Telegram channel |
| `ALERT_SCHEDULE`         | `0 9 * * *`             | cron expression               |
| `ALERT_TIMEZONE`         | `Europe/Moscow`         | scheduler timezone            |
| `ENABLE_ALERT_SCHEDULER` | `true`                  | set `false` to disable        |
| `PUBLIC_BASE_URL`        | `http://localhost:5173` | dashboard links in messages   |

## Public API

```ts
startAlertScheduler();
stopAlertScheduler();
triggerAlertCheck();
```

## Package verdict (ST-8)

`bi-alerts` package was evaluated and intentionally deferred:

- No second consumer exists
- Tied to SvelteKit app lifecycle (`hooks.server.ts` starts/stops scheduler)
- Uses `$lib/server/db/pg` for DB access (app-level infrastructure)
- Cross-domain orchestration with env-specific config (Telegram tokens, cron)
- Extracting would require abstracting app lifecycle management

Canonical home: `apps/web/src/lib/server/alerts/` (app-level server subsystem).

## When to read this folder

- если меняешь alert processing pipeline
- если трогаешь scheduler lifecycle в `hooks.server.ts`
- если добавляешь новый notification channel
