<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '$shared/styles/utils';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';

	import type { DashboardWidget } from '../model';

	interface Props {
		widget: DashboardWidget;
		editable?: boolean;
		children?: Snippet;
		class?: string;
	}

	let { widget, editable = true, children, class: className }: Props = $props();
</script>

<Card
	class={cn(
		'relative h-full overflow-hidden border-border/50 bg-card transition-colors',
		editable ? 'ring-1 ring-transparent hover:ring-border/60' : '',
		className
	)}
>
	<div class="flex items-start justify-between gap-2 p-4 pb-2">
		<div class="min-w-0">
			<CardTitle class="truncate text-sm font-semibold">{widget.title}</CardTitle>
			<CardDescription class="text-xs text-muted-foreground">{widget.type}</CardDescription>
		</div>

		<div
			class={cn(
				'widget-drag-handle inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/50 bg-muted/30 text-muted-foreground',
				editable
					? 'cursor-grab hover:bg-muted/60 active:cursor-grabbing'
					: 'cursor-not-allowed opacity-50'
			)}
			aria-label="Drag"
			aria-disabled={!editable}
			role="button"
			tabindex={editable ? 0 : -1}
			onclick={(e) => {
				e.stopPropagation();
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
			}}
		>
			<span class="text-base leading-none">≡</span>
		</div>
	</div>

	<CardContent class={cn('p-4 pt-0', editable ? 'pointer-events-none' : '')}>
		<div class="rounded-md bg-muted/20 p-3 text-xs text-muted-foreground">
			{#if children}
				{@render children()}
			{:else}
				<div class="space-y-2">
					<div class="h-2 w-3/5 rounded bg-muted"></div>
					<div class="h-2 w-4/5 rounded bg-muted"></div>
					<div class="h-2 w-2/5 rounded bg-muted"></div>
				</div>
			{/if}
		</div>
	</CardContent>
</Card>
