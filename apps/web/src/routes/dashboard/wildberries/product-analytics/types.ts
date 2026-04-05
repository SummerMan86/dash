import type { JsonValue } from '@dashboard-builder/platform-datasets';

export type FactProductPeriodRow = {
	nm_id: number;
	dt: string;
	title: string;
	vendor_code: string;
	brand_name: string;
	subject_name: string;
	main_photo: string;
	stock_count: number;
	stock_sum: number;
	sale_rate_days: number;
	avg_stock_turnover_days: number;
	to_client_count: number;
	from_client_count: number;
	lost_orders_count: number;
	lost_orders_sum: number;
	lost_buyouts_count: number;
	lost_buyouts_sum: number;
	availability_status: string;
	price_min: number;
	price_max: number;
	open_count: number;
	cart_count: number;
	order_count: number;
	order_sum: number;
	buyout_count: number;
	buyout_sum: number;
	add_to_cart_percent: number;
	cart_to_order_percent: number;
	buyout_percent: number;
	add_to_wishlist_count: number;
	product_rating: number;
	feedback_rating: number;
	stocks_wb: number;
	stocks_mp: number;
};

export function asFactRow(row: Record<string, JsonValue>): FactProductPeriodRow {
	return row as unknown as FactProductPeriodRow;
}

export type ProductSummary = {
	nm_id: number;
	title: string;
	vendor_code: string;
	brand_name: string;
	subject_name: string;
	main_photo: string;

	// Latest snapshot
	stock_count: number;
	stocks_wb: number;
	stocks_mp: number;
	stock_sum: number;
	availability_status: string;
	price_min: number;
	price_max: number;
	product_rating: number;
	feedback_rating: number;
	sale_rate_days: number;
	avg_stock_turnover_days: number;

	// Aggregated over period
	open_count: number;
	cart_count: number;
	order_count: number;
	order_sum: number;
	buyout_count: number;
	buyout_sum: number;
	lost_orders_count: number;
	lost_orders_sum: number;
	lost_buyouts_count: number;
	lost_buyouts_sum: number;
	to_client_count: number;
	from_client_count: number;
	add_to_wishlist_count: number;

	// Computed conversions
	add_to_cart_percent: number;
	cart_to_order_percent: number;
	buyout_percent: number;

	// Sparkline data (chronological)
	daily_orders: number[];
	daily_revenue: number[];
};

export type ProductAnalyticsKpi = {
	totalRevenue: number;
	totalOrders: number;
	totalBuyouts: number;
	avgBuyoutPercent: number;
	totalLostSales: number;
	avgRating: number;
	totalProducts: number;
	dataDate: string;
};

export type DailyTotal = {
	date: string;
	order_count: number;
	order_sum: number;
	buyout_count: number;
	buyout_sum: number;
	open_count: number;
};

export type FunnelData = {
	views: number;
	cart: number;
	orders: number;
	buyouts: number;
};
