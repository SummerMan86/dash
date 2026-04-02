# Субагенты проекта

Этот каталог содержит только reviewer-subagents.
Canonical docs:

- [workflow.md](../../docs/agents/workflow.md) — процесс, инварианты, git-правила
- [roles.md](../../docs/agents/roles.md) — таблица ролей, кто что делает
- [templates.md](../../docs/agents/templates.md) — шаблоны коммуникации

## Субагенты-ревьюеры (`.claude/agents/`)

| Файл | Модель | Проверяет |
|---|---|---|
| `security-reviewer.md` | Sonnet | SQL injection, XSS, secrets, SSRF |
| `architecture-reviewer.md` | Sonnet | FSD boundaries, server isolation, complexity |
| `docs-reviewer.md` | Sonnet | Docs, DB truth, runtime contracts sync |
| `code-reviewer.md` | Sonnet | Naming, conventions, maintainability |
| `ui-reviewer.md` | Sonnet + Chrome | UI smoke-test (при frontend changes) |
| `ui-reviewer-deep.md` | Opus + Chrome | Deep UX/a11y audit (по запросу) |

Детальные instructions для каждого ревьюера: `docs/agents/{name}/instructions.md`

## Жизненный цикл

```
Первый review в сессии:  Agent spawn (загружают контекст)   ~30 сек
Следующие review:        SendMessage (только diff)          ~5 сек
Новая сессия:            spawn заново
```

Ревьюеры **read-only** — не редактируют файлы.

## Как создать нового субагента

### 1. Создай `.claude/agents/{name}.md`

````markdown
---
name: имя-агента
description: Когда запускать этого агента.
tools: Read, Grep, Glob
model: sonnet
memory: project
---

Ты — [роль] для проекта на SvelteKit + TypeScript.

Role instructions and escalation rules: `docs/agents/{name}/instructions.md`.
````

### 2. Добавь instructions в `docs/agents/`

Создай:

- `docs/agents/{name}/instructions.md`
- `docs/agents/{name}/memory.md`

В `instructions.md` используй canonical review contract из `docs/agents/templates.md`, секция 6 `Review Result`.

### Frontmatter

| Поле | Значение | Описание |
|---|---|---|
| `name` | уникальное имя | латиница, дефисы |
| `description` | когда использовать | для dispatch |
| `tools` | `Read, Grep, Glob` | для ревьюеров — read-only |
| `model` | `sonnet` / `opus` / `haiku` | стоимость vs качество |
| `memory` | `project` | накапливает знания между сессиями |

## Chrome и UI-reviewer

Предусловия: Chrome extension (v1.0.36+), Chrome запущен, dev server (`pnpm dev`).

UI-reviewer запускается только при `.svelte`/`.css`/routes changes.
