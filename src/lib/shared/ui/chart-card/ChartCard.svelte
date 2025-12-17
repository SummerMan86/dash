<!--
  ChartCard Component
  Container for charts with header and optional metadata

  Usage:
    <ChartCard
      title="Transaction Volume"
      subtitle="Monthly trend analysis"
      updatedAt="Dec 2024"
    >
      <MyChart />
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
  <div class="p-6 pt-0">
    {#if loading}
      <!-- Inline chart skeleton -->
      <div class="flex h-72 items-end gap-2 px-4 animate-pulse">
        {#each skeletonHeights as height}
          <div
            class="flex-1 rounded bg-muted"
            style="height: {height}%"
          ></div>
        {/each}
      </div>
    {:else}
      <div class="h-72">
        {#if children}
          {@render children()}
        {/if}
      </div>
    {/if}
  </div>
</div>
