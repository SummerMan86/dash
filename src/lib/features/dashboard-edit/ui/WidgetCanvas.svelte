<script lang="ts">
	import type { DndEvent, Options } from 'svelte-dnd-action';
	import { dragHandleZone, FEATURE_FLAG_NAMES, setFeatureFlag } from 'svelte-dnd-action';

	import { cn } from '$shared/styles/utils';

	import { GRID_BUFFER_ROWS, GRID_COLUMNS, GRID_ROW_HEIGHT_PX, indexToLayout, layoutToIndex } from '../model/layout';
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
		widgets = [],
		editable = true,
		columns = GRID_COLUMNS,
		rowHeightPx = GRID_ROW_HEIGHT_PX,
		selectedId = null,
		class: className,
		onFinalize,
		onSelect
	}: Props = $props();

	// Fine grid MVP: model the canvas as a fixed list of "cells" (items),
	// so there are stable drop targets even where there is no widget.
	type EmptySlot = { id: string; kind: 'empty' };
	type CanvasItem = DashboardWidget | EmptySlot;

	function isEmpty(item: CanvasItem): item is EmptySlot {
		return (item as EmptySlot).kind === 'empty';
	}

	function isShadowItem(item: CanvasItem): boolean {
		// svelte-dnd-action injects a shadow placeholder object with this marker
		return !!(item as any)?.isDndShadowItem;
	}

	let slotItems = $state<CanvasItem[]>([]);
	let internalDragUpdate = false;
	let isDragging = $state(false);

	function cleanupDraggedOverlay() {
		if (typeof document === 'undefined') return;
		// svelte-dnd-action uses a fixed id for the dragged overlay element
		document.getElementById('dnd-action-dragged-el')?.remove();
	}

	function recoverIfStuck(reason: string) {
		// Only recover if we still think we're dragging.
		// Intentionally conservative to avoid racing `finalize`.
		if (!isDragging) return;
		void reason;
		cleanupDraggedOverlay();
		isDragging = false;
		internalDragUpdate = true;
		slotItems = ensureSlotItemsFromWidgets(widgets, 0);
	}

	function ensureSlotItemsFromWidgets(input: DashboardWidget[], minSlotCount: number): CanvasItem[] {
		const safeColumns = Math.max(1, Math.floor(columns));

		// Place widgets into cells by their layout index; resolve collisions by moving forward.
		const occupiedByIndex = new Map<number, DashboardWidget>();
		const occupied = new Set<number>();
		let maxIndex = -1;

		for (const w of input) {
			let idx = layoutToIndex(w.layout, safeColumns);
			while (occupied.has(idx)) idx++;
			occupied.add(idx);
			occupiedByIndex.set(idx, w);
			maxIndex = Math.max(maxIndex, idx);
		}

		const required = Math.max(input.length, maxIndex + 1);
		const padded = required + GRID_BUFFER_ROWS * safeColumns;
		const requiredSlots = Math.ceil(padded / safeColumns) * safeColumns;
		const slotCount = Math.max(requiredSlots, Math.max(safeColumns, minSlotCount));

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
			if (isEmpty(it) || isShadowItem(it)) continue;
			const { x, y } = indexToLayout(i, safeColumns);
			result.push({ ...it, layout: { ...it.layout, x, y, w: 1, h: 1 } });
		}

		return result;
	}

	function syncWidgetPayloadIntoSlotItems(items: CanvasItem[], input: DashboardWidget[]): CanvasItem[] {
		const byId = new Map(input.map((w) => [w.id, w]));
		let changed = false;

		const next = items.map((it) => {
			if (isEmpty(it) || isShadowItem(it)) return it;
			const fresh = byId.get(it.id);
			if (!fresh) return it;
			if (fresh !== it) changed = true;
			return fresh;
		});

		return changed ? next : items;
	}

	function sameSlotSignature(a: CanvasItem[], b: CanvasItem[]) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (a[i].id !== b[i].id) return false;
		}
		return true;
	}

	$effect(() => {
		// External updates (Reset/Add/Edit) rebuild the slots.
		// During a drag, never rebuild from `widgets` (it can break DnD).
		if (internalDragUpdate) {
			internalDragUpdate = false;
			if (isDragging) return;
		}

		const minSlots = isDragging ? slotItems.length : 0;
		const next = ensureSlotItemsFromWidgets(widgets, minSlots);
		if (!sameSlotSignature(next, slotItems)) {
			slotItems = next;
			return;
		}

		// Same structure but payload might have changed (title/config edits).
		const payloadSynced = syncWidgetPayloadIntoSlotItems(slotItems, widgets);
		if (payloadSynced !== slotItems) slotItems = payloadSynced;
	});

	const zoneOptions = $derived<Options<CanvasItem>>({
		items: slotItems,
		flipDurationMs: 160,
		dragDisabled: !editable,
		dropFromOthersDisabled: true,
		delayTouchStart: 80,
		dropTargetClasses: ['dnd-drop-target']
	});

	function handleConsider(e: CustomEvent<DndEvent<CanvasItem>>) {
		const trigger = (e.detail as any)?.info?.trigger as string | undefined;
		if (trigger === 'dragStarted') isDragging = true;
		internalDragUpdate = true;
		slotItems = e.detail.items;
	}

	function handleFinalize(e: CustomEvent<DndEvent<CanvasItem>>) {
		internalDragUpdate = true;
		slotItems = e.detail.items;
		const nextWidgets = widgetsFromSlotItems(e.detail.items);
		onFinalize?.(nextWidgets);
		isDragging = false;
		// If overlay ever gets stuck, remove it after drop paint.
		requestAnimationFrame(() => cleanupDraggedOverlay());
	}

	// Minimal safety: if drag leaves the document, restore a clean slot model from widgets.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const handle = () => {
			isDragging = false;
			slotItems = ensureSlotItemsFromWidgets(widgets, 0);
			cleanupDraggedOverlay();
		};
		window.addEventListener('draggedLeftDocument', handle as EventListener);

		// Safety: if mouse/touch ends but finalize didn't happen (rare), recover.
		const endHandler = () => {
			setTimeout(() => recoverIfStuck('mouseup/touchend-without-finalize'), 0);
		};
		window.addEventListener('mouseup', endHandler as EventListener);
		window.addEventListener('touchend', endHandler as EventListener);
		const escHandler = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') recoverIfStuck('escape');
		};
		window.addEventListener('keyup', escHandler as unknown as EventListener);

		return () => {
			window.removeEventListener('draggedLeftDocument', handle as EventListener);
			window.removeEventListener('mouseup', endHandler as EventListener);
			window.removeEventListener('touchend', endHandler as EventListener);
			window.removeEventListener('keyup', escHandler as unknown as EventListener);
		};
	});
</script>

<div
	class={cn('grid gap-4', className)}
	style={`grid-template-columns: repeat(${columns}, minmax(0, 1fr)); grid-auto-rows: ${rowHeightPx}px;`}
	use:dragHandleZone={zoneOptions}
	onconsider={handleConsider}
	onfinalize={handleFinalize}
>
	{#each slotItems as item, index (isShadowItem(item) ? `shadow-${index}` : item.id)}
		{#if isEmpty(item) || isShadowItem(item)}
			<div
				class={cn(
					'flex h-full items-center justify-center rounded-md border border-dashed border-border/50 bg-muted/10',
					isShadowItem(item) ? 'bg-muted/30' : '',
					editable ? 'text-muted-foreground' : 'opacity-50'
				)}
				aria-hidden="true"
			>
				<span class="text-[10px] leading-none">+</span>
			</div>
		{:else}
			<div
				class={cn(
					'group h-full rounded-lg',
					!isDragging && selectedId === item.id ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
				)}
				role="button"
				tabindex={0}
				onclick={() => {
					if (!isDragging) onSelect?.(item.id);
				}}
				onkeydown={(e) => {
					if (!isDragging && (e.key === 'Enter' || e.key === ' ')) onSelect?.(item.id);
				}}
			>
				<WidgetCard widget={item} {editable} />
			</div>
		{/if}
	{/each}
</div>

<style>
	:global(.dnd-drop-target) {
		outline: 2px dashed color-mix(in srgb, var(--color-border) 70%, transparent);
		outline-offset: 6px;
		border-radius: 12px;
	}

	/* Prevent "multiple selected" look caused by the drag overlay cloning a selected item */
	:global(#dnd-action-dragged-el) {
		box-shadow: none !important;
		outline: none !important;
	}
</style>
