<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';

	import { cn } from '$shared/styles/utils';

	import { GRID_COLUMNS, GRID_ROW_HEIGHT_PX } from '../model/layout';
	import type { DashboardWidget } from '../model/types';

	import WidgetCard from './WidgetCard.svelte';

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

	type GridStackNodeLike = {
		id?: string | number;
		x?: number;
		y?: number;
		w?: number;
		h?: number;
		el?: HTMLElement | null;
	};

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

	const pendingWidgetEls = new Set<HTMLElement>();

	type WidgetActionParams = {
		id: string;
		layout: DashboardWidget['layout'];
		editable: boolean;
	};

	function widgetNode(node: HTMLElement, params: WidgetActionParams) {
		pendingWidgetEls.add(node);

		function apply(p: WidgetActionParams) {
			if (!grid) return;
			// Update is safe even if GridStack already manages the node.
			applyingFromStore = true;
			grid.update(node, {
				id: p.id,
				x: p.layout.x,
				y: p.layout.y,
				w: p.layout.w,
				h: p.layout.h,
				noMove: !p.editable,
				noResize: !p.editable
			});
			applyingFromStore = false;
		}

		if (grid) {
			grid.makeWidget(node);
			apply(params);
		}

		return {
			update(next: WidgetActionParams) {
				apply(next);
			},
			destroy() {
				pendingWidgetEls.delete(node);
				if (grid) grid.removeWidget(node, false);
			}
		};
	}

	function handleGridChange(items: GridStackNodeLike[] | undefined) {
		if (!items || applyingFromStore) return;

		const byId = new Map<string, GridStackNodeLike>();
		for (const it of items) {
			const id =
				(typeof it.id === 'string' && it.id) ||
				(typeof it.id === 'number' ? String(it.id) : '') ||
				it.el?.getAttribute('data-gs-id') ||
				it.el?.getAttribute('gs-id') ||
				'';
			if (id) byId.set(id, it);
		}

		// Only update widgets that actually changed.
		let changed = false;
		const next = widgets.map((w) => {
			const it = byId.get(w.id);
			if (!it) return w;

			const x = it.x ?? w.layout.x;
			const y = it.y ?? w.layout.y;
			const ww = it.w ?? w.layout.w;
			const hh = it.h ?? w.layout.h;

			if (x === w.layout.x && y === w.layout.y && ww === w.layout.w && hh === w.layout.h) return w;
			changed = true;
			return { ...w, layout: { ...w.layout, x, y, w: ww, h: hh } };
		});

		if (!changed) return;

		applyingFromGrid = true;
		lastWidgets = next;
		onWidgetsChange?.(next);
		applyingFromGrid = false;
	}

	onMount(async () => {
		if (!gridEl) return;

		// IMPORTANT: GridStack's ESM build currently breaks when evaluated in SSR under Node ESM
		// (extension-less internal imports). We therefore load it client-only.
		const mod = await import('gridstack');
		const GridStack = mod.GridStack as any;

		grid = GridStack.init(
			{
				column: Math.max(1, Math.floor(columns)),
				cellHeight: Math.max(8, Math.floor(rowHeightPx)),
				margin: 16, // matches tailwind gap-4 (16px)
				float: true,
				draggable: {
					handle: '.widget-drag-handle'
				},
				disableDrag: !editable,
				disableResize: !editable
			},
			gridEl
		);

		grid.on('change', (_e, items) => handleGridChange(items));
		grid.on('dragstop', async () => {
			await tick();
			onFinalize?.(lastWidgets);
		});
		grid.on('resizestop', async () => {
			await tick();
			onFinalize?.(lastWidgets);
		});

		// Adopt any widgets rendered before init.
		for (const el of pendingWidgetEls) {
			grid.makeWidget(el);
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
			<div class="grid-stack-item-content">
				<div
					class={cn(
						'group rounded-lg',
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
