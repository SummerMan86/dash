import type { PoolClient } from 'pg';

import type { EmisObjectLinkInput, UpdateNewsObjectLinkInput } from '@dashboard-builder/emis-contracts/emis-link';

import { getDb } from '../../infra/db';

export async function upsertNewsObjectLinks(
	newsId: string,
	links: EmisObjectLinkInput[],
	actorId: string | null,
	client?: PoolClient
): Promise<
	Array<{
		id: string;
		newsId: string;
		objectId: string;
		linkType: string;
		isPrimary: boolean;
		confidence: number | null;
		comment: string | null;
	}>
> {
	const db = getDb(client);
	const created: Array<{
		id: string;
		newsId: string;
		objectId: string;
		linkType: string;
		isPrimary: boolean;
		confidence: number | null;
		comment: string | null;
	}> = [];

	for (const link of links) {
		const result = await db.query(
			`INSERT INTO emis.news_object_links (
				news_id,
				object_id,
				link_type,
				is_primary,
				confidence,
				comment,
				created_by,
				updated_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
			ON CONFLICT (news_id, object_id, link_type)
			DO UPDATE SET
				is_primary = EXCLUDED.is_primary,
				confidence = EXCLUDED.confidence,
				comment = EXCLUDED.comment,
				updated_by = EXCLUDED.updated_by
			RETURNING
				id,
				news_id,
				object_id,
				link_type,
				is_primary,
				confidence,
				comment`,
			[
				newsId,
				link.objectId,
				link.linkType,
				link.isPrimary,
				link.confidence ?? null,
				link.comment ?? null,
				actorId
			]
		);
		const row = result.rows[0];
		created.push({
			id: row.id,
			newsId: row.news_id,
			objectId: row.object_id,
			linkType: row.link_type,
			isPrimary: row.is_primary,
			confidence: row.confidence === null ? null : Number(row.confidence),
			comment: row.comment
		});
	}

	return created;
}

export async function updateNewsObjectLink(
	newsId: string,
	objectId: string,
	patch: UpdateNewsObjectLinkInput,
	actorId: string | null,
	client?: PoolClient
): Promise<{ id: string; newsId: string; objectId: string; linkType: string } | null> {
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
	push('updated_by', actorId);

	values.push(newsId);
	values.push(objectId);

	const db = getDb(client);
	const result = await db.query(
		`UPDATE emis.news_object_links
		 SET ${sets.join(', ')}
		 WHERE news_id = $${values.length - 1}
		   AND object_id = $${values.length}
		 RETURNING id, news_id, object_id, link_type`,
		values
	);
	if ((result.rowCount ?? 0) === 0) return null;
	return {
		id: result.rows[0].id,
		newsId: result.rows[0].news_id,
		objectId: result.rows[0].object_id,
		linkType: result.rows[0].link_type
	};
}

export async function deleteNewsObjectLink(
	newsId: string,
	objectId: string,
	client?: PoolClient
): Promise<{ id: string; newsId: string; objectId: string; linkType: string } | null> {
	const db = getDb(client);
	const result = await db.query(
		`DELETE FROM emis.news_object_links
		 WHERE news_id = $1
		   AND object_id = $2
		 RETURNING id, news_id, object_id, link_type`,
		[newsId, objectId]
	);
	if ((result.rowCount ?? 0) === 0) return null;
	return {
		id: result.rows[0].id,
		newsId: result.rows[0].news_id,
		objectId: result.rows[0].object_id,
		linkType: result.rows[0].link_type
	};
}
