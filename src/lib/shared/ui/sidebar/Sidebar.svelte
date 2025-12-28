<!--
  Sidebar
  - Desktop: статичный сайдбар слева, collapsible (сворачивается до иконок)
  - Mobile: off-canvas drawer + затемнение (overlay)
-->

<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/styles/utils';
	import { useSidebar } from './useSidebar';
	import type { SidebarSide } from './context';

	interface Props {
		/** Сторона появления на mobile */
		side?: SidebarSide;
		/** Ширина развёрнутого сайдбара в px */
		expandedWidth?: number;
		/** Ширина collapsed сайдбара в px (только иконки) */
		collapsedWidth?: number;
		class?: string;
		children?: Snippet;
	}

	let {
		side = 'left',
		expandedWidth = 256,
		collapsedWidth = 64,
		class: className,
		children
	}: Props = $props();

	const { openDesktop, openMobile, collapsed, close } = useSidebar();

	// Computed width для desktop
	const desktopWidth = $derived($collapsed ? collapsedWidth : expandedWidth);

	// Lock body scroll when mobile drawer is open
	let prevOverflow = '';
	const unsub = openMobile.subscribe((isOpen) => {
		if (typeof document === 'undefined') return;
		if (isOpen) {
			prevOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = prevOverflow;
		}
	});

	onDestroy(() => {
		unsub();
		if (typeof document !== 'undefined') document.body.style.overflow = prevOverflow;
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && $openMobile) close();
	}
</script>

<svelte:window on:keydown={onKeydown} />

<!-- Desktop sidebar (>= lg): collapsible с плавной анимацией -->
{#if $openDesktop}
	<aside
		class={cn(
			'hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:shrink-0',
			'border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
			'transition-[width] duration-200 ease-out overflow-hidden',
			className
		)}
		style="width: {desktopWidth}px;"
		data-collapsed={$collapsed}
	>
		<div class="flex h-full flex-col overflow-y-auto overflow-x-hidden">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</aside>
{/if}

<!-- Mobile overlay + drawer (< lg) -->
{#if $openMobile}
	<!-- Overlay -->
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/50 lg:hidden animate-in fade-in duration-200"
		aria-label="Close sidebar overlay"
		onclick={() => close()}
	></button>

	<!-- Drawer panel -->
	<div
		class={cn(
			'fixed inset-y-0 z-50 lg:hidden',
			'bg-sidebar text-sidebar-foreground shadow-xl border-r border-sidebar-border',
			'animate-in slide-in-from-left duration-200',
			side === 'left' ? 'left-0' : 'right-0',
			className
		)}
		style="width: {expandedWidth}px;"
		role="dialog"
		aria-modal="true"
		aria-label="Sidebar"
	>
		<!-- Mobile close button area -->
		<div class="flex items-center justify-end p-2">
			<button
				type="button"
				class="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
				aria-label="Close sidebar"
				onclick={() => close()}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
			</button>
		</div>

		<div class="px-3 pb-3 overflow-y-auto">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}
