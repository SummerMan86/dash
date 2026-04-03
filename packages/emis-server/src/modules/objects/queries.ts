import type { PoolClient } from 'pg';

import type {
	EmisObjectDetail,
	EmisObjectRelatedNews,
	EmisObjectSummary,
	ListEmisObjectsInput
} from '@dashboard-builder/emis-contracts/emis-object';

import { getDb } from '../../infra/db';

function clampPageSize(value: number | undefined): number {
	return Math.max(1, Math.min(200, Math.trunc(value ?? 50)));
}

export async function listObjectsQuery(
	filters: ListEmisObjectsInput
): Promise<EmisObjectSummary[]> {
	const conditions = ['o.deleted_at IS NULL'];
	const values: unknown[] = [];

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

	const limit = clampPageSize(filters.limit);
	const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
	values.push(limit, offset);

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
			o.geom IS NOT NULL AS has_geometry,
			o.updated_at
		 FROM emis.objects o
		 JOIN emis.object_types ot
		   ON ot.id = o.object_type_id
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY o.name ASC, o.id ASC
		 LIMIT $${values.length - 1}
		 OFFSET $${values.length}`,
		values
	);

	return result.rows.map((row) => ({
		id: row.id,
		name: row.name,
		objectTypeId: row.object_type_id,
		objectTypeCode: row.object_type_code,
		objectTypeName: row.object_type_name,
		countryCode: row.country_code,
		region: row.region,
		status: row.status,
		hasGeometry: row.has_geometry,
		updatedAt: row.updated_at.toISOString()
	}));
}

export async function getObjectDetailQuery(
	id: string,
	client?: PoolClient
): Promise<EmisObjectDetail | null> {
	const db = getDb(client);
	const objectResult = await db.query(
		`SELECT
			o.id,
			o.external_id,
			o.name,
			o.name_en,
			o.country_code,
			o.region,
			o.status,
			o.operator_name,
			o.description,
			o.attributes,
			ST_AsGeoJSON(o.geom)::json AS geometry,
			o.source_note,
			o.created_at,
			o.updated_at,
			ot.id AS object_type_id,
			ot.code AS object_type_code,
			ot.name AS object_type_name
		 FROM emis.objects o
		 JOIN emis.object_types ot
		   ON ot.id = o.object_type_id
		 WHERE o.id = $1
		   AND o.deleted_at IS NULL`,
		[id]
	);

	if ((objectResult.rowCount ?? 0) === 0) return null;
	const row = objectResult.rows[0];

	const relatedNewsResult = await db.query(
		`SELECT
			n.id,
			n.title,
			s.name AS source_name,
			n.published_at,
			n.news_type,
			n.importance,
			l.link_type,
			l.is_primary,
			l.confidence,
			l.comment
		 FROM emis.news_object_links l
		 JOIN emis.news_items n
		   ON n.id = l.news_id
		 JOIN emis.sources s
		   ON s.id = n.source_id
		 WHERE l.object_id = $1
		   AND n.deleted_at IS NULL
		 ORDER BY n.published_at DESC`,
		[id]
	);

	const relatedNews: EmisObjectRelatedNews[] = relatedNewsResult.rows.map((item) => ({
		id: item.id,
		title: item.title,
		sourceName: item.source_name,
		publishedAt: item.published_at.toISOString(),
		newsType: item.news_type,
		importance: item.importance,
		linkType: item.link_type,
		isPrimary: item.is_primary,
		confidence: item.confidence === null ? null : Number(item.confidence),
		comment: item.comment
	}));

	return {
		id: row.id,
		externalId: row.external_id,
		name: row.name,
		nameEn: row.name_en,
		objectType: {
			id: row.object_type_id,
			code: row.object_type_code,
			name: row.object_type_name
		},
		countryCode: row.country_code,
		region: row.region,
		status: row.status,
		operatorName: row.operator_name,
		description: row.description,
		attributes: row.attributes ?? {},
		geometry: row.geometry,
		sourceNote: row.source_note,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString(),
		relatedNews
	};
}
