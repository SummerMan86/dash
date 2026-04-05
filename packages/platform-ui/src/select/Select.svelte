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
	import { cn } from '../styles/utils';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props extends HTMLSelectAttributes {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, value = $bindable(), ...rest }: Props = $props();
</script>

<select
	bind:value
	class={cn(
		'type-control box-border flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5',
		'focus-glow',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-[border-color,box-shadow] duration-[var(--transition-fast)] ease-[var(--ease-standard)]',
		'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27currentColor%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] appearance-none bg-size-[16px_16px] bg-position-[right_0.5rem_center] bg-no-repeat pr-10',
		className
	)}
	{...rest}
>
	{#if children}{@render children()}{/if}
</select>
