import type { PoolClient } from 'pg';

import type { CreateEmisNewsInput, UpdateEmisNewsInput } from '$entities/emis-news';

import { getDb } from '../../infra/db';

function newsGeometrySql(paramIndex: number): string {
	return `ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}), 4326)`;
}

export async function newsExists(id: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query(
		'SELECT 1 FROM emis.news_items WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
		[id]
	);
	return (result.rowCount ?? 0) > 0;
}

export async function insertNews(input: CreateEmisNewsInput, client?: PoolClient): Promise<string> {
	const db = getDb(client);
	const geometry = input.geometry ? JSON.stringify(input.geometry) : null;
	const result = await db.query(
		`INSERT INTO emis.news_items (
			source_id,
			source_item_id,
			url,
			title,
			summary,
			body,
			language,
			published_at,
			country_code,
			region,
			news_type,
			importance,
			geom,
			is_manual,
			meta
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10, $11, $12,
			CASE WHEN $13::text IS NULL THEN NULL ELSE ${newsGeometrySql(13)} END,
			$14,
			$15::jsonb
		)
		RETURNING id`,
		[
			input.sourceId,
			input.sourceItemId ?? null,
			input.url ?? null,
			input.title,
			input.summary ?? null,
			input.body ?? null,
			input.language ?? null,
			input.publishedAt,
			input.countryCode ?? null,
			input.region ?? null,
			input.newsType ?? null,
			input.importance ?? null,
			geometry,
			input.isManual ?? false,
			JSON.stringify(input.meta ?? {})
		]
	);
	return result.rows[0].id;
}

export async function updateNews(
	id: string,
	patch: UpdateEmisNewsInput,
	client?: PoolClient
): Promise<boolean> {
	const sets: string[] = [];
	const values: unknown[] = [];

	const push = (sql: string, value: unknown) => {
		values.push(value);
		sets.push(`${sql} = $${values.length}`);
	};

	if ('sourceId' in patch && patch.sourceId) push('source_id', patch.sourceId);
	if ('sourceItemId' in patch) push('source_item_id', patch.sourceItemId ?? null);
	if ('url' in patch) push('url', patch.url ?? null);
	if ('title' in patch && patch.title) push('title', patch.title);
	if ('summary' in patch) push('summary', patch.summary ?? null);
	if ('body' in patch) push('body', patch.body ?? null);
	if ('language' in patch) push('language', patch.language ?? null);
	if ('publishedAt' in patch && patch.publishedAt) {
		values.push(patch.publishedAt);
		sets.push(`published_at = $${values.length}::timestamptz`);
	}
	if ('countryCode' in patch) push('country_code', patch.countryCode ?? null);
	if ('region' in patch) push('region', patch.region ?? null);
	if ('newsType' in patch) push('news_type', patch.newsType ?? null);
	if ('importance' in patch) push('importance', patch.importance ?? null);
	if ('geometry' in patch) {
		values.push(patch.geometry ? JSON.stringify(patch.geometry) : null);
		sets.push(
			`geom = CASE WHEN $${values.length}::text IS NULL THEN NULL ELSE ST_SetSRID(ST_GeomFromGeoJSON($${values.length}), 4326) END`
		);
	}
	if ('isManual' in patch && typeof patch.isManual === 'boolean') push('is_manual', patch.isManual);
	if ('meta' in patch && patch.meta) {
		values.push(JSON.stringify(patch.meta));
		sets.push(`meta = $${values.length}::jsonb`);
	}

	values.push(id);
	sets.push(`updated_at = now()`);

	const db = getDb(client);
	const result = await db.query(
		`UPDATE emis.news_items
		 SET ${sets.join(', ')}
		 WHERE id = $${values.length}
		   AND deleted_at IS NULL`,
		values
	);
	return (result.rowCount ?? 0) > 0;
}

export async function softDeleteNews(id: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query(
		`UPDATE emis.news_items
		 SET deleted_at = now(), updated_at = now()
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id]
	);
	return (result.rowCount ?? 0) > 0;
}
