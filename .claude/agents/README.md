# Субагенты проекта

## Как это работает

Claude Opus выступает как **lead-orchestrator** — принимает задачу, реализует, запускает Review Gate, агрегирует результаты. Тебе не нужно вручную роутить сообщения между агентами.

```
Ты даёшь задачу
    │
    ▼
Claude Opus (lead-orchestrator)
    │
    ├─ планирует и реализует
    │  (или spawn worker в worktree для параллельной работы)
    │
    ▼
git diff (что изменилось)
    │
    ├─► security-reviewer    (Sonnet)    ─ уязвимости + write-side guardrails
    ├─► architecture-reviewer (Sonnet)   ─ архитектура + complexity guardrails
    ├─► docs-reviewer        (Sonnet)    ─ документация + contracts + runtime
    ├─► codex-reviewer       (Codex/GPT) ─ качество кода + naming + conventions
    └─► ui-reviewer          (Sonnet/Opus, если фронтенд) ─ рендеринг, a11y
    │
    ▼
Claude Opus агрегирует findings
    │
    ├─ исправляет non-critical issues
    ├─ эскалирует CRITICAL к тебе
    │
    ▼
Ты подтверждаешь merge (или request changes)
```

Субагенты-ревьюеры **read-only** — они анализируют, но не редактируют файлы. Исправления делает Claude Opus после твоего подтверждения.

Для критических изменений (новый contract/schema/cross-module) ты можешь передать diff отдельному Codex/GPT-5.4 как внешнему `lead-integrator`.

## EMIS Operating Model Mapping

Имена агентов здесь привязаны к built-in dispatch Claude Code. В EMIS operating model используются алиасы, расширяющие scope.

Canonical role definitions: [`docs/emis_agent_roles.md`](../../docs/emis_agent_roles.md)

| Built-in name (dispatch) | EMIS alias | Модель | Что проверяет |
| ------------------------- | ----------------------- | ------------- | ------------- |
| `security-reviewer` | `security-reviewer` | Claude Sonnet | SQL injection, XSS, секреты, SSRF, write-side guardrails |
| `architecture-reviewer` | `architecture-reviewer` | Claude Sonnet | FSD boundaries, server isolation, EMIS layers, complexity guardrails |
| `docs-reviewer` | `docs-contracts-reviewer` | Claude Sonnet | AGENTS.md, CLAUDE.md, schema docs, RUNTIME_CONTRACT, schema_catalog |
| `codex-reviewer` | `code-reviewer` | Codex (GPT) | Naming, framework conventions, maintainability via `codex exec` |
| `ui-reviewer` | `ui-reviewer` (smoke) | Claude Sonnet | Рендеринг, console errors, базовые клики (Chrome) |
| `ui-reviewer-deep` | `ui-reviewer` (deep) | Claude Opus | Layout, a11y, interaction flows, design system compliance |

UI-ревьюеры — **условные**: запускаются только при изменениях фронтенда (`.svelte`, `.css`, routes) и только если dev server запущен. Требуют Chrome-расширение.

**Выбор уровня:**

- По умолчанию — `ui-reviewer` (Sonnet): быстрый smoke-test за ~10 сек
- По запросу — `ui-reviewer-deep` (Opus): глубокий UX/a11y аудит (скажи _"глубокий UI-ревью"_ или _"проверь UI на Opus"_)

## Жизненный цикл в рамках сессии

```
Задача 1:  Agent spawn x4-5 (загружают контекст проекта)   ~30 сек
Задача 2:  SendMessage x4-5 (уже знают проект, только diff) ~5 сек
Задача 3:  SendMessage x4-5                                  ~5 сек
...
Новая сессия: Agent spawn x4 заново
```

Субагенты **живут в рамках одного разговора**. При первой задаче загружают контекст, потом переиспользуются через SendMessage. Между сессиями — `memory: project` сохраняет накопленные знания.

## Как создать нового субагента

### 1. Создай файл `.claude/agents/имя-агента.md`

Минимальный шаблон:

````markdown
---
name: имя-агента
description: Краткое описание — когда запускать этого агента.
tools: Read, Grep, Glob
model: sonnet
memory: project
---

Ты — [роль агента] для проекта на SvelteKit + TypeScript.

## Что проверяешь

1. **Проверка A**: описание
2. **Проверка B**: описание

## Формат вывода

Если проблем нет:
\```
No issues found.
\```

Если найдены:
\```
[CRITICAL|WARNING|INFO] файл:строка — описание
Рекомендация: как исправить
\```

## Правила

- Анализируй ТОЛЬКО файлы из переданного diff
- Режим read-only — не редактируй файлы
- Будь кратким
````

### 2. Frontmatter — обязательные поля

```yaml
---
name: имя-агента # уникальное имя (латиница, дефисы)
description: ... # когда Claude должен использовать этого агента
tools: Read, Grep, Glob # доступные инструменты (ограничивай!)
model: sonnet # sonnet = дёшево и быстро, opus = точнее
memory: project # накапливает знания о проекте между сессиями
---
```

### 3. Добавь в AGENTS.md (корневой, секция 8)

В список субагентов-ревьюеров:

```markdown
- `имя-агента.md` — краткое описание
```

В секцию агрегации (формат Review Gate):

```markdown
- Имя: [OK | N issues found]
```

## Настройки frontmatter

### tools — какие инструменты доступны

| Инструмент | Для чего                 | Read-only? |
| ---------- | ------------------------ | ---------- |
| `Read`     | Чтение файлов            | Да         |
| `Grep`     | Поиск по содержимому     | Да         |
| `Glob`     | Поиск файлов по паттерну | Да         |
| `Bash`     | Выполнение команд        | Нет!       |
| `Edit`     | Редактирование файлов    | Нет!       |
| `Write`    | Создание файлов          | Нет!       |

Для ревьюеров используй только `Read, Grep, Glob`. Добавляй `Bash` только если агенту нужно запускать команды (как `codex-reviewer`).

### model — выбор модели

| Модель   | Когда использовать                    | Стоимость   |
| -------- | ------------------------------------- | ----------- |
| `sonnet` | Ревью, анализ, типовые проверки       | Низкая      |
| `opus`   | Сложная логика, архитектурные решения | Высокая     |
| `haiku`  | Быстрый поиск, простые проверки       | Минимальная |

### memory — память между сессиями

| Значение   | Что запоминает                                  |
| ---------- | ----------------------------------------------- |
| `project`  | Знания о проекте (паттерны, находки, структура) |
| `user`     | Предпочтения пользователя                       |
| Не указано | Ничего не помнит между сессиями                 |

## Примеры: готовые роли для добавления

### Тест-ревьюер (проверяет покрытие тестами)

```markdown
---
name: test-reviewer
description: Checks if changed code has adequate test coverage and suggests missing tests.
tools: Read, Grep, Glob
model: sonnet
memory: project
---

You are a test coverage reviewer.

## What to check

1. New functions/endpoints without corresponding tests
2. Changed logic paths without updated tests
3. Edge cases visible in the diff but not tested

## Output format

[WARNING] file:line — missing test for <description>
Suggestion: <what test to write>
```

### Performance-ревьюер

```markdown
---
name: performance-reviewer
description: Reviews code changes for performance issues (N+1 queries, memory leaks, unnecessary re-renders).
tools: Read, Grep, Glob
model: sonnet
memory: project
---

You are a performance reviewer for a SvelteKit application.

## What to check

1. N+1 query patterns in server code
2. Unnecessary reactivity ($effect without cleanup, derived from derived)
3. Large objects in $state that trigger excessive re-renders
4. Missing pagination/limits in database queries
5. Synchronous operations that should be async

## Output format

[WARNING] file:line — <performance issue>
Impact: <estimated impact>
Fix: <suggested optimization>
```

## Agent Teams (интерактивный режим)

Для сложных задач, где хочешь видеть и направлять каждого агента в tmux:

```bash
# 1. Запусти tmux
tmux

# 2. Внутри tmux запусти claude
claude

# 3. Попроси создать команду
> Создай agent team: security-ревьюер, architect, и один на дебаг
```

Каждый тиммейт появится в своём tmux-pane. Навигация: `Shift+Down` / `Shift+Up`.

Agent Teams — experimental, включается через:

```json
// ~/.claude.json
{
	"env": {
		"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
	}
}
```

### Микс моделей в Agent Teams

Можно назначать **разную модель каждому тиммейту**. Lead (оркестратор) требует Opus для координации, а тиммейты работают на более дешёвых моделях.

Указывается в промпте при создании команды:

```
Создай agent team:
- security-ревьюер на Sonnet
- architect на Sonnet
- документатор на Haiku
```

Или переключить модель конкретного тиммейта: `/model sonnet` в его pane.

### Стратегия выбора моделей

| Роль                        | Модель          | Почему                                                   |
| --------------------------- | --------------- | -------------------------------------------------------- |
| **Lead (оркестратор)**      | Opus            | Координация, декомпозиция, синтез — нужна сильная модель |
| **Ревьюер кода**            | Sonnet          | Хорошо справляется с pattern matching по правилам        |
| **Дебаггер**                | Opus или Sonnet | Opus для сложных багов, Sonnet для типовых               |
| **Документатор**            | Haiku           | Механическая работа, не требует глубокого рассуждения    |
| **Scaffolding / генерация** | Haiku           | Генерация типов, тестовых заготовок, boilerplate         |
| **Архитектурный анализ**    | Sonnet          | Достаточно для проверки FSD/import boundaries            |

### Стоимость по моделям (относительно)

```
Opus   ████████████████████  1x    (baseline)
Sonnet ██████                ~0.3x
Haiku  ██                    ~0.1x
```

Пример: команда из Lead (Opus) + 3 тиммейта (Sonnet) стоит ~1.9x одного Opus, а не 4x. Если заменить одного на Haiku — ~1.6x.

### Оптимальная раскладка для этого проекта

```
Lead (Opus) — декомпозиция, координация, финальный синтез
  ├─ ETL/Backend разработчик (Sonnet) — серверный код, SQL, API
  ├─ Ревьюер (Sonnet) — code review, архитектура
  ├─ Фронтенд (Sonnet) — Svelte компоненты, стили
  └─ Документатор (Haiku) — AGENTS.md, комментарии, changelog
```

## Как запускать

### Автоматически (по умолчанию)

Review Gate запускается **сам после каждой задачи**, которая изменила файлы. Ничего делать не нужно — просто работай как обычно:

```
Ты: Добавь фильтр по дате в product-analytics

Claude: [выполняет задачу]
        [автоматический Review Gate]

## Review Gate
- Security (Claude): OK
- Architecture: 1 warning
- Docs: 1 update needed
- Codex (second opinion): OK
- UI (Chrome): OK

[детали findings + предложения по исправлению]
```

### Ручной запуск — примеры промптов

**Полный Review Gate:**

```
Запусти Review Gate по текущим изменениям
```

**Отдельные ревьюеры:**

```
Проверь безопасность текущих изменений
Проверь архитектуру — я менял импорты
Запусти Codex для second opinion
```

**UI-ревью (требует dev server + Chrome):**

```
Проверь UI на /dashboard/wildberries/product-analytics
Глубокий UI-ревью новой страницы stock-alerts
Проверь UI на Opus — я переделал layout карточек
```

**Ревью конкретного коммита:**

```
Запусти Review Gate по последнему коммиту
Проверь безопасность коммита abc1234
```

### Управление

**Пропустить проверки:**

```
Без проверок
Пропусти Review Gate
```

**Только часть ревьюеров:**

```
Проверь только безопасность
Только docs review
```

**Выбор уровня UI:**

```
Проверь UI                     → ui-reviewer (Sonnet, smoke-test)
Глубокий UI-ревью              → ui-reviewer-deep (Opus, полный аудит)
Проверь UI на Opus              → ui-reviewer-deep
```

**Отключить Codex:**
Удали `codex-reviewer.md` или скажи _"без Codex"_

### Agent Teams в tmux (интерактивный режим)

Для сложных задач, где нужна команда агентов с прямым взаимодействием:

```bash
# Предусловие (один раз): включить в ~/.claude.json
# { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }

tmux
claude
```

**Примеры промптов для Agent Teams:**

```
Создай agent team для рефакторинга фильтров:
- backend на Sonnet — серверная часть filter planner
- frontend на Sonnet — UI компоненты
- ревьюер на Sonnet — проверяет архитектуру обоих

Создай team для дебага:
- один агент проверяет серверные логи
- другой проверяет клиентскую часть
- третий ищет в git history когда сломалось

Создай team для новой фичи stock-alerts:
- ETL-разработчик на Sonnet — SQL, серверный код
- UI-разработчик на Sonnet — Svelte компоненты
- документатор на Haiku — AGENTS.md, типы
```

## Файлы конфигурации

```
.claude/
├── agents/
│   ├── README.md                  ← этот файл
│   ├── security-reviewer.md       ← безопасность
│   ├── architecture-reviewer.md   ← архитектура
│   ├── docs-reviewer.md           ← документация
│   ├── codex-reviewer.md          ← второе мнение (Codex/GPT)
│   ├── ui-reviewer.md             ← UI smoke-test (Sonnet + Chrome)
│   └── ui-reviewer-deep.md       ← UI/UX эксперт (Opus + Chrome)
├── settings.local.json            ← hooks (auto-prettier, блок опасных команд)
└── worktrees/                     ← git worktrees для изоляции
```

## Chrome-расширение и UI-reviewer

UI-reviewer использует **Claude in Chrome** — расширение для браузерной автоматизации.

### Предусловия

1. Установлено расширение [Claude in Chrome](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) (v1.0.36+)
2. Chrome/Edge запущен
3. Dev server запущен (`pnpm dev`)
4. Chrome подключён к Claude Code (`/chrome` или `--chrome`)

### Какие tools использует ui-reviewer

| Tool               | Что делает                                      |
| ------------------ | ----------------------------------------------- |
| `navigate_page`    | Переход на URL (`localhost:5173/dashboard/...`) |
| `take_screenshot`  | Скриншот текущей страницы                       |
| `take_snapshot`    | DOM-снимок для анализа структуры                |
| `click`            | Клик по элементам (проверка интерактивности)    |
| `evaluate_script`  | Выполнение JS на странице                       |
| `get_console_logs` | Чтение console.log/error/warn                   |

### Когда запускается

- Только при изменениях `.svelte`, `.css`, файлов в `routes/`
- Только если dev server запущен (иначе: "Dev server not running" и стоп)
- Не запускается при backend-only изменениях

Протокол Review Gate описан в корневом `AGENTS.md`, секция 8.
