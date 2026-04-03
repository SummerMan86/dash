/**
 * Repository for alert history (sent notifications log)
 */

import { getPgPool } from '$lib/server/db/pg';
import type {
	AlertHistoryEntry,
	CreateHistoryInput,
	AlertCondition,
	NotificationChannelType,
	AlertStatus
} from '../model/types';

type HistoryRow = {
	id: string;
	rule_id: string;
	recipient_id: string | null;
	triggered_at: Date;
	condition_snapshot: AlertCondition;
	matched_data: unknown[] | null;
	matched_count: number;
	channel: NotificationChannelType;
	status: AlertStatus;
	sent_at: Date | null;
	error_message: string | null;
};

function rowToHistory(row: HistoryRow): AlertHistoryEntry {
	return {
		id: Number(row.id),
		ruleId: Number(row.rule_id),
		recipientId: row.recipient_id ? Number(row.recipient_id) : null,
		triggeredAt: row.triggered_at,
		conditionSnapshot: row.condition_snapshot,
		matchedData: row.matched_data ?? undefined,
		matchedCount: row.matched_count,
		channel: row.channel,
		status: row.status,
		sentAt: row.sent_at ?? undefined,
		errorMessage: row.error_message ?? undefined
	};
}

export async function recordHistory(input: CreateHistoryInput): Promise<AlertHistoryEntry> {
	const pool = getPgPool();
	const result = await pool.query<HistoryRow>(
		`INSERT INTO alerts.history
		 (rule_id, recipient_id, condition_snapshot, matched_data, matched_count, channel, status, error_message, dedup_key, sent_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (rule_id, dedup_key, DATE(triggered_at)) WHERE dedup_key IS NOT NULL
		 DO UPDATE SET status = EXCLUDED.status, error_message = EXCLUDED.error_message
		 RETURNING id, rule_id, recipient_id, triggered_at, condition_snapshot, matched_data, matched_count, channel, status, sent_at, error_message`,
		[
			input.ruleId,
			input.recipientId,
			JSON.stringify(input.conditionSnapshot),
			input.matchedData ? JSON.stringify(input.matchedData) : null,
			input.matchedCount,
			input.channel,
			input.status,
			input.errorMessage ?? null,
			input.dedupKey ?? null,
			input.status === 'sent' ? new Date() : null
		]
	);
	return rowToHistory(result.rows[0]);
}

export async function getHistoryForRule(ruleId: number, limit = 100): Promise<AlertHistoryEntry[]> {
	const pool = getPgPool();
	const result = await pool.query<HistoryRow>(
		`SELECT id, rule_id, recipient_id, triggered_at, condition_snapshot,
		        matched_data, matched_count, channel, status, sent_at, error_message
		 FROM alerts.history
		 WHERE rule_id = $1
		 ORDER BY triggered_at DESC
		 LIMIT $2`,
		[ruleId, limit]
	);
	return result.rows.map(rowToHistory);
}

export async function getRecentHistory(sellerId: number, limit = 50): Promise<AlertHistoryEntry[]> {
	const pool = getPgPool();
	const result = await pool.query<HistoryRow>(
		`SELECT h.id, h.rule_id, h.recipient_id, h.triggered_at, h.condition_snapshot,
		        h.matched_data, h.matched_count, h.channel, h.status, h.sent_at, h.error_message
		 FROM alerts.history h
		 JOIN alerts.rules r ON r.id = h.rule_id
		 WHERE r.seller_id = $1
		 ORDER BY h.triggered_at DESC
		 LIMIT $2`,
		[sellerId, limit]
	);
	return result.rows.map(rowToHistory);
}

export async function updateHistoryStatus(
	historyId: number,
	status: AlertStatus,
	errorMessage?: string
): Promise<void> {
	const pool = getPgPool();
	await pool.query(
		`UPDATE alerts.history
		 SET status = $1, error_message = $2, sent_at = $3
		 WHERE id = $4`,
		[status, errorMessage ?? null, status === 'sent' ? new Date() : null, historyId]
	);
}

export async function checkDedupExists(ruleId: number, dedupKey: string): Promise<boolean> {
	const pool = getPgPool();
	const result = await pool.query(
		`SELECT 1 FROM alerts.history
		 WHERE rule_id = $1 AND dedup_key = $2 AND DATE(triggered_at) = CURRENT_DATE
		 LIMIT 1`,
		[ruleId, dedupKey]
	);
	return (result.rowCount ?? 0) > 0;
}
