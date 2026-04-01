# Strategy Parallel Intake

Дата: `2026-03-18`

## Что добавлено

Для параллельного парсинга стратегических документов добавлен отдельный intake-контур в PostgreSQL.

Он не заменяет текущий `strategy DWH`, а работает рядом с ним:

- агенты пишут в специальные intake-таблицы;
- Excel-книга `v7.1` используется только как reference-модель полей и бизнес-логики;
- потом эти данные можно курировать и уже после этого переносить в `staging.strategy_*` / `mart.strategy_*`.

## Таблицы

### Управление запуском и очередью

- `staging.strategy_parse_run`
- `staging.strategy_parse_task`
- `staging.strategy_parse_task_event`

### Intake-листы под данные из гибридной книги

- `staging.strategy_document_intake`
- `staging.strategy_fact_intake`
- `staging.strategy_link_intake`
- `staging.strategy_gap_intake`

## Monitoring views

- `mart.strategy_parse_task_queue`
- `mart.strategy_parse_run_summary`
- `mart.strategy_parse_agent_progress`

## Helper functions

- `staging.strategy_seed_parse_run(...)`
- `staging.strategy_claim_parse_task(...)`
- `staging.strategy_complete_parse_task(...)`

## Как использовать

### 1. Применить миграции

```bash
pnpm db:reset
```

### 2. Создать run и заполнить очередь документами из текущего strategy batch

```bash
node ./scripts/strategy-agent-queue.mjs seed \
  --run-id strategy_parse_hybrid_v7_1 \
  --run-label "Strategy hybrid intake v7.1"
```

### 3. Каждому агенту выдать документ через claim

```bash
node ./scripts/strategy-agent-queue.mjs claim \
  --run-id strategy_parse_hybrid_v7_1 \
  --agent-code agent_01 \
  --agent-label "Strategy parser 01"
```

### 4. Агент пишет результаты в intake-таблицы

Основные таблицы, которые агент должен заполнять:

- `staging.strategy_document_intake`
- `staging.strategy_fact_intake`
- `staging.strategy_link_intake`
- `staging.strategy_gap_intake`

Важно:

- при параллельной работе агенты не редактируют одну и ту же Excel-книгу;
- источником записи считается PostgreSQL intake;
- workbook `v7.1` нужен как схема полей, а не как общий writable-файл.

### 5. После завершения отметить задачу

```bash
node ./scripts/strategy-agent-queue.mjs complete \
  --task-id <uuid> \
  --agent-code agent_01 \
  --result-status completed \
  --note "Document parsed and intake rows inserted"
```

## Зачем это полезно

Такой контур дает:

- безопасную параллельную раздачу документов;
- lease-механику для зависших задач;
- отдельный intake-слой без риска повредить боевые mart-витрины;
- мониторинг прогресса по агентам и документам;
- основу для последующего ETL из гибридной книги / intake-таблиц в DWH.
