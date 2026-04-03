import type {
	EmisShipRoutePoint,
	EmisShipRouteSegment,
	EmisShipRouteVessel,
	ListEmisShipRoutePointsQueryInput,
	ListEmisShipRouteSegmentsQueryInput,
	ListEmisShipRouteVesselsQueryInput
} from '@dashboard-builder/emis-contracts/emis-ship-route';

import { getDb } from '../../infra/db';

function clampLimit(value: number, max: number): number {
	return Math.max(1, Math.min(max, Math.trunc(value)));
}

function asOptionalNumber(value: unknown): number | null {
	return value === null || value === undefined ? null : Number(value);
}

function appendDateRangeConditions(
	columnName: 'fetched_at' | 'from_fetched_at',
	filters: { dateFrom?: string; dateTo?: string },
	conditions: string[],
	values: unknown[]
) {
	if (filters.dateFrom) {
		values.push(filters.dateFrom);
		conditions.push(`${columnName} >= $${values.length}::timestamptz`);
	}

	if (filters.dateTo) {
		values.push(filters.dateTo);
		conditions.push(`${columnName} <= $${values.length}::timestamptz`);
	}
}

export async function listShipRouteVesselsQuery(
	filters: ListEmisShipRouteVesselsQueryInput
): Promise<EmisShipRouteVessel[]> {
	const db = getDb();
	const limit = clampLimit(filters.limit, 500);
	const offset = Math.max(0, Math.trunc(filters.offset ?? 0));

	const conditions = ['ship_hbk_id IS NOT NULL'];
	const values: unknown[] = [];

	if (filters.q) {
		values.push(`%${filters.q}%`);
		const qParam = `$${values.length}`;
		conditions.push(
			`(vessel_name ILIKE ${qParam} OR callsign ILIKE ${qParam} OR CAST(ship_hbk_id AS text) ILIKE ${qParam} OR CAST(imo AS text) ILIKE ${qParam} OR CAST(mmsi AS text) ILIKE ${qParam})`
		);
	}

	values.push(limit, offset);

	const result = await db.query(
		`SELECT
			ship_hbk_id,
			ship_id,
			imo,
			mmsi,
			vessel_name,
			vessel_type,
			flag,
			callsign,
			first_fetched_at,
			last_fetched_at,
			last_route_date_utc,
			points_count,
			route_days_count,
			last_latitude,
			last_longitude
		 FROM mart.emis_ship_route_vessels
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY last_fetched_at DESC, ship_hbk_id ASC
		 LIMIT $${values.length - 1}
		 OFFSET $${values.length}`,
		values
	);

	return result.rows.map((row) => ({
		shipHbkId: Number(row.ship_hbk_id),
		shipId: asOptionalNumber(row.ship_id),
		imo: asOptionalNumber(row.imo),
		mmsi: asOptionalNumber(row.mmsi),
		vesselName: row.vessel_name,
		vesselType: row.vessel_type,
		flag: row.flag,
		callsign: row.callsign,
		firstFetchedAt: row.first_fetched_at ? row.first_fetched_at.toISOString() : null,
		lastFetchedAt: row.last_fetched_at.toISOString(),
		lastRouteDateUtc: row.last_route_date_utc ? row.last_route_date_utc.toISOString() : null,
		pointsCount: Number(row.points_count ?? 0),
		routeDaysCount: Number(row.route_days_count ?? 0),
		lastLatitude: row.last_latitude === null ? null : Number(row.last_latitude),
		lastLongitude: row.last_longitude === null ? null : Number(row.last_longitude)
	}));
}

export async function listShipRoutePointsQuery(
	filters: ListEmisShipRoutePointsQueryInput
): Promise<EmisShipRoutePoint[]> {
	const conditions = ['ship_hbk_id = $1'];
	const values: unknown[] = [filters.shipHbkId];

	appendDateRangeConditions('fetched_at', filters, conditions, values);

	const limit = clampLimit(filters.limit, 5000);
	const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
	values.push(limit, offset);

	const db = getDb();
	const result = await db.query(
		`SELECT
			route_point_id,
			ship_hbk_id,
			ship_id,
			imo,
			mmsi,
			vessel_name,
			vessel_type,
			flag,
			callsign,
			route_date_utc,
			point_seq_ship,
			point_seq_day,
			fetched_at,
			loaded_at,
			latitude,
			longitude,
			speed,
			course,
			heading,
			gap_minutes_from_prev,
			gap_minutes_to_next
		 FROM mart_emis.vsl_route_point_hist
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY fetched_at ASC, point_seq_ship ASC
		 LIMIT $${values.length - 1}
		 OFFSET $${values.length}`,
		values
	);

	return result.rows.map((row) => ({
		routePointId: Number(row.route_point_id),
		shipHbkId: Number(row.ship_hbk_id),
		shipId: asOptionalNumber(row.ship_id),
		imo: asOptionalNumber(row.imo),
		mmsi: asOptionalNumber(row.mmsi),
		vesselName: row.vessel_name,
		vesselType: row.vessel_type,
		flag: row.flag,
		callsign: row.callsign,
		routeDateUtc: row.route_date_utc ? row.route_date_utc.toISOString() : null,
		pointSeqShip: Number(row.point_seq_ship),
		pointSeqDay: asOptionalNumber(row.point_seq_day),
		fetchedAt: row.fetched_at.toISOString(),
		loadedAt: row.loaded_at ? row.loaded_at.toISOString() : null,
		latitude: Number(row.latitude),
		longitude: Number(row.longitude),
		speed: row.speed === null ? null : Number(row.speed),
		course: row.course === null ? null : Number(row.course),
		heading: row.heading === null ? null : Number(row.heading),
		gapMinutesFromPrev:
			row.gap_minutes_from_prev === null ? null : Number(row.gap_minutes_from_prev),
		gapMinutesToNext: row.gap_minutes_to_next === null ? null : Number(row.gap_minutes_to_next)
	}));
}

export async function listShipRouteSegmentsQuery(
	filters: ListEmisShipRouteSegmentsQueryInput
): Promise<EmisShipRouteSegment[]> {
	const conditions = ['ship_hbk_id = $1'];
	const values: unknown[] = [filters.shipHbkId];

	appendDateRangeConditions('from_fetched_at', filters, conditions, values);

	const limit = clampLimit(filters.limit, 5000);
	const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
	values.push(limit, offset);

	const db = getDb();
	const result = await db.query(
		`SELECT
			ship_hbk_id,
			ship_id,
			imo,
			mmsi,
			vessel_name,
			vessel_type,
			flag,
			callsign,
			segment_seq_ship,
			route_date_utc,
			from_route_point_id,
			to_route_point_id,
			from_fetched_at,
			to_fetched_at,
			from_latitude,
			from_longitude,
			to_latitude,
			to_longitude,
			from_speed,
			from_course,
			from_heading,
			gap_minutes,
			same_coordinates_as_next
		 FROM mart_emis.vsl_route_segment_hist
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY from_fetched_at ASC, segment_seq_ship ASC
		 LIMIT $${values.length - 1}
		 OFFSET $${values.length}`,
		values
	);

	return result.rows.map((row) => ({
		shipHbkId: Number(row.ship_hbk_id),
		shipId: asOptionalNumber(row.ship_id),
		imo: asOptionalNumber(row.imo),
		mmsi: asOptionalNumber(row.mmsi),
		vesselName: row.vessel_name,
		vesselType: row.vessel_type,
		flag: row.flag,
		callsign: row.callsign,
		segmentSeqShip: Number(row.segment_seq_ship),
		routeDateUtc: row.route_date_utc ? row.route_date_utc.toISOString() : null,
		fromRoutePointId: asOptionalNumber(row.from_route_point_id),
		toRoutePointId: asOptionalNumber(row.to_route_point_id),
		fromFetchedAt: row.from_fetched_at.toISOString(),
		toFetchedAt: row.to_fetched_at ? row.to_fetched_at.toISOString() : null,
		fromLatitude: Number(row.from_latitude),
		fromLongitude: Number(row.from_longitude),
		toLatitude: Number(row.to_latitude),
		toLongitude: Number(row.to_longitude),
		fromSpeed: row.from_speed === null ? null : Number(row.from_speed),
		fromCourse: row.from_course === null ? null : Number(row.from_course),
		fromHeading: row.from_heading === null ? null : Number(row.from_heading),
		gapMinutes: row.gap_minutes === null ? null : Number(row.gap_minutes),
		sameCoordinatesAsNext:
			row.same_coordinates_as_next === null ? null : Boolean(row.same_coordinates_as_next)
	}));
}
