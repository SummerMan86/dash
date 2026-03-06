/**
 * Alert System Types
 *
 * Defines the core types for the alerting system:
 * - AlertCondition: what triggers an alert
 * - AlertRule: a configured alert with schedule
 * - AlertRecipient: who receives notifications
 * - NotificationChannel: how to send notifications
 */

// ============================================================================
// Condition Types
// ============================================================================

export type ComparisonOperator = '=' | '!=' | '<' | '<=' | '>' | '>=';

export type AlertCondition = {
	/** Column/metric name from the dataset */
	metric: string;
	/** Comparison operator */
	operator: ComparisonOperator;
	/** Threshold value to compare against */
	threshold: number;
	/** Additional WHERE filters (optional) */
	scope?: Record<string, unknown>;
	/** Date range for the query (optional) */
	dateRange?: {
		/** Relative date: 'now', '-7d', '-1w', '-1m' */
		from: string;
		/** Relative date: 'now', '-7d', '-1w', '-1m' */
		to: string;
	};
};

// ============================================================================
// Rule Types
// ============================================================================

export type AlertRule = {
	id: number;
	sellerId: number;
	name: string;
	description?: string;
	condition: AlertCondition;
	datasetId: string;
	scheduleCron: string;
	enabled: boolean;
	lastCheckedAt?: Date;
	lastTriggeredAt?: Date;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateAlertRuleInput = {
	sellerId: number;
	name: string;
	description?: string;
	condition: AlertCondition;
	datasetId: string;
	scheduleCron?: string;
	enabled?: boolean;
};

export type UpdateAlertRuleInput = Partial<
	Pick<AlertRule, 'name' | 'description' | 'condition' | 'scheduleCron' | 'enabled'>
>;

// ============================================================================
// Recipient Types
// ============================================================================

export type NotificationChannelType = 'telegram' | 'browser_push' | 'email';

export type AlertRecipient = {
	id: number;
	sellerId: number;
	channel: NotificationChannelType;
	/** For telegram: chat_id, for email: email address, for push: subscription JSON */
	address: string;
	name?: string;
	enabled: boolean;
	verifiedAt?: Date;
	createdAt: Date;
};

export type CreateRecipientInput = {
	sellerId: number;
	channel: NotificationChannelType;
	address: string;
	name?: string;
};

// ============================================================================
// History Types
// ============================================================================

export type AlertStatus = 'pending' | 'sent' | 'failed' | 'throttled';

export type AlertHistoryEntry = {
	id: number;
	ruleId: number;
	recipientId: number | null;
	triggeredAt: Date;
	conditionSnapshot: AlertCondition;
	matchedData?: unknown[];
	matchedCount: number;
	channel: NotificationChannelType;
	status: AlertStatus;
	sentAt?: Date;
	errorMessage?: string;
};

export type CreateHistoryInput = {
	ruleId: number;
	recipientId: number | null;
	conditionSnapshot: AlertCondition;
	matchedData?: unknown[];
	matchedCount: number;
	channel: NotificationChannelType;
	status: AlertStatus;
	errorMessage?: string;
	dedupKey?: string;
};

// ============================================================================
// Notification Channel Interface (Port)
// ============================================================================

export type NotificationPayload = {
	rule: AlertRule;
	recipient: AlertRecipient;
	matchedData: unknown[];
	matchedCount: number;
	dashboardUrl?: string;
};

export type SendResult = {
	success: boolean;
	error?: string;
};

export interface INotificationChannel {
	readonly channelType: NotificationChannelType;
	send(payload: NotificationPayload): Promise<SendResult>;
}

// ============================================================================
// Evaluation Result
// ============================================================================

export type EvaluationResult = {
	triggered: boolean;
	matchedData: unknown[];
	matchedCount: number;
	checkedAt: Date;
};
