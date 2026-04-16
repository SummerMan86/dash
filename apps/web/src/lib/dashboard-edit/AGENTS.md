# Dashboard Editor

`src/lib/dashboard-edit/` - зрелый app-local модуль для GridStack-based dashboard editing.

## Purpose

- add / move / resize / remove widgets
- hold editor state
- save and restore layout

## Structure

```text
dashboard-edit/
├── model/
│   ├── types.ts
│   ├── store.internal.ts
│   ├── layout.internal.ts
│   ├── save.internal.ts
│   ├── config.ts
│   ├── gridstack.types.ts
│   ├── gridstack-helpers.ts
│   └── index.ts
├── ui/
│   ├── WidgetCanvas.svelte
│   ├── WidgetCard.svelte
│   ├── WidgetEditorShell.svelte
│   ├── WidgetToolbox.svelte
│   ├── WidgetInspector.svelte
│   ├── DragOverlay.svelte
│   └── index.ts
└── composables/
    ├── useDashboardEditor.svelte.ts
    └── index.ts
```

## Adding a new widget type

1. Add type to `WidgetType` union in `model/types.ts`
2. Add default config in `model/config.ts`
3. Add rendering case in `ui/WidgetCanvas.svelte`
4. Add to palette in `ui/WidgetToolbox.svelte`

## State rules

- `.internal.ts` files считать private
- импортировать editor API через `model/index.ts`
- layout persistence сейчас MVP-level и идёт через `localStorage` в `save.internal.ts`

## Key composable

```ts
const editor = useDashboardEditor();
editor.addWidget(type);
editor.removeWidget(id);
editor.saveLayout();
editor.loadLayout();
```

## Package verdict (ST-8)

`bi-dashboards` package was evaluated and intentionally deferred:

- No second consumer exists (only `apps/web` routes use this)
- Uses `$app/environment` (SvelteKit-specific)
- Creating a package for a single consumer is speculative
- Self-contained design means future extraction is trivial if needed

Canonical home: `apps/web/src/lib/dashboard-edit/` (first-level app-local module).

## When to read this folder

- если нужен drag-and-drop layout editor
- если меняется widget canvas, toolbox или inspector
- если ищешь orchestration между UI и editor state
