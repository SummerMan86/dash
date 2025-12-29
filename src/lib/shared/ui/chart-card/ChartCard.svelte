<!--
  ChartCard Component
  Container for charts with header and optional metadata

  Usage:
    <ChartCard title="Transaction Volume" subtitle="Monthly trend analysis">
      <MyChart />
    </ChartCard>

  For GridStack/flex containers, use fluid prop:
    <ChartCard title="Revenue" fluid>
      <Chart options={chartOptions} autoResize />
    </ChartCard>
-->

<script lang="ts">
  import { cn } from '$shared/styles/utils';
  import type { Snippet } from 'svelte';

  interface Props {
    /** Chart title */
    title: string;
    /** Chart subtitle/description */
    subtitle?: string;
    /** Last updated label */
    updatedAt?: string;
    /** Loading state */
    loading?: boolean;
    /** Fill parent container height instead of fixed height (useful for GridStack, flex layouts) */
    fluid?: boolean;
    /** Chart content slot */
    children?: Snippet;
    /** Additional classes */
    class?: string;
    [key: string]: unknown;
  }

  let {
    title,
    subtitle,
    updatedAt,
    loading = false,
    fluid = false,
    children,
    class: className,
    ...rest
  }: Props = $props();

  // Deterministic skeleton heights (SSR-safe)
  const skeletonHeights = [35, 55, 25, 70, 45, 60, 30, 50, 40, 65, 55, 45];
</script>

<div
  class={cn(
    'rounded-lg border border-border/50 bg-card',
    fluid && 'flex h-full flex-col',
    className
  )}
  {...rest}
>
  <!-- Header -->
  <div class="flex items-center justify-between p-6 pb-2">
    <div>
      <h3 class="text-base font-semibold">
        {title}
      </h3>
      {#if subtitle}
        <p class="text-sm text-muted-foreground">
          {subtitle}
        </p>
      {/if}
    </div>

    {#if updatedAt}
      <span class="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
        Updated: {updatedAt}
      </span>
    {/if}
  </div>

  <!-- Content -->
  <div class={cn('p-6 pt-0', fluid && 'flex min-h-0 flex-1 flex-col')}>
    {#if loading}
      <!-- Inline chart skeleton -->
      <div class={cn('flex items-end gap-2 px-4 animate-pulse', fluid ? 'min-h-[200px] flex-1' : 'h-72')}>
        {#each skeletonHeights as height}
          <div
            class="flex-1 rounded bg-muted"
            style="height: {height}%"
          ></div>
        {/each}
      </div>
    {:else}
      <div class={fluid ? 'min-h-0 flex-1' : 'h-72'}>
        {#if children}
          {@render children()}
        {/if}
      </div>
    {/if}
  </div>
</div>
