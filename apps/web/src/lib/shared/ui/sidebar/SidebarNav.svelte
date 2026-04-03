<!--
  SidebarNav
  Семантический контейнер навигации с опциональным заголовком группы.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/styles/utils';
	import { useSidebar } from './useSidebar';

	interface Props {
		/** Заголовок группы навигации */
		label?: string;
		ariaLabel?: string;
		class?: string;
		children?: Snippet;
	}

	let { label, ariaLabel = 'Sidebar navigation', class: className, children }: Props = $props();

	const { collapsed } = useSidebar();
</script>

<nav class={cn('px-2 py-2', className)} aria-label={ariaLabel}>
	{#if label}
		<div class={cn('type-overline mb-2 px-3 text-sidebar-muted', $collapsed && 'sr-only')}>
			{label}
		</div>
	{/if}
	<div class="space-y-1">
		{#if children}
			{@render children()}
		{/if}
	</div>
</nav>
