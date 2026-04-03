/**
 * Alert System - Public API
 *
 * Re-exports for convenient imports:
 * import { startAlertScheduler, createRule } from '$lib/server/alerts';
 */

// Types
export type {
	AlertRule,
	AlertCondition,
	AlertRecipient,
	AlertHistoryEntry,
	AlertStatus,
	NotificationChannelType,
	CreateAlertRuleInput,
	UpdateAlertRuleInput,
	CreateRecipientInput,
	EvaluationResult,
	NotificationPayload,
	SendResult,
	INotificationChannel
} from './model/types';

// Schemas (for validation)
export {
	alertConditionSchema,
	createAlertRuleSchema,
	updateAlertRuleSchema,
	createRecipientSchema
} from './model/schema';

// Repositories
export {
	getEnabledRules,
	getRulesBySeller,
	getRuleById,
	createRule,
	updateRule,
	deleteRule,
	linkRuleToRecipients,
	unlinkRuleFromRecipient
} from './repository/alertRuleRepository';

export {
	getRecipientsBySeller,
	getRecipientsForRule,
	getRecipientById,
	createRecipient,
	updateRecipient,
	deleteRecipient,
	verifyRecipient
} from './repository/recipientRepository';

export {
	recordHistory,
	getHistoryForRule,
	getRecentHistory
} from './repository/alertHistoryRepository';

// Services
export { evaluateCondition, generateDedupKey } from './services/conditionEvaluator';
export { processAlerts, processSingleRule } from './services/alertProcessor';
export {
	startAlertScheduler,
	stopAlertScheduler,
	isSchedulerRunning,
	triggerAlertCheck,
	getSchedulerStatus
} from './services/alertScheduler';

// Channels
export { createTelegramChannel, sendTestMessage } from './channels/telegramChannel';
