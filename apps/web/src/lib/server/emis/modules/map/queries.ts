import type {
	EmisMapBBox,
	EmisMapNewsFeatureCollection,
	EmisMapNewsFeatureProperties,
	EmisMapNewsQueryInput,
	EmisMapObjectFeatureCollection,
	EmisMapObjectFeatureProperties,
	EmisMapObjectsQueryInput,
	EmisMapVesselFeatureCollection,
	EmisMapVesselFeatureProperties,
	EmisMapVesselsQueryInput
} from '$entities/emis-map';

import { getDb } from '../../infra/db';

function clampMapLimit(value: number | undefined): number {
	return Math.max(1, Math.min(500, Math.trunc(value ?? 200)));
}

function appendBboxConditions(
	columnName: string,
	bbox: EmisMapBBox,
	conditions: string[],
	values: unknown[]
) {
	const [west, south, east, north] = bbox;
	values.push(west, south, east, north);

	const westParam = `$${values.length - 3}`;
	const southParam = `$${values.length - 2}`;
	const eastParam = `$${values.length - 1}`;
	const northParam = `$${values.length}`;
	const envelope = `ST_MakeEnvelope(${westParam}, ${southParam}, ${eastParam}, ${northParam}, 4326)`;

	conditions.push(`${columnName} && ${envelope}`);
	conditions.push(`ST_Intersects(${columnName}, ${envelope})`);
}

function buildObjectSubtitle(row: {
	object_type_name: string;
	region: string | null;
	country_code: string | null;
}): string | null {
	const parts = [row.object_type_name, row.region, row.country_code].filter(Boolean);
	return parts.length ? parts.join(' • ') : null;
}

function buildNewsSubtitle(row: {
	source_name: string;
	region: string | null;
	news_type: string | null;
}): string | null {
	const parts = [row.source_name, row.region, row.news_type].filter(Boolean);
	return parts.length ? parts.join(' • ') : null;
}

export async function mapObjectsQuery(
	filters: EmisMapObjectsQueryInput
): Promise<EmisMapObjectFeatureCollection> {
	const conditions = ['o.deleted_at IS NULL'];
	const values: unknown[] = [];

	appendBboxConditions('o.geom', filters.bbox, conditions, values);

	if (filters.q) {
		values.push(`%${filters.q}%`);
		const firstParam = `$${values.length}`;
		values.push(`%${filters.q}%`);
		const secondParam = `$${values.length}`;
		conditions.push(`(o.name ILIKE ${firstParam} OR coalesce(o.name_en, '') ILIKE ${secondParam})`);
	}
	if (filters.objectType) {
		values.push(filters.objectType);
		conditions.push(`o.object_type_id = $${values.length}`);
	}
	if (filters.country) {
		values.push(filters.country);
		conditions.push(`o.country_code = $${values.length}`);
	}
	if (filters.status) {
		values.push(filters.status);
		conditions.push(`o.status = $${values.length}`);
	}

	const limit = clampMapLimit(filters.limit);
	values.push(limit);

	const db = getDb();
	const result = await db.query(
		`SELECT
			o.id,
			o.name,
			o.object_type_id,
			ot.code AS object_type_code,
			ot.name AS object_type_name,
			o.country_code,
			o.region,
			o.status,
			o.updated_at,
			ST_AsGeoJSON(COALESCE(o.centroid, ST_PointOnSurface(o.geom)))::json AS geometry
		 FROM emis.objects o
		 JOIN emis.object_types ot
		   ON ot.id = o.object_type_id
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY o.name ASC, o.id ASC
		 LIMIT $${values.length}`,
		values
	);

	return {
		type: 'FeatureCollection',
		features: result.rows.map((row) => {
			const properties: EmisMapObjectFeatureProperties = {
				id: row.id,
				kind: 'object',
				title: row.name,
				subtitle: buildObjectSubtitle(row),
				colorKey: `object-${row.status}`,
				objectTypeId: row.object_type_id,
				objectTypeCode: row.object_type_code,
				objectTypeName: row.object_type_name,
				countryCode: row.country_code,
				region: row.region,
				status: row.status,
				updatedAt: row.updated_at.toISOString()
			};

			return {
				type: 'Feature',
				id: row.id,
				geometry: row.geometry,
				properties
			};
		})
	};
}

export async function mapNewsQuery(
	filters: EmisMapNewsQueryInput
): Promise<EmisMapNewsFeatureCollection> {
	const conditions = ['n.deleted_at IS NULL', 'n.geom IS NOT NULL'];
	const values: unknown[] = [];

	appendBboxConditions('n.geom', filters.bbox, conditions, values);

	if (filters.q) {
		values.push(`%${filters.q}%`);
		const titleParam = `$${values.length}`;
		values.push(`%${filters.q}%`);
		const textParam = `$${values.length}`;
		conditions.push(`(n.title ILIKE ${titleParam} OR coalesce(n.summary, '') ILIKE ${textParam})`);
	}
	if (filters.source) {
		values.push(filters.source);
		conditions.push(`n.source_id = $${values.length}`);
	}
	if (filters.country) {
		values.push(filters.country);
		conditions.push(`n.country_code = $${values.length}`);
	}
	if (filters.newsType) {
		values.push(filters.newsType);
		conditions.push(`n.news_type = $${values.length}`);
	}
	if (filters.dateFrom) {
		values.push(filters.dateFrom);
		conditions.push(`n.published_at >= $${values.length}::timestamptz`);
	}
	if (filters.dateTo) {
		values.push(filters.dateTo);
		conditions.push(`n.published_at <= $${values.length}::timestamptz`);
	}
	if (filters.objectId) {
		values.push(filters.objectId);
		conditions.push(`EXISTS (
			SELECT 1
			FROM emis.news_object_links nl
			WHERE nl.news_id = n.id
			  AND nl.object_id = $${values.length}
		)`);
	}

	const limit = clampMapLimit(filters.limit);
	values.push(limit);

	const db = getDb();
	const result = await db.query(
		`SELECT
			n.id,
			n.title,
			n.summary,
			n.url,
			n.source_id,
			s.name AS source_name,
			n.published_at,
			n.country_code,
			n.region,
			n.news_type,
			n.importance,
			ST_AsGeoJSON(n.geom)::json AS geometry,
			COUNT(DISTINCT l.object_id) AS related_objects_count
		 FROM emis.news_items n
		 JOIN emis.sources s
		   ON s.id = n.source_id
		 LEFT JOIN emis.news_object_links l
		   ON l.news_id = n.id
		 WHERE ${conditions.join(' AND ')}
		 GROUP BY
			n.id,
			n.title,
			n.summary,
			n.url,
			n.source_id,
			s.name,
			n.published_at,
			n.country_code,
			n.region,
			n.news_type,
			n.importance,
			n.geom
		 ORDER BY n.published_at DESC, n.id DESC
		 LIMIT $${values.length}`,
		values
	);

	return {
		type: 'FeatureCollection',
		features: result.rows.map((row) => {
			const properties: EmisMapNewsFeatureProperties = {
				id: row.id,
				kind: 'news',
				title: row.title,
				subtitle: buildNewsSubtitle(row),
				colorKey: `news-${row.importance ?? 0}`,
				sourceId: row.source_id,
				sourceName: row.source_name,
				countryCode: row.country_code,
				region: row.region,
				newsType: row.news_type,
				importance: row.importance,
				publishedAt: row.published_at.toISOString(),
				relatedObjectsCount: Number(row.related_objects_count),
				summary: row.summary ?? null,
				url: row.url ?? null
			};

			return {
				type: 'Feature',
				id: row.id,
				geometry: row.geometry,
				properties
			};
		})
	};
}

function buildVesselSubtitle(row: {
	flag: string | null;
	vessel_type: string | null;
	callsign: string | null;
}): string | null {
	const parts = [row.vessel_type, row.flag, row.callsign].filter(Boolean);
	return parts.length ? parts.join(' · ') : null;
}

export async function mapVesselsQuery(
	filters: EmisMapVesselsQueryInput
): Promise<EmisMapVesselFeatureCollection> {
	const conditions = ['last_latitude IS NOT NULL', 'last_longitude IS NOT NULL'];
	const values: unknown[] = [];

	const [west, south, east, north] = filters.bbox;
	values.push(west, east, south, north);
	conditions.push(`last_longitude >= $1 AND last_longitude <= $2`);
	conditions.push(`last_latitude >= $3 AND last_latitude <= $4`);

	if (filters.q) {
		values.push(`%${filters.q}%`);
		const qParam = `$${values.length}`;
		conditions.push(
			`(vessel_name ILIKE ${qParam} OR callsign ILIKE ${qParam} OR CAST(ship_hbk_id AS text) ILIKE ${qParam} OR CAST(imo AS text) ILIKE ${qParam} OR CAST(mmsi AS text) ILIKE ${qParam})`
		);
	}

	const limit = clampMapLimit(filters.limit);
	values.push(limit);

	const db = getDb();
	const result = await db.query(
		`SELECT
			ship_hbk_id,
			vessel_name,
			vessel_type,
			imo,
			mmsi,
			flag,
			callsign,
			last_fetched_at,
			last_latitude,
			last_longitude,
			points_count,
			route_days_count
		 FROM mart.emis_ship_route_vessels
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY last_fetched_at DESC, ship_hbk_id ASC
		 LIMIT $${values.length}`,
		values
	);

	return {
		type: 'FeatureCollection',
		features: result.rows.map((row) => {
			const properties: EmisMapVesselFeatureProperties = {
				id: String(row.ship_hbk_id),
				kind: 'vessel',
				title: row.vessel_name,
				subtitle: buildVesselSubtitle(row),
				colorKey: 'vessel',
				shipHbkId: Number(row.ship_hbk_id),
				imo: row.imo === null ? null : Number(row.imo),
				mmsi: row.mmsi === null ? null : Number(row.mmsi),
				flag: row.flag,
				callsign: row.callsign,
				vesselType: row.vessel_type,
				lastFetchedAt: row.last_fetched_at.toISOString(),
				lastLatitude: Number(row.last_latitude),
				lastLongitude: Number(row.last_longitude),
				pointsCount: Number(row.points_count ?? 0),
				routeDaysCount: Number(row.route_days_count ?? 0)
			};

			return {
				type: 'Feature',
				id: row.ship_hbk_id,
				geometry: {
					type: 'Point',
					coordinates: [Number(row.last_longitude), Number(row.last_latitude)]
				},
				properties
			};
		})
	};
}
