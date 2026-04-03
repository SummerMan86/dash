// === Public Types ===
export type {
	WidgetLayout,
	DashboardWidget,
	DashboardConfig,
	WidgetType,
	WidgetConfig
} from './types';

export type { SaveState } from './save.internal';

export type { GridConfig } from './config';
export { DEFAULT_GRID_CONFIG, createGridConfig } from './config';

export type { GridStackNode, GridStackApi, GridStackInitOptions } from './gridstack.types';

// === Internal exports (for use within the feature only) ===
// These are not re-exported from the main index.ts

// Deprecated: use useDashboardEditor instead
export { GRID_COLUMNS, GRID_ROW_HEIGHT_PX, placeWidgetInFirstFreeSlot } from './layout.internal';

// Deprecated: use useDashboardEditor instead
export {
	createDebouncedDashboardSaver,
	loadDashboardFromStorage,
	clearDashboardStorage
} from './save.internal';

// Deprecated: use useDashboardEditor instead
export { createDashboardEditorStore, type DashboardEditorStore } from './store.internal';
