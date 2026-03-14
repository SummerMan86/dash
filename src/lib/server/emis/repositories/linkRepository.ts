import type { PoolClient } from 'pg';

import type { EmisObjectLinkInput, UpdateNewsObjectLinkInput } from '$entities/emis-link';

import { getDb } from '../sql/db';

export async function upsertNewsObjectLinks(
	newsId: string,
	links: EmisObjectLinkInput[],
	client?: PoolClient
): Promise<void> {
	const db = getDb(client);

	for (const link of links) {
		await db.query(
			`INSERT INTO emis.news_object_links (
				news_id,
				object_id,
				link_type,
				is_primary,
				confidence,
				comment
			) VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (news_id, object_id, link_type)
			DO UPDATE SET
				is_primary = EXCLUDED.is_primary,
				confidence = EXCLUDED.confidence,
				comment = EXCLUDED.comment`,
			[
				newsId,
				link.objectId,
				link.linkType,
				link.isPrimary,
				link.confidence ?? null,
				link.comment ?? null
			]
		);
	}
}

export async function updateNewsObjectLink(
	newsId: string,
	objectId: string,
	patch: UpdateNewsObjectLinkInput,
	client?: PoolClient
): Promise<boolean> {
	const sets: string[] = [];
	const values: unknown[] = [];

	const push = (sql: string, value: unknown) => {
		values.push(value);
		sets.push(`${sql} = $${values.length}`);
	};

	if ('linkType' in patch && patch.linkType) push('link_type', patch.linkType);
	if ('isPrimary' in patch && typeof patch.isPrimary === 'boolean')
		push('is_primary', patch.isPrimary);
	if ('confidence' in patch) push('confidence', patch.confidence ?? null);
	if ('comment' in patch) push('comment', patch.comment ?? null);

	values.push(newsId);
	values.push(objectId);

	const db = getDb(client);
	const result = await db.query(
		`UPDATE emis.news_object_links
		 SET ${sets.join(', ')}
		 WHERE news_id = $${values.length - 1}
		   AND object_id = $${values.length}`,
		values
	);
	return (result.rowCount ?? 0) > 0;
}

export async function deleteNewsObjectLink(
	newsId: string,
	objectId: string,
	client?: PoolClient
): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query(
		`DELETE FROM emis.news_object_links
		 WHERE news_id = $1
		   AND object_id = $2`,
		[newsId, objectId]
	);
	return (result.rowCount ?? 0) > 0;
}
