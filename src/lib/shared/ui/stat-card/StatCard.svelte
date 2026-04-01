<!--
  StatCard Component
  KPI card with label, value, and optional trend indicator

  Usage:
    <StatCard
      label="Total Revenue"
      value="€448.2M"
      trend={12.4}
      trendLabel="vs last month"
    />
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import type { TrendDirection } from '$shared/styles/tokens';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Card label (e.g., "Total Revenue") */
		label: string;
		/** Formatted value (e.g., "€448.2M") */
		value: string;
		/** Trend percentage (positive = up, negative = down) */
		trend?: number;
		/** Trend context label */
		trendLabel?: string;
		/** Tooltip hint shown on hover over info icon */
		hint?: string;
		/** Loading state */
		loading?: boolean;
		/** Optional icon snippet rendered top-right */
		icon?: Snippet;
		/** Additional classes */
		class?: string;
		[key: string]: unknown;
	}

	let {
		label,
		value,
		trend,
		trendLabel = 'vs last period',
		hint,
		loading = false,
		icon,
		class: className,
		...rest
	}: Props = $props();

	// Derive trend direction
	const trendDirection: TrendDirection = $derived(
		trend === undefined ? 'neutral' : trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'
	);

	// Format trend text
	const trendText = $derived(
		trend === undefined ? '' : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`
	);
</script>

<div
	class={cn(
		'card-interactive rounded-lg border border-card-border bg-card p-5 shadow-sm',
		className
	)}
	{...rest}
>
	{#if loading}
		<!-- Shimmer skeleton -->
		<div class="space-y-3">
			<div class="skeleton-shimmer h-3 w-20 rounded"></div>
			<div class="skeleton-shimmer h-7 w-28 rounded"></div>
			<div class="skeleton-shimmer h-3 w-24 rounded"></div>
		</div>
	{:else}
		<!-- Header: label + optional icon -->
		<div class="flex items-start justify-between">
			<p class="type-overline text-muted-foreground">
				{label}
				{#if hint}
					<span class="ml-1 inline-flex cursor-help align-middle" title={hint}>
						<svg
							aria-hidden="true"
							class="h-3.5 w-3.5 text-muted-foreground/60"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
								clip-rule="evenodd"
							/>
						</svg>
					</span>
				{/if}
			</p>
			{#if icon}
				<span class="text-muted-foreground">
					{@render icon()}
				</span>
			{/if}
		</div>

		<!-- Value -->
		<p class="type-kpi-value mt-2 text-foreground">
			{value}
		</p>

		<!-- Trend -->
		{#if trend !== undefined}
			<div class="type-caption mt-2 flex items-center gap-1.5">
				<!-- Trend icon -->
				{#if trendDirection === 'up'}
					<svg
						aria-hidden="true"
						class="h-3.5 w-3.5 text-trend-up"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<path d="M7 17l9.2-9.2M17 17V7H7" />
					</svg>
				{:else if trendDirection === 'down'}
					<svg
						aria-hidden="true"
						class="h-3.5 w-3.5 text-trend-down"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<path d="M7 7l9.2 9.2M17 7v10H7" />
					</svg>
				{/if}

				<!-- Trend value -->
				<span
					class={cn(
						'type-caption-strong',
						trendDirection === 'up' && 'text-trend-up',
						trendDirection === 'down' && 'text-trend-down',
						trendDirection === 'neutral' && 'text-muted-foreground'
					)}
				>
					{trendText}
				</span>

				<!-- Trend label -->
				<span class="text-muted-foreground">
					{trendLabel}
				</span>
			</div>
		{/if}
	{/if}
</div>
