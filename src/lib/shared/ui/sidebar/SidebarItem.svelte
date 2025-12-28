<!--
  SidebarItem
  Пункт меню: ссылка или кнопка.
  - Поддерживает иконку (snippet)
  - В collapsed режиме показывает только иконку с tooltip
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/styles/utils';
	import { useSidebar } from './useSidebar';

	interface Props {
		href?: string;
		active?: boolean;
		disabled?: boolean;
		/** Название для tooltip (в collapsed режиме) */
		label?: string;
		class?: string;
		/** Иконка слева */
		icon?: Snippet;
		/** Текст/контент */
		children?: Snippet;
	}

	let {
		href,
		active = false,
		disabled = false,
		label,
		class: className,
		icon,
		children
	}: Props = $props();

	const { collapsed } = useSidebar();

	const baseClasses = cn(
		'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
		'text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground',
		'transition-colors',
		active && 'bg-sidebar-active text-sidebar-foreground',
		disabled && 'pointer-events-none opacity-50'
	);

	// В collapsed режиме центрируем иконку
	const collapsedClasses = 'justify-center px-0';
</script>

{#if href}
	<a
		{href}
		class={cn(baseClasses, $collapsed && collapsedClasses, className)}
		aria-current={active ? 'page' : undefined}
		title={$collapsed ? label : undefined}
	>
		{#if icon}
			<span class="shrink-0">
				{@render icon()}
			</span>
		{/if}
		{#if !$collapsed && children}
			<span class="truncate">
				{@render children()}
			</span>
		{/if}
	</a>
{:else}
	<button
		type="button"
		class={cn(baseClasses, 'w-full text-left', $collapsed && collapsedClasses, className)}
		{disabled}
		title={$collapsed ? label : undefined}
	>
		{#if icon}
			<span class="shrink-0">
				{@render icon()}
			</span>
		{/if}
		{#if !$collapsed && children}
			<span class="truncate">
				{@render children()}
			</span>
		{/if}
	</button>
{/if}
