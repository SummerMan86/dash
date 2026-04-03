export type WidgetLayout = {
	/** Column index (0-based) */
	x: number;
	/** Row index (0-based) */
	y: number;
	/** Width in columns */
	w: number;
	/** Height in rows */
	h: number;
};

export type DashboardWidget = {
	id: string;
	type: WidgetType;
	title: string;
	layout: WidgetLayout;
	// Extra payload that should survive DnD
	config?: WidgetConfig;
	query?: Record<string, unknown>;
};

export type WidgetType = 'kpi' | 'line' | 'bar' | 'pie' | 'table' | 'stat';

export type WidgetConfig = {
	/** MVP placeholders */
	measure?: string;
	dimension?: string;
};

export type DashboardConfig = {
	id: string;
	title: string;
	widgets: DashboardWidget[];
};
