<!--
  CardHeader - Header section of Card
  Typically contains CardTitle and CardDescription
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

<div class={cn('flex flex-col gap-2 p-6', className)} {...rest}>
	{#if children}
		{@render children()}
	{/if}
</div>
