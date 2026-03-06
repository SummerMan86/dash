# server/alerts/ — Alert system

## Purpose
Server-side alerting: evaluate SQL conditions against mart data, send notifications via Telegram (and future channels).

## Structure
```
alerts/
├── model/
│   ├── types.ts              # AlertRule, AlertCondition, Recipient, AlertHistory
│   └── schema.ts             # Zod schemas for validation
├── repository/
│   ├── alertRuleRepository.ts     # CRUD for alerts.rules
│   ├── recipientRepository.ts     # CRUD for alerts.recipients
│   └── alertHistoryRepository.ts  # Notification history
├── services/
│   ├── conditionEvaluator.ts  # Builds SQL from AlertCondition, runs check
│   ├── alertProcessor.ts      # Pipeline: load rules → evaluate → notify → log
│   └── alertScheduler.ts      # node-cron scheduler with distributed pg lock
├── channels/
│   ├── types.ts               # NotificationChannel interface
│   └── telegramChannel.ts     # Telegram Bot API
├── sql/
│   └── 001_alerts_schema.sql  # DB migration (apply manually)
└── index.ts                   # Public API: startAlertScheduler, triggerAlertCheck
```

## Lifecycle
1. `hooks.server.ts` calls `startAlertScheduler()` on boot (unless `ENABLE_ALERT_SCHEDULER=false`)
2. Scheduler runs on cron (default `0 9 * * *`, TZ `Europe/Moscow`)
3. Distributed lock via `alerts.scheduler_locks` table prevents duplicate runs
4. `processAlerts()` → loads rules → evaluates conditions → sends notifications → logs history

## DB tables (alerts schema)
- `alerts.rules` — alert rules
- `alerts.recipients` — notification targets
- `alerts.rule_recipients` — many-to-many
- `alerts.history` — notification log
- `alerts.scheduler_locks` — distributed lock (required for scheduler)

## IMPORTANT: migrations must be applied before scheduler runs
```bash
psql $DATABASE_URL < src/lib/server/alerts/sql/001_alerts_schema.sql
```
If not applied, scheduler fails silently (logs error, server stays up).

## Environment variables
| Var | Default | Purpose |
|-----|---------|---------|
| `TELEGRAM_BOT_TOKEN` | — | Required for Telegram channel |
| `ALERT_SCHEDULE` | `0 9 * * *` | Cron expression |
| `ALERT_TIMEZONE` | `Europe/Moscow` | Scheduler timezone |
| `ENABLE_ALERT_SCHEDULER` | `true` | Set to `false` to disable |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | For dashboard links in messages |

## Public API (from index.ts)
```ts
startAlertScheduler()   // called by hooks.server.ts
stopAlertScheduler()    // called on SIGTERM/SIGINT
triggerAlertCheck()     // manual trigger → { processed, triggered, errors }
```
