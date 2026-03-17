import type { PoolClient } from 'pg';

import type {
	EmisCountry,
	EmisObjectType,
	EmisShipRouteVessel,
	EmisSource
} from '$entities/emis-dictionary';

import { getDb } from '../../infra/db';

export async function listCountries(client?: PoolClient): Promise<EmisCountry[]> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT code, name_ru, name_en
		 FROM emis.countries
		 ORDER BY name_ru ASC`
	);
	return result.rows.map((row) => ({
		code: row.code,
		nameRu: row.name_ru,
		nameEn: row.name_en
	}));
}

export async function listObjectTypes(client?: PoolClient): Promise<EmisObjectType[]> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, code, name, geometry_kind, icon_key, created_at
		 FROM emis.object_types
		 ORDER BY name ASC`
	);
	return result.rows.map((row) => ({
		id: row.id,
		code: row.code,
		name: row.name,
		geometryKind: row.geometry_kind,
		iconKey: row.icon_key,
		createdAt: row.created_at.toISOString()
	}));
}

export async function listSources(client?: PoolClient): Promise<EmisSource[]> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, code, name, kind, base_url, is_active, created_at, updated_at
		 FROM emis.sources
		 ORDER BY name ASC`
	);
	return result.rows.map((row) => ({
		id: row.id,
		code: row.code,
		name: row.name,
		kind: row.kind,
		baseUrl: row.base_url,
		isActive: row.is_active,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	}));
}

export async function listShipRouteVessels(client?: PoolClient): Promise<EmisShipRouteVessel[]> {
	const db = getDb(client);
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
		 WHERE ship_hbk_id IS NOT NULL
		 ORDER BY last_fetched_at DESC, ship_hbk_id ASC`
	);

	return result.rows.map((row) => ({
		shipHbkId: row.ship_hbk_id,
		shipId: row.ship_id,
		imo: row.imo,
		mmsi: row.mmsi,
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

export async function objectTypeExists(id: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query('SELECT 1 FROM emis.object_types WHERE id = $1 LIMIT 1', [id]);
	return (result.rowCount ?? 0) > 0;
}

export async function sourceExists(id: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query('SELECT 1 FROM emis.sources WHERE id = $1 LIMIT 1', [id]);
	return (result.rowCount ?? 0) > 0;
}

export async function countryExists(code: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query('SELECT 1 FROM emis.countries WHERE code = $1 LIMIT 1', [code]);
	return (result.rowCount ?? 0) > 0;
}
