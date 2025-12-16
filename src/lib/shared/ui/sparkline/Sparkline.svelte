<!--
  Sparkline Component - Lightweight SVG trend visualization

  Features:
  - Uses Carbon Design System color tokens
  - Auto-normalizes data to fit viewBox
  - Responsive width via Tailwind classes

  Usage:
  <Sparkline data={[100, 120, 115, 130, 125]} color="primary" />
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';

	interface Props {
		data: number[];
		color?: 'primary' | 'error' | 'success';
		class?: string;
	}

	let { data, color = 'primary', class: className }: Props = $props();

	// Color mapping to CSS custom properties (from tokens.css)
	const colorMap = {
		primary: 'var(--color-primary)',
		error: 'var(--color-error)',
		success: 'var(--color-success)'
	};

	// Normalize data points to SVG coordinates
	const points = $derived.by(() => {
		if (!data || data.length < 2) return '';
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		return data
			.map((val, i) => {
				const x = (i / (data.length - 1)) * 100;
				const y = 28 - ((val - min) / range) * 24; // 2px padding top/bottom
				return `${x},${y}`;
			})
			.join(' ');
	});
</script>

{#if data && data.length >= 2}
	<svg viewBox="0 0 100 30" class={cn('w-16 h-5 flex-shrink-0', className)} aria-hidden="true">
		<polyline
			{points}
			fill="none"
			stroke={colorMap[color]}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
{/if}
