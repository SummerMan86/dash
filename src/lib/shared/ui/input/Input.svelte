<!--
  Input Component - Adapted from shadcn-svelte
  Carbon Design System integration

  Features:
  - Full HTML input attributes support
  - Focus states with ring
  - Disabled state
  - Error state (via class)
  - Accessible
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		class?: string;
	}

	let { class: className, type = 'text', ...rest }: Props = $props();
</script>

<input
	{type}
	class={cn(
		'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm',
		'file:border-0 file:bg-transparent file:text-sm file:font-medium',
		'placeholder:text-muted-foreground',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors',
		className
	)}
	{...rest}
/>
