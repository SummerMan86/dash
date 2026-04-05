import type { DatasetId, DatasetQuery } from '@dashboard-builder/platform-datasets';
import type { DatasetIr } from '@dashboard-builder/platform-datasets';
import { ir } from '@dashboard-builder/platform-datasets';

export const WILDBERRIES_DATASETS = {
	factProductOfficeDay: 'wildberries.fact_product_office_day'
} as const satisfies Record<string, DatasetId>;

export type WildberriesDatasetId = (typeof WILDBERRIES_DATASETS)[keyof typeof WILDBERRIES_DATASETS];

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

export function compileWildberriesDataset(
	datasetId: WildberriesDatasetId,
	query: DatasetQuery
): DatasetIr {
	switch (datasetId) {
		case WILDBERRIES_DATASETS.factProductOfficeDay: {
			const p = (query.params ?? {}) as Record<string, unknown>;
			const nmId = asNumber(p.nmId);
			const officeId = asNumber(p.officeId);
			const chrtId = asNumber(p.chrtId);
			const regionName = asString(p.regionName);
			const limit = clampLimit(p.limit, 500);

			const whereParts = [];
			const dateWhere = dateRangeWhere(query.filters);
			if (dateWhere) whereParts.push(dateWhere);
			if (typeof nmId === 'number') whereParts.push(ir.eq(ir.col('nm_id'), ir.lit(nmId)));
			if (typeof officeId === 'number')
				whereParts.push(ir.eq(ir.col('office_id'), ir.lit(officeId)));
			if (typeof chrtId === 'number') whereParts.push(ir.eq(ir.col('chrt_id'), ir.lit(chrtId)));
			if (regionName) whereParts.push(ir.eq(ir.col('region_name'), ir.lit(regionName)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('dt') },
					{ expr: ir.col('nm_id') },
					{ expr: ir.col('chrt_id') },
					{ expr: ir.col('office_id') },
					{ expr: ir.col('office_name') },
					{ expr: ir.col('region_name') },
					{ expr: ir.col('size_name') },
					{ expr: ir.col('stock_count') },
					{ expr: ir.col('to_client_count') },
					{ expr: ir.col('from_client_count') },
					{ expr: ir.col('stock_sum') },
					{ expr: ir.col('buyout_count') },
					{ expr: ir.col('buyout_sum') },
					{ expr: ir.col('buyout_percent') },
					{ expr: ir.col('sale_rate_days') },
					{ expr: ir.col('avg_stock_turnover_days') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('dt'), dir: 'desc' },
					{ expr: ir.col('office_id'), dir: 'asc' },
					{ expr: ir.col('nm_id'), dir: 'asc' }
				],
				limit
			};
		}
	}
}
