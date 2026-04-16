# Субагенты проекта

Этот каталог содержит только reviewer-subagents.
Canonical docs:

- [workflow.md](../../docs/agents/workflow.md) — процесс, роли, review model, governance, DoD, memory
- [templates.md](../../docs/agents/templates.md) — шаблоны коммуникации

## Субагенты-ревьюеры (`.claude/agents/`)

| Файл                       | Модель          | Проверяет                                             |
| -------------------------- | --------------- | ----------------------------------------------------- |
| `security-reviewer.md`     | Sonnet          | SQL injection, XSS, secrets, SSRF                     |
| `architecture-reviewer.md` | Sonnet          | layer/import boundaries, server isolation, complexity |
| `docs-reviewer.md`         | Sonnet          | Docs, DB truth, runtime contracts sync                |
| `code-reviewer.md`         | Sonnet          | Naming, conventions, maintainability                  |
| `ui-reviewer.md`           | Sonnet + Chrome | UI smoke-test (при frontend changes)                  |
| `ui-reviewer-deep.md`      | Opus + Chrome   | Deep UX/a11y audit; reuses `ui-reviewer` instructions |

Детальные instructions обычно живут в `docs/agents/{name}/instructions.md`.
`ui-reviewer-deep.md` использует canonical deep-mode секцию в `docs/agents/ui-reviewer/instructions.md`.

## Жизненный цикл

```
Каждый review pass:      Agent spawn (только diff + файлы)
Следующий review:        новый spawn, снова с чистого листа
Новая сессия:            то же правило
```

Ревьюеры **read-only** — не редактируют файлы.

## Как создать нового субагента

### 1. Создай `.claude/agents/{name}.md`

```markdown
---
name: имя-агента
description: Когда запускать этого агента.
tools: Read, Grep, Glob
model: sonnet
---

Ты — [роль] для проекта на SvelteKit + TypeScript.

Role instructions and escalation rules: `<canonical reviewer instructions path>`.
```

### 2. Добавь instructions в `docs/agents/`

Создай:

- `docs/agents/{name}/instructions.md` или используй уже существующий canonical reviewer doc
- `docs/agents/{name}/memory.md` только если у роли действительно есть durable memory

В `instructions.md` используй canonical review contract из `docs/agents/templates.md`, секция 6 `Review Result`.

### Frontmatter

| Поле          | Значение                    | Описание                          |
| ------------- | --------------------------- | --------------------------------- |
| `name`        | уникальное имя              | латиница, дефисы                  |
| `description` | когда использовать          | для dispatch                      |
| `tools`       | `Read, Grep, Glob`          | для ревьюеров — read-only         |
| `model`       | `sonnet` / `opus` / `haiku` | стоимость vs качество             |
| `memory`      | omitted by default          | для reviewer-pass не использовать persistent memory |

## Chrome и UI-reviewer

Предусловия: Chrome extension (v1.0.36+), Chrome запущен, dev server (`pnpm dev`).

UI-reviewer запускается только при `.svelte`/`.css`/routes changes.
