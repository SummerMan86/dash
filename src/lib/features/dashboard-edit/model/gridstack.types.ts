/**
 * GridStack type definitions for internal use.
 *
 * These types wrap the minimal GridStack API surface we use,
 * avoiding direct dependency on gridstack's types which may break under SSR.
 */

/** GridStack node - represents a single widget in the grid */
export type GridStackNode = {
	id?: string | number;
	x?: number;
	y?: number;
	w?: number;
	h?: number;
	el?: HTMLElement | null;
	noMove?: boolean;
	noResize?: boolean;
};

/** GridStack API - minimal surface used by our integration */
export type GridStackApi = {
	on(event: string, callback: (e: unknown, items?: GridStackNode[]) => void): void;
	update(el: HTMLElement, opts: Partial<GridStackNode>): void;
	makeWidget(el: HTMLElement): void;
	removeWidget(el: HTMLElement, removeDOM?: boolean): void;
	destroy(removeDOM?: boolean): void;
	column(n: number): void;
	cellHeight(h: number): void;
	enableMove(enabled: boolean): void;
	enableResize(enabled: boolean): void;
};

/** GridStack init options */
export type GridStackInitOptions = {
	column?: number;
	cellHeight?: number;
	margin?: number;
	float?: boolean;
	draggable?: { handle?: string };
	disableDrag?: boolean;
	disableResize?: boolean;
};
