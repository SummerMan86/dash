<!--
  Card Component - Adapted from shadcn-svelte
  Carbon Design System integration

  Features:
  - Clean container with border
  - Hover state support
  - Flexible content with snippets
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		hover?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { hover = false, class: className, children, ...rest }: Props = $props();
</script>

<div
	class={cn(
		'rounded-lg border border-card-border bg-card text-card-foreground shadow-sm',
		hover && 'transition-colors hover:bg-card-hover',
		className
	)}
	{...rest}
>
	{#if children}
		{@render children()}
	{/if}
</div>
