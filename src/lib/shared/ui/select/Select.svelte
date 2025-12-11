<!--
  Select Component - Adapted from shadcn-svelte
  Carbon Design System integration

  Features:
  - Full HTML select attributes support
  - Focus states with ring
  - Disabled state
  - Accessible
  - Native select dropdown
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props extends HTMLSelectAttributes {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...rest }: Props = $props();
</script>

<select
	class={cn(
		'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors',
		'appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'none\' stroke=\'currentColor\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat pr-10',
		className
	)}
	{...rest}
>
	{#if children}
		{@render children()}
	{/if}
</select>
