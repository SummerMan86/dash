import type { DashboardWidget, WidgetLayout } from './types';

export const GRID_COLUMNS = 4;
export const GRID_ROW_HEIGHT_PX = 240;
export const GRID_BUFFER_ROWS = 2;

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
	const occupied = new Set<number>();

	for (const w of widgets) {
		occupied.add(layoutToIndex(w.layout, safeColumns));
	}

	let idx = 0;
	while (occupied.has(idx)) idx++;

	const { x, y } = indexToLayout(idx, safeColumns);
	return [
		...widgets,
		{
			...newWidget,
			layout: {
				...normalizeLayout(newWidget.layout),
				x,
				y,
				w: 1,
				h: 1
			}
		}
	];
}
