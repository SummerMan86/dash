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
  <Chart options={chartOptions} autoResize />  <!-- for GridStack/flex containers -->
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as echarts from 'echarts';
	import type { EChartsOption } from 'echarts';
	import { cn } from '$shared/styles/utils';
	import { resolveChartPalette, resolveCssVarValue } from '$shared/styles/tokens';

	interface Props {
		options: EChartsOption;
		/** Auto-resize chart when container size changes (useful for GridStack, flex layouts) */
		autoResize?: boolean;
		class?: string;
	}

	let { options, autoResize = false, class: className }: Props = $props();

	let chartContainer: HTMLDivElement;
	let chartInstance: echarts.ECharts | null = null;

	let resolvedPalette: string[] = [];
	let resolvedFontFamily: string | undefined;

	// Merge Carbon DS colors into options
	function mergeWithCarbonTheme(opts: EChartsOption): EChartsOption {
		return {
			...(resolvedPalette.length ? { color: resolvedPalette } : {}),
			backgroundColor: 'transparent',
			textStyle: {
				...(resolvedFontFamily ? { fontFamily: resolvedFontFamily } : {}),
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
		resolvedPalette = resolveChartPalette();
		resolvedFontFamily = resolveCssVarValue('--font-family');

		// Initialize chart
		chartInstance = echarts.init(chartContainer);

		// Set initial options with Carbon theme
		const themedOptions = mergeWithCarbonTheme(options);
		chartInstance.setOption(themedOptions);

		// Handle container resize (only when autoResize is enabled)
		let resizeObserver: ResizeObserver | null = null;
		if (autoResize) {
			resizeObserver = new ResizeObserver(() => {
				chartInstance?.resize();
			});
			resizeObserver.observe(chartContainer);
		}

		// Handle window resize
		const resizeHandler = () => {
			chartInstance?.resize();
		};
		window.addEventListener('resize', resizeHandler);

		// Cleanup
		return () => {
			resizeObserver?.disconnect();
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

<div bind:this={chartContainer} class={cn('w-full', autoResize ? 'h-full' : 'h-full min-h-[300px]', className)}></div>
