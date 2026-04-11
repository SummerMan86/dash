import { describe, it, expect, vi } from 'vitest';
import type { DailyTotal, FunnelData } from './types';

// Mock @dashboard-builder/platform-ui to avoid Svelte file parsing in Node
vi.mock('@dashboard-builder/platform-ui', () => ({
	lineChartPreset: {
		grid: { top: 10, right: 10, bottom: 30, left: 50, containLabel: true },
		tooltip: { trigger: 'axis' },
		xAxis: { type: 'category', boundaryGap: false },
		yAxis: { type: 'value' }
	},
	getLineSeries: (colorIndex: number, options?: { showArea?: boolean }) => ({
		type: 'line',
		smooth: true,
		symbol: 'none',
		lineStyle: { width: 2, color: `chart-${colorIndex}` },
		itemStyle: { color: `chart-${colorIndex}` },
		...(options?.showArea !== false && { areaStyle: { color: `gradient-${colorIndex}` } })
	}),
	getChartPalette: () => ['#color1', '#color2', '#color3', '#color4', '#color5'],
	resolveCssColorVar: (name: string) => `resolved(${name})`
}));

// Mock @dashboard-builder/platform-core for formatCompact
vi.mock('@dashboard-builder/platform-core', () => ({
	formatCompact: (v: number) => String(v)
}));

// Import AFTER mocks are set up
const { buildSalesChartOptions, buildFunnelChartOptions } = await import('./view-model');

// --- buildSalesChartOptions ---
describe('buildSalesChartOptions', () => {
	it('returns null for empty data', () => {
		expect(buildSalesChartOptions([])).toBeNull();
	});

	it('returns valid chart options for daily totals', () => {
		const dailyTotals: DailyTotal[] = [
			{ date: '2026-04-01', order_count: 10, order_sum: 12000, buyout_count: 8, buyout_sum: 9600, open_count: 100 },
			{ date: '2026-04-02', order_count: 15, order_sum: 18000, buyout_count: 12, buyout_sum: 14400, open_count: 150 }
		];

		const options = buildSalesChartOptions(dailyTotals);
		expect(options).not.toBeNull();
		expect(options!.series).toHaveLength(2);
		expect(options!.series[0].name).toContain('Заказы');
		expect(options!.series[1].name).toContain('Выкупы');
	});

	it('maps x-axis to date suffixes (MM-DD)', () => {
		const dailyTotals: DailyTotal[] = [
			{ date: '2026-04-01', order_count: 10, order_sum: 12000, buyout_count: 8, buyout_sum: 9600, open_count: 100 },
			{ date: '2026-04-15', order_count: 5, order_sum: 6000, buyout_count: 4, buyout_sum: 4800, open_count: 80 }
		];

		const options = buildSalesChartOptions(dailyTotals);
		expect(options!.xAxis.data).toEqual(['04-01', '04-15']);
	});

	it('maps series data correctly', () => {
		const dailyTotals: DailyTotal[] = [
			{ date: '2026-04-01', order_count: 10, order_sum: 12000, buyout_count: 8, buyout_sum: 9600, open_count: 100 }
		];

		const options = buildSalesChartOptions(dailyTotals);
		expect(options!.series[0].data).toEqual([12000]); // order_sum
		expect(options!.series[1].data).toEqual([9600]); // buyout_sum
	});

	it('includes legend with two entries', () => {
		const dailyTotals: DailyTotal[] = [
			{ date: '2026-04-01', order_count: 10, order_sum: 12000, buyout_count: 8, buyout_sum: 9600, open_count: 100 }
		];

		const options = buildSalesChartOptions(dailyTotals);
		expect(options!.legend.data).toHaveLength(2);
	});

	it('inherits grid and tooltip from lineChartPreset', () => {
		const dailyTotals: DailyTotal[] = [
			{ date: '2026-04-01', order_count: 10, order_sum: 12000, buyout_count: 8, buyout_sum: 9600, open_count: 100 }
		];

		const options = buildSalesChartOptions(dailyTotals);
		expect(options!.grid).toBeDefined();
		expect(options!.tooltip).toBeDefined();
	});
});

// --- buildFunnelChartOptions ---
describe('buildFunnelChartOptions', () => {
	it('returns null when views and orders are both zero', () => {
		const data: FunnelData = { views: 0, cart: 0, orders: 0, buyouts: 0 };
		expect(buildFunnelChartOptions(data)).toBeNull();
	});

	it('returns valid chart options for funnel data', () => {
		const data: FunnelData = { views: 1000, cart: 200, orders: 50, buyouts: 40 };
		const options = buildFunnelChartOptions(data);

		expect(options).not.toBeNull();
		expect(options!.series).toHaveLength(1);
		expect(options!.series[0].type).toBe('bar');
		expect(options!.series[0].data).toHaveLength(4);
	});

	it('uses horizontal bar layout (category on yAxis)', () => {
		const data: FunnelData = { views: 1000, cart: 200, orders: 50, buyouts: 40 };
		const options = buildFunnelChartOptions(data);

		expect(options!.yAxis.type).toBe('category');
		expect(options!.yAxis.data).toHaveLength(4);
		expect(options!.xAxis.type).toBe('value');
		expect(options!.xAxis.show).toBe(false);
	});

	it('sets xAxis max to at least 1', () => {
		const data: FunnelData = { views: 0, cart: 0, orders: 1, buyouts: 0 };
		const options = buildFunnelChartOptions(data);
		expect(options!.xAxis.max).toBeGreaterThanOrEqual(1);
	});

	it('orders funnel stages correctly', () => {
		const data: FunnelData = { views: 1000, cart: 200, orders: 50, buyouts: 40 };
		const options = buildFunnelChartOptions(data);

		expect(options!.yAxis.data).toEqual(['Просмотры', 'В корзину', 'Заказы', 'Выкупы']);
	});

	it('carries correct values in bar data', () => {
		const data: FunnelData = { views: 1000, cart: 200, orders: 50, buyouts: 40 };
		const options = buildFunnelChartOptions(data);

		const values = options!.series[0].data.map((d: { value: number }) => d.value);
		expect(values).toEqual([1000, 200, 50, 40]);
	});
});
