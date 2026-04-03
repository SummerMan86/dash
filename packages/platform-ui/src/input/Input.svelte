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
	import { cn } from '../styles/utils';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		class?: string;
	}

	// Svelte 5: make `value` bindable for consumers (`bind:value={...}`).
	// Note: we keep `value` as `any`-ish since HTML input value varies by `type`.
	let { class: className, type = 'text', value = $bindable(), ...rest }: Props = $props();
</script>

<input
	{type}
	bind:value
	class={cn(
		'type-control box-border flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5',
		'file:border-0 file:bg-transparent file:text-sm file:font-medium',
		'placeholder:text-muted-foreground',
		'focus-glow',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-[border-color,box-shadow] duration-[var(--transition-fast)] ease-[var(--ease-standard)]',
		className
	)}
	{...rest}
/>
