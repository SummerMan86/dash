/**
 * Repository for alert rules CRUD operations
 */

import { getPgPool } from '$lib/server/db/pg';
import type {
	AlertRule,
	CreateAlertRuleInput,
	UpdateAlertRuleInput,
	AlertCondition
} from '../model/types';

type RuleRow = {
	id: string;
	seller_id: string;
	name: string;
	description: string | null;
	condition: AlertCondition;
	dataset_id: string;
	schedule_cron: string;
	enabled: boolean;
	last_checked_at: Date | null;
	last_triggered_at: Date | null;
	created_at: Date;
	updated_at: Date;
};

function rowToRule(row: RuleRow): AlertRule {
	return {
		id: Number(row.id),
		sellerId: Number(row.seller_id),
		name: row.name,
		description: row.description ?? undefined,
		condition: row.condition,
		datasetId: row.dataset_id,
		scheduleCron: row.schedule_cron,
		enabled: row.enabled,
		lastCheckedAt: row.last_checked_at ?? undefined,
		lastTriggeredAt: row.last_triggered_at ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

export async function getEnabledRules(): Promise<AlertRule[]> {
	const pool = getPgPool();
	const result = await pool.query<RuleRow>(
		`SELECT id, seller_id, name, description, condition, dataset_id,
		        schedule_cron, enabled, last_checked_at, last_triggered_at,
		        created_at, updated_at
		 FROM alerts.rules
		 WHERE enabled = TRUE
		 ORDER BY last_checked_at NULLS FIRST, id`
	);
	return result.rows.map(rowToRule);
}

export async function getRulesBySeller(sellerId: number): Promise<AlertRule[]> {
	const pool = getPgPool();
	const result = await pool.query<RuleRow>(
		`SELECT id, seller_id, name, description, condition, dataset_id,
		        schedule_cron, enabled, last_checked_at, last_triggered_at,
		        created_at, updated_at
		 FROM alerts.rules
		 WHERE seller_id = $1
		 ORDER BY created_at DESC`,
		[sellerId]
	);
	return result.rows.map(rowToRule);
}

export async function getRuleById(id: number): Promise<AlertRule | null> {
	const pool = getPgPool();
	const result = await pool.query<RuleRow>(
		`SELECT id, seller_id, name, description, condition, dataset_id,
		        schedule_cron, enabled, last_checked_at, last_triggered_at,
		        created_at, updated_at
		 FROM alerts.rules
		 WHERE id = $1`,
		[id]
	);
	return result.rows[0] ? rowToRule(result.rows[0]) : null;
}

export async function createRule(input: CreateAlertRuleInput): Promise<AlertRule> {
	const pool = getPgPool();
	const result = await pool.query<RuleRow>(
		`INSERT INTO alerts.rules (seller_id, name, description, condition, dataset_id, schedule_cron, enabled)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, seller_id, name, description, condition, dataset_id,
		           schedule_cron, enabled, last_checked_at, last_triggered_at,
		           created_at, updated_at`,
		[
			input.sellerId,
			input.name,
			input.description ?? null,
			JSON.stringify(input.condition),
			input.datasetId,
			input.scheduleCron ?? '0 9 * * *',
			input.enabled ?? true
		]
	);
	return rowToRule(result.rows[0]);
}

export async function updateRule(
	id: number,
	input: UpdateAlertRuleInput
): Promise<AlertRule | null> {
	const pool = getPgPool();

	const updates: string[] = [];
	const values: unknown[] = [];
	let paramIdx = 1;

	if (input.name !== undefined) {
		updates.push(`name = $${paramIdx++}`);
		values.push(input.name);
	}
	if (input.description !== undefined) {
		updates.push(`description = $${paramIdx++}`);
		values.push(input.description);
	}
	if (input.condition !== undefined) {
		updates.push(`condition = $${paramIdx++}`);
		values.push(JSON.stringify(input.condition));
	}
	if (input.scheduleCron !== undefined) {
		updates.push(`schedule_cron = $${paramIdx++}`);
		values.push(input.scheduleCron);
	}
	if (input.enabled !== undefined) {
		updates.push(`enabled = $${paramIdx++}`);
		values.push(input.enabled);
	}

	if (updates.length === 0) {
		return getRuleById(id);
	}

	values.push(id);
	const result = await pool.query<RuleRow>(
		`UPDATE alerts.rules
		 SET ${updates.join(', ')}
		 WHERE id = $${paramIdx}
		 RETURNING id, seller_id, name, description, condition, dataset_id,
		           schedule_cron, enabled, last_checked_at, last_triggered_at,
		           created_at, updated_at`,
		values
	);

	return result.rows[0] ? rowToRule(result.rows[0]) : null;
}

export async function deleteRule(id: number): Promise<boolean> {
	const pool = getPgPool();
	const result = await pool.query('DELETE FROM alerts.rules WHERE id = $1', [id]);
	return (result.rowCount ?? 0) > 0;
}

export async function updateRuleCheckTime(ruleId: number, triggered: boolean): Promise<void> {
	const pool = getPgPool();

	if (triggered) {
		await pool.query(
			`UPDATE alerts.rules
			 SET last_checked_at = NOW(), last_triggered_at = NOW()
			 WHERE id = $1`,
			[ruleId]
		);
	} else {
		await pool.query(
			`UPDATE alerts.rules
			 SET last_checked_at = NOW()
			 WHERE id = $1`,
			[ruleId]
		);
	}
}

export async function linkRuleToRecipients(ruleId: number, recipientIds: number[]): Promise<void> {
	if (recipientIds.length === 0) return;

	const pool = getPgPool();
	const values = recipientIds.map((rid, i) => `($1, $${i + 2})`).join(', ');
	await pool.query(
		`INSERT INTO alerts.rule_recipients (rule_id, recipient_id)
		 VALUES ${values}
		 ON CONFLICT DO NOTHING`,
		[ruleId, ...recipientIds]
	);
}

export async function unlinkRuleFromRecipient(ruleId: number, recipientId: number): Promise<void> {
	const pool = getPgPool();
	await pool.query('DELETE FROM alerts.rule_recipients WHERE rule_id = $1 AND recipient_id = $2', [
		ruleId,
		recipientId
	]);
}
