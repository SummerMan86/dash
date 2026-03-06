import type { DatasetId, DatasetQuery } from '$entities/dataset';
import type { DatasetIr } from '$entities/dataset';
import { ir } from '$entities/dataset';

export const PRODUCT_PERIOD_DATASETS = {
	factProductPeriod: 'wildberries.fact_product_period'
} as const satisfies Record<string, DatasetId>;

export type ProductPeriodDatasetId =
	(typeof PRODUCT_PERIOD_DATASETS)[keyof typeof PRODUCT_PERIOD_DATASETS];

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
		return Number(value);
	return undefined;
}

function asString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const s = value.trim();
	return s ? s : undefined;
}

function dateRangeWhere(filters: DatasetQuery['filters'] | undefined) {
	const from = typeof filters?.dateFrom === 'string' ? filters.dateFrom : undefined;
	const to = typeof filters?.dateTo === 'string' ? filters.dateTo : undefined;
	if (!from && !to) return undefined;

	const parts = [];
	if (from) parts.push(ir.gte(ir.col('dt'), ir.lit(from)));
	if (to) parts.push(ir.lte(ir.col('dt'), ir.lit(to)));
	return parts.length === 1 ? parts[0] : ir.and(parts);
}

function clampLimit(value: unknown, fallback: number): number {
	const n = asNumber(value);
	if (typeof n !== 'number') return fallback;
	return Math.max(0, Math.min(50_000, Math.floor(n)));
}

export function compileProductPeriodDataset(
	datasetId: ProductPeriodDatasetId,
	query: DatasetQuery
): DatasetIr {
	switch (datasetId) {
		case PRODUCT_PERIOD_DATASETS.factProductPeriod: {
			const p = (query.params ?? {}) as Record<string, unknown>;
			const f = (query.filters ?? {}) as Record<string, unknown>;
			const nmId = asNumber(p.nmId);
			const brandName = asString(p.brandName) || asString(f.brand_name);
			const subjectName = asString(p.subjectName) || asString(f.subject_name);
			const limit = clampLimit(p.limit, 1000);

			const whereParts = [];
			const dateWhere = dateRangeWhere(query.filters);
			if (dateWhere) whereParts.push(dateWhere);
			if (typeof nmId === 'number') whereParts.push(ir.eq(ir.col('nm_id'), ir.lit(nmId)));
			if (brandName) whereParts.push(ir.eq(ir.col('brand_name'), ir.lit(brandName)));
			if (subjectName)
				whereParts.push(ir.eq(ir.col('subject_name'), ir.lit(subjectName)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('nm_id') },
					{ expr: ir.col('dt') },
					{ expr: ir.col('title') },
					{ expr: ir.col('vendor_code') },
					{ expr: ir.col('brand_name') },
					{ expr: ir.col('subject_name') },
					{ expr: ir.col('main_photo') },
					{ expr: ir.col('stock_count') },
					{ expr: ir.col('stock_sum') },
					{ expr: ir.col('sale_rate_days') },
					{ expr: ir.col('avg_stock_turnover_days') },
					{ expr: ir.col('to_client_count') },
					{ expr: ir.col('from_client_count') },
					{ expr: ir.col('lost_orders_count') },
					{ expr: ir.col('lost_orders_sum') },
					{ expr: ir.col('lost_buyouts_count') },
					{ expr: ir.col('lost_buyouts_sum') },
					{ expr: ir.col('availability_status') },
					{ expr: ir.col('price_min') },
					{ expr: ir.col('price_max') },
					{ expr: ir.col('open_count') },
					{ expr: ir.col('cart_count') },
					{ expr: ir.col('order_count') },
					{ expr: ir.col('order_sum') },
					{ expr: ir.col('buyout_count') },
					{ expr: ir.col('buyout_sum') },
					{ expr: ir.col('add_to_cart_percent') },
					{ expr: ir.col('cart_to_order_percent') },
					{ expr: ir.col('buyout_percent') },
					{ expr: ir.col('add_to_wishlist_count') },
					{ expr: ir.col('product_rating') },
					{ expr: ir.col('feedback_rating') },
					{ expr: ir.col('stocks_wb') },
					{ expr: ir.col('stocks_mp') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('dt'), dir: 'desc' },
					{ expr: ir.col('nm_id'), dir: 'asc' }
				],
				limit
			};
		}
	}
}
