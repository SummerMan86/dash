<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';

	import type { WidgetType } from '../model/types';

	export type ToolboxItem = {
		type: WidgetType;
		label: string;
		description?: string;
	};

	interface Props {
		selectedType?: WidgetType;
		editable?: boolean;
		items?: ToolboxItem[];
		onSelectType?: (type: WidgetType) => void;
		class?: string;
	}

	let {
		selectedType,
		editable = true,
		items = [
			{ type: 'kpi', label: 'KPI', description: 'Single metric' },
			{ type: 'line', label: 'Line', description: 'Trend over time' },
			{ type: 'bar', label: 'Bar', description: 'Compare categories' },
			{ type: 'pie', label: 'Pie', description: 'Share distribution' },
			{ type: 'table', label: 'Table', description: 'Rows & columns' },
			{ type: 'stat', label: 'Stat', description: 'Small summary card' }
		],
		onSelectType,
		class: className
	}: Props = $props();
</script>

<Card class={cn('h-fit', className)}>
	<CardHeader>
		<CardTitle>Toolbox</CardTitle>
	</CardHeader>
	<CardContent class="space-y-2">
		{#each items as item (item.type)}
			<Button
				variant={selectedType === item.type ? 'default' : 'secondary'}
				class="w-full justify-start"
				disabled={!editable}
				onclick={() => onSelectType?.(item.type)}
			>
				<div class="flex w-full items-center justify-between gap-3">
					<div class="min-w-0">
						<div class="truncate text-sm font-medium">{item.label}</div>
						{#if item.description}
							<div class="truncate text-xs text-muted-foreground">{item.description}</div>
						{/if}
					</div>
					<span class="text-xs text-muted-foreground">+</span>
				</div>
			</Button>
		{/each}

		<p class="pt-2 text-xs text-muted-foreground">Select a type, then configure it in Inspector.</p>
	</CardContent>
</Card>
