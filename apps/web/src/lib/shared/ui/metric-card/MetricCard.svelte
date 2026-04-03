<!--
  MetricCard Component
  Extended KPI card with plan/fact comparison and built-in progress bar

  Usage:
    <MetricCard label="Выручка" value={formatCurrency(320_000_000)} />

    <MetricCard
      label="Выручка"
      value={formatCurrency(320_000_000)}
      target={formatCurrency(400_000_000)}
      progress={80}
      trend={12.4}
      trendLabel="vs прошлый месяц"
    />

    <MetricCard label="NPS" value="72" target="80" progress={90} variant="accent" loading />
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import { ProgressBar } from '$shared/ui/progress-bar';
	import type { TrendDirection } from '$shared/styles/tokens';
	import type { Snippet } from 'svelte';

	type MetricVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';

	interface Props {
		/** Metric label */
		label: string;
		/** Formatted current value */
		value: string;
		/** Formatted target / plan value */
		target?: string;
		/** Progress percentage 0–100 (shows progress bar when provided) */
		progress?: number;
		/** Trend percentage (positive = up, negative = down) */
		trend?: number;
		/** Trend context label */
		trendLabel?: string;
		/** Color variant for progress bar */
		variant?: MetricVariant;
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
		target,
		progress,
		trend,
		trendLabel = 'vs plan',
		variant = 'default',
		loading = false,
		icon,
		class: className,
		...rest
	}: Props = $props();

	const trendDirection: TrendDirection = $derived(
		trend === undefined ? 'neutral' : trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'
	);

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
		<div class="space-y-3">
			<div class="skeleton-shimmer h-3 w-20 rounded"></div>
			<div class="skeleton-shimmer h-7 w-28 rounded"></div>
			<div class="skeleton-shimmer mt-2 h-2 w-full rounded"></div>
			<div class="skeleton-shimmer h-3 w-24 rounded"></div>
		</div>
	{:else}
		<!-- Header: label + optional icon -->
		<div class="flex items-start justify-between">
			<p class="type-overline text-muted-foreground">{label}</p>
			{#if icon}
				<span class="text-muted-foreground">
					{@render icon()}
				</span>
			{/if}
		</div>

		<!-- Value row -->
		<div class="mt-2 flex items-baseline gap-2">
			<span class="type-kpi-value text-foreground">{value}</span>
			{#if target}
				<span class="type-caption text-muted-foreground">/ {target}</span>
			{/if}
		</div>

		<!-- Progress bar -->
		{#if progress !== undefined}
			<div class="mt-3">
				<ProgressBar value={progress} {variant} size="sm" />
			</div>
		{/if}

		<!-- Trend -->
		{#if trend !== undefined}
			<div class="type-caption mt-2 flex items-center gap-1.5">
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

				<span class="text-muted-foreground">{trendLabel}</span>
			</div>
		{/if}
	{/if}
</div>
