<script lang="ts">
	import { onDestroy, onMount, tick, type Snippet } from 'svelte';

	import { cn } from '$shared/styles/utils';

	import { DEFAULT_GRID_CONFIG } from '../model/config';
	import type { GridStackApi, GridStackNode } from '../model/gridstack.types';
	import type { DashboardWidget } from '../model/types';

	import WidgetCard from './WidgetCard.svelte';

	/** Props for the custom widget snippet */
	export type WidgetSnippetProps = {
		widget: DashboardWidget;
		editable: boolean;
		selected: boolean;
	};

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
		/** Margin between widgets in pixels */
		margin?: number;
		selectedId?: string | null;
		class?: string;
		/** Custom widget renderer. If not provided, uses default WidgetCard. */
		widgetSnippet?: Snippet<[WidgetSnippetProps]>;
		onWidgetsChange?: (widgets: DashboardWidget[]) => void;
		onFinalize?: (widgets: DashboardWidget[]) => void;
		onSelect?: (id: string) => void;
	}

	let {
		widgets = [],
		editable = true,
		columns = DEFAULT_GRID_CONFIG.columns,
		rowHeightPx = DEFAULT_GRID_CONFIG.rowHeightPx,
		margin = DEFAULT_GRID_CONFIG.margin,
		selectedId = null,
		class: className,
		widgetSnippet,
		onWidgetsChange,
		onFinalize,
		onSelect
	}: Props = $props();

	let lastWidgets = widgets;
	$effect(() => {
		lastWidgets = widgets;
	});

	let gridEl: HTMLDivElement | null = $state(null);

	let grid: GridStackApi | null = null;

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

	function getNodeId(it: GridStackNode): string | null {
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

	function applyLayoutToWidget(widget: DashboardWidget, node: GridStackNode): DashboardWidget {
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

	function handleGridChange(items: GridStackNode[] | undefined) {
		if (!items || applyingFromStore) return;

		const byId = new Map<string, GridStackNode>();
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
				margin: margin,
				// float: false makes widgets push each other when dragged
				float: false,
				// Animate widget movements for smooth UX
				animate: true,
				// Best UX pattern: drag only from a dedicated handle, so content clicks don't start dragging.
				draggable: {
					handle: '.widget-drag-handle'
				},
				disableDrag: !editable,
				disableResize: !editable
			},
			el
		);

		return (g as GridStackApi) ?? null;
	}

	function attachGridEvents(g: GridStackApi) {
		// Live updates: write x/y/w/h back into Svelte state while dragging/resizing.
		g.on('change', (_e: unknown, items: GridStackNode[] | undefined) => handleGridChange(items));

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
					{#if widgetSnippet}
						{@render widgetSnippet({ widget: item, editable, selected: selectedId === item.id })}
					{:else}
						<WidgetCard widget={item} {editable} />
					{/if}
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
