<!--
  SidebarTrigger
  Кнопка "свернуть/развернуть" сайдбар.
  - На mobile: открывает/закрывает drawer
  - На desktop: переключает collapsed/expanded режим
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import { useSidebar } from './useSidebar';

	interface Props {
		/** Текст для screen readers */
		label?: string;
		class?: string;
	}

	let { label = 'Toggle sidebar', class: className }: Props = $props();

	const { toggle, collapsed } = useSidebar();
</script>

<button
	type="button"
	class={cn(
		'inline-flex h-8 w-8 items-center justify-center rounded-md',
		'text-muted-foreground hover:text-foreground',
		'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
		'transition-colors',
		className
	)}
	aria-label={label}
	aria-expanded={!$collapsed}
	onclick={() => toggle()}
>
	<!-- Sidebar toggle icon (панель со стрелкой) -->
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" />
		<path d="M9 3v18" stroke="currentColor" stroke-width="2" />
		{#if $collapsed}
			<!-- Стрелка вправо (развернуть) -->
			<path d="M14 12l3 3m0-6l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
		{:else}
			<!-- Стрелка влево (свернуть) -->
			<path d="M17 12l-3-3m0 6l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
		{/if}
	</svg>
</button>


