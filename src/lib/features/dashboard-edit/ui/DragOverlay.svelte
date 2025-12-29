<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '$shared/styles/utils';

	interface Props {
		/** Enable drag handle */
		editable?: boolean;
		/** Show drag handle only on hover (default: true) */
		showOnHover?: boolean;
		/** Position of drag handle */
		handlePosition?: 'top-right' | 'top-left' | 'top-center';
		/** Content to render */
		children: Snippet;
		class?: string;
	}

	let {
		editable = true,
		showOnHover = true,
		handlePosition = 'top-right',
		children,
		class: className
	}: Props = $props();

	const positionClasses = {
		'top-right': 'top-1 right-1',
		'top-left': 'top-1 left-1',
		'top-center': 'top-1 left-1/2 -translate-x-1/2'
	};
</script>

<!--
	Minimal drag overlay:
	- Renders children as-is (no wrapper card)
	- Adds a small, unobtrusive drag handle
	- Handle is visible only on hover by default
	- No pointer-events blocking - content remains fully interactive
-->
<div class={cn('group relative h-full', className)}>
	<!-- Content - fully interactive, no pointer-events blocking -->
	{@render children()}

	<!-- Drag handle overlay -->
	{#if editable}
		<div
			class={cn(
				'widget-drag-handle absolute z-10 flex h-5 w-5 items-center justify-center rounded bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-opacity',
				positionClasses[handlePosition],
				editable ? 'cursor-grab active:cursor-grabbing' : '',
				showOnHover ? 'opacity-0 group-hover:opacity-100' : 'opacity-60 hover:opacity-100'
			)}
			role="button"
			tabindex={editable ? 0 : -1}
			aria-label="Drag to move"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
			}}
		>
			<svg
				class="h-3 w-3"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
				<circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
			</svg>
		</div>
	{/if}
</div>
