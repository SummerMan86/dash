import type { PoolClient } from 'pg';

import { getDb } from './db';

export type EmisWriteSource = 'api' | 'manual-ui' | 'server';

export type EmisWriteContext = {
	actorId: string | null;
	source: EmisWriteSource;
};

export type EmisAuditEntityType = 'object' | 'news_item' | 'news_object_link' | 'user_account';

export type EmisAuditAction = 'create' | 'update' | 'delete' | 'attach' | 'detach' | 'upsert';

export type EmisAuditEntry = {
	entityType: EmisAuditEntityType;
	entityId: string;
	action: EmisAuditAction;
	payload?: Record<string, unknown>;
};

function normalizeActorId(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function resolveEmisWriteContext(
	request: Request,
	source: EmisWriteSource = 'api'
): EmisWriteContext {
	const actorId =
		normalizeActorId(request.headers.get('x-emis-actor-id')) ??
		normalizeActorId(request.headers.get('x-actor-id')) ??
		(source === 'manual-ui'
			? 'local-manual-ui'
			: source === 'api'
				? 'api-client'
				: 'server-process');

	return {
		actorId,
		source
	};
}

export async function insertAuditLog(
	entry: EmisAuditEntry,
	context: EmisWriteContext,
	client?: PoolClient
): Promise<void> {
	const db = getDb(client);
	await db.query(
		`INSERT INTO emis.audit_log (
			entity_type,
			entity_id,
			action,
			actor_id,
			payload
		) VALUES ($1, $2::uuid, $3, $4, $5::jsonb)`,
		[
			entry.entityType,
			entry.entityId,
			entry.action,
			context.actorId,
			JSON.stringify({
				source: context.source,
				...(entry.payload ?? {})
			})
		]
	);
}
