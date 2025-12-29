/**
 * Grid configuration for the dashboard editor.
 *
 * Centralizes all grid-related constants to avoid scattered magic numbers.
 */

export type GridConfig = {
	/** Number of columns in the grid */
	columns: number;
	/** Height of each row in pixels */
	rowHeightPx: number;
	/** Margin between widgets in pixels */
	margin: number;
	/** Buffer rows for widget placement algorithm */
	bufferRows: number;
	/** CSS selector for drag handle */
	dragHandle: string;
};

export const DEFAULT_GRID_CONFIG: GridConfig = {
	columns: 12,
	rowHeightPx: 24,
	margin: 8,
	bufferRows: 2,
	dragHandle: '.widget-drag-handle'
};

/**
 * Create a grid config with optional overrides.
 */
export function createGridConfig(overrides?: Partial<GridConfig>): GridConfig {
	return { ...DEFAULT_GRID_CONFIG, ...overrides };
}
