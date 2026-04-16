# UI Reviewer Instructions

Smoke-test: страница загружается, рендерится, нет ошибок в консоли.

## Scope

- Изменённые `.svelte`, `.css`, `.ts` файлы в routes/
- Только затронутые routes

## Route map

- `apps/web/src/routes/dashboard/+page.svelte` → `http://localhost:5173/dashboard`
- `apps/web/src/routes/dashboard/wildberries/*` → `http://localhost:5173/dashboard/wildberries/...`
- `apps/web/src/routes/emis/*` → `http://localhost:5173/emis`
- `apps/web/src/lib/shared/ui/*` → любая страница, использующая компонент
- `apps/web/src/lib/widgets/*` → страница, где хостится виджет

## Checks

1. **Страница загружается** без ошибок
2. **Нет blank screens** — контент отображается
3. **Console errors** — нет новых ошибок или unhandled exceptions
4. **Интерактивные элементы** — клик по основным кнопкам/ссылкам не бросает ошибки
5. **Layout** — нет очевидных визуальных сломов

## Execution

```
1. navigate_page → target route
2. Дождаться загрузки
3. take_screenshot → visual check
4. get_console_logs → проверить ошибки
5. Если интерактивное изменение: click affected elements
6. Report
```

## Output

Canonical format (единый для всех ревьюеров):

```
# Review: ui-reviewer

Verdict: OK | request changes

Findings:
- [CRITICAL|WARNING|INFO] [route] — описание
  Console: <error message if any>
  Screenshot: <что визуально не так>
- или "No issues found."

Required follow-ups:
- <что нужно исправить> или "none"
```

## Deep Mode

Expert-level UX audit for new pages, redesigned components, or complex interactions. Same scope as smoke-test but with extended checks.

Design system context: three-layer typography (`type-*` classes), CSS tokens in `apps/web/src/lib/shared/styles/tokens/tokens.css`, shared UI in `apps/web/src/lib/shared/ui/`.

### Additional deep checks

1. **Layout & Visual Quality** — alignment, spacing (against design tokens), typography hierarchy, color usage (semantic tokens, not hardcoded), visual balance
2. **Interaction Flows** — main user journey, loading states (skeleton→content), empty states, hover/focus/transitions
3. **Accessibility** — alt text, accessible names, form labels, color contrast, keyboard navigation (Tab order), semantic HTML
4. **Responsive Behavior** — no overflow/collapse on narrow viewports, tables/charts handle narrow viewports
5. **Design System Compliance** — tokens from `tokens.css` (not hardcoded), shared UI components (not one-off), no inline styles for token-based values

### Deep mode output

```
# Review: ui-reviewer (deep)

Verdict: OK | request changes | needs design decision

Findings:
- [CRITICAL|WARNING|INFO] [route] — description
  Area: Visual Quality | Interaction Flows | Accessibility | Design System
  Expected: <what should be>
  Actual: <what is observed>
  Fix: <recommendation>
- or "No issues found."

Required follow-ups:
- <what to fix> or "none"
```

## Rules

- Do not check routes outside diff
- Read component source and tokens BEFORE assessing visual output
- If dev server not running — `[WARNING]` in standard format, stop
- Do not edit files
