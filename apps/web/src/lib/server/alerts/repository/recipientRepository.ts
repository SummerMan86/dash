/**
 * Repository for alert recipients CRUD operations
 */

import { getPgPool } from '$lib/server/db/pg';
import type { AlertRecipient, CreateRecipientInput, NotificationChannelType } from '../model/types';

type RecipientRow = {
	id: string;
	seller_id: string;
	channel: NotificationChannelType;
	address: string;
	name: string | null;
	enabled: boolean;
	verified_at: Date | null;
	created_at: Date;
};

function rowToRecipient(row: RecipientRow): AlertRecipient {
	return {
		id: Number(row.id),
		sellerId: Number(row.seller_id),
		channel: row.channel,
		address: row.address,
		name: row.name ?? undefined,
		enabled: row.enabled,
		verifiedAt: row.verified_at ?? undefined,
		createdAt: row.created_at
	};
}

export async function getRecipientsBySeller(sellerId: number): Promise<AlertRecipient[]> {
	const pool = getPgPool();
	const result = await pool.query<RecipientRow>(
		`SELECT id, seller_id, channel, address, name, enabled, verified_at, created_at
		 FROM alerts.recipients
		 WHERE seller_id = $1
		 ORDER BY created_at DESC`,
		[sellerId]
	);
	return result.rows.map(rowToRecipient);
}

export async function getRecipientsForRule(ruleId: number): Promise<AlertRecipient[]> {
	const pool = getPgPool();
	const result = await pool.query<RecipientRow>(
		`SELECT r.id, r.seller_id, r.channel, r.address, r.name, r.enabled, r.verified_at, r.created_at
		 FROM alerts.recipients r
		 JOIN alerts.rule_recipients rr ON rr.recipient_id = r.id
		 WHERE rr.rule_id = $1 AND r.enabled = TRUE`,
		[ruleId]
	);
	return result.rows.map(rowToRecipient);
}

export async function getRecipientById(id: number): Promise<AlertRecipient | null> {
	const pool = getPgPool();
	const result = await pool.query<RecipientRow>(
		`SELECT id, seller_id, channel, address, name, enabled, verified_at, created_at
		 FROM alerts.recipients
		 WHERE id = $1`,
		[id]
	);
	return result.rows[0] ? rowToRecipient(result.rows[0]) : null;
}

export async function createRecipient(input: CreateRecipientInput): Promise<AlertRecipient> {
	const pool = getPgPool();
	const result = await pool.query<RecipientRow>(
		`INSERT INTO alerts.recipients (seller_id, channel, address, name)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, seller_id, channel, address, name, enabled, verified_at, created_at`,
		[input.sellerId, input.channel, input.address, input.name ?? null]
	);
	return rowToRecipient(result.rows[0]);
}

export async function updateRecipient(
	id: number,
	input: Partial<Pick<AlertRecipient, 'name' | 'enabled'>>
): Promise<AlertRecipient | null> {
	const pool = getPgPool();

	const updates: string[] = [];
	const values: unknown[] = [];
	let paramIdx = 1;

	if (input.name !== undefined) {
		updates.push(`name = $${paramIdx++}`);
		values.push(input.name);
	}
	if (input.enabled !== undefined) {
		updates.push(`enabled = $${paramIdx++}`);
		values.push(input.enabled);
	}

	if (updates.length === 0) {
		return getRecipientById(id);
	}

	values.push(id);
	const result = await pool.query<RecipientRow>(
		`UPDATE alerts.recipients
		 SET ${updates.join(', ')}
		 WHERE id = $${paramIdx}
		 RETURNING id, seller_id, channel, address, name, enabled, verified_at, created_at`,
		values
	);

	return result.rows[0] ? rowToRecipient(result.rows[0]) : null;
}

export async function deleteRecipient(id: number): Promise<boolean> {
	const pool = getPgPool();
	const result = await pool.query('DELETE FROM alerts.recipients WHERE id = $1', [id]);
	return (result.rowCount ?? 0) > 0;
}

export async function verifyRecipient(id: number): Promise<void> {
	const pool = getPgPool();
	await pool.query(`UPDATE alerts.recipients SET verified_at = NOW() WHERE id = $1`, [id]);
}
