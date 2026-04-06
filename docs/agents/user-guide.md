# User Guide — Работа с командой агентов

Практический runbook для пользователя.

По умолчанию используйте **integrated orchestration path**: вы ставите задачу `lead-tactical`, он сам тянет Codex/GPT-5.4, workers и reviewers по workflow.

## 5-Minute Overview

Агентная команда работает в три слоя:

```text
┌─────────────────────────────────────────────────────────┐
│  GPT-5.4 (lead-strategic)                               │
│  Планирует, декомпозирует, принимает результат.         │
│  Не пишет код. Владеет current_plan.md.                 │
├─────────────────────────────────────────────────────────┤
│  Claude Opus (lead-tactical)                            │
│  Исполняет план: раздаёт задачи, запускает review,      │
│  собирает report. Владеет execution flow.               │
├──────────────────┬──────────────────────────────────────┤
│  Worker (Claude)  │  Reviewers (Claude, fresh subagent) │
│  Реализует slice  │  Проверяют diff по своей зоне       │
│  в заданном scope │  (security, architecture, code, UI) │
└──────────────────┴──────────────────────────────────────┘
```

**Как это работает на практике:**

1. Ты ставишь задачу `lead-tactical` (Claude Opus).
2. Он сам поднимает GPT-5.4 через Codex plugin для планирования.
3. GPT-5.4 пишет план, ты его подтверждаешь (или нет).
4. `lead-tactical` создаёт worker'ов (teammates в tmux), которые реализуют план по частям (slices).
5. После каждого slice worker запускает review (fresh subagents: security, architecture, code, docs, UI).
6. После каждого принятого slice `lead-strategic` делает post-slice reframe; в risky waves он может запускать strategic-reviewer на каждом slice, в обычных — только по risk signals.
7. В конце `lead-tactical` запускает integration review на полный diff и собирает report.
8. GPT-5.4 принимает или отклоняет результат.
9. Ты подтверждаешь merge.

**Ключевые понятия:**

- **Slice** — одна подзадача плана с чётким scope и acceptance criteria.
- **Review Gate** — набор автоматических review passes (security, architecture, code, docs, UI).
- **Post-slice reframe** — обязательная сверка следующего slice с реальным результатом текущего.
- **Handoff** — формальная сдача результата от worker'а к `lead-tactical`.
- **Escalation** — когда агент не может принять решение сам и обращается к тебе.

Ты участвуешь только в трёх точках: **план** (approve), **эскалации** (decide), **merge** (confirm). Всё остальное автономно.

## 30-Second Quickstart

Не хочешь разбираться в ролях и tmux — просто запусти:

```bash
# Полный цикл (план через Codex/GPT-5.4, workers, review gate):
./scripts/emis-task.sh "добавить фильтр по дате в /emis/map"

# С явным scope:
./scripts/emis-task.sh "bcrypt migration" --scope "packages/emis-server/src/modules/users/"

# Локальная low-risk задача: только risk hint, без bypass strategic ownership
./scripts/emis-task.sh "fix typo in login page" --low-risk
```

Скрипт сам запустит tmux (если не запущен), сформирует промпт и откроет Claude в режиме lead-tactical. Флаг `--low-risk` только подсказывает ожидаемый operating mode: canonical workflow, plan ownership и final acceptance всё равно остаются у `lead-strategic`. Legacy alias `--simple` допустим только для backward compatibility и больше не должен читаться как "без strategic loop".

## Быстрый старт (manual)

### Что нужно

| Компонент                   | Где                          | Как использовать                                                                |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| GPT-5.4 (`lead-strategic`)  | Codex plugin                 | Вызывается из `lead-tactical` через Codex                                       |
| Claude Opus (`lead-tactical`) | tmux pane #0               | `tmux` → `claude`                                                               |
| Claude Worker (teammate)    | tmux pane #1+                | Lead создаёт через Agent Teams, или вручную                                     |

### Предусловия

1. Agent Teams включён:

   ```json
   // ~/.claude.json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```

2. Codex plugin настроен (`/codex:setup` для проверки).

## Primary Path

Пиши сразу `lead-tactical`:

```text
Новая задача: <что сделать>
Контекст: <зачем>
Scope: <что затрагивает>
Ограничения: <что нельзя трогать>
Работай по docs/agents/workflow.md как tactical-orchestrator.
```

Что произойдёт дальше:

- Claude сам поднимет план через Codex/GPT-5.4, если задача нетривиальна
- сам создаст workers / reviewers
- вернётся к тебе только с plan approval, эскалациями и merge decision

Для простой локальной задачи обычно достаточно:

```text
Исправь <проблема>. Файл/зона: <путь>.
Сначала классифицируй задачу по docs/agents/workflow.md. Даже для low-risk fix plan ownership и final acceptance остаются у lead-strategic.
Если нужно — создай worker. Если review нужен по workflow, запусти его. Иначе верни lightweight report с причиной skip.
```

## Fallback Path (deprecated)

> Используй только если Codex CLI полностью недоступен. Если Codex временно недоступен посреди работы — используй recovery protocol RP-3 из `docs/agents/recovery.md`.

Поставь задачу GPT-5.4 в отдельном чате → он напишет `current_plan.md` → скажи Claude `Выполняй план из docs/agents/lead-strategic/current_plan.md` → передай `last_report.md` обратно в GPT-5.4.

## Частые сценарии

### Продолжить работу

Claude:

```text
Продолжи работу. Прочитай:
- docs/agents/lead-tactical/memory.md
- docs/agents/lead-strategic/current_plan.md
```

### После auto-compact

```text
Ты — lead-tactical. Восстановись:
1. Прочитай docs/agents/lead-tactical/memory.md
2. Прочитай docs/agents/lead-tactical/instructions.md
3. Прочитай docs/agents/lead-strategic/current_plan.md
Продолжи работу.
```

### Эскалация от Claude

В integrated path Claude сам пробросит эскалацию через Codex. Ты увидишь её в tmux. Выбери вариант и ответь:

```text
Решение по эскалации: <вариант N>. Продолжай.
```

### Запуск Review Gate вручную

```text
Запусти Review Gate по текущим изменениям
```

Или точечно:

```text
Проверь только безопасность
Только architecture review
Запусти code review
Проверь UI на /emis
Глубокий UI-ревью новой страницы
```

### Strategic Review Pass

Если нужен bounded strategic acceptance/reframe pass без нового strategic чата:

- дай `current_plan.md`
- дай `last_report.md`
- дай текущий operating mode
- дай reviewer verdicts или risk signal, если нужен cross-model recheck после green review
- дай diff или changed files
- дай 2-4 canonical docs по теме

Пример:

```text
Сделай strategic review pass.
Проверь:
- соответствует ли результат плану
- есть ли scope drift
- все ли acceptance items закрыты
- есть ли likely bug/regression, который могли не поднять Sonnet reviewers
- меняется ли план следующего slice
- нужно ли менять operating mode
- нужен ли strategic decision или можно принимать
```

Практическое правило:

- в `high-risk iterative / unstable wave` per-slice strategic review нормален;
- в `ordinary iterative` post-slice reframe обязателен всегда, а отдельный strategic-reviewer pass нужен только по risk signals;
- в `batch / low-risk` strategic review обычно достаточно на integration/final acceptance;
- если нужен дешёвый cross-model second look после Sonnet review, по умолчанию используй `gpt-5.4-mini`, а не full `gpt-5.4`;
- operating mode выбирает `lead-strategic` в начале wave и может сменить его после любого post-slice reframe с короткой причиной.

Новый чат лучше, когда началась новая wave или нужен clean reset.

## Usage History

Если хочешь потом понять, какие агенты реально приносили пользу, смотри:

- `docs/agents/lead-tactical/last_report.md` — текущий human-readable report
- `runtime/agents/usage-log.ndjson` — append-only local history по task/slice usage

В usage log отдельно фиксируется:

- кто запускался
- зачем запускался
- был ли полезен или избыточен
- где orchestration можно упростить

Локальная БД для этого не нужна в v1; import в Postgres можно добавить позже.

## Workers

Попросить `lead-tactical` создать worker:

```text
Создай worker-teammate для задачи: <описание>
```

> По умолчанию worker-teammate работает напрямую в integration branch, без отдельной worker branch.
> `Worker branch: agent/worker/<slug>` нужен только при subagent+worktree mode (trigger criteria: `docs/agents/git-protocol.md` §4).

Если Agent Teams не работает, worker можно поднять вручную:

```text
Ты — worker. Прочитай docs/agents/worker/instructions.md
Задача: <описание>
Scope: <файлы>
Integration branch: feature/<topic>
Worker branch: agent/worker/<slug> (только subagent mode)
Не трогать: <что за пределами scope>
```

С worker-teammate можно общаться напрямую в tmux pane:

```text
Покажи что ты сделал
Объясни почему ты выбрал этот подход
Переделай <конкретный файл> — <что не так>
```

Reviewer-subagent под каждый review-pass создаётся отдельно; напрямую с ним обычно не общаются.

## Tmux

| Действие                   | Клавиша       |
| -------------------------- | ------------- |
| Новое окно                 | `Ctrl+B, C`   |
| Следующее окно             | `Ctrl+B, N`   |
| Предыдущее окно            | `Ctrl+B, P`   |
| Список окон                | `Ctrl+B, W`   |
| Отсоединиться              | `Ctrl+B, D`   |
| Вернуться                  | `tmux attach` |
| Следующий pane teammate    | `Shift+Down`  |
| Предыдущий pane teammate   | `Shift+Up`    |

## Перед Merge

- [ ] Все подзадачи плана выполнены
- [ ] Review Gate пройден или truthfully skipped/not applicable
- [ ] `WARNING` исправлены или обоснованы
- [ ] GPT-5.4 / Codex принял report, если strategic loop был задействован
- [ ] Ветка актуальна относительно `main`
- [ ] Коммиты чистые и осмысленные

## Recovery

Если выполнение пошло не по happy path, не пытайся чинить процесс устно. Проси `lead-tactical` явно идти по recovery protocol из `docs/agents/recovery.md`.

Короткие формулировки:

```text
Сработай по Recovery Protocol для rejected slice с applied DB change.
```

```text
Сработай по Recovery Protocol для divergence integration branch с main.
```

```text
Сработай по Recovery Protocol: Codex/GPT недоступен посреди iterative цикла.
```

## Короткие ответы

- GPT-5.4 нужен для новой фичи, архитектурного решения, cross-module change.
- Только Claude обычно хватает для локального бага, стилистики, небольшого рефакторинга.
- `worker = teammate` (default, shared checkout); subagent+worktree когда нужна файловая изоляция. `reviewer = fresh subagent`.
- Если Claude завис: проверь tmux pane, затем `Enter` и `продолжай`; если нужно, `Ctrl+C` и восстановление через `memory.md`.
- Если GPT-5.4 и Claude расходятся, стратегический приоритет у GPT-5.4, но финальное решение остаётся за пользователем.
