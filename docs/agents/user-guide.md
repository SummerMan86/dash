# User Guide — Работа с командой агентов

Практический runbook для пользователя.

По умолчанию используйте **integrated orchestration path**: вы ставите задачу `orchestrator` (legacy alias: `lead-tactical`), а не напрямую `lead-strategic`. `orchestrator` сам тянет Codex/GPT-5.4, workers и reviewers по workflow.

Прямой prompt в `lead-strategic` — только manual/fallback path или узкий strategic pass, а не основной user entrypoint.

Runtime/model binding for supported profiles lives only in
`docs/agents/execution-profiles.md`.

## Practical Runtime Summary

- `mixed-claude-workers` — current practical default: user-facing `orchestrator` stays in Claude; Codex/GPT-5.4 remains available for strategic work; ordinary worker/reviewer execution may stay on Claude lanes.
- `opus-orchestrated-codex-workers` — supported target profile for waves where worker/reviewer execution should move to Codex/GPT-5.4 lanes without changing role ownership.
- В Claude Code для `opus-orchestrated-codex-workers` primary operational path для worker/reviewer execution должен идти через `codex-plugin-cc`, а не через ad hoc codex-labeled subagent names.
- Practical plugin-first path in Claude Code for worker/reviewer execution:
  - `/codex:setup` — preflight
  - `/codex:rescue` — worker / micro-worker only
  - `/codex:review` / `/codex:adversarial-review` — reviewer lanes only
  - `/codex:status` / `/codex:result` — logical tracking/result surfaces; in current observed runtime, reliable proof retrieval is via companion CLI (`status --json`, `result`)
- For code-writing worker slices in that profile, request `/codex:rescue --fresh --write` by default; a bare `/codex:rescue` is read-only in current observed runtime behavior.
- For proof/recovery on that surface, expect to use companion CLI for `status/result`, not the skill surface.
- `lead-strategic` and `strategic-reviewer` are not implicitly mapped to those worker/reviewer slash commands. If the active plugin surface does not expose a dedicated strategic lane, treat that as explicit exception/fallback territory, not as silent remap.
- Если runtime surface не может truthfully показать, что worker/reviewer run действительно ушёл в Codex lane, не считай это validated `opus-orchestrated-codex-workers` execution; оставайся на `mixed-claude-workers` или фиксируй blocker truthfully.
- Minimum proof artifact for that claim in Claude Code = `/codex:result` + returned session ID/run ID tied to the specific worker/reviewer role; `/codex:status` tracks progress, а history alone only corroborates an already identified run.

## 5-Minute Overview

Агентная команда работает в три слоя:

```text
┌─────────────────────────────────────────────────────────┐
│  Lead-Strategic (profile-selected Codex lane)           │
│  Планирует, декомпозирует, принимает результат.         │
│  Не пишет код. Владеет current_plan.md.                 │
├─────────────────────────────────────────────────────────┤
│  Claude Opus (orchestrator)                             │
│  По умолчанию не пишет product code: раздаёт задачи,    │
│  запускает review, собирает report. Владеет flow.       │
├─────────────────────────────────────────────────────────┤
│  Workers / Reviewers (profile-selected runtime)         │
│  Реализуют slice и проверяют diff по своей зоне         │
│  по выбранному execution profile                        │
└─────────────────────────────────────────────────────────┘
```

**Как это работает на практике:**

1. Ты ставишь задачу `orchestrator` (Claude Opus).
2. Он сам поднимает `lead-strategic` через selected Codex lane по `execution-profiles.md`.
3. GPT-5.4 пишет план, ты его подтверждаешь (или нет).
4. `orchestrator` либо делает eligible `direct-fix` inline, либо создаёт worker'ов:
   - для code-writing slices по умолчанию это isolated subagents с отдельным worktree/branch;
   - teammate mode остаётся exception для docs-only / read-only / governance-closeout work.
   - если workers запускаются параллельно, они все идут как isolated subagents; teammate mode для parallel path не используется.
5. После каждого code-writing slice worker запускает minimum independent review floor (как минимум `code-reviewer`; при необходимости security, architecture, docs, UI).
6. После каждого принятого slice `lead-strategic` делает post-slice reframe; в risky waves он может запускать strategic-reviewer на каждом slice, в обычных — только по risk signals.
7. В конце `orchestrator` запускает integration review на полный diff и собирает report.
8. GPT-5.4 принимает или отклоняет результат.
9. Ты подтверждаешь merge.

**Ключевые понятия:**

- **Slice** — одна подзадача плана с чётким scope и acceptance criteria.
- **Review Gate** — набор автоматических review passes (security, architecture, code, docs, UI).
- **Post-slice reframe** — обязательная сверка следующего slice с реальным результатом текущего.
- **Handoff** — формальная сдача результата от worker'а к `orchestrator`.
- **Escalation** — когда агент не может принять решение сам и обращается к тебе.
- **Micro-worker** — тот же worker contract, но для trivial/bounded slice: маленький scope, быстрый handoff. Ты можешь увидеть его в report.
- **Direct-fix** — inline fast path у `orchestrator` для правки `<= 10` строк в одном файле без architectural surface; worker и reviewer там не обязательны.
- **Architecture Readiness Check** — bounded pre-implementation audit, который `orchestrator` может запустить перед execution, если фича затрагивает architectural surface (BI, cross-layer, новый dataset и т.д.). Может немного задержать старт execution — это нормально.

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

Скрипт сам запустит tmux (если не запущен), сформирует промпт и откроет Claude в режиме orchestrator. Флаг `--low-risk` только подсказывает ожидаемый operating mode: canonical workflow, plan ownership и final acceptance всё равно остаются у `lead-strategic`. Legacy alias `--simple` допустим только для backward compatibility и больше не должен читаться как "без strategic loop".

## Быстрый старт (manual)

### Что нужно

| Компонент                    | Где                                                                                   | Как использовать                                         |
| ---------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `lead-strategic`             | profile-selected Codex surface                                                        | Вызывается из `orchestrator` через selected runtime path |
| Claude Opus (`orchestrator`) | tmux pane #0                                                                          | `tmux` → `claude`                                        |
| Workers / reviewers          | profile-selected runtime; isolated branch/worktree by default for code-writing slices | Orchestrator создаёт через selected execution profile    |

### Предусловия

1. Agent Teams включён:

   ```json
   // ~/.claude.json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```

2. Codex plugin настроен (`/codex:setup` для проверки).

## Primary Path

Пиши сразу `orchestrator`:

```text
Новая задача: <что сделать>
Контекст: <зачем>
Scope: <что затрагивает>
Ограничения: <что нельзя трогать>
Работай по docs/agents/workflow.md как orchestration-only orchestrator.
```

Что произойдёт дальше:

- Claude сам поднимет план через Codex/GPT-5.4, если задача нетривиальна
- сам создаст workers / reviewers
- вернётся к тебе только с plan approval, эскалациями и merge decision

Для простой локальной задачи обычно достаточно:

```text
Исправь <проблема>. Файл/зона: <путь>.
Сначала классифицируй задачу по docs/agents/workflow.md. Даже для low-risk fix plan ownership и final acceptance остаются у lead-strategic.
Если нужно — создай worker. Любой implementation slice должен идти через worker. Если review нужен по workflow, запусти его. Иначе верни lightweight report с причиной skip.
```

## Fallback Path (deprecated)

> Используй только если Codex CLI полностью недоступен. Если Codex временно недоступен посреди работы — используй recovery protocol RP-3 из `docs/agents/recovery.md`.

Поставь задачу GPT-5.4 в отдельном чате → он напишет `current_plan.md` → скажи Claude `Выполняй план из docs/agents/lead-strategic/current_plan.md` → передай `last_report.md` обратно в GPT-5.4.

## Частые сценарии

### Продолжить работу

Claude:

```text
Продолжи работу. Восстановись как orchestrator:
- docs/agents/orchestrator/memory.md
- docs/agents/lead-strategic/memory.md
- docs/agents/orchestrator/instructions.md
- docs/agents/lead-strategic/current_plan.md
```

### После auto-compact

```text
Ты — orchestrator. Восстановись:
1. Прочитай docs/agents/orchestrator/memory.md
2. Прочитай docs/agents/lead-strategic/memory.md
3. Прочитай docs/agents/orchestrator/instructions.md
4. Прочитай docs/agents/lead-strategic/current_plan.md
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

- `docs/agents/orchestrator/last_report.md` — latest checked-in human-readable report/snapshot; role contract lives in current `docs/agents/*`
- `runtime/agents/usage-log.ndjson` — append-only local history по task/slice usage

В usage log отдельно фиксируется:

- кто запускался
- зачем запускался
- был ли полезен или избыточен
- где orchestration можно упростить

Локальная БД для этого не нужна в v1; import в Postgres можно добавить позже.

## Workers

Попросить `orchestrator` создать worker:

```text
Создай isolated worker для задачи: <описание>
```

> Для любого code-writing slice default = isolated worker с отдельным `agent/worker/<slug>` branch и worktree.
> Teammate mode — исключение для docs-only / read-only / governance-closeout work по `docs/agents/git-protocol.md` §4.

Если Agent Teams не работает, worker можно поднять вручную:

```text
Ты — worker. Прочитай docs/agents/worker/guide.md
Задача: <описание>
Scope: <файлы>
Integration branch: feature/<topic>
Worker branch: agent/worker/<slug> (default for code-writing; direct integration branch только если orchestrator явно назначил teammate mode)
Не трогать: <что за пределами scope>
```

С teammate-worker можно общаться напрямую в tmux pane:

```text
Покажи что ты сделал
Объясни почему ты выбрал этот подход
Переделай <конкретный файл> — <что не так>
```

Reviewer-subagent под каждый review-pass создаётся отдельно; напрямую с ним обычно не общаются.

## Tmux — настройка и работа

### Зачем tmux

Agent Teams использует tmux для управления panes: orchestrator живёт в одном pane. Если `orchestrator` выбрал teammate mode, новый teammate-worker автоматически появится в соседнем pane. Isolated subagent workers по умолчанию не обязаны жить в общем pane layout. Без tmux teammate path не будет работать.

### Первоначальная настройка

1. Убедись, что tmux установлен:

   ```bash
   # Ubuntu/Debian
   sudo apt install tmux

   # macOS
   brew install tmux
   ```

2. Убедись, что Agent Teams включён:

   ```json
   // ~/.claude.json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```

3. Убедись, что Codex plugin настроен (`/codex:setup` при запуске Claude для проверки).

### Запуск рабочей сессии

```bash
# 1. Создай именованную tmux-сессию (можно любое имя)
tmux new-session -s agents

# 2. Перейди в директорию проекта
cd ~/shared_folder/apps/dashboard-builder

# 3. Запусти Claude — он станет orchestrator
claude
```

Всё. Ты в pane #0, Claude готов работать как orchestrator.

### Что происходит, когда orchestrator создаёт worker

Если orchestrator вызывает `Agent Teams` в **teammate mode**, tmux **автоматически** создаёт новый pane в текущем окне. Это exception path для non-code work; код пишется isolated workers по умолчанию.

Pane layout ниже относится именно к teammate mode:

```text
┌──────────────────────────────┬──────────────────────────────┐
│  pane #0: orchestrator       │  pane #1: worker A           │
│  (сюда ты отправляешь задачу)│  (появился автоматически)    │
│                              │                              │
│                              │                              │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
```

Если orchestrator создаёт второго teammate-worker, появится pane #2, и так далее.

### Навигация между panes

| Действие                         | Клавиша                 |
| -------------------------------- | ----------------------- |
| Следующий pane (teammate вниз)   | `Shift+Down`            |
| Предыдущий pane (teammate вверх) | `Shift+Up`              |
| Новое окно                       | `Ctrl+B, C`             |
| Следующее окно                   | `Ctrl+B, N`             |
| Предыдущее окно                  | `Ctrl+B, P`             |
| Список окон                      | `Ctrl+B, W`             |
| Отсоединиться (сессия живёт)     | `Ctrl+B, D`             |
| Вернуться к сессии               | `tmux attach -t agents` |

`Shift+Down` / `Shift+Up` — основной способ перехода между orchestrator и worker panes.

### Работа с panes

- **Читать вывод worker'а**: перейди в его pane через `Shift+Down`, прокрути вверх (`Ctrl+B, [`, затем стрелки, `q` для выхода из scroll mode).
- **Написать worker'у напрямую**: перейди в его pane и печатай. Можно задать уточняющий вопрос или дать указание.
- **Вернуться к orchestrator**: `Shift+Up` до pane #0.

### Полезные tmux-команды

```bash
# Посмотреть список сессий (если забыл имя)
tmux list-sessions

# Вернуться к конкретной сессии
tmux attach -t agents

# Убить сессию (осторожно — все panes закроются)
tmux kill-session -t agents
```

### Если что-то пошло не так

- **Worker не появился**: проверь, что `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` в `~/.claude.json` и ты внутри tmux-сессии (не просто в терминале).
- **Pane закрылся**: worker завершил работу или упал. Orchestrator должен сам это обработать. Если нет — напиши ему `продолжай`.
- **Tmux отключился**: `tmux attach -t agents` — сессия и все panes будут живы.
- **Claude завис в pane**: нажми `Enter` и напиши `продолжай`. Если не помогает — `Ctrl+C`, затем заново запусти Claude и дай промпт восстановления (см. раздел «После auto-compact»).

## Перед Merge

- [ ] Все подзадачи плана выполнены
- [ ] Для любого code change minimum independent reviewer floor закрыт
- [ ] Review Gate пройден или truthfully skipped/not applicable
- [ ] `WARNING` исправлены или обоснованы
- [ ] GPT-5.4 / Codex принял report, если strategic loop был задействован
- [ ] Ветка актуальна относительно `main`
- [ ] Коммиты чистые и осмысленные

## Recovery

Если выполнение пошло не по happy path, не пытайся чинить процесс устно. Проси `orchestrator` явно идти по recovery protocol из `docs/agents/recovery.md`.

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

```text
Сработай по Recovery Protocol: slice получил 3+ rejection подряд, review loop не сходится.
```

```text
Сработай по Recovery Protocol: teammate закоммитил файлы вне своего scope.
```

```text
Сработай по Recovery Protocol: worker упал посреди реализации slice.
```

```text
Сработай по Recovery Protocol: конфликт при merge параллельных worker branches.
```

## Короткие ответы

- GPT-5.4 нужен для новой фичи, архитектурного решения, cross-module change.
- Только Claude обычно хватает для локального бага, стилистики, небольшого рефакторинга.
- `worker = subagent + worktree` (default для code-writing); teammate только для docs-only / read-only / governance-closeout. `reviewer = fresh subagent`.
- Если Claude завис: проверь tmux pane, затем `Enter` и `продолжай`; если нужно, `Ctrl+C` и восстановление через `memory.md`.
- Если GPT-5.4 и Claude расходятся, стратегический приоритет у GPT-5.4, но финальное решение остаётся за пользователем.
