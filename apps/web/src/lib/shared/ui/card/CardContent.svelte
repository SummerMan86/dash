<!--
  CardContent - Main content area of Card
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...rest }: Props = $props();
</script>

<div class={cn('p-6 pt-0', className)} {...rest}>
	{#if children}
		{@render children()}
	{/if}
</div>
