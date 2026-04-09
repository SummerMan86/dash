# Autonomous Execution Protocol

Протокол автономного выполнения задач без user-in-the-loop.

## Два уровня автономности

| Аспект | **Lightweight** | **Full** |
| --- | --- | --- |
| Когда | Задача по аналогии, чёткий scope, нет архитектурных решений | Cross-layer, schema changes, архитектурные решения |
| Strategic loop | **Нет.** lead-tactical сам планирует и принимает | **Да.** GPT-5.4 = lead-strategic, plan owner, decision-maker |
| Codex required | Нет | Да (`/codex:setup` green) |
| Plan | Mini-plan inline в decision-log | Полный `current_plan.md` через Codex |
| Review Gate | Обязателен (code + security минимум) | Полный (все applicable reviewers) |
| Decision-log | Обязателен | Обязателен |
| Типичное время | 10-30 мин | 30-90 мин |
| Типичная стоимость | Низкая (только Claude) | Высокая (Claude + GPT-5.4 + workers) |

### Критерий выбора

```text
Lightweight, если ВСЁ верно:
  ✓ Задача "сделай как X, но для Y" (есть reference implementation)
  ✓ Scope ≤ 1 модуль / ≤ 10 файлов
  ✓ Нет архитектурных решений, которые не очевидны из existing code
  ✓ Нет schema changes / DB migrations
  ✓ Нет cross-layer / cross-package changes
  ✓ Acceptance criteria однозначны

Full, если ХОТЯ БЫ ОДНО верно:
  ◆ Задача требует архитектурного решения
  ◆ Cross-layer или cross-package scope
  ◆ Schema / contract changes
  ◆ 4+ файлов в разных модулях
  ◆ Sequencing зависит от результата предыдущего шага
  ◆ Неочевидный acceptance criteria
```

## 1. Модель

### 1.1. Lightweight Autonomous

```text
Пользователь
    │
    ├─ задача + reference + scope
    ▼
lead-tactical (Claude Opus) — plan + execute + accept
    │
    ├─ читает reference implementation
    ├─ создаёт mini-plan в decision-log
    ├─ реализует сам или через 1 worker
    ├─ Review Gate (code-reviewer + security-reviewer)
    ├─ self-acceptance по acceptance criteria
    │
    ▼
Результат: коммиты + decision-log.md
    ↓
Пользователь ревьюит постфактум
```

**Ключевой принцип:** lead-tactical совмещает все роли. Нет strategic loop, нет Codex round-trips. Review Gate — единственный внешний контроль качества.

### 1.2. Full Autonomous

```text
Пользователь
    │
    ├─ задача + autonomy parameters
    │  (scope, guardrails, timeout)
    ▼
lead-tactical (Claude Opus) — autonomous executor
    │
    ├─ /codex:rescue --fresh --write "autonomous plan"
    │       ↓
    │   lead-strategic (GPT-5.4) — autonomous decision-maker
    │       ├─ создаёт plan
    │       ├─ утверждает plan (без user approval)
    │       ├─ принимает/отклоняет slices
    │       ├─ reframe'ит следующие slices
    │       └─ принимает финальный результат
    │
    ├─ dispatch workers, review gate (как обычно)
    ├─ все решения → decision-log.md
    ├─ guardrail violation → STOP + notify user
    │
    ▼
Результат: коммиты + decision-log.md + last_report.md
    ↓
Пользователь ревьюит постфактум
```

**Ключевой принцип:** GPT-5.4 заменяет пользователя как decision-maker, но не получает новых полномочий. Всё, что GPT-5.4 решает автономно, пользователь мог бы решить сам — просто решения принимаются по заранее определённым правилам без ожидания ответа.

## 2. Entry Protocol

### 2.1. Lightweight — промпт

```text
Автономная задача (lightweight): <что сделать>
Reference: <файл-образец>
Scope: <что затрагивает>
Ограничения: <что нельзя трогать>
Timeout: 30 минут
```

### 2.2. Lightweight — headless

```bash
claude -p "$(cat <<'EOF'
## Autonomous Task (Lightweight)

Ты — lead-tactical в lightweight autonomous mode.
Прочитай docs/agents/autonomous-protocol.md, секцию 1.1.

Задача: <описание>
Reference: <файл-образец для копирования паттерна>
Scope: <файлы/модули>
Timeout: 30 минут

Режим: lightweight — без strategic loop, без Codex.
1. Прочитай reference implementation
2. Создай mini-plan в decision-log
3. Реализуй сам (или через 1 worker если multi-file)
4. Запусти Review Gate (code-reviewer + security-reviewer минимум)
5. Исправь findings
6. Коммит + decision-log

Все решения пиши в docs/agents/lead-tactical/decision-log.md.
EOF
)" --allowedTools "Edit,Write,Bash,Glob,Grep,Read,Agent" \
   --max-turns 100
```

### 2.3. Full — промпт

```text
Автономная задача (full): <что сделать>
Контекст: <зачем>
Scope: <что затрагивает>
Ограничения: <что нельзя трогать>

Режим: autonomous full (docs/agents/autonomous-protocol.md)
Timeout: 60 минут
Guardrails: default
```

### 2.4. Full — headless

```bash
claude -p "$(cat <<'EOF'
## Autonomous Task (Full)

Ты — lead-tactical в full autonomous mode.
Прочитай docs/agents/autonomous-protocol.md.

Задача: <описание>
Scope: <файлы/модули>
Timeout: 60 минут

Используй /codex:rescue --fresh --write для планирования.
GPT-5.4 — твой lead-strategic и decision-maker.
Все решения пиши в docs/agents/lead-tactical/decision-log.md.
По завершении — коммит + last_report.md.
EOF
)" --allowedTools "Edit,Write,Bash,Glob,Grep,Read,Agent" \
   --max-turns 200
```

### 2.5. Autonomy parameters

| Параметр | Default (lightweight) | Default (full) | Описание |
| --- | --- | --- | --- |
| `timeout` | 30m | 60m | Максимальное время выполнения |
| `scope` | обязателен | обязателен | Ограничение по файлам/модулям |
| `guardrails` | `default` | `default` | Набор ограничений (см. §5) |
| `operating-mode` | n/a | решает `lead-strategic` | Можно зафиксировать заранее |
| `max-slices` | 3 | 9 | Максимум подзадач |
| `escalation-policy` | `stop` | `log-and-continue` | Что делать при спорных решениях |
| `reference` | рекомендуется | опционально | Файл-образец для паттерна |

## 3. Роли в autonomous mode

### 3.1. Lightweight: lead-tactical = единственный агент

В lightweight режиме lead-tactical **совмещает все роли**, кроме review:

| Функция | Кто выполняет |
| --- | --- |
| Планирование | lead-tactical (mini-plan в decision-log) |
| Реализация | lead-tactical сам или 1 worker (если multi-file) |
| Acceptance | lead-tactical (self-acceptance по acceptance criteria из задачи) |
| Review | Review Gate subagents (code-reviewer + security-reviewer минимум) |
| Strategic decisions | **Нет.** Если возникает архитектурное решение — STOP, переключиться на full или standard mode |

**Escalation rule для lightweight:**

Если в процессе работы lead-tactical обнаруживает, что задача **сложнее, чем ожидалось** (нужны schema changes, cross-layer координация, неочевидный design choice), он:

1. Логирует `ESCALATION_TO_FULL` в decision-log
2. Коммитит текущую работу
3. Либо переключается на full autonomous (если Codex доступен), либо останавливается и ждёт пользователя

### 3.2. Full: lead-strategic (GPT-5.4) — autonomous decision-maker

Всё из `lead-strategic/instructions.md` плюс:

- **Утверждает план без user approval.** Plan считается approved сразу после создания, если не нарушает guardrails.
- **Принимает slice verdicts автономно.** `ACCEPT` / `ACCEPT WITH ADJUSTMENTS` / `REJECT` — как обычно, но без паузы на пользователя.
- **Решает escalations по decision framework (§4).** Вместо "эскалировать пользователю" — принять решение, записать в decision-log с rationale.
- **Принимает финальный результат.** Если integration review green и guardrails не нарушены — `ACCEPT`.
- **Не получает новых прав:** не может выходить за scope, не может игнорировать invariants, не может менять contracts без waiver.

### 3.3. Full: lead-tactical (Claude Opus) — autonomous executor

Всё из `lead-tactical/instructions.md` плюс:

- **Не ждёт user input.** Вместо `AskUserQuestion` — принимает решение по framework или логирует и продолжает.
- **Escalations → decision-log + Codex.** Вместо "эскалировать пользователю" — отправляет в Codex через `--resume`, GPT-5.4 решает.
- **Self-monitoring:** проверяет timeout и guardrails после каждого slice.
- **Автономная остановка:** если guardrail нарушен или timeout истёк — остановиться, зафиксировать state, написать partial report.

### 3.4. worker, reviewers — без изменений

Работают так же, как в standard workflow. Workers не знают, что режим автономный.

## 3.1. CTO-модель lead-strategic

`lead-strategic` работает как **технический директор / tech-lead**: не пишет код, не запускает команды, но владеет всеми ключевыми решениями и управляет качеством через запросы к execution-слою.

### Что делает сам (без делегирования)

| Зона | Действия |
| --- | --- |
| **Планирование** | Декомпозиция задачи → slices с acceptance criteria, sequencing, dependency graph |
| **Архитектура** | Выбор слоя, паттерна, контракта. Placement decisions. Exception/waiver |
| **Risk assessment** | Выбор operating mode, оценка blast radius каждого slice |
| **Acceptance** | Принятие/отклонение slice по report + review verdicts + diff analysis |
| **Reframe** | Пересмотр следующего slice на основе реального результата текущего |
| **Conflict resolution** | Арбитраж, когда reviewers расходятся или worker оспаривает scope |
| **Knowledge management** | Обновление `memory.md`, фиксация canonical decisions в plan |

### Что делегирует (через lead-tactical → workers)

| Зона | Делегируется кому | Как |
| --- | --- | --- |
| **Весь код** | workers | Slice handoff с чётким scope и acceptance criteria |
| **Команды** (build, test, lint, git) | lead-tactical / workers | Не запускает сам, читает результаты из report |
| **Review execution** | reviewer subagents | Запускает lead-tactical, results идут в report |
| **Исследование кода** | lead-tactical | "Покажи текущую структуру X", "Какие паттерны используются в Y" |
| **Proof of concept** | workers | "Реализуй minimal spike для Z, верни findings без merge" |

### Что запрашивает (transparency requests)

`lead-strategic` не видит код напрямую, но может запрашивать прозрачность через lead-tactical. Это ключевой механизм управления без прямого доступа к коду.

**Запросы к lead-tactical:**

| Запрос | Когда | Формат ответа |
| --- | --- | --- |
| `EXPLAIN_DIFF` | Непрозрачный diff, неочевидные изменения | Summary по каждому файлу: что изменено, зачем |
| `EXPLAIN_DECISION` | Worker принял неочевидное решение | Rationale + альтернативы + почему отвергнуты |
| `SHOW_STRUCTURE` | Нужно понять текущее состояние модуля | File tree + key interfaces + data flow |
| `SHOW_IMPACT` | Оценка blast radius перед acceptance | Какие модули затронуты, что может сломаться |
| `ALTERNATIVE_APPROACH` | Текущий подход вызывает сомнения | Worker реализует альтернативу (spike), comparison report |
| `DOCUMENT_RISK` | Принятое решение несёт risk | Worker/lead-tactical описывает: что может пойти не так, mitigation |
| `VERIFY_INVARIANT` | Подозрение на нарушение инварианта | Lead-tactical проверяет конкретный invariant, возвращает evidence |

**Примеры в Codex-промптах:**

```text
# lead-strategic → lead-tactical (через Codex --resume)

ACCEPT WITH ADJUSTMENTS for SLICE-3.

Adjustments:
1. EXPLAIN_DECISION: worker выбрал inline SQL вместо repository pattern —
   задокументируй rationale в decision-log.
2. SHOW_IMPACT: slice добавил новый тип геометрии — покажи,
   какие существующие queries это затрагивает.
3. DOCUMENT_RISK: soft-delete для imported objects — опиши edge cases
   при re-import того же объекта.

После выполнения adjustments — continue to SLICE-4.
```

```text
# lead-strategic: rejection с запросом альтернативы

REJECT SLICE-5.

Причина: подход через monolithic adapter не масштабируется.

ALTERNATIVE_APPROACH: реализуй adapter как strategy pattern
(один interface, отдельные implementations per source).
Покажи оба варианта в spike, без merge.
Верни comparison: LOC, complexity, extensibility.
```

### Информационная асимметрия и как lead-strategic с ней работает

`lead-strategic` принципиально не видит:
- Raw diff (только summaries и review verdicts)
- Runtime output (только reported results)
- File contents (только запрошенные excerpts)

Это **дизайн, а не ограничение.** Преимущества:

1. **Фокус на "что" и "зачем", а не "как"** — стратегические решения не загрязняются implementation details.
2. **Масштабируемость** — lead-strategic может управлять несколькими parallel waves, не читая каждую строку.
3. **Quality through review** — вместо "я прочитал код и он ок" → "review прошёл, evidence есть, acceptance criteria закрыты".
4. **Forced transparency** — если что-то непрозрачно, lead-strategic явно запрашивает объяснение, что создаёт документированный trail.

Компенсация информационной асимметрии:

| Канал | Что даёт |
| --- | --- |
| Review verdicts | Объективная оценка качества от независимых reviewers |
| Worker handoff | Structured summary с evidence и self-check |
| Decision-log | Trail всех нетривиальных решений |
| Transparency requests | On-demand deep-dive в конкретный аспект |
| Memory | Accumulated context из прошлых сессий |

### Anti-patterns

Чего lead-strategic **не должен** делать:

- **Микроменеджмент кода** — "переименуй переменную X в Y" → это scope worker'а или code-reviewer'а.
- **Запрашивать полный diff** — читать его всё равно не нужно; запрашивай `EXPLAIN_DIFF` или `SHOW_IMPACT` если что-то непрозрачно.
- **Дублировать review** — не повторяй работу code/security/arch reviewers; если не доверяешь verdict — запроси re-review с уточнённым scope.
- **Принимать решения без evidence** — если report неполон или review skipped без rationale, запроси дополнение, а не принимай вслепую.
- **Блокировать execution запросами** — transparency requests не должны превращаться в bottleneck. Батчи запросы, не выдавай их по одному.

## 4. Decision Framework

Правила для принятия решений без пользователя. Применяются `lead-strategic` и `lead-tactical`.

### 4.1. Архитектурные решения

| Ситуация | Решение |
| --- | --- |
| Неясно, в какой слой положить код | Следуй существующим паттернам в соседних модулях |
| Два подхода равноценны | Выбирай проще, логируй альтернативу |
| Нужна новая зависимость | Только если аналог уже в `package.json`; новую — в decision-log как `DEFERRED` |
| Нужен новый shared utility | Inline first, extract only if 3+ call sites |
| Неясна схема БД | Читай миграции + relevant domain bootstrap doc (e.g. `emis_session_bootstrap.md`) |

### 4.2. Scope decisions

| Ситуация | Решение |
| --- | --- |
| Задача оказалась больше, чем ожидалось | Реализовать core scope, отложить extras в `DEFERRED` секцию decision-log |
| Найден баг, не связанный с задачей | Логировать в decision-log, не чинить |
| Нужен рефакторинг для выполнения задачи | Минимальный, только если блокирует; логировать |
| Code вне scope сломан и мешает | Minimal fix + логировать, не рефакторить |

### 4.3. Конфликты и неоднозначности

| Ситуация | Решение |
| --- | --- |
| Reviewers расходятся | `lead-strategic` выбирает позицию с лучшим rationale, логирует |
| Slice rejected 3+ раза | `lead-strategic` решает: simplify scope, skip slice, или accept-with-known-limitation |
| Invariant violation | **STOP.** Не может быть resolved автономно. Это guardrail break. |
| Новый contract / schema нужен | Допустимо только если в scope задачи. Логировать как `SIGNIFICANT DECISION` |

### 4.4. Fallback rule

**Если ни одно правило не подходит:** `lead-strategic` принимает решение, которое минимизирует blast radius, и логирует его как `JUDGMENT CALL` с полным rationale.

## 5. Guardrails

Жёсткие ограничения, нарушение которых **останавливает** autonomous execution.

### 5.1. Hard stops (autonomous execution прекращается)

- **Invariant violation** — нарушение `docs/agents/invariants.md`
- **Scope escape** — работа за пределами заданного scope без явного расширения в decision-log
- **Destructive operation** — `DROP TABLE`, force push, удаление production data/files, `rm -rf` на нетривиальных путях
- **Secret exposure** — коммит `.env`, credentials, tokens
- **Timeout exceeded** — превышен заданный timeout
- **External system mutation** — запись в external API, отправка сообщений, deploy
- **Новая runtime зависимость** — добавление нового пакета в `package.json` (только если не разрешено явно в задаче)

### 5.2. Soft limits (логируются, execution продолжается)

- **Файл > 500 строк** — warning, логировать обоснование
- **> 20 изменённых файлов** — warning, сверить со scope
- **> 5 slices выполнено** — checkpoint: сверить progress с timeout
- **Review WARNING не исправлен** — логировать причину

### 5.3. Custom guardrails

Пользователь может расширить или сузить guardrails в autonomy parameters:

```text
Guardrails:
  allow: новые npm-зависимости (uuid, zod)
  deny: изменения в packages/emis-server/src/modules/auth/
  deny: DB migrations
```

## 6. Decision Log

Каждое нетривиальное решение, принятое автономно, фиксируется в `docs/agents/lead-tactical/decision-log.md`.

### Формат

```markdown
# Decision Log — <название задачи>

Режим: autonomous
Начало: <ISO timestamp>
Scope: <заданный scope>
Timeout: <заданный timeout>

## Decisions

### D-1: <краткое описание>
- **Тип:** SCOPE | ARCHITECTURE | CONFLICT | JUDGMENT_CALL | SIGNIFICANT | DEFERRED
- **Контекст:** <что произошло>
- **Решение:** <что решили>
- **Rationale:** <почему>
- **Альтернатива:** <что ещё можно было сделать>
- **Risk:** LOW | MEDIUM | HIGH

### D-2: ...

## Deferred

- <что отложено и почему>

## Guardrail Events

- <soft limit warnings, если были>
```

### Кто пишет decision-log

- `lead-tactical` создаёт файл при старте autonomous execution.
- `lead-tactical` логирует свои тактические решения.
- `lead-strategic` (через Codex `--write`) логирует стратегические решения.
- После завершения decision-log остаётся как артефакт для user review.

## 7. Lifecycle

### 7.1. Lightweight Lifecycle

```text
1. lead-tactical получает lightweight autonomous task
2. Читает reference implementation
3. Создаёт decision-log.md с mini-plan:
   - что делать (1-3 шага)
   - acceptance criteria (из задачи)
   - reference file
4. Реализует:
   - сам, если ≤ 3 файла
   - через 1 worker-teammate, если > 3 файлов
5. Запускает Review Gate:
   - code-reviewer (обязательно)
   - security-reviewer (обязательно)
   - architecture-reviewer (если новые файлы или imports)
   - docs-reviewer (если docs в scope)
6. Исправляет CRITICAL и WARNING findings
7. Проверяет: pnpm check && pnpm build (если TS changes)
8. Коммитит с осмысленным сообщением
9. Финализирует decision-log
```

**Нет `last_report.md`** — в lightweight mode decision-log заменяет report. Он содержит mini-plan, decisions и итог.

**Нет `current_plan.md`** — план живёт внутри decision-log, не перезаписывает стратегический план.

**Нет memory update** — lightweight задачи не меняют стратегический контекст.

### 7.2. Full Lifecycle — Startup

```text
1. lead-tactical получает full autonomous task
2. Читает autonomous-protocol.md
3. Создаёт decision-log.md
4. /codex:rescue --fresh --write:
   "Autonomous mode. Создай plan для: <задача>.
    Scope: <scope>. Guardrails: <guardrails>.
    Ты — autonomous decision-maker. Утверди план сам.
    Зафиксируй operating mode.
    Не жди user approval."
5. lead-strategic создаёт current_plan.md + утверждает
6. lead-tactical начинает execution loop
```

### 7.3. Full Lifecycle — Execution loop

```text
For each slice:
  1. Dispatch worker (как обычно)
  2. Worker: implement + slice review + handoff
  3. lead-tactical: проверить handoff, запустить review gate
  4. /codex:rescue --resume:
     "Autonomous acceptance. Slice N result: <summary>.
      Review verdict: <verdict>.
      Decision-log entries: <new entries>.
      Прими решение: ACCEPT / ADJUST / REJECT.
      Reframe next slice если нужно."
  5. lead-strategic: verdict + reframe (без паузы на user)
  6. Проверить guardrails + timeout
  7. Если REJECT — вернуть worker'у / simplify
  8. Если ACCEPT — следующий slice
```

### 7.4. Full Lifecycle — Completion

```text
1. Integration review (если нужен)
2. /codex:rescue --resume "final autonomous acceptance"
3. lead-strategic: final verdict
4. lead-tactical: собрать last_report.md + финализировать decision-log
5. Коммит всех изменений
6. Обновить memory files
7. Вывести summary для пользователя
```

### 7.5. Interruption (любой mode)

```text
1. Остановить текущую работу (довести до safe state)
2. Коммит уже сделанного
3. decision-log: записать причину остановки
4. last_report.md: partial report со статусом INTERRUPTED (full mode only)
5. memory: обновить для continuability (full mode only)
6. Вывести summary с: что сделано, что осталось, почему остановились
```

**Lightweight-specific interruption:** если задача оказалась сложнее ожидаемого:

```text
1. Логировать ESCALATION_TO_FULL в decision-log
2. Коммит текущей работы
3. Вывести: "Задача сложнее, чем lightweight. Нужен full autonomous или standard mode."
4. Описать: что уже сделано, что требует strategic decision
```

## 8. Codex Prompting для Autonomous Mode

### Initial plan prompt

```text
## Autonomous Strategic Planning

Role: lead-strategic (autonomous decision-maker)
Mode: autonomous — ты утверждаешь план сам, не ждёшь user approval.

### Задача
<описание от пользователя>

### Scope
<scope ограничения>

### Guardrails
<guardrails>

### Контекст
Прочитай:
- docs/agents/lead-strategic/memory.md
- Relevant domain bootstrap doc if applicable (e.g. docs/emis_session_bootstrap.md for EMIS)
- Relevant source files

### Инструкции
1. Создай plan в docs/agents/lead-strategic/current_plan.md
2. Выбери operating mode
3. План считается APPROVED сразу
4. Укажи в плане: "Autonomous mode — plan self-approved by lead-strategic"
5. Обнови memory.md
```

### Slice acceptance prompt

```text
## Autonomous Slice Acceptance

Slice: <N> — <название>
Result: <summary из handoff>
Review verdict: <reviewer verdicts>
Decision-log entries since last acceptance: <entries>
Remaining timeout: <minutes>
Guardrail status: <clean / warnings>

### Инструкции
1. ACCEPT / ACCEPT WITH ADJUSTMENTS / REJECT
2. Reframe next slice если нужно
3. Обнови current_plan.md если reframe
4. Логируй significant decisions
5. Если REJECT — объясни что исправить
6. Не жди user input
```

## 9. Post-Execution User Review

После автономного выполнения пользователь получает:

1. **`last_report.md`** — стандартный report (full / lightweight / governance-closeout)
2. **`decision-log.md`** — все решения, принятые автономно
3. **Git diff** — что изменилось

### Checklist для user review

- [ ] decision-log: нет `HIGH` risk decisions, которые не устраивают
- [ ] decision-log: `JUDGMENT_CALL` решения адекватны
- [ ] decision-log: `DEFERRED` items понятны и принимаемы
- [ ] Код соответствует ожиданиям (быстрый review diff)
- [ ] Guardrail warnings обоснованы
- [ ] Merge или revert

### Если результат не устраивает

```text
# Вариант 1: доработать в диалоговом режиме
Доработай результат автономной задачи.
Мои замечания: <что не так>
Decision-log entries D-3, D-5 — неверные решения, исправь.

# Вариант 2: откатить
git reset --soft HEAD~N  # откатить коммиты автономной сессии
```

## 10. Recovery Protocols (autonomous-specific)

### ARP-1. Codex недоступен в full autonomous mode

**Full** autonomous mode не может продолжаться без GPT-5.4. При Codex failure:

1. Довести текущий slice до safe state.
2. Коммит + decision-log + partial report.
3. Оценить: можно ли оставшуюся работу завершить в **lightweight** mode (если оставшиеся slices не требуют strategic decisions)?
4. Если да — переключиться на lightweight, логировать `DOWNGRADE_TO_LIGHTWEIGHT`.
5. Если нет — переключиться в **standard workflow** (RP-3 из `recovery.md`).
6. Пользователь решает при постфактум review.

**Lightweight** mode не зависит от Codex — этот recovery protocol к нему не применим.

### ARP-2. lead-strategic застрял в rejection loop

Если `lead-strategic` отклоняет slice 3+ раза:

1. В standard mode это эскалация к пользователю (RP-5).
2. В autonomous mode `lead-strategic` **сам** решает по правилу:
   - Если можно simplify scope — simplify + логировать.
   - Если нельзя — skip slice, пометить как `DEFERRED`, продолжить.
   - Если slice критичен для остальных — **STOP autonomous execution**, partial report.

### ARP-3. Timeout approaching

Когда осталось < 20% timeout:

1. `lead-tactical` оценивает: можно ли завершить текущий slice.
2. Если да — завершить slice + final report (partial).
3. Если нет — остановиться, коммит current state.
4. В обоих случаях: decision-log entry `TIMEOUT_APPROACHING`.

## 11. Ограничения и риски

### Когда НЕ использовать autonomous mode

- **Задача требует продуктового решения** — autonomous agents не знают бизнес-контекст
- **Задача затрагивает production** — deploy, миграции, external APIs
- **Scope нечёткий** — "улучши производительность" → нужен диалог
- **Первая задача в новом домене** — agents не имеют domain context
- **Cross-repo изменения** — выходит за scope одного workspace

### Когда какой уровень эффективен

| Задача | Уровень | Почему |
| --- | --- | --- |
| Adapter по аналогии | **Lightweight** | Reference есть, scope чёткий |
| Bug fix с воспроизведением | **Lightweight** | Scope узкий, acceptance однозначен |
| Batch rename / migrate pattern | **Lightweight** | Механическая трансформация |
| Расширение existing feature | **Lightweight** | Паттерн очевиден |
| Новый модуль с нестандартным API | **Full** | Архитектурные решения |
| Cross-layer feature | **Full** | Координация между слоями |
| Schema change + downstream | **Full** | Sequencing зависит от результата |
| Задача с неочевидным acceptance | **Full** | Нужен strategic judgment |

### Известные риски

| Риск | Lightweight | Full | Mitigation |
| --- | --- | --- | --- |
| **Decision drift** | Низкий (мало решений) | Средний | decision-log + postfactum review |
| **Cost** | Низкий (только Claude) | Высокий (Claude + GPT-5.4) | Выбирай lightweight, когда можно |
| **Partial completion** | Редко (короткие задачи) | Возможно | Atomic commits, partial reports |
| **Over-engineering** | Невозможно (нет strategic loop) | Возможно | Timeout + scope limits |

## 12. Примеры запуска

### Пример 1: Wikimapia adapter — Lightweight

**Почему lightweight:** задача по аналогии, reference есть (OSM + GEM), scope = 1 модуль, нет архитектурных решений.

**Промпт (interactive):**

```text
Автономная задача (lightweight): добавить Wikimapia source adapter
для EMIS ingestion по аналогии с OSM и GEM.

Reference: packages/emis-server/src/modules/ingestion/adapters/osmAdapter.ts
Scope: packages/emis-server/src/modules/ingestion/adapters/
Ограничения:
- Не трогать существующие adapters, service.ts, repository.ts
- Не менять DB schema, не добавлять npm-зависимости
- API key через env var WIKIMAPIA_API_KEY
- Формат API: scripts/test-wikimapia-api.ts
Timeout: 30 минут
```

**Headless (fire-and-forget):**

```bash
claude -p "$(cat <<'EOF'
## Autonomous Task (Lightweight)

Ты — lead-tactical в lightweight autonomous mode.
Прочитай docs/agents/autonomous-protocol.md, секцию 1.1 и 7.1.

### Задача
Добавить Wikimapia source adapter для EMIS ingestion.

### Reference (читай первым)
- packages/emis-server/src/modules/ingestion/adapters/osmAdapter.ts — main pattern
- packages/emis-server/src/modules/ingestion/adapters/gemAdapter.ts — second reference
- packages/emis-server/src/modules/ingestion/adapters/types.ts — SourceAdapter interface
- packages/emis-server/src/modules/ingestion/adapters/registry.ts — регистрация
- scripts/test-wikimapia-api.ts — формат Wikimapia API

### Scope
- packages/emis-server/src/modules/ingestion/adapters/ — новый файл + registry + index

### Ограничения
- Не трогать существующие adapters, service.ts, repository.ts
- Не менять DB schema, не добавлять npm-зависимости
- API key через env var WIKIMAPIA_API_KEY

### Режим
Lightweight autonomous — без Codex, без strategic loop.
1. Прочитай reference, создай mini-plan в decision-log
2. Реализуй wikimapiaAdapter.ts по паттерну osmAdapter
3. Зарегистрируй в registry.ts, экспортируй из index.ts
4. Review Gate: code-reviewer + security-reviewer
5. Исправь findings, pnpm check && pnpm build
6. Коммит + финализируй decision-log
Timeout: 30 минут.
EOF
)" --allowedTools "Edit,Write,Bash,Glob,Grep,Read,Agent" \
   --max-turns 100
```

**Что произойдёт:**

```text
1. Читает osmAdapter.ts + gemAdapter.ts + types.ts       (~2 мин)
2. Создаёт decision-log с mini-plan                       (~1 мин)
3. Пишет wikimapiaAdapter.ts:                             (~8 мин)
   - WIKIMAPIA_TYPE_MAP (categories → EMIS codes)
   - geometry mapping (polygon → GeoJSON)
   - fetch logic (Wikimapia API → NormalizedCandidate[])
4. Обновляет registry.ts + index.ts                       (~2 мин)
5. Review Gate: code + security                           (~4 мин)
6. Fix findings                                           (~3 мин)
7. pnpm check && pnpm build                               (~2 мин)
8. Коммит + decision-log                                  (~1 мин)
                                                   Total: ~23 мин
```

**Нет Codex round-trips = экономия ~10 мин и токенов GPT-5.4.**

### Пример 2: Новый ingestion source с нестандартным API — Full

**Почему full:** API нестандартный (пагинация, rate limits, auth flow), нужны архитектурные решения (retry strategy, data normalization), cross-file impact.

```text
Автономная задача (full): добавить MarineTraffic source adapter.
Контекст:
- API требует OAuth2, пагинацию, rate limiting
- Данные в нестандартном формате (XML + JSON mixed)
- Нужно решить: retry strategy, partial ingestion, error handling

Scope: packages/emis-server/src/modules/ingestion/
Ограничения: не менять DB schema
Режим: autonomous full (docs/agents/autonomous-protocol.md)
Timeout: 60 минут
```

### Пример 3: Рефакторинг по правилам — Lightweight

```text
Автономная задача (lightweight): переименовать objectTypeCode → categoryCode
в packages/emis-server/ и packages/emis-contracts/.

Reference: найти все uses через grep, переименовать
Scope: packages/emis-server/, packages/emis-contracts/
Ограничения: не трогать DB columns, только TS code и types.
Timeout: 20 минут
```

### Пример 4: Bug fix — Lightweight

```text
Автономная задача (lightweight): при GEM ingestion дублируются записи
если source_ref уже есть в stg_emis.obj_import_candidate.

Reference: packages/emis-server/src/modules/ingestion/repository.ts
Воспроизведение: запустить GEM ingestion дважды подряд.
Ожидание: второй запуск должен обновлять (upsert), а не дублировать.
Scope: packages/emis-server/src/modules/ingestion/
Timeout: 20 минут
```

### Пример 5: Cross-layer feature — Full

```text
Автономная задача (full): добавить фильтр по source в Review UI.
Контекст:
- /emis/ingestion/conflicts показывает все конфликты
- Нужен dropdown фильтр по source (osm, gem, wikimapia)
- Затрагивает: API route, server query, UI component

Scope:
- apps/web/src/routes/api/emis/ingestion/
- packages/emis-server/src/modules/ingestion/
- apps/web/src/routes/emis/
Режим: autonomous full
Timeout: 45 минут
```

## 13. Связь с другими документами

| Документ | Связь |
| --- | --- |
| `workflow.md` | Autonomous — надстройка над standard workflow. Все роли, review gate, report formats остаются |
| `review-gate.md` | Review model без изменений. Strategic acceptance loop работает, но без user pauses |
| `recovery.md` | RP-1..RP-6 действуют. ARP-1..ARP-3 расширяют для autonomous-specific cases |
| `invariants.md` | Инварианты = hard guardrails. Нарушение = STOP |
| `lead-strategic/instructions.md` | Расширяется autonomous decision-maker ответственностью |
| `lead-tactical/instructions.md` | Расширяется autonomous executor ответственностью |
| `memory-protocol.md` | Без изменений. Decision-log — дополнительный артефакт |
| `user-guide.md` | Добавить секцию про autonomous mode entry |
