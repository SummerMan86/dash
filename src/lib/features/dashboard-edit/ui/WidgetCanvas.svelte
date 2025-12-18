<script lang="ts">
	import type { DndEvent, Options } from 'svelte-dnd-action';
	import { dragHandleZone, FEATURE_FLAG_NAMES, setFeatureFlag } from 'svelte-dnd-action';

	import { cn } from '$shared/styles/utils';

	import { applyGridByIndex, GRID_COLUMNS, GRID_ROW_HEIGHT_PX } from '../model/layout';
	import type { DashboardWidget } from '../model/types';

	import WidgetCard from './WidgetCard.svelte';

	// Grid layout + CSS grid can have stale bounding rects in some browsers; enable lib workaround.
	setFeatureFlag(FEATURE_FLAG_NAMES.USE_COMPUTED_STYLE_INSTEAD_OF_BOUNDING_RECT, true);

	interface Props {
		widgets?: DashboardWidget[];
		editable?: boolean;
		columns?: number;
		selectedId?: string | null;
		class?: string;
		onFinalize?: (widgets: DashboardWidget[]) => void;
		onSelect?: (id: string) => void;
	}

	let {
		widgets = $bindable([]),
		editable = true,
		columns = GRID_COLUMNS,
		selectedId = null,
		class: className,
		onFinalize,
		onSelect
	}: Props = $props();

	const zoneOptions = $derived<Options<DashboardWidget>>({
		items: widgets,
		flipDurationMs: 160,
		dragDisabled: !editable,
		dropFromOthersDisabled: true,
		// Helps touch UX a bit
		delayTouchStart: 80,
		dropTargetClasses: ['dnd-drop-target']
	});

	function handleConsider(e: CustomEvent<DndEvent<DashboardWidget>>) {
		widgets = e.detail.items;
	}

	function handleFinalize(e: CustomEvent<DndEvent<DashboardWidget>>) {
		widgets = applyGridByIndex(e.detail.items, columns);
		onFinalize?.(widgets);
	}
</script>

<div
	class={cn('grid gap-4', className)}
	style={`grid-template-columns: repeat(${columns}, minmax(0, 1fr)); grid-auto-rows: ${GRID_ROW_HEIGHT_PX}px;`}
	use:dragHandleZone={zoneOptions}
	onconsider={handleConsider}
	onfinalize={handleFinalize}
>
	{#each widgets as widget (widget.id)}
		<div
			class={cn(
				'group rounded-lg',
				selectedId === widget.id ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
			)}
			role="button"
			tabindex={0}
			onclick={() => onSelect?.(widget.id)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') onSelect?.(widget.id);
			}}
		>
			<WidgetCard {widget} {editable} />
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
