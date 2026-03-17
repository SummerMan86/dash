import type { DatasetId, DatasetIr, DatasetQuery } from '$entities/dataset';
import { ir } from '$entities/dataset';

export const EMIS_SHIP_ROUTE_DATASETS = {
	shipRoutePoints: 'emis.ship_route_points',
	shipRouteSegments: 'emis.ship_route_segments'
} as const satisfies Record<string, DatasetId>;

export type EmisShipRouteDatasetId =
	(typeof EMIS_SHIP_ROUTE_DATASETS)[keyof typeof EMIS_SHIP_ROUTE_DATASETS];

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
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

function datetimeRangeWhere(
	column: 'fetched_at' | 'from_fetched_at',
	filters: DatasetQuery['filters'] | undefined
) {
	const from = typeof filters?.dateFrom === 'string' ? filters.dateFrom : undefined;
	const to = typeof filters?.dateTo === 'string' ? filters.dateTo : undefined;
	if (!from && !to) return undefined;

	const parts = [];
	if (from) parts.push(ir.gte(ir.col(column), ir.lit(from)));
	if (to) parts.push(ir.lte(ir.col(column), ir.lit(to)));
	return parts.length === 1 ? parts[0] : ir.and(parts);
}

export function compileEmisShipRouteDataset(
	datasetId: EmisShipRouteDatasetId,
	query: DatasetQuery
): DatasetIr {
	const p = (query.params ?? {}) as Record<string, unknown>;
	const shipHbkId = asNumber(p.shipHbkId);
	const shipId = asNumber(p.shipId);
	const imo = asNumber(p.imo);
	const mmsi = asNumber(p.mmsi);
	const vesselName = asString(p.vesselName);
	const routeDateUtc = asString(p.routeDateUtc);
	const limit = clampLimit(p.limit, 5000);

	switch (datasetId) {
		case EMIS_SHIP_ROUTE_DATASETS.shipRoutePoints: {
			const whereParts = [];
			const dateWhere = datetimeRangeWhere('fetched_at', query.filters);
			if (dateWhere) whereParts.push(dateWhere);
			if (typeof shipHbkId === 'number') whereParts.push(ir.eq(ir.col('ship_hbk_id'), ir.lit(shipHbkId)));
			if (typeof shipId === 'number') whereParts.push(ir.eq(ir.col('ship_id'), ir.lit(shipId)));
			if (typeof imo === 'number') whereParts.push(ir.eq(ir.col('imo'), ir.lit(imo)));
			if (typeof mmsi === 'number') whereParts.push(ir.eq(ir.col('mmsi'), ir.lit(mmsi)));
			if (vesselName) whereParts.push(ir.eq(ir.col('vessel_name'), ir.lit(vesselName)));
			if (routeDateUtc) whereParts.push(ir.eq(ir.col('route_date_utc'), ir.lit(routeDateUtc)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('route_point_id') },
					{ expr: ir.col('load_batch_id') },
					{ expr: ir.col('ship_hbk_id') },
					{ expr: ir.col('ship_id') },
					{ expr: ir.col('imo') },
					{ expr: ir.col('mmsi') },
					{ expr: ir.col('vessel_name') },
					{ expr: ir.col('vessel_type') },
					{ expr: ir.col('flag') },
					{ expr: ir.col('callsign') },
					{ expr: ir.col('route_date_utc') },
					{ expr: ir.col('point_seq_ship') },
					{ expr: ir.col('point_seq_day') },
					{ expr: ir.col('fetched_at') },
					{ expr: ir.col('loaded_at') },
					{ expr: ir.col('latitude') },
					{ expr: ir.col('longitude') },
					{ expr: ir.col('speed') },
					{ expr: ir.col('course') },
					{ expr: ir.col('heading') },
					{ expr: ir.col('prev_route_point_id') },
					{ expr: ir.col('prev_fetched_at') },
					{ expr: ir.col('prev_latitude') },
					{ expr: ir.col('prev_longitude') },
					{ expr: ir.col('gap_minutes_from_prev') },
					{ expr: ir.col('same_coordinates_as_prev') },
					{ expr: ir.col('next_route_point_id') },
					{ expr: ir.col('next_fetched_at') },
					{ expr: ir.col('next_latitude') },
					{ expr: ir.col('next_longitude') },
					{ expr: ir.col('gap_minutes_to_next') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('fetched_at'), dir: 'asc' },
					{ expr: ir.col('point_seq_ship'), dir: 'asc' }
				],
				limit
			};
		}

		case EMIS_SHIP_ROUTE_DATASETS.shipRouteSegments: {
			const whereParts = [];
			const dateWhere = datetimeRangeWhere('from_fetched_at', query.filters);
			if (dateWhere) whereParts.push(dateWhere);
			if (typeof shipHbkId === 'number') whereParts.push(ir.eq(ir.col('ship_hbk_id'), ir.lit(shipHbkId)));
			if (typeof shipId === 'number') whereParts.push(ir.eq(ir.col('ship_id'), ir.lit(shipId)));
			if (typeof imo === 'number') whereParts.push(ir.eq(ir.col('imo'), ir.lit(imo)));
			if (typeof mmsi === 'number') whereParts.push(ir.eq(ir.col('mmsi'), ir.lit(mmsi)));
			if (vesselName) whereParts.push(ir.eq(ir.col('vessel_name'), ir.lit(vesselName)));
			if (routeDateUtc) whereParts.push(ir.eq(ir.col('route_date_utc'), ir.lit(routeDateUtc)));

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
					{ expr: ir.col('segment_seq_ship') },
					{ expr: ir.col('route_date_utc') },
					{ expr: ir.col('from_route_point_id') },
					{ expr: ir.col('to_route_point_id') },
					{ expr: ir.col('from_fetched_at') },
					{ expr: ir.col('to_fetched_at') },
					{ expr: ir.col('from_latitude') },
					{ expr: ir.col('from_longitude') },
					{ expr: ir.col('to_latitude') },
					{ expr: ir.col('to_longitude') },
					{ expr: ir.col('from_speed') },
					{ expr: ir.col('from_course') },
					{ expr: ir.col('from_heading') },
					{ expr: ir.col('gap_minutes') },
					{ expr: ir.col('same_coordinates_as_next') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('from_fetched_at'), dir: 'asc' },
					{ expr: ir.col('segment_seq_ship'), dir: 'asc' }
				],
				limit
			};
		}
	}
}
