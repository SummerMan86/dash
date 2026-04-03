import type { PoolClient } from 'pg';

import type {
	EmisNewsDetail,
	EmisNewsRelatedObject,
	EmisNewsSummary,
	ListEmisNewsInput
} from '@dashboard-builder/emis-contracts/emis-news';

import { getDb } from '../../infra/db';
import { clampPageSize } from '../../infra/http';

export async function listNewsQuery(filters: ListEmisNewsInput): Promise<EmisNewsSummary[]> {
	const conditions = ['n.deleted_at IS NULL'];
	const values: unknown[] = [];

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

	const limit = clampPageSize(filters.limit);
	const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
	values.push(limit, offset);

	const db = getDb();
	const result = await db.query(
		`SELECT
			n.id,
			n.title,
			n.source_id,
			s.name AS source_name,
			n.published_at,
			n.country_code,
			n.region,
			n.news_type,
			n.importance,
			n.geom IS NOT NULL AS has_geometry,
			COUNT(l.object_id) AS related_objects_count
		 FROM emis.news_items n
		 JOIN emis.sources s
		   ON s.id = n.source_id
		 LEFT JOIN emis.news_object_links l
		   ON l.news_id = n.id
		 WHERE ${conditions.join(' AND ')}
		 GROUP BY
			n.id, n.title, n.source_id, s.name, n.published_at,
			n.country_code, n.region, n.news_type, n.importance, n.geom
		 ORDER BY n.published_at DESC, n.id DESC
		 LIMIT $${values.length - 1}
		 OFFSET $${values.length}`,
		values
	);

	return result.rows.map((row) => ({
		id: row.id,
		title: row.title,
		sourceId: row.source_id,
		sourceName: row.source_name,
		publishedAt: row.published_at.toISOString(),
		countryCode: row.country_code,
		region: row.region,
		newsType: row.news_type,
		importance: row.importance,
		relatedObjectsCount: Number(row.related_objects_count),
		hasGeometry: row.has_geometry
	}));
}

export async function getNewsDetailQuery(
	id: string,
	client?: PoolClient
): Promise<EmisNewsDetail | null> {
	const db = getDb(client);
	const newsResult = await db.query(
		`SELECT
			n.id,
			n.source_item_id,
			n.url,
			n.title,
			n.summary,
			n.body,
			n.language,
			n.published_at,
			n.collected_at,
			n.country_code,
			n.region,
			n.news_type,
			n.importance,
			CASE WHEN n.geom IS NULL THEN NULL ELSE ST_AsGeoJSON(n.geom)::json END AS geometry,
			n.is_manual,
			n.meta,
			n.created_at,
			n.updated_at,
			s.id AS source_id,
			s.code AS source_code,
			s.name AS source_name,
			s.kind AS source_kind
		 FROM emis.news_items n
		 JOIN emis.sources s
		   ON s.id = n.source_id
		 WHERE n.id = $1
		   AND n.deleted_at IS NULL`,
		[id]
	);

	if ((newsResult.rowCount ?? 0) === 0) return null;
	const row = newsResult.rows[0];

	const relatedObjectsResult = await db.query(
		`SELECT
			o.id,
			o.name,
			o.country_code,
			o.status,
			ot.code AS object_type_code,
			ot.name AS object_type_name,
			l.link_type,
			l.is_primary,
			l.confidence,
			l.comment
		 FROM emis.news_object_links l
		 JOIN emis.objects o
		   ON o.id = l.object_id
		 JOIN emis.object_types ot
		   ON ot.id = o.object_type_id
		 WHERE l.news_id = $1
		   AND o.deleted_at IS NULL
		 ORDER BY l.is_primary DESC, o.name ASC`,
		[id]
	);

	const relatedObjects: EmisNewsRelatedObject[] = relatedObjectsResult.rows.map((item) => ({
		id: item.id,
		name: item.name,
		objectTypeCode: item.object_type_code,
		objectTypeName: item.object_type_name,
		countryCode: item.country_code,
		status: item.status,
		linkType: item.link_type,
		isPrimary: item.is_primary,
		confidence: item.confidence === null ? null : Number(item.confidence),
		comment: item.comment
	}));

	return {
		id: row.id,
		source: {
			id: row.source_id,
			code: row.source_code,
			name: row.source_name,
			kind: row.source_kind
		},
		sourceItemId: row.source_item_id,
		url: row.url,
		title: row.title,
		summary: row.summary,
		body: row.body,
		language: row.language,
		publishedAt: row.published_at.toISOString(),
		collectedAt: row.collected_at.toISOString(),
		countryCode: row.country_code,
		region: row.region,
		newsType: row.news_type,
		importance: row.importance,
		geometry: row.geometry,
		isManual: row.is_manual,
		meta: row.meta ?? {},
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString(),
		relatedObjects
	};
}
