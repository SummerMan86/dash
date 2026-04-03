<!--
  ProgressBar Component
  Linear progress indicator with optional label and value display

  Usage:
    <ProgressBar value={75} />
    <ProgressBar value={75} max={100} label="Выполнение плана" showValue />
    <ProgressBar value={45} variant="warning" size="lg" />
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';

	type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';
	type ProgressSize = 'sm' | 'default' | 'lg';

	interface Props {
		/** Current value */
		value: number;
		/** Maximum value (default 100) */
		max?: number;
		/** Color variant */
		variant?: ProgressVariant;
		/** Bar height */
		size?: ProgressSize;
		/** Show percentage text on the right */
		showValue?: boolean;
		/** Label above the bar */
		label?: string;
		/** Additional classes for the wrapper */
		class?: string;
		[key: string]: unknown;
	}

	let {
		value,
		max = 100,
		variant = 'default',
		size = 'default',
		showValue = false,
		label,
		class: className,
		...rest
	}: Props = $props();

	const percent = $derived(Math.min(Math.max((value / max) * 100, 0), 100));

	const variants: Record<ProgressVariant, string> = {
		default: 'bg-primary',
		success: 'bg-success',
		warning: 'bg-warning',
		error: 'bg-error',
		accent: 'bg-accent'
	};

	const trackVariants: Record<ProgressVariant, string> = {
		default: 'bg-primary/10',
		success: 'bg-success-muted',
		warning: 'bg-warning-muted',
		error: 'bg-error-muted',
		accent: 'bg-accent/10'
	};

	const sizes: Record<ProgressSize, string> = {
		sm: 'h-1',
		default: 'h-2',
		lg: 'h-3'
	};
</script>

<div class={cn('w-full', className)} {...rest}>
	{#if label || showValue}
		<div class="mb-1.5 flex items-baseline justify-between">
			{#if label}
				<span class="type-caption text-muted-foreground">{label}</span>
			{/if}
			{#if showValue}
				<span class="type-caption-strong text-foreground tabular-nums">
					{percent.toFixed(0)}%
				</span>
			{/if}
		</div>
	{/if}

	<div
		class={cn('w-full overflow-hidden rounded-full', trackVariants[variant], sizes[size])}
		role="progressbar"
		aria-valuenow={value}
		aria-valuemin={0}
		aria-valuemax={max}
	>
		<div
			class={cn(
				'h-full rounded-full transition-all duration-[var(--transition-moderate)] ease-[var(--ease-standard)]',
				variants[variant]
			)}
			style="width: {percent}%"
		></div>
	</div>
</div>
