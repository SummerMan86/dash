/**
 * Pure factory functions that produce ECharts option objects.
 * Extracted from +page.svelte $derived.by() blocks.
 */

import {
	lineChartPreset,
	getLineSeries,
	getChartPalette,
	resolveCssColorVar
} from '@dashboard-builder/platform-ui';
import { formatCompact } from '@dashboard-builder/platform-core';
import type { DailyTotal, FunnelData } from './types';

/**
 * Build ECharts options for the "Sales over time" line chart.
 * Returns `null` when there is no data to render.
 */
export function buildSalesChartOptions(
	dailyTotals: DailyTotal[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> | null {
	if (!dailyTotals.length) return null;

	const preset = lineChartPreset;
	return {
		...preset,
		legend: {
			data: ['Заказы (\u20BD)', 'Выкупы (\u20BD)'],
			top: 0,
			textStyle: { fontSize: 11, color: resolveCssColorVar('--color-muted-foreground') }
		},
		xAxis: {
			...preset.xAxis,
			data: dailyTotals.map((d) => d.date.slice(5))
		},
		series: [
			{
				...getLineSeries(1, { showArea: true }),
				name: 'Заказы (\u20BD)',
				data: dailyTotals.map((d) => d.order_sum)
			},
			{
				...getLineSeries(2, { showArea: false }),
				name: 'Выкупы (\u20BD)',
				data: dailyTotals.map((d) => d.buyout_sum)
			}
		]
	};
}

/**
 * Build ECharts options for the horizontal funnel / bar chart.
 * Returns `null` when there is no data to render.
 */
export function buildFunnelChartOptions(
	funnelData: FunnelData
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> | null {
	if (!funnelData.views && !funnelData.orders) return null;

	const maxVal = Math.max(funnelData.views, 1);
	const palette = getChartPalette();
	const buyoutColor = resolveCssColorVar('--color-success');

	return {
		grid: { top: 10, right: 80, bottom: 10, left: 100, containLabel: false },
		tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
		xAxis: { type: 'value', show: false, max: maxVal },
		yAxis: {
			type: 'category',
			data: ['Просмотры', 'В корзину', 'Заказы', 'Выкупы'],
			inverse: true,
			axisLine: { show: false },
			axisTick: { show: false }
		},
		series: [
			{
				type: 'bar',
				data: [
					{ value: funnelData.views, itemStyle: { color: palette[0] } },
					{ value: funnelData.cart, itemStyle: { color: palette[1] } },
					{ value: funnelData.orders, itemStyle: { color: palette[2] } },
					{ value: funnelData.buyouts, itemStyle: { color: buyoutColor } }
				],
				barWidth: '55%',
				label: {
					show: true,
					position: 'right',
					formatter: (params: { value: number }) => formatCompact(params.value)
				},
				itemStyle: { borderRadius: [0, 4, 4, 0] }
			}
		]
	};
}
