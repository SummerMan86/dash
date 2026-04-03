import { DEFAULT_GRID_CONFIG } from './config';
import type { DashboardWidget, WidgetLayout } from './types';

/**
 * @deprecated Use DEFAULT_GRID_CONFIG.columns instead
 */
export const GRID_COLUMNS = DEFAULT_GRID_CONFIG.columns;

/**
 * @deprecated Use DEFAULT_GRID_CONFIG.rowHeightPx instead
 */
export const GRID_ROW_HEIGHT_PX = DEFAULT_GRID_CONFIG.rowHeightPx;

const GRID_BUFFER_ROWS = DEFAULT_GRID_CONFIG.bufferRows;

function normalizeLayout(layout: Partial<WidgetLayout> | undefined): WidgetLayout {
	return {
		x: layout?.x ?? 0,
		y: layout?.y ?? 0,
		w: Math.max(1, layout?.w ?? 1),
		h: Math.max(1, layout?.h ?? 1)
	};
}

/**
 * MVP layout: place widgets into a grid purely by their list order.
 * This guarantees no overlaps and is predictable for demo.
 */
export function applyGridByIndex(
	widgets: DashboardWidget[],
	columns: number = GRID_COLUMNS
): DashboardWidget[] {
	const safeColumns = Math.max(1, Math.floor(columns));

	return widgets.map((w, index) => {
		const col = index % safeColumns;
		const row = Math.floor(index / safeColumns);
		const prev = normalizeLayout(w.layout);

		return {
			...w,
			layout: {
				...prev,
				x: col,
				y: row
			}
		};
	});
}

export function layoutToIndex(layout: Pick<WidgetLayout, 'x' | 'y'>, columns: number): number {
	const safeColumns = Math.max(1, Math.floor(columns));
	return Math.max(0, layout.y) * safeColumns + Math.max(0, layout.x);
}

export function indexToLayout(index: number, columns: number): Pick<WidgetLayout, 'x' | 'y'> {
	const safeColumns = Math.max(1, Math.floor(columns));
	const i = Math.max(0, Math.floor(index));
	return { x: i % safeColumns, y: Math.floor(i / safeColumns) };
}

/**
 * Place a new 1x1 widget into the first free cell (gap-aware).
 * (Safe MVP for fine grid: avoids packing/collisions.)
 */
export function placeWidgetInFirstFreeSlot(
	widgets: DashboardWidget[],
	newWidget: DashboardWidget,
	columns: number
): DashboardWidget[] {
	const safeColumns = Math.max(1, Math.floor(columns));
	const occupied = new Set<string>();

	let maxBottom = 0;
	for (const w of widgets) {
		const l = normalizeLayout(w.layout);
		maxBottom = Math.max(maxBottom, Math.max(0, l.y) + l.h);

		for (let yy = Math.max(0, l.y); yy < Math.max(0, l.y) + l.h; yy++) {
			for (let xx = Math.max(0, l.x); xx < Math.max(0, l.x) + l.w; xx++) {
				occupied.add(`${xx},${yy}`);
			}
		}
	}

	const nextLayout = normalizeLayout(newWidget.layout);
	const w = Math.min(nextLayout.w, safeColumns);
	const h = nextLayout.h;

	let found: { x: number; y: number } | null = null;

	const maxScanRows = Math.max(maxBottom + GRID_BUFFER_ROWS, 64);
	for (let y = 0; y <= maxScanRows && !found; y++) {
		for (let x = 0; x <= safeColumns - w && !found; x++) {
			let free = true;
			for (let dy = 0; dy < h && free; dy++) {
				for (let dx = 0; dx < w; dx++) {
					if (occupied.has(`${x + dx},${y + dy}`)) {
						free = false;
						break;
					}
				}
			}
			if (free) found = { x, y };
		}
	}

	const x = found?.x ?? 0;
	const y = found?.y ?? maxBottom;
	return [
		...widgets,
		{
			...newWidget,
			layout: {
				...nextLayout,
				x,
				y,
				w,
				h
			}
		}
	];
}
