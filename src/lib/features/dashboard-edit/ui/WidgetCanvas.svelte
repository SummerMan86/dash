<script lang="ts">
	import type { DndEvent, Options } from 'svelte-dnd-action';
	import { dragHandleZone, FEATURE_FLAG_NAMES, setFeatureFlag } from 'svelte-dnd-action';

	import { cn } from '$shared/styles/utils';

	import {
		GRID_BUFFER_ROWS,
		GRID_COLUMNS,
		GRID_ROW_HEIGHT_PX,
		indexToLayout,
		layoutToIndex
	} from '../model/layout';
	import type { DashboardWidget } from '../model/types';

	import WidgetCard from './WidgetCard.svelte';

	// Grid layout + CSS grid can have stale bounding rects in some browsers; enable lib workaround.
	setFeatureFlag(FEATURE_FLAG_NAMES.USE_COMPUTED_STYLE_INSTEAD_OF_BOUNDING_RECT, true);

	interface Props {
		widgets?: DashboardWidget[];
		editable?: boolean;
		columns?: number;
		rowHeightPx?: number;
		selectedId?: string | null;
		class?: string;
		onFinalize?: (widgets: DashboardWidget[]) => void;
		onSelect?: (id: string) => void;
	}

	let {
		widgets = $bindable([]),
		editable = true,
		columns = GRID_COLUMNS,
		rowHeightPx = GRID_ROW_HEIGHT_PX,
		selectedId = null,
		class: className,
		onFinalize,
		onSelect
	}: Props = $props();

	// IMPORTANT: for fine-grid we model the canvas as a fixed list of cells (items).
	// This keeps drag targets stable and avoids DnD glitches caused by rebuilding DOM during drag.
	type EmptySlot = { id: string; kind: 'empty' };
	type CanvasItem = DashboardWidget | EmptySlot;

	function isEmpty(item: CanvasItem): item is EmptySlot {
		return (item as EmptySlot).kind === 'empty';
	}

	let slotItems = $state<CanvasItem[]>([]);
	let internalDragUpdate = false;

	function ensureSlotItemsFromWidgets(input: DashboardWidget[]): CanvasItem[] {
		const safeColumns = Math.max(1, Math.floor(columns));

		const occupiedByIndex = new Map<number, DashboardWidget>();
		let maxIndex = -1;

		for (const w of input) {
			const idx = layoutToIndex(w.layout, safeColumns);
			if (!occupiedByIndex.has(idx)) {
				occupiedByIndex.set(idx, w);
				maxIndex = Math.max(maxIndex, idx);
			}
		}

		const required = Math.max(input.length, maxIndex + 1);
		const padded = required + GRID_BUFFER_ROWS * safeColumns;
		const slotCount = Math.ceil(padded / safeColumns) * safeColumns;

		const items: CanvasItem[] = Array.from({ length: slotCount }, (_, i) => ({
			id: `empty-${i}`,
			kind: 'empty'
		}));

		for (const [idx, w] of occupiedByIndex.entries()) {
			if (idx >= 0 && idx < items.length) items[idx] = w;
		}

		return items;
	}

	function widgetsFromSlotItems(items: CanvasItem[]): DashboardWidget[] {
		const safeColumns = Math.max(1, Math.floor(columns));
		const result: DashboardWidget[] = [];

		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (isEmpty(it)) continue;
			const { x, y } = indexToLayout(i, safeColumns);
			result.push({ ...it, layout: { ...it.layout, x, y, w: 1, h: 1 } });
		}

		return result;
	}

	$effect(() => {
		// Rebuild slots only for external widget changes (load/reset/add),
		// NOT for updates originating from consider/finalize.
		if (internalDragUpdate) {
			internalDragUpdate = false;
			return;
		}
		slotItems = ensureSlotItemsFromWidgets(widgets);
	});

	const zoneOptions = $derived<Options<CanvasItem>>({
		items: slotItems,
		flipDurationMs: 160,
		dragDisabled: !editable,
		dropFromOthersDisabled: true,
		// Helps touch UX a bit
		delayTouchStart: 80,
		dropTargetClasses: ['dnd-drop-target']
	});

	function handleConsider(e: CustomEvent<DndEvent<CanvasItem>>) {
		internalDragUpdate = true;
		slotItems = e.detail.items;
		widgets = widgetsFromSlotItems(slotItems);
	}

	function handleFinalize(e: CustomEvent<DndEvent<CanvasItem>>) {
		internalDragUpdate = true;
		slotItems = e.detail.items;
		widgets = widgetsFromSlotItems(slotItems);
		onFinalize?.(widgets);
	}

	function gridPlacementStyle(index: number) {
		const safeColumns = Math.max(1, Math.floor(columns));
		const { x, y } = indexToLayout(index, safeColumns);
		return `grid-column: ${x + 1}; grid-row: ${y + 1};`;
	}
</script>

<div
	class={cn('grid gap-4', className)}
	style={`grid-template-columns: repeat(${columns}, minmax(0, 1fr)); grid-auto-rows: ${rowHeightPx}px;`}
	use:dragHandleZone={zoneOptions}
	onconsider={handleConsider}
	onfinalize={handleFinalize}
>
	{#each slotItems as item, index (item.id)}
		<div style={gridPlacementStyle(index)}>
			{#if isEmpty(item)}
				<div
					class={cn(
						'flex h-full items-center justify-center rounded-md border border-dashed border-border/50 bg-muted/10',
						editable ? 'text-muted-foreground' : 'opacity-50'
					)}
				>
					<span class="text-[10px] leading-none">+</span>
				</div>
			{:else}
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
			{/if}
		</div>
	{/each}
</div>

<style>
	:global(.dnd-drop-target) {
		outline: 2px dashed color-mix(in srgb, var(--color-border) 70%, transparent);
		outline-offset: 6px;
		border-radius: 12px;
	}
</style>
