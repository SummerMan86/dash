<!--
  ProgressCircle Component
  Radial gauge / circular progress indicator

  Usage:
    <ProgressCircle value={75} />
    <ProgressCircle value={75} label="План" size="lg" />
    <ProgressCircle value={92} variant="success" showValue />
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import type { Snippet } from 'svelte';

	type CircleVariant = 'default' | 'success' | 'warning' | 'error' | 'accent' | 'auto';
	type CircleSize = 'sm' | 'default' | 'lg' | 'xl';

	interface Props {
		/** Current value */
		value: number;
		/** Maximum value (default 100) */
		max?: number;
		/** Color variant. 'auto' picks green/yellow/red based on percent */
		variant?: CircleVariant;
		/** Component size */
		size?: CircleSize;
		/** Show percentage in the center */
		showValue?: boolean;
		/** Label below the circle */
		label?: string;
		/** Custom center content (overrides showValue) */
		center?: Snippet;
		/** Additional classes */
		class?: string;
		[key: string]: unknown;
	}

	let {
		value,
		max = 100,
		variant = 'default',
		size = 'default',
		showValue = true,
		label,
		center,
		class: className,
		...rest
	}: Props = $props();

	const percent = $derived(Math.min(Math.max((value / max) * 100, 0), 100));

	// Auto variant: green >= 80, yellow >= 50, red < 50
	const resolvedVariant = $derived<Exclude<CircleVariant, 'auto'>>(
		variant === 'auto' ? (percent >= 80 ? 'success' : percent >= 50 ? 'warning' : 'error') : variant
	);

	// SVG geometry
	const sizeConfig: Record<CircleSize, { px: number; stroke: number; valueClass: string }> = {
		sm: { px: 48, stroke: 4, valueClass: 'text-xs font-semibold' },
		default: { px: 72, stroke: 5, valueClass: 'type-card-title' },
		lg: { px: 96, stroke: 6, valueClass: 'text-lg font-semibold' },
		xl: { px: 128, stroke: 7, valueClass: 'type-kpi-value' }
	};

	const cfg = $derived(sizeConfig[size]);
	const radius = $derived((cfg.px - cfg.stroke) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const offset = $derived(circumference - (percent / 100) * circumference);

	// Stroke color via CSS vars
	const strokeColors: Record<Exclude<CircleVariant, 'auto'>, string> = {
		default: 'var(--color-primary)',
		success: 'var(--color-success)',
		warning: 'var(--color-warning)',
		error: 'var(--color-error)',
		accent: 'var(--color-accent)'
	};

	const trackColors: Record<Exclude<CircleVariant, 'auto'>, string> = {
		default: 'var(--color-primary)',
		success: 'var(--color-success-muted)',
		warning: 'var(--color-warning-muted)',
		error: 'var(--color-error-muted)',
		accent: 'var(--color-accent)'
	};

	const textColors: Record<Exclude<CircleVariant, 'auto'>, string> = {
		default: 'text-foreground',
		success: 'text-success',
		warning: 'text-warning-muted-foreground',
		error: 'text-error',
		accent: 'text-accent'
	};
</script>

<div class={cn('inline-flex flex-col items-center gap-1.5', className)} {...rest}>
	<div class="relative" style="width: {cfg.px}px; height: {cfg.px}px">
		<svg viewBox="0 0 {cfg.px} {cfg.px}" class="h-full w-full -rotate-90" aria-hidden="true">
			<!-- Track -->
			<circle
				cx={cfg.px / 2}
				cy={cfg.px / 2}
				r={radius}
				fill="none"
				stroke={trackColors[resolvedVariant]}
				stroke-width={cfg.stroke}
				opacity="0.2"
			/>
			<!-- Progress arc -->
			<circle
				cx={cfg.px / 2}
				cy={cfg.px / 2}
				r={radius}
				fill="none"
				stroke={strokeColors[resolvedVariant]}
				stroke-width={cfg.stroke}
				stroke-linecap="round"
				stroke-dasharray={circumference}
				stroke-dashoffset={offset}
				class="transition-all duration-[var(--transition-slow)] ease-[var(--ease-standard)]"
			/>
		</svg>

		<!-- Center content -->
		<div class="absolute inset-0 flex items-center justify-center">
			{#if center}
				{@render center()}
			{:else if showValue}
				<span class={cn('tabular-nums', cfg.valueClass, textColors[resolvedVariant])}>
					{percent.toFixed(0)}%
				</span>
			{/if}
		</div>
	</div>

	{#if label}
		<span class="type-caption text-center text-muted-foreground">{label}</span>
	{/if}
</div>
