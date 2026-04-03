<!--
  Skeleton Component
  Loading placeholder with pulse or shimmer animation

  Usage:
    <Skeleton class="h-8 w-32" />
    <Skeleton class="h-4 w-full" shimmer />
-->

<script lang="ts">
	import { cn } from '../styles/utils';

	interface Props {
		/** Use shimmer gradient instead of pulse */
		shimmer?: boolean;
		class?: string;
		[key: string]: unknown;
	}

	let { shimmer = false, class: className, ...rest }: Props = $props();
</script>

<div
	class={cn('rounded-md', shimmer ? 'skeleton-shimmer' : 'animate-pulse bg-muted', className)}
	{...rest}
></div>
