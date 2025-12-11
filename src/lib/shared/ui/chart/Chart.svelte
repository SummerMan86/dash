<!--
  Chart Component - ECharts wrapper with Carbon Design System integration

  Features:
  - Reactive chart updates when options change
  - Automatic resize handling
  - Carbon DS color palette integration
  - Responsive design
  - Proper cleanup on unmount

  Usage:
  <Chart options={chartOptions} class="h-96" />
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as echarts from 'echarts';
	import type { EChartsOption } from 'echarts';
	import { cn } from '$shared/styles/utils';

	interface Props {
		options: EChartsOption;
		class?: string;
	}

	let { options, class: className }: Props = $props();

	let chartContainer: HTMLDivElement;
	let chartInstance: echarts.ECharts | null = null;

	// Carbon Design System color palette for charts
	const carbonColors = {
		blue: ['#0f62fe', '#4589ff', '#78a9ff', '#a6c8ff'],
		purple: ['#8a3ffc', '#a56eff', '#be95ff', '#d4bbff'],
		teal: ['#08bdba', '#3ddbd9', '#3ddbd9', '#9ef0f0'],
		magenta: ['#d02670', '#ee5396', '#ff7eb6', '#ffafd2'],
		red: ['#da1e28', '#fa4d56', '#ff8389', '#ffb3b8'],
		green: ['#24a148', '#42be65', '#6fdc8c', '#a7f0ba'],
		gray: ['#525252', '#878787', '#a8a8a8', '#c6c6c6']
	};

	// Default color palette for charts
	const defaultColorPalette = [
		carbonColors.blue[0],
		carbonColors.purple[0],
		carbonColors.teal[0],
		carbonColors.magenta[0],
		carbonColors.green[0],
		carbonColors.red[0]
	];

	// Merge Carbon DS colors into options
	function mergeWithCarbonTheme(opts: EChartsOption): EChartsOption {
		return {
			color: defaultColorPalette,
			backgroundColor: 'transparent',
			textStyle: {
				fontFamily:
					'var(--font-family)',
				fontSize: 14
			},
			...opts,
			// Ensure grid has proper padding
			grid: {
				left: '3%',
				right: '4%',
				bottom: '3%',
				top: '10%',
				containLabel: true,
				...(opts.grid || {})
			}
		};
	}

	onMount(() => {
		// Initialize chart
		chartInstance = echarts.init(chartContainer);

		// Set initial options with Carbon theme
		const themedOptions = mergeWithCarbonTheme(options);
		chartInstance.setOption(themedOptions);

		// Handle window resize
		const resizeHandler = () => {
			chartInstance?.resize();
		};
		window.addEventListener('resize', resizeHandler);

		// Cleanup
		return () => {
			window.removeEventListener('resize', resizeHandler);
		};
	});

	// Watch for options changes and update chart
	$effect(() => {
		if (chartInstance && options) {
			const themedOptions = mergeWithCarbonTheme(options);
			chartInstance.setOption(themedOptions, true);
		}
	});

	onDestroy(() => {
		chartInstance?.dispose();
	});
</script>

<div bind:this={chartContainer} class={cn('w-full h-full min-h-[300px]', className)} />
