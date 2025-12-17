<!--
  Skeleton Component
  Loading placeholder with pulse animation

  Usage:
    <Skeleton class="h-8 w-32" />
    <Skeleton class="h-4 w-full" />
-->

<script lang="ts">
  import { cn } from '$shared/styles/utils';

  interface Props {
    class?: string;
    [key: string]: unknown;
  }

  let { class: className, ...rest }: Props = $props();
</script>

<div
  class={cn('animate-pulse rounded-md bg-muted', className)}
  {...rest}
></div>
