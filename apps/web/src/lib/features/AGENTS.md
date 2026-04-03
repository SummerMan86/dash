# Features Navigation

`src/lib/features/` сейчас почти полностью определяется модулем `dashboard-edit/`.

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

- `dashboard-builder/` сейчас пустой

Не стоит ориентироваться на него как на реальный модуль.

## Когда идти в `features/`

- если нужен именно пользовательский сценарий, а не shared primitive;
- если работаешь с layout editor;
- если ищешь orchestration между UI и state в рамках одной функции.
