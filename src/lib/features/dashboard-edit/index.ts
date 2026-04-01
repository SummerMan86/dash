// === Public Types ===
export type {
	WidgetLayout,
	DashboardWidget,
	DashboardConfig,
	WidgetType,
	WidgetConfig,
	SaveState,
	GridConfig
} from './model';

export { DEFAULT_GRID_CONFIG, createGridConfig } from './model';

// === Composable ===
export {
	useDashboardEditor,
	type DashboardEditorApi,
	type DashboardEditorOptions,
	type WidgetDraft
} from './composables';

// === Components ===
export { default as WidgetCanvas, type WidgetSnippetProps } from './ui/WidgetCanvas.svelte';
export { default as WidgetCard } from './ui/WidgetCard.svelte';
export { default as DragOverlay } from './ui/DragOverlay.svelte';
export { default as WidgetToolbox } from './ui/WidgetToolbox.svelte';
export { default as WidgetInspector } from './ui/WidgetInspector.svelte';
export { default as WidgetEditorShell } from './ui/WidgetEditorShell.svelte';

// === Deprecated (for backward compatibility) ===
// Use useDashboardEditor instead of these individual exports
export {
	createDashboardEditorStore,
	type DashboardEditorStore,
	createDebouncedDashboardSaver,
	loadDashboardFromStorage,
	clearDashboardStorage,
	GRID_COLUMNS,
	GRID_ROW_HEIGHT_PX
} from './model';
