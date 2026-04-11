import type { DatasetId, DatasetIr, DatasetQuery } from '../../model';
import { ir } from '../../model';

export const EMIS_MART_DATASETS = {
	newsFlat: 'emis.news_flat',
	objectNewsFacts: 'emis.object_news_facts',
	objectsDim: 'emis.objects_dim',
	shipRouteVessels: 'emis.ship_route_vessels'
} as const satisfies Record<string, DatasetId>;

export type EmisMartDatasetId = (typeof EMIS_MART_DATASETS)[keyof typeof EMIS_MART_DATASETS];

function asBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		if (value === 'true') return true;
		if (value === 'false') return false;
	}
	return undefined;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
		return Number(value);
	return undefined;
}

function asString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function clampLimit(value: unknown, fallback: number): number {
	const n = asNumber(value);
	if (typeof n !== 'number') return fallback;
	return Math.max(0, Math.min(50_000, Math.floor(n)));
}

function publishedRangeWhere(query: DatasetQuery) {
	// Canonical: params (migrated pages). Fallback: filters (legacy pages).
	const bag = { ...query.filters, ...query.params } as Record<string, unknown>;
	const from = typeof bag.dateFrom === 'string' ? bag.dateFrom : undefined;
	const to = typeof bag.dateTo === 'string' ? bag.dateTo : undefined;
	if (!from && !to) return undefined;

	const parts = [];
	if (from) parts.push(ir.gte(ir.col('published_at'), ir.lit(from)));
	if (to) parts.push(ir.lte(ir.col('published_at'), ir.lit(to)));
	return parts.length === 1 ? parts[0] : ir.and(parts);
}

export function compileEmisMartDataset(
	datasetId: EmisMartDatasetId,
	query: DatasetQuery
): DatasetIr {
	const p = (query.params ?? {}) as Record<string, unknown>;
	const f = (query.filters ?? {}) as Record<string, unknown>;

	switch (datasetId) {
		case EMIS_MART_DATASETS.newsFlat: {
			const countryCode = asString(p.countryCode) || asString(f.countryCode) || asString(f.country);
			const sourceCode = asString(p.sourceCode);
			const newsType = asString(p.newsType);
			const sourceOrigin = asString(p.sourceOrigin);
			const isManual = asBoolean(p.isManual);
			const hasGeometry = asBoolean(p.hasGeometry);
			const limit = clampLimit(p.limit, 200);

			const whereParts = [];
			const rangeWhere = publishedRangeWhere(query);
			if (rangeWhere) whereParts.push(rangeWhere);
			if (countryCode) whereParts.push(ir.eq(ir.col('country_code'), ir.lit(countryCode)));
			if (sourceCode) whereParts.push(ir.eq(ir.col('source_code'), ir.lit(sourceCode)));
			if (newsType) whereParts.push(ir.eq(ir.col('news_type'), ir.lit(newsType)));
			if (sourceOrigin) whereParts.push(ir.eq(ir.col('source_origin'), ir.lit(sourceOrigin)));
			if (typeof isManual === 'boolean')
				whereParts.push(ir.eq(ir.col('is_manual'), ir.lit(isManual)));
			if (typeof hasGeometry === 'boolean') {
				whereParts.push(ir.eq(ir.col('has_geometry'), ir.lit(hasGeometry)));
			}

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('id') },
					{ expr: ir.col('title') },
					{ expr: ir.col('summary') },
					{ expr: ir.col('source_code') },
					{ expr: ir.col('source_name') },
					{ expr: ir.col('published_at') },
					{ expr: ir.col('country_code') },
					{ expr: ir.col('region') },
					{ expr: ir.col('news_type') },
					{ expr: ir.col('importance') },
					{ expr: ir.col('is_manual') },
					{ expr: ir.col('source_origin') },
					{ expr: ir.col('has_geometry') },
					{ expr: ir.col('related_objects_count') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [{ expr: ir.col('published_at'), dir: 'desc' }],
				limit
			};
		}

		case EMIS_MART_DATASETS.objectNewsFacts: {
			const objectId = asString(p.objectId);
			const newsId = asString(p.newsId);
			const objectTypeCode = asString(p.objectTypeCode);
			const sourceCode = asString(p.sourceCode);
			const countryCode = asString(p.countryCode) || asString(f.countryCode) || asString(f.country);
			const linkType = asString(p.linkType);
			const newsSourceOrigin = asString(p.newsSourceOrigin);
			const objectSourceOrigin = asString(p.objectSourceOrigin);
			const isPrimary = asBoolean(p.isPrimary);
			const limit = clampLimit(p.limit, 500);

			const whereParts = [];
			const rangeWhere = publishedRangeWhere(query);
			if (rangeWhere) whereParts.push(rangeWhere);
			if (objectId) whereParts.push(ir.eq(ir.col('object_id'), ir.lit(objectId)));
			if (newsId) whereParts.push(ir.eq(ir.col('news_id'), ir.lit(newsId)));
			if (objectTypeCode)
				whereParts.push(ir.eq(ir.col('object_type_code'), ir.lit(objectTypeCode)));
			if (sourceCode) whereParts.push(ir.eq(ir.col('source_code'), ir.lit(sourceCode)));
			if (countryCode) whereParts.push(ir.eq(ir.col('object_country_code'), ir.lit(countryCode)));
			if (linkType) whereParts.push(ir.eq(ir.col('link_type'), ir.lit(linkType)));
			if (newsSourceOrigin) {
				whereParts.push(ir.eq(ir.col('news_source_origin'), ir.lit(newsSourceOrigin)));
			}
			if (objectSourceOrigin) {
				whereParts.push(ir.eq(ir.col('object_source_origin'), ir.lit(objectSourceOrigin)));
			}
			if (typeof isPrimary === 'boolean')
				whereParts.push(ir.eq(ir.col('is_primary'), ir.lit(isPrimary)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('link_id') },
					{ expr: ir.col('news_id') },
					{ expr: ir.col('news_title') },
					{ expr: ir.col('object_id') },
					{ expr: ir.col('object_name') },
					{ expr: ir.col('object_type_code') },
					{ expr: ir.col('object_type_name') },
					{ expr: ir.col('object_country_code') },
					{ expr: ir.col('published_at') },
					{ expr: ir.col('source_code') },
					{ expr: ir.col('source_name') },
					{ expr: ir.col('link_type') },
					{ expr: ir.col('is_primary') },
					{ expr: ir.col('confidence') },
					{ expr: ir.col('news_source_origin') },
					{ expr: ir.col('object_source_origin') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('published_at'), dir: 'desc' },
					{ expr: ir.col('object_id'), dir: 'asc' }
				],
				limit
			};
		}

		case EMIS_MART_DATASETS.objectsDim: {
			const countryCode = asString(p.countryCode) || asString(f.countryCode) || asString(f.country);
			const objectTypeCode = asString(p.objectTypeCode);
			const status = asString(p.status);
			const sourceOrigin = asString(p.sourceOrigin);
			const geometryType = asString(p.geometryType);
			const limit = clampLimit(p.limit, 500);

			const whereParts = [];
			if (countryCode) whereParts.push(ir.eq(ir.col('country_code'), ir.lit(countryCode)));
			if (objectTypeCode)
				whereParts.push(ir.eq(ir.col('object_type_code'), ir.lit(objectTypeCode)));
			if (status) whereParts.push(ir.eq(ir.col('status'), ir.lit(status)));
			if (sourceOrigin) whereParts.push(ir.eq(ir.col('source_origin'), ir.lit(sourceOrigin)));
			if (geometryType) whereParts.push(ir.eq(ir.col('geometry_type'), ir.lit(geometryType)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('id') },
					{ expr: ir.col('external_id') },
					{ expr: ir.col('name') },
					{ expr: ir.col('name_en') },
					{ expr: ir.col('object_type_code') },
					{ expr: ir.col('object_type_name') },
					{ expr: ir.col('country_code') },
					{ expr: ir.col('country_name_ru') },
					{ expr: ir.col('country_name_en') },
					{ expr: ir.col('region') },
					{ expr: ir.col('status') },
					{ expr: ir.col('operator_name') },
					{ expr: ir.col('source_origin') },
					{ expr: ir.col('geometry_type') },
					{ expr: ir.col('centroid_lon') },
					{ expr: ir.col('centroid_lat') },
					{ expr: ir.col('created_at') },
					{ expr: ir.col('updated_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('object_type_code'), dir: 'asc' },
					{ expr: ir.col('name'), dir: 'asc' }
				],
				limit
			};
		}

		case EMIS_MART_DATASETS.shipRouteVessels: {
			const flag = asString(p.flag);
			const vesselType = asString(p.vesselType);
			const limit = clampLimit(p.limit, 1000);

			const whereParts = [];
			const from = typeof query.filters?.dateFrom === 'string' ? query.filters.dateFrom : undefined;
			const to = typeof query.filters?.dateTo === 'string' ? query.filters.dateTo : undefined;

			if (from) whereParts.push(ir.gte(ir.col('last_fetched_at'), ir.lit(from)));
			if (to) whereParts.push(ir.lte(ir.col('last_fetched_at'), ir.lit(to)));
			if (flag) whereParts.push(ir.eq(ir.col('flag'), ir.lit(flag)));
			if (vesselType) whereParts.push(ir.eq(ir.col('vessel_type'), ir.lit(vesselType)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('ship_hbk_id') },
					{ expr: ir.col('ship_id') },
					{ expr: ir.col('imo') },
					{ expr: ir.col('mmsi') },
					{ expr: ir.col('vessel_name') },
					{ expr: ir.col('vessel_type') },
					{ expr: ir.col('flag') },
					{ expr: ir.col('callsign') },
					{ expr: ir.col('first_fetched_at') },
					{ expr: ir.col('last_fetched_at') },
					{ expr: ir.col('last_route_date_utc') },
					{ expr: ir.col('points_count') },
					{ expr: ir.col('route_days_count') },
					{ expr: ir.col('last_latitude') },
					{ expr: ir.col('last_longitude') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('last_fetched_at'), dir: 'desc' },
					{ expr: ir.col('ship_hbk_id'), dir: 'asc' }
				],
				limit
			};
		}
	}
}
