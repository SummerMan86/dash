import type { JsonValue } from '@dashboard-builder/platform-datasets';
import type {
	ProductSummary,
	ProductAnalyticsKpi,
	DailyTotal,
	FunnelData,
	FactProductPeriodRow
} from './types';
import { asFactRow } from './types';

function num(v: unknown): number {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string') {
		const n = parseFloat(v);
		if (Number.isFinite(n)) return n;
	}
	return 0;
}

// Negative values are ETL sentinel (-3 = "data unavailable"). Clamp to 0.
function numPos(v: unknown): number {
	return Math.max(0, num(v));
}

function str(v: unknown): string {
	return typeof v === 'string' ? v : '';
}

/**
 * Aggregate rows by nm_id.
 * Latest date provides snapshot data; sums accumulated across all dates.
 */
export function aggregateProducts(rows: Record<string, JsonValue>[]): ProductSummary[] {
	if (!rows.length) return [];

	const byProduct = new Map<number, FactProductPeriodRow[]>();
	for (const raw of rows) {
		const row = asFactRow(raw);
		const nmId = num(row.nm_id);
		if (!nmId) continue;
		let arr = byProduct.get(nmId);
		if (!arr) {
			arr = [];
			byProduct.set(nmId, arr);
		}
		arr.push(row);
	}

	const products: ProductSummary[] = [];

	for (const [nmId, productRows] of byProduct) {
		// Latest date first for snapshot
		productRows.sort((a, b) => str(b.dt).localeCompare(str(a.dt)));
		const latest = productRows[0];

		// Accumulate in chronological order
		let open_count = 0,
			cart_count = 0,
			order_count = 0,
			order_sum = 0;
		let buyout_count = 0,
			buyout_sum = 0;
		let lost_orders_count = 0,
			lost_orders_sum = 0;
		let lost_buyouts_count = 0,
			lost_buyouts_sum = 0;
		let to_client_count = 0,
			from_client_count = 0;
		let add_to_wishlist_count = 0;

		const dailyOrders: number[] = [];
		const dailyRevenue: number[] = [];

		const chronological = [...productRows].reverse();
		for (const r of chronological) {
			open_count += num(r.open_count);
			cart_count += num(r.cart_count);
			order_count += num(r.order_count);
			order_sum += num(r.order_sum);
			buyout_count += num(r.buyout_count);
			buyout_sum += num(r.buyout_sum);
			lost_orders_count += numPos(r.lost_orders_count);
			lost_orders_sum += numPos(r.lost_orders_sum);
			lost_buyouts_count += numPos(r.lost_buyouts_count);
			lost_buyouts_sum += numPos(r.lost_buyouts_sum);
			to_client_count += num(r.to_client_count);
			from_client_count += num(r.from_client_count);
			add_to_wishlist_count += num(r.add_to_wishlist_count);
			dailyOrders.push(num(r.order_count));
			dailyRevenue.push(num(r.order_sum));
		}

		const add_to_cart_percent = open_count > 0 ? (cart_count / open_count) * 100 : 0;
		const cart_to_order_percent = cart_count > 0 ? (order_count / cart_count) * 100 : 0;
		const buyout_percent = order_count > 0 ? (buyout_count / order_count) * 100 : 0;

		products.push({
			nm_id: nmId,
			title: str(latest.title),
			vendor_code: str(latest.vendor_code),
			brand_name: str(latest.brand_name),
			subject_name: str(latest.subject_name),
			main_photo: str(latest.main_photo),

			stock_count: num(latest.stock_count),
			stocks_wb: num(latest.stocks_wb),
			stocks_mp: num(latest.stocks_mp),
			stock_sum: num(latest.stock_sum),
			availability_status: str(latest.availability_status),
			price_min: num(latest.price_min),
			price_max: num(latest.price_max),
			product_rating: num(latest.product_rating),
			feedback_rating: num(latest.feedback_rating),
			sale_rate_days: num(latest.sale_rate_days),
			avg_stock_turnover_days: num(latest.avg_stock_turnover_days),

			open_count,
			cart_count,
			order_count,
			order_sum,
			buyout_count,
			buyout_sum,
			lost_orders_count,
			lost_orders_sum,
			lost_buyouts_count,
			lost_buyouts_sum,
			to_client_count,
			from_client_count,
			add_to_wishlist_count,

			add_to_cart_percent,
			cart_to_order_percent,
			buyout_percent,

			daily_orders: dailyOrders,
			daily_revenue: dailyRevenue
		});
	}

	return products;
}

/**
 * Calculate KPI totals from product summaries.
 */
export function calculateKpi(products: ProductSummary[]): ProductAnalyticsKpi {
	if (!products.length) {
		return {
			totalRevenue: 0,
			totalOrders: 0,
			totalBuyouts: 0,
			avgBuyoutPercent: 0,
			totalLostSales: 0,
			avgRating: 0,
			totalProducts: 0,
			dataDate: ''
		};
	}

	let totalRevenue = 0,
		totalOrders = 0,
		totalBuyouts = 0;
	let totalLostSales = 0;
	let ratingSum = 0,
		ratingCount = 0;
	let buyoutPctSum = 0,
		buyoutPctCount = 0;

	for (const p of products) {
		// WB revenue = buyout_sum (confirmed payments after returns, not order_sum)
		totalRevenue += p.buyout_sum;
		totalOrders += p.order_count;
		totalBuyouts += p.buyout_count;
		totalLostSales += p.lost_orders_sum;
		if (p.product_rating > 0) {
			ratingSum += p.product_rating;
			ratingCount++;
		}
		if (p.order_count > 0) {
			buyoutPctSum += p.buyout_percent;
			buyoutPctCount++;
		}
	}

	return {
		totalRevenue,
		totalOrders,
		totalBuyouts,
		avgBuyoutPercent: buyoutPctCount > 0 ? buyoutPctSum / buyoutPctCount : 0,
		totalLostSales,
		avgRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
		totalProducts: products.length,
		dataDate: ''
	};
}

/**
 * Aggregate daily totals across all products.
 */
export function getDailyTotals(rows: Record<string, JsonValue>[]): DailyTotal[] {
	if (!rows.length) return [];

	const byDate = new Map<string, DailyTotal>();
	for (const raw of rows) {
		const row = asFactRow(raw);
		const dt = str(row.dt);
		if (!dt) continue;
		let day = byDate.get(dt);
		if (!day) {
			day = {
				date: dt,
				order_count: 0,
				order_sum: 0,
				buyout_count: 0,
				buyout_sum: 0,
				open_count: 0
			};
			byDate.set(dt, day);
		}
		day.order_count += num(row.order_count);
		day.order_sum += num(row.order_sum);
		day.buyout_count += num(row.buyout_count);
		day.buyout_sum += num(row.buyout_sum);
		day.open_count += num(row.open_count);
	}

	return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Build conversion funnel data.
 */
export function buildFunnelData(products: ProductSummary[]): FunnelData {
	let views = 0,
		cart = 0,
		orders = 0,
		buyouts = 0;
	for (const p of products) {
		views += p.open_count;
		cart += p.cart_count;
		orders += p.order_count;
		buyouts += p.buyout_count;
	}
	return { views, cart, orders, buyouts };
}

/**
 * Get max date from rows.
 */
export function getMaxDate(rows: Record<string, JsonValue>[]): string {
	let max = '';
	for (const r of rows) {
		const dt = str(r.dt);
		if (dt > max) max = dt;
	}
	return max;
}

/**
 * Get unique brands sorted.
 */
export function getUniqueBrands(rows: Record<string, JsonValue>[]): string[] {
	const set = new Set<string>();
	for (const r of rows) {
		const b = str(r.brand_name);
		if (b) set.add(b);
	}
	return Array.from(set).sort();
}

/**
 * Get unique subjects sorted.
 */
export function getUniqueSubjects(rows: Record<string, JsonValue>[]): string[] {
	const set = new Set<string>();
	for (const r of rows) {
		const s = str(r.subject_name);
		if (s) set.add(s);
	}
	return Array.from(set).sort();
}
