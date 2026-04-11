import { describe, it, expect } from 'vitest';
import {
	analyzeProduct,
	getSeverityColor,
	getSeverityBgColor,
	getRecommendationIcon,
	getWorstSeverity,
	getSeverityLabel,
	type Recommendation
} from './recommendations';
import type { ProductSummary } from './types';

function makeProduct(overrides: Partial<ProductSummary> = {}): ProductSummary {
	return {
		nm_id: 100,
		title: 'Test Product',
		vendor_code: 'TP-001',
		brand_name: 'Brand',
		subject_name: 'Subject',
		main_photo: '',
		stock_count: 50,
		stocks_wb: 30,
		stocks_mp: 20,
		stock_sum: 10000,
		availability_status: 'active',
		price_min: 1000,
		price_max: 1200,
		product_rating: 4.5,
		feedback_rating: 4.2,
		sale_rate_days: 10,
		avg_stock_turnover_days: 30,
		open_count: 100,
		cart_count: 20,
		order_count: 10,
		order_sum: 12000,
		buyout_count: 8,
		buyout_sum: 9600,
		lost_orders_count: 0,
		lost_orders_sum: 0,
		lost_buyouts_count: 0,
		lost_buyouts_sum: 0,
		to_client_count: 5,
		from_client_count: 2,
		add_to_wishlist_count: 3,
		add_to_cart_percent: 20,
		cart_to_order_percent: 50,
		buyout_percent: 80,
		daily_orders: [1, 2, 3],
		daily_revenue: [100, 200, 300],
		...overrides
	};
}

// --- analyzeProduct ---
describe('analyzeProduct', () => {
	it('returns "healthy" for a good product', () => {
		// A product with decent metrics that triggers no warnings
		const product = makeProduct({
			stock_count: 50,
			lost_orders_sum: 0,
			buyout_percent: 50,
			add_to_cart_percent: 10,
			product_rating: 4.5,
			avg_stock_turnover_days: 30,
			open_count: 100
		});
		const recs = analyzeProduct(product);
		expect(recs).toHaveLength(1);
		expect(recs[0].type).toBe('healthy');
		expect(recs[0].severity).toBe('success');
	});

	it('detects out-of-stock (critical)', () => {
		const product = makeProduct({ stock_count: 0, lost_orders_sum: 5000 });
		const recs = analyzeProduct(product);
		const restock = recs.find((r) => r.type === 'restock');
		expect(restock).toBeDefined();
		expect(restock!.severity).toBe('critical');
		expect(restock!.description).toContain('5');
	});

	it('detects out-of-stock without lost orders', () => {
		const product = makeProduct({ stock_count: 0, lost_orders_sum: 0 });
		const recs = analyzeProduct(product);
		const restock = recs.find((r) => r.type === 'restock');
		expect(restock).toBeDefined();
		expect(restock!.description).toContain('нет в наличии');
	});

	it('detects lost sales when stock > 0', () => {
		const product = makeProduct({ stock_count: 10, lost_orders_sum: 3000, lost_orders_count: 5 });
		const recs = analyzeProduct(product);
		const lost = recs.find((r) => r.type === 'lost_sales');
		expect(lost).toBeDefined();
		expect(lost!.severity).toBe('warning');
	});

	it('does NOT flag lost_sales when stock is 0 (restock takes priority)', () => {
		const product = makeProduct({ stock_count: 0, lost_orders_sum: 3000, lost_orders_count: 5 });
		const recs = analyzeProduct(product);
		const lost = recs.find((r) => r.type === 'lost_sales');
		expect(lost).toBeUndefined();
	});

	it('detects price_up opportunity (high buyout)', () => {
		const product = makeProduct({ buyout_percent: 75, order_count: 10 });
		const recs = analyzeProduct(product);
		const priceUp = recs.find((r) => r.type === 'price_up');
		expect(priceUp).toBeDefined();
		expect(priceUp!.severity).toBe('info');
	});

	it('does NOT flag price_up with low order volume', () => {
		const product = makeProduct({ buyout_percent: 75, order_count: 3 });
		const recs = analyzeProduct(product);
		const priceUp = recs.find((r) => r.type === 'price_up');
		expect(priceUp).toBeUndefined();
	});

	it('detects price_down (low cart conversion + decent views)', () => {
		const product = makeProduct({ add_to_cart_percent: 2, open_count: 100 });
		const recs = analyzeProduct(product);
		const priceDown = recs.find((r) => r.type === 'price_down');
		expect(priceDown).toBeDefined();
		expect(priceDown!.severity).toBe('warning');
	});

	it('detects listing optimization opportunity', () => {
		const product = makeProduct({ add_to_cart_percent: 5, open_count: 50 });
		const recs = analyzeProduct(product);
		const optimize = recs.find((r) => r.type === 'optimize_listing');
		expect(optimize).toBeDefined();
		expect(optimize!.severity).toBe('info');
	});

	it('detects low product rating (warning for < 4.0)', () => {
		const product = makeProduct({ product_rating: 3.5 });
		const recs = analyzeProduct(product);
		const quality = recs.find((r) => r.type === 'review_quality');
		expect(quality).toBeDefined();
		expect(quality!.severity).toBe('warning');
	});

	it('detects very low product rating (critical for < 3.0)', () => {
		const product = makeProduct({ product_rating: 2.5 });
		const recs = analyzeProduct(product);
		const quality = recs.find((r) => r.type === 'review_quality');
		expect(quality).toBeDefined();
		expect(quality!.severity).toBe('critical');
	});

	it('detects overstock (slow turnover)', () => {
		const product = makeProduct({ avg_stock_turnover_days: 120, stock_count: 50, stock_sum: 50000 });
		const recs = analyzeProduct(product);
		const overstock = recs.find((r) => r.type === 'overstock');
		expect(overstock).toBeDefined();
		expect(overstock!.severity).toBe('warning');
	});

	it('detects promotion opportunity (high rating, low views)', () => {
		const product = makeProduct({
			product_rating: 4.8,
			open_count: 10,
			add_to_cart_percent: 20 // avoid triggering listing optimization
		});
		const recs = analyzeProduct(product);
		const promote = recs.find((r) => r.type === 'promote');
		expect(promote).toBeDefined();
		expect(promote!.severity).toBe('info');
	});

	it('sorts recommendations by severity (critical first)', () => {
		const product = makeProduct({
			stock_count: 0,
			lost_orders_sum: 5000,
			product_rating: 2.5
		});
		const recs = analyzeProduct(product);
		expect(recs.length).toBeGreaterThan(1);
		// First recommendation should be critical
		expect(recs[0].severity).toBe('critical');
	});
});

// --- Utility functions ---
describe('getSeverityColor', () => {
	it('returns correct CSS classes', () => {
		expect(getSeverityColor('critical')).toBe('text-error');
		expect(getSeverityColor('warning')).toBe('text-warning');
		expect(getSeverityColor('info')).toBe('text-info');
		expect(getSeverityColor('success')).toBe('text-success');
	});
});

describe('getSeverityBgColor', () => {
	it('returns correct background classes', () => {
		expect(getSeverityBgColor('critical')).toBe('bg-error-muted');
		expect(getSeverityBgColor('warning')).toBe('bg-warning-muted');
		expect(getSeverityBgColor('info')).toBe('bg-info-muted');
		expect(getSeverityBgColor('success')).toBe('bg-success-muted');
	});
});

describe('getRecommendationIcon', () => {
	it('returns a string for each type', () => {
		const types = [
			'restock',
			'lost_sales',
			'price_up',
			'price_down',
			'promote',
			'optimize_listing',
			'review_quality',
			'overstock',
			'healthy'
		] as const;
		for (const t of types) {
			expect(typeof getRecommendationIcon(t)).toBe('string');
			expect(getRecommendationIcon(t).length).toBeGreaterThan(0);
		}
	});
});

describe('getWorstSeverity', () => {
	it('returns success for empty list', () => {
		expect(getWorstSeverity([])).toBe('success');
	});

	it('returns critical when present', () => {
		const recs: Recommendation[] = [
			{ type: 'restock', severity: 'critical', title: '', description: '' },
			{ type: 'promote', severity: 'info', title: '', description: '' }
		];
		expect(getWorstSeverity(recs)).toBe('critical');
	});

	it('returns warning when no critical', () => {
		const recs: Recommendation[] = [
			{ type: 'lost_sales', severity: 'warning', title: '', description: '' },
			{ type: 'promote', severity: 'info', title: '', description: '' }
		];
		expect(getWorstSeverity(recs)).toBe('warning');
	});

	it('returns info when only info/success', () => {
		const recs: Recommendation[] = [
			{ type: 'promote', severity: 'info', title: '', description: '' }
		];
		expect(getWorstSeverity(recs)).toBe('info');
	});
});

describe('getSeverityLabel', () => {
	it('returns Russian labels', () => {
		expect(getSeverityLabel('critical')).toBe('Критично');
		expect(getSeverityLabel('warning')).toBe('Важно');
		expect(getSeverityLabel('info')).toBe('Совет');
		expect(getSeverityLabel('success')).toBe('Норма');
	});
});
