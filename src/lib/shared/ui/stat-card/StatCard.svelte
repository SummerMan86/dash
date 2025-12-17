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

  interface Props {
    /** Card label (e.g., "Total Revenue") */
    label: string;
    /** Formatted value (e.g., "€448.2M") */
    value: string;
    /** Trend percentage (positive = up, negative = down) */
    trend?: number;
    /** Trend context label */
    trendLabel?: string;
    /** Loading state */
    loading?: boolean;
    /** Additional classes */
    class?: string;
    [key: string]: unknown;
  }

  let {
    label,
    value,
    trend,
    trendLabel = 'vs last period',
    loading = false,
    class: className,
    ...rest
  }: Props = $props();

  // Derive trend direction
  const trendDirection: TrendDirection = $derived(
    trend === undefined ? 'neutral' :
    trend > 0 ? 'up' :
    trend < 0 ? 'down' : 'neutral'
  );

  // Format trend text
  const trendText = $derived(
    trend === undefined ? '' :
    `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`
  );
</script>

<div
  class={cn(
    'rounded-lg border border-border/50 bg-card p-6 pt-4',
    className
  )}
  {...rest}
>
  {#if loading}
    <!-- Inline skeleton -->
    <div class="animate-pulse">
      <div class="h-3 w-24 rounded bg-muted mb-2"></div>
      <div class="h-8 w-32 rounded bg-muted mb-2"></div>
      <div class="h-3 w-28 rounded bg-muted"></div>
    </div>
  {:else}
    <!-- Label -->
    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>

    <!-- Value -->
    <p class="mt-1 text-2xl font-bold">
      {value}
    </p>

    <!-- Trend -->
    {#if trend !== undefined}
      <div class="mt-1 flex items-center gap-1 text-xs">
        <!-- Trend icon -->
        {#if trendDirection === 'up'}
          <svg
            aria-hidden="true"
            class="h-3 w-3 text-trend-up"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        {:else if trendDirection === 'down'}
          <svg
            aria-hidden="true"
            class="h-3 w-3 text-trend-down"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M7 7l9.2 9.2M17 7v10H7" />
          </svg>
        {/if}

        <!-- Trend value -->
        <span
          class={cn(
            'font-medium',
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
