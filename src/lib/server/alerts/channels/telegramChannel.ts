/**
 * Telegram Notification Channel
 *
 * Sends alert notifications via Telegram Bot API.
 * Requires TELEGRAM_BOT_TOKEN environment variable.
 */

import type { INotificationChannel, NotificationPayload, SendResult, AlertCondition } from '../model/types';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

// ============================================================================
// Message Formatting
// ============================================================================

function formatOperator(op: string): string {
	const opMap: Record<string, string> = {
		'=': '=',
		'!=': '≠',
		'<': '<',
		'<=': '≤',
		'>': '>',
		'>=': '≥'
	};
	return opMap[op] || op;
}

function formatCondition(condition: AlertCondition): string {
	return `${condition.metric} ${formatOperator(condition.operator)} ${condition.threshold}`;
}

function formatMatchedItem(item: Record<string, unknown>, index: number): string {
	// Pick most relevant fields for display
	const relevantKeys = ['nm_id', 'title', 'vendor_code', 'brand_name', 'office_name', 'stock_count', 'lost_orders_sum'];
	const displayParts: string[] = [];

	for (const key of relevantKeys) {
		if (key in item && item[key] !== null && item[key] !== undefined) {
			const value = item[key];
			// Truncate long strings
			const displayValue = typeof value === 'string' && value.length > 30
				? value.substring(0, 30) + '...'
				: String(value);
			displayParts.push(`${key}: ${displayValue}`);
		}
	}

	// If no relevant keys found, show first 3 entries
	if (displayParts.length === 0) {
		const entries = Object.entries(item).slice(0, 3);
		for (const [key, value] of entries) {
			displayParts.push(`${key}: ${value}`);
		}
	}

	return `${index + 1}. ${displayParts.join(', ')}`;
}

function formatMessage(payload: NotificationPayload): string {
	const { rule, matchedData, matchedCount, dashboardUrl } = payload;

	const lines: string[] = [
		`🔔 *Alert: ${escapeMarkdown(rule.name)}*`,
		'',
		`📊 Condition: \`${formatCondition(rule.condition)}\``,
		`📁 Dataset: \`${rule.datasetId}\``,
		`📈 Matched items: *${matchedCount}*`
	];

	// Add sample of matched data (first 5 items)
	if (matchedData.length > 0) {
		lines.push('', '📋 *Sample:*');

		const sample = matchedData.slice(0, 5);
		for (let i = 0; i < sample.length; i++) {
			const item = sample[i] as Record<string, unknown>;
			lines.push(escapeMarkdown(formatMatchedItem(item, i)));
		}

		if (matchedCount > 5) {
			lines.push(`_... and ${matchedCount - 5} more_`);
		}
	}

	// Add dashboard link
	if (dashboardUrl) {
		lines.push('', `🔗 [Open Dashboard](${dashboardUrl})`);
	}

	lines.push('', `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`);

	return lines.join('\n');
}

function escapeMarkdown(text: string): string {
	// Escape special characters for Telegram Markdown
	return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// ============================================================================
// Telegram Channel Implementation
// ============================================================================

export function createTelegramChannel(): INotificationChannel {
	const botToken = process.env.TELEGRAM_BOT_TOKEN;

	if (!botToken) {
		console.warn('[TelegramChannel] TELEGRAM_BOT_TOKEN not set, channel disabled');
	}

	return {
		channelType: 'telegram',

		async send(payload: NotificationPayload): Promise<SendResult> {
			if (!botToken) {
				return {
					success: false,
					error: 'TELEGRAM_BOT_TOKEN not configured'
				};
			}

			const chatId = payload.recipient.address;
			const text = formatMessage(payload);

			try {
				const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/sendMessage`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						chat_id: chatId,
						text,
						parse_mode: 'MarkdownV2',
						disable_web_page_preview: true
					})
				});

				if (!response.ok) {
					const errorText = await response.text();
					let errorDetail: string;

					try {
						const errorJson = JSON.parse(errorText);
						errorDetail = errorJson.description || errorText;
					} catch {
						errorDetail = errorText;
					}

					return {
						success: false,
						error: `Telegram API error ${response.status}: ${errorDetail}`
					};
				}

				const result = await response.json();

				if (!result.ok) {
					return {
						success: false,
						error: `Telegram error: ${result.description || 'Unknown error'}`
					};
				}

				return { success: true };
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : 'Unknown error sending to Telegram'
				};
			}
		}
	};
}

// ============================================================================
// Utility: Send test message
// ============================================================================

export async function sendTestMessage(chatId: string, message: string): Promise<SendResult> {
	const botToken = process.env.TELEGRAM_BOT_TOKEN;

	if (!botToken) {
		return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
	}

	try {
		const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: message,
				parse_mode: 'MarkdownV2'
			})
		});

		if (!response.ok) {
			const error = await response.text();
			return { success: false, error: `Telegram API: ${response.status} ${error}` };
		}

		return { success: true };
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}
