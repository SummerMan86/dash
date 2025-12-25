<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';

	import { cn } from '$shared/styles/utils';

	import { GRID_COLUMNS, GRID_ROW_HEIGHT_PX } from '../model/layout';
	import type { DashboardWidget } from '../model/types';

	import WidgetCard from './WidgetCard.svelte';

	/**
	 * This component is a “thin integration” between Svelte and GridStack:
	 *
	 * - Svelte owns rendering and state (`widgets` array).
	 * - GridStack owns drag/resize behavior and writes new x/y/w/h during interactions.
	 * - We bridge the two using:
	 *   - a Svelte action (`use:widgetNode`) per widget DOM element
	 *   - GridStack events (`change`, `dragstop`, `resizestop`)
	 *
	 * The core rule: **avoid feedback loops**.
	 * When GridStack changes layout → we update the store.
	 * When the store changes layout → we update GridStack.
	 */

	interface Props {
		widgets?: DashboardWidget[];
		editable?: boolean;
		columns?: number;
		rowHeightPx?: number;
		selectedId?: string | null;
		class?: string;
		onWidgetsChange?: (widgets: DashboardWidget[]) => void;
		onFinalize?: (widgets: DashboardWidget[]) => void;
		onSelect?: (id: string) => void;
	}

	let {
		widgets = [],
		editable = true,
		columns = GRID_COLUMNS,
		rowHeightPx = GRID_ROW_HEIGHT_PX,
		selectedId = null,
		class: className,
		onWidgetsChange,
		onFinalize,
		onSelect
	}: Props = $props();

	let lastWidgets = widgets;
	$effect(() => {
		lastWidgets = widgets;
	});

	let gridEl: HTMLDivElement | null = $state(null);

	/** Minimal shape of a GridStack node, used to avoid importing GridStack types in SSR. */
	type GridStackNodeLike = {
		id?: string | number;
		x?: number;
		y?: number;
		w?: number;
		h?: number;
		el?: HTMLElement | null;
	};

	/** Minimal GridStack API surface we use in this file. */
	type GridStackLike = {
		on: (name: string, cb: (e: unknown, items: GridStackNodeLike[] | undefined) => void) => void;
		update: (el: HTMLElement, opts: Record<string, unknown>) => void;
		makeWidget: (el: HTMLElement) => void;
		removeWidget: (el: HTMLElement, removeDOM?: boolean) => void;
		destroy: (removeDOM?: boolean) => void;
		column: (n: number) => void;
		cellHeight: (h: number) => void;
		enableMove: (enabled: boolean) => void;
		enableResize: (enabled: boolean) => void;
	};

	let grid: GridStackLike | null = null;

	// Prevent feedback loops:
	// - applyingFromGrid: we are currently writing layouts into `widgets` due to grid events.
	// - applyingFromStore: we are currently calling grid.update() due to external/store changes.
	let applyingFromGrid = false;
	let applyingFromStore = false;

	// Widgets may be rendered before GridStack is initialized (because Svelte renders first).
	// We remember those DOM elements and "adopt" them into GridStack after init.
	const pendingWidgetEls = new Set<HTMLElement>();

	type WidgetActionParams = {
		id: string;
		layout: DashboardWidget['layout'];
		editable: boolean;
	};

	function withApplyingFromStore<T>(fn: () => T): T {
		applyingFromStore = true;
		try {
			return fn();
		} finally {
			applyingFromStore = false;
		}
	}

	function getNodeId(it: GridStackNodeLike): string | null {
		// GridStack sometimes provides `id`, but we also keep `data-gs-id` on the element.
		// This makes the mapping resilient even if GridStack version / config changes.
		const id =
			(typeof it.id === 'string' && it.id) ||
			(typeof it.id === 'number' ? String(it.id) : '') ||
			it.el?.getAttribute('data-gs-id') ||
			it.el?.getAttribute('gs-id') ||
			'';

		return id ? id : null;
	}

	function applyLayoutToWidget(widget: DashboardWidget, node: GridStackNodeLike): DashboardWidget {
		// GridStack nodes may omit values, so we fall back to the existing layout.
		const x = node.x ?? widget.layout.x;
		const y = node.y ?? widget.layout.y;
		const w = node.w ?? widget.layout.w;
		const h = node.h ?? widget.layout.h;

		if (x === widget.layout.x && y === widget.layout.y && w === widget.layout.w && h === widget.layout.h) return widget;
		return { ...widget, layout: { ...widget.layout, x, y, w, h } };
	}

	function syncNodeFromStore(nodeEl: HTMLElement, p: WidgetActionParams) {
		const g = grid;
		if (!g) return;
		// This writes store state into GridStack. Guard against re-entering via `change` events.
		withApplyingFromStore(() => {
			// update() is safe even if GridStack already manages the node.
			g.update(nodeEl, {
				id: p.id,
				x: p.layout.x,
				y: p.layout.y,
				w: p.layout.w,
				h: p.layout.h,
				noMove: !p.editable,
				noResize: !p.editable
			});
		});
	}

	function widgetNode(node: HTMLElement, params: WidgetActionParams) {
		pendingWidgetEls.add(node);

		if (grid) {
			// When widgets mount after GridStack init, we must explicitly "adopt" them.
			grid.makeWidget(node);
			syncNodeFromStore(node, params);
		}

		return {
			update(next: WidgetActionParams) {
				syncNodeFromStore(node, next);
			},
			destroy() {
				pendingWidgetEls.delete(node);
				// Keep DOM (Svelte owns it), but remove the widget from GridStack's internal state.
				if (grid) grid.removeWidget(node, false);
			}
		};
	}

	function handleGridChange(items: GridStackNodeLike[] | undefined) {
		if (!items || applyingFromStore) return;

		const byId = new Map<string, GridStackNodeLike>();
		for (const it of items) {
			const id = getNodeId(it);
			if (id) byId.set(id, it);
		}

		// Only update widgets that actually changed.
		let changed = false;
		const next = widgets.map((w) => {
			const it = byId.get(w.id);
			if (!it) return w;
			const patched = applyLayoutToWidget(w, it);
			if (patched !== w) changed = true;
			return patched;
		});

		if (!changed) return;

		applyingFromGrid = true;
		lastWidgets = next;
		onWidgetsChange?.(next);
		applyingFromGrid = false;
	}

	async function initGridStack(el: HTMLDivElement) {
		// IMPORTANT: GridStack's ESM build currently breaks when evaluated in SSR under Node ESM
		// (extension-less internal imports). We therefore load it client-only (inside onMount).
		const mod = await import('gridstack');
		const GridStack = mod.GridStack as any;

		const g = GridStack.init(
			{
				column: Math.max(1, Math.floor(columns)),
				cellHeight: Math.max(8, Math.floor(rowHeightPx)),
				margin: 8,
				float: true,
				// Best UX pattern: drag only from a dedicated handle, so content clicks don’t start dragging.
				draggable: {
					handle: '.widget-drag-handle'
				},
				disableDrag: !editable,
				disableResize: !editable
			},
			el
		);

		return (g as GridStackLike) ?? null;
	}

	function attachGridEvents(g: GridStackLike) {
		// Live updates: write x/y/w/h back into Svelte state while dragging/resizing.
		g.on('change', (_e: unknown, items: GridStackNodeLike[] | undefined) => handleGridChange(items));

		// Finalize updates: persist once the interaction stops.
		// We wait a tick to ensure Svelte/store updates from the last `change` have been applied.
		g.on('dragstop', async () => {
			await tick();
			onFinalize?.(lastWidgets);
		});
		g.on('resizestop', async () => {
			await tick();
			onFinalize?.(lastWidgets);
		});
	}

	onMount(async () => {
		if (!gridEl) return;

		const g = await initGridStack(gridEl);
		if (!g) return;
		grid = g;
		attachGridEvents(g);

		// Adopt any widgets rendered before init.
		for (const el of pendingWidgetEls) {
			g.makeWidget(el);
		}
	});

	onDestroy(() => {
		if (grid) grid.destroy(false);
		grid = null;
	});

	// Reflect external changes (columns/rowHeight/editable) into GridStack without re-writing layouts.
	$effect(() => {
		if (!grid) return;
		grid.column(Math.max(1, Math.floor(columns)));
	});

	$effect(() => {
		if (!grid) return;
		grid.cellHeight(Math.max(8, Math.floor(rowHeightPx)));
	});

	$effect(() => {
		if (!grid) return;
		grid.enableMove(!!editable);
		grid.enableResize(!!editable);
	});
</script>

<div
	bind:this={gridEl}
	class={cn('grid-stack', className)}
>
	{#each widgets as item (item.id)}
		<div
			class="grid-stack-item"
			data-gs-id={item.id}
			data-gs-x={item.layout.x}
			data-gs-y={item.layout.y}
			data-gs-w={item.layout.w}
			data-gs-h={item.layout.h}
			use:widgetNode={{ id: item.id, layout: item.layout, editable }}
		>
			<div class="grid-stack-item-content h-full">
				<div
					class={cn(
						'group h-full min-h-0 rounded-lg',
						selectedId === item.id ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
					)}
					role="button"
					tabindex={0}
					onclick={() => onSelect?.(item.id)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') onSelect?.(item.id);
					}}
				>
					<WidgetCard widget={item} {editable} />
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	/*
		GridStack places resize handles in the item corner, but the icon is centered inside a 20x20 handle box.
		That can look like it's "floating" away from the visible corner. We keep GridStack geometry intact
		and only move the icon within the handle to sit in the corner.
	*/
	:global(.grid-stack .grid-stack-item > .ui-resizable-se) {
		/* GridStack rotates this handle; anchor rotation to the corner to avoid the icon “floating”. */
		transform-origin: 100% 100%;
		background-position: right bottom;
	}
</style>
