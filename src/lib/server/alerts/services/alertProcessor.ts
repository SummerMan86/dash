/**
 * Alert Processor
 *
 * Main processing pipeline for alerts:
 * 1. Get enabled rules
 * 2. Evaluate conditions
 * 3. Send notifications via channels
 * 4. Record history
 */

import { getEnabledRules, updateRuleCheckTime } from '../repository/alertRuleRepository';
import { getRecipientsForRule } from '../repository/recipientRepository';
import { recordHistory } from '../repository/alertHistoryRepository';
import { evaluateCondition, generateDedupKey } from './conditionEvaluator';
import { createTelegramChannel } from '../channels/telegramChannel';
import type { INotificationChannel, NotificationPayload, AlertRule, AlertRecipient } from '../model/types';

// ============================================================================
// Channel Registry
// ============================================================================

const channels = new Map<string, INotificationChannel>();

function getChannel(channelType: string): INotificationChannel | undefined {
	if (!channels.has(channelType)) {
		switch (channelType) {
			case 'telegram':
				channels.set('telegram', createTelegramChannel());
				break;
			// Future: add browser_push, email channels here
		}
	}
	return channels.get(channelType);
}

// ============================================================================
// Dashboard URL Builder
// ============================================================================

function buildDashboardUrl(rule: AlertRule): string {
	const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';

	// Map dataset to appropriate dashboard page
	if (rule.datasetId.startsWith('wildberries.')) {
		return `${baseUrl}/dashboard/wildberries/stock-alerts`;
	}

	return `${baseUrl}/dashboard`;
}

// ============================================================================
// Single Rule Processing
// ============================================================================

async function processRule(rule: AlertRule): Promise<void> {
	console.log(`[AlertProcessor] Processing rule ${rule.id}: ${rule.name}`);

	try {
		// 1. Evaluate condition
		const evalResult = await evaluateCondition(rule);

		console.log(`[AlertProcessor] Rule ${rule.id} evaluated: triggered=${evalResult.triggered}, count=${evalResult.matchedCount}`);

		if (!evalResult.triggered) {
			// Update check time even if not triggered
			await updateRuleCheckTime(rule.id, false);
			return;
		}

		// 2. Get recipients for this rule
		const recipients = await getRecipientsForRule(rule.id);

		if (recipients.length === 0) {
			console.log(`[AlertProcessor] Rule ${rule.id}: no recipients configured`);
			await updateRuleCheckTime(rule.id, true);
			return;
		}

		// 3. Generate dedup key to prevent spam
		const dedupKey = generateDedupKey(rule, evalResult.matchedCount);

		// 4. Send to each recipient
		for (const recipient of recipients) {
			await sendToRecipient(rule, recipient, evalResult.matchedData, evalResult.matchedCount, dedupKey);
		}

		// 5. Update rule check time
		await updateRuleCheckTime(rule.id, true);

	} catch (err) {
		console.error(`[AlertProcessor] Error processing rule ${rule.id}:`, err);
		// Don't throw - continue with other rules
	}
}

async function sendToRecipient(
	rule: AlertRule,
	recipient: AlertRecipient,
	matchedData: unknown[],
	matchedCount: number,
	dedupKey: string
): Promise<void> {
	const channel = getChannel(recipient.channel);

	if (!channel) {
		console.warn(`[AlertProcessor] Channel not configured: ${recipient.channel}`);

		await recordHistory({
			ruleId: rule.id,
			recipientId: recipient.id,
			conditionSnapshot: rule.condition,
			matchedData: matchedData.slice(0, 10), // Store only sample
			matchedCount,
			channel: recipient.channel,
			status: 'failed',
			errorMessage: `Channel not configured: ${recipient.channel}`,
			dedupKey
		});

		return;
	}

	const payload: NotificationPayload = {
		rule,
		recipient,
		matchedData,
		matchedCount,
		dashboardUrl: buildDashboardUrl(rule)
	};

	const result = await channel.send(payload);

	await recordHistory({
		ruleId: rule.id,
		recipientId: recipient.id,
		conditionSnapshot: rule.condition,
		matchedData: matchedData.slice(0, 10),
		matchedCount,
		channel: recipient.channel,
		status: result.success ? 'sent' : 'failed',
		errorMessage: result.error,
		dedupKey
	});

	if (result.success) {
		console.log(`[AlertProcessor] Alert sent to ${recipient.channel}:${recipient.address}`);
	} else {
		console.error(`[AlertProcessor] Failed to send to ${recipient.channel}:${recipient.address}: ${result.error}`);
	}
}

// ============================================================================
// Main Processing Function
// ============================================================================

/**
 * Process all enabled alert rules.
 * Called by the scheduler on cron schedule.
 */
export async function processAlerts(): Promise<{ processed: number; triggered: number; errors: number }> {
	console.log('[AlertProcessor] Starting alert processing...');

	const rules = await getEnabledRules();
	console.log(`[AlertProcessor] Found ${rules.length} enabled rules`);

	let processed = 0;
	let triggered = 0;
	let errors = 0;

	for (const rule of rules) {
		try {
			const evalResult = await evaluateCondition(rule);

			if (evalResult.triggered) {
				triggered++;
			}

			await processRule(rule);
			processed++;
		} catch {
			errors++;
		}
	}

	console.log(`[AlertProcessor] Completed: processed=${processed}, triggered=${triggered}, errors=${errors}`);

	return { processed, triggered, errors };
}

/**
 * Process a single rule by ID (for testing/manual trigger)
 */
export async function processSingleRule(ruleId: number): Promise<boolean> {
	const { getRuleById } = await import('../repository/alertRuleRepository');
	const rule = await getRuleById(ruleId);

	if (!rule) {
		throw new Error(`Rule not found: ${ruleId}`);
	}

	await processRule(rule);
	return true;
}
