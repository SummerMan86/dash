# Features Navigation

`src/lib/features/` - transitional app-local bucket for remaining user workflows/editors.
It is not a canonical repo-wide architecture layer.

## Что реально используется

### `dashboard-edit/`

Это зрелый feature-модуль для редактирования дашбордов на GridStack:

- state/composables
- model helpers
- UI shell
- toolbox
- inspector
- canvas

Есть локальный документ:

- `dashboard-edit/AGENTS.md`

Если нужно понять drag-and-drop и layout editing, читать надо именно его.

## Что здесь пока неактивно

- `dashboard-builder/` сейчас пустой migration residue

Не стоит ориентироваться на него как на реальный модуль.

## Когда идти в `features/`

- если нужен именно пользовательский сценарий, а не shared primitive;
- если работаешь с layout editor;
- если ищешь orchestration между UI и state в рамках одной функции.

Если появится новый reusable app-only flow, семантически точнее считать целевым именем `workflows/`, а не расширять vocabulary `features/` без необходимости.
