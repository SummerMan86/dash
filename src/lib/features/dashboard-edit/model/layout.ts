import type { DashboardWidget, WidgetLayout } from './types';

export const GRID_COLUMNS = 4;
export const GRID_ROW_HEIGHT_PX = 240;

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
