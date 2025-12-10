<!--
  CardTitle - Title within CardHeader
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props extends HTMLAttributes<HTMLHeadingElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...rest }: Props = $props();
</script>

<h3 class={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...rest}>
	{#if children}
		{@render children()}
	{/if}
</h3>
