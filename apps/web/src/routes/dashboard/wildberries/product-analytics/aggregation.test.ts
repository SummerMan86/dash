import { describe, it, expect } from 'vitest';
import {
	aggregateProducts,
	calculateKpi,
	getMaxDate,
	getDailyTotals,
	buildFunnelData,
	getUniqueBrands,
	getUniqueSubjects
} from './aggregation';
import type { ProductSummary } from './types';

// --- Helpers ---
function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		nm_id: 100,
		dt: '2026-04-01',
		title: 'Test Product',
		vendor_code: 'TP-001',
		brand_name: 'BrandA',
		subject_name: 'SubjectA',
		main_photo: '',
		stock_count: 50,
		stock_sum: 10000,
		sale_rate_days: 10,
		avg_stock_turnover_days: 30,
		to_client_count: 5,
		from_client_count: 2,
		lost_orders_count: 1,
		lost_orders_sum: 500,
		lost_buyouts_count: 0,
		lost_buyouts_sum: 0,
		availability_status: 'active',
		price_min: 1000,
		price_max: 1200,
		open_count: 100,
		cart_count: 20,
		order_count: 10,
		order_sum: 12000,
		buyout_count: 8,
		buyout_sum: 9600,
		add_to_cart_percent: 20,
		cart_to_order_percent: 50,
		buyout_percent: 80,
		add_to_wishlist_count: 3,
		product_rating: 4.5,
		feedback_rating: 4.2,
		stocks_wb: 30,
		stocks_mp: 20,
		...overrides
	};
}

// --- aggregateProducts ---
describe('aggregateProducts', () => {
	it('returns empty array for empty input', () => {
		expect(aggregateProducts([])).toEqual([]);
	});

	it('aggregates a single row into one product', () => {
		const rows = [makeRow()];
		const result = aggregateProducts(rows);
		expect(result).toHaveLength(1);
		expect(result[0].nm_id).toBe(100);
		expect(result[0].order_count).toBe(10);
		expect(result[0].order_sum).toBe(12000);
	});

	it('aggregates multiple rows for the same product', () => {
		const rows = [
			makeRow({ dt: '2026-04-01', order_count: 10, order_sum: 12000 }),
			makeRow({ dt: '2026-04-02', order_count: 5, order_sum: 6000 })
		];
		const result = aggregateProducts(rows);
		expect(result).toHaveLength(1);
		expect(result[0].order_count).toBe(15);
		expect(result[0].order_sum).toBe(18000);
	});

	it('keeps separate products distinct', () => {
		const rows = [makeRow({ nm_id: 100 }), makeRow({ nm_id: 200 })];
		const result = aggregateProducts(rows);
		expect(result).toHaveLength(2);
		const ids = result.map((p) => p.nm_id).sort();
		expect(ids).toEqual([100, 200]);
	});

	it('uses latest date for snapshot fields', () => {
		const rows = [
			makeRow({ dt: '2026-04-01', stock_count: 50, price_max: 1200 }),
			makeRow({ dt: '2026-04-03', stock_count: 30, price_max: 1100 }),
			makeRow({ dt: '2026-04-02', stock_count: 40, price_max: 1150 })
		];
		const result = aggregateProducts(rows);
		expect(result[0].stock_count).toBe(30); // latest date: 2026-04-03
		expect(result[0].price_max).toBe(1100);
	});

	it('builds daily_orders sparkline in chronological order', () => {
		const rows = [
			makeRow({ dt: '2026-04-03', order_count: 3 }),
			makeRow({ dt: '2026-04-01', order_count: 1 }),
			makeRow({ dt: '2026-04-02', order_count: 2 })
		];
		const result = aggregateProducts(rows);
		expect(result[0].daily_orders).toEqual([1, 2, 3]);
	});

	it('computes conversion percentages', () => {
		const rows = [makeRow({ open_count: 200, cart_count: 40, order_count: 20, buyout_count: 10 })];
		const result = aggregateProducts(rows);
		expect(result[0].add_to_cart_percent).toBe(20); // 40/200*100
		expect(result[0].cart_to_order_percent).toBe(50); // 20/40*100
		expect(result[0].buyout_percent).toBe(50); // 10/20*100
	});

	it('clamps negative lost_orders to zero', () => {
		const rows = [makeRow({ lost_orders_count: -3, lost_orders_sum: -500 })];
		const result = aggregateProducts(rows);
		expect(result[0].lost_orders_count).toBe(0);
		expect(result[0].lost_orders_sum).toBe(0);
	});

	it('skips rows with nm_id = 0 or missing', () => {
		const rows = [makeRow({ nm_id: 0 }), makeRow({ nm_id: undefined })];
		const result = aggregateProducts(rows);
		expect(result).toHaveLength(0);
	});
});

// --- calculateKpi ---
describe('calculateKpi', () => {
	it('returns zero KPI for empty input', () => {
		const kpi = calculateKpi([]);
		expect(kpi.totalRevenue).toBe(0);
		expect(kpi.totalOrders).toBe(0);
		expect(kpi.totalBuyouts).toBe(0);
		expect(kpi.avgRating).toBe(0);
		expect(kpi.totalProducts).toBe(0);
	});

	it('aggregates revenue and orders from products', () => {
		const products: ProductSummary[] = [
			{ buyout_sum: 10000, order_count: 5, buyout_count: 4, lost_orders_sum: 100, product_rating: 4.5, buyout_percent: 80 } as ProductSummary,
			{ buyout_sum: 20000, order_count: 10, buyout_count: 8, lost_orders_sum: 200, product_rating: 4.0, buyout_percent: 80 } as ProductSummary
		];
		const kpi = calculateKpi(products);
		expect(kpi.totalRevenue).toBe(30000);
		expect(kpi.totalOrders).toBe(15);
		expect(kpi.totalBuyouts).toBe(12);
		expect(kpi.totalLostSales).toBe(300);
		expect(kpi.avgRating).toBeCloseTo(4.25, 2);
		expect(kpi.totalProducts).toBe(2);
	});

	it('excludes zero-rated products from average rating', () => {
		const products: ProductSummary[] = [
			{ buyout_sum: 0, order_count: 5, buyout_count: 0, lost_orders_sum: 0, product_rating: 0, buyout_percent: 50 } as ProductSummary,
			{ buyout_sum: 0, order_count: 5, buyout_count: 0, lost_orders_sum: 0, product_rating: 4.0, buyout_percent: 50 } as ProductSummary
		];
		const kpi = calculateKpi(products);
		expect(kpi.avgRating).toBe(4.0);
	});
});

// --- getDailyTotals ---
describe('getDailyTotals', () => {
	it('returns empty for no rows', () => {
		expect(getDailyTotals([])).toEqual([]);
	});

	it('aggregates by date and sorts chronologically', () => {
		const rows = [
			makeRow({ nm_id: 100, dt: '2026-04-02', order_count: 5, order_sum: 6000 }),
			makeRow({ nm_id: 200, dt: '2026-04-02', order_count: 3, order_sum: 4000 }),
			makeRow({ nm_id: 100, dt: '2026-04-01', order_count: 2, order_sum: 3000 })
		];
		const result = getDailyTotals(rows);
		expect(result).toHaveLength(2);
		expect(result[0].date).toBe('2026-04-01');
		expect(result[0].order_count).toBe(2);
		expect(result[1].date).toBe('2026-04-02');
		expect(result[1].order_count).toBe(8); // 5+3
		expect(result[1].order_sum).toBe(10000);
	});
});

// --- buildFunnelData ---
describe('buildFunnelData', () => {
	it('returns zeros for empty input', () => {
		expect(buildFunnelData([])).toEqual({ views: 0, cart: 0, orders: 0, buyouts: 0 });
	});

	it('sums across products', () => {
		const products = [
			{ open_count: 100, cart_count: 20, order_count: 10, buyout_count: 5 } as ProductSummary,
			{ open_count: 200, cart_count: 40, order_count: 20, buyout_count: 10 } as ProductSummary
		];
		const result = buildFunnelData(products);
		expect(result).toEqual({ views: 300, cart: 60, orders: 30, buyouts: 15 });
	});
});

// --- getMaxDate ---
describe('getMaxDate', () => {
	it('returns empty string for no rows', () => {
		expect(getMaxDate([])).toBe('');
	});

	it('returns the latest date', () => {
		const rows = [
			makeRow({ dt: '2026-04-01' }),
			makeRow({ dt: '2026-04-03' }),
			makeRow({ dt: '2026-04-02' })
		];
		expect(getMaxDate(rows)).toBe('2026-04-03');
	});
});

// --- getUniqueBrands ---
describe('getUniqueBrands', () => {
	it('returns empty for no rows', () => {
		expect(getUniqueBrands([])).toEqual([]);
	});

	it('returns sorted unique brands', () => {
		const rows = [
			makeRow({ brand_name: 'Zeta' }),
			makeRow({ brand_name: 'Alpha' }),
			makeRow({ brand_name: 'Zeta' }),
			makeRow({ brand_name: 'Beta' })
		];
		expect(getUniqueBrands(rows)).toEqual(['Alpha', 'Beta', 'Zeta']);
	});

	it('skips empty brand names', () => {
		const rows = [makeRow({ brand_name: '' }), makeRow({ brand_name: 'X' })];
		expect(getUniqueBrands(rows)).toEqual(['X']);
	});
});

// --- getUniqueSubjects ---
describe('getUniqueSubjects', () => {
	it('returns sorted unique subjects', () => {
		const rows = [
			makeRow({ subject_name: 'Cat B' }),
			makeRow({ subject_name: 'Cat A' }),
			makeRow({ subject_name: 'Cat B' })
		];
		expect(getUniqueSubjects(rows)).toEqual(['Cat A', 'Cat B']);
	});
});
