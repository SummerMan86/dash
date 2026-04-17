# Субагенты проекта

Этот каталог содержит только reviewer-subagents для Claude Code runtime.
Canonical docs:

- [workflow.md](../../docs/agents/workflow.md) — процесс, роли, review model, governance, DoD, memory
- [templates.md](../../docs/agents/templates.md) — шаблоны коммуникации и canonical Review Result contract (§6)

## Single source of truth

Полные инструкции для каждого ревьюера (scope, checks, output format, severity, rules, escalation) живут в `docs/agents/<name>/instructions.md`.

Файлы в `.claude/agents/<name>.md` — **тонкие адаптеры** для Claude Code subagent runtime: frontmatter + короткий pointer на canonical instructions. Тело не дублирует содержимое canonical doc и не несёт самостоятельной правды.

То же canonical instruction читают Codex-ревьюеры (`./scripts/codex-companion.sh review`, `adversarial-review`) — контекст у Claude и Codex сабагентов одинаковый, минимальный и достаточный.

## Субагенты-ревьюеры (`.claude/agents/`)

| Файл                       | Модель          | Canonical instructions                                      |
| -------------------------- | --------------- | ----------------------------------------------------------- |
| `security-reviewer.md`     | Sonnet          | `docs/agents/security-reviewer/instructions.md`             |
| `architecture-reviewer.md` | Sonnet          | `docs/agents/architecture-reviewer/instructions.md`         |
| `docs-reviewer.md`         | Sonnet          | `docs/agents/docs-reviewer/instructions.md`                 |
| `code-reviewer.md`         | Sonnet          | `docs/agents/code-reviewer/instructions.md`                 |
| `ui-reviewer.md`           | Sonnet + Chrome | `docs/agents/ui-reviewer/instructions.md`                   |
| `ui-reviewer-deep.md`      | Opus + Chrome   | `docs/agents/ui-reviewer/instructions.md` — секция Deep Mode |

## Жизненный цикл

```
Каждый review pass:      Agent spawn (только diff + файлы)
Следующий review:        новый spawn, снова с чистого листа
Новая сессия:            то же правило
```

Ревьюеры **read-only** — не редактируют файлы.

## Как создать нового субагента

### 1. Напиши canonical instructions в `docs/agents/<name>/instructions.md`

Это единственный источник правды. Используй canonical Review Result contract из `docs/agents/templates.md` §6. Держи файл ≤200 строк.

Опционально: `docs/agents/<name>/memory.md` — только если у роли действительно есть durable memory (reviewer passes — обычно без).

### 2. Создай тонкую обёртку `.claude/agents/<name>.md`

```markdown
---
name: имя-агента
description: Когда запускать этого агента.
tools: Read, Grep, Glob
model: sonnet
---

Read `docs/agents/<name>/instructions.md` and follow it.
```

Тело — чистый redirect, без inline checks / output templates / architecture rules / «do not modify files» и прочего: всё это живёт в canonical instructions.

### Frontmatter

| Поле          | Значение                    | Описание                                            |
| ------------- | --------------------------- | --------------------------------------------------- |
| `name`        | уникальное имя              | латиница, дефисы                                    |
| `description` | когда использовать          | для dispatch                                        |
| `tools`       | `Read, Grep, Glob`          | для ревьюеров — read-only                           |
| `model`       | `sonnet` / `opus` / `haiku` | стоимость vs качество                               |
| `memory`      | omitted by default          | для reviewer-pass не использовать persistent memory |

## Chrome и UI-reviewer

Предусловия: Chrome extension (v1.0.36+), Chrome запущен, dev server (`pnpm dev`).

UI-reviewer запускается только при `.svelte`/`.css`/routes changes. Frontmatter таких ревьюеров включает browser-automation tools (`navigate_page`, `take_screenshot`, ...).
