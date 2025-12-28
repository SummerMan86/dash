<!--
  SidebarInset
  Обёртка для основного контента рядом с Sidebar.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/styles/utils';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<main class={cn('flex-1 bg-background text-foreground', className)}>
	{#if children}
		{@render children()}
	{/if}
</main>


