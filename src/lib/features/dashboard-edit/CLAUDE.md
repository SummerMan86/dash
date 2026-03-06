# features/dashboard-edit — Dashboard editor

## Purpose
GridStack-based drag-and-drop dashboard editor: add/move/resize/remove widgets, save layout.

## Structure
```
dashboard-edit/
├── model/
│   ├── types.ts              # WidgetType, WidgetConfig, DashboardLayout
│   ├── store.internal.ts     # Editor state (Svelte store)
│   ├── layout.internal.ts    # GridStack layout helpers
│   ├── save.internal.ts      # Persistence (localStorage for MVP)
│   ├── config.ts             # Default configs per WidgetType
│   ├── gridstack.types.ts    # GridStack type wrappers
│   ├── gridstack-helpers.ts  # GridStack init/update helpers
│   └── index.ts              # Public model API
├── ui/
│   ├── WidgetCanvas.svelte   # GridStack integration, renders widget grid
│   ├── WidgetCard.svelte     # Individual widget wrapper
│   ├── WidgetEditorShell.svelte  # Full editor (canvas + toolbox + inspector)
│   ├── WidgetToolbox.svelte  # Drag-source widget palette
│   ├── WidgetInspector.svelte  # Config panel for selected widget
│   ├── DragOverlay.svelte    # Drop zone visual
│   └── index.ts
└── composables/
    ├── useDashboardEditor.svelte.ts  # Main editor composable
    └── index.ts
```

## Adding a new widget type
1. Add type to `WidgetType` union in `model/types.ts`
2. Add default config in `model/config.ts`
3. Add rendering case in `WidgetCanvas.svelte`
4. Add to palette in `WidgetToolbox.svelte`

## State
- `.internal.ts` files are private — import only via `model/index.ts`
- Layout persisted to `localStorage` (MVP) via `save.internal.ts`

## Key composable
```ts
const editor = useDashboardEditor();
editor.addWidget(type)
editor.removeWidget(id)
editor.saveLayout()
editor.loadLayout()
```
