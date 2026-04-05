<!--
  StatusBadge Component
  Displays stock status with color-coded badge

  Usage:
    <StatusBadge status="DEFICIT" />
    <StatusBadge status="RISK" size="sm" />
-->

<script lang="ts">
	import { cn } from '@dashboard-builder/platform-ui';
	import type { StockStatus } from './types';
	import { getStatusColor, getStatusLabel } from './utils';

	interface Props {
		/** Stock status */
		status: StockStatus;
		/** Badge size */
		size?: 'sm' | 'md';
		/** Show label text */
		showLabel?: boolean;
		/** Additional classes */
		class?: string;
	}

	let { status, size = 'md', showLabel = true, class: className }: Props = $props();

	const sizeClasses = $derived(size === 'sm' ? 'px-2 py-0.5 type-badge' : 'px-2 py-1 type-badge');
</script>

<span
	class={cn(
		'inline-flex items-center rounded-full',
		getStatusColor(status),
		sizeClasses,
		className
	)}
>
	{#if showLabel}
		{getStatusLabel(status)}
	{:else}
		<span class="sr-only">{getStatusLabel(status)}</span>
		<span
			class={cn(
				'rounded-full',
				size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
				status === 'DEFICIT' && 'bg-error',
				status === 'RISK' && 'bg-warning',
				status === 'OK' && 'bg-success'
			)}
		></span>
	{/if}
</span>
