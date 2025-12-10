<!--
  CardDescription - Subtitle/description within CardHeader
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props extends HTMLAttributes<HTMLParagraphElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...rest }: Props = $props();
</script>

<p class={cn('text-sm text-muted-foreground', className)} {...rest}>
	{#if children}
		{@render children()}
	{/if}
</p>
