/**
 * Zod validation schemas for alert system
 */

import { z } from 'zod';

// ============================================================================
// Condition Schema
// ============================================================================

export const comparisonOperatorSchema = z.enum(['=', '!=', '<', '<=', '>', '>=']);

export const alertConditionSchema = z.object({
	metric: z.string().min(1),
	operator: comparisonOperatorSchema,
	threshold: z.number(),
	scope: z.record(z.unknown()).optional(),
	dateRange: z
		.object({
			from: z.string(),
			to: z.string()
		})
		.optional()
});

// ============================================================================
// Rule Schemas
// ============================================================================

export const createAlertRuleSchema = z.object({
	sellerId: z.number().int().positive(),
	name: z.string().min(1).max(255),
	description: z.string().max(1000).optional(),
	condition: alertConditionSchema,
	datasetId: z.string().min(1),
	scheduleCron: z.string().default('0 9 * * *'),
	enabled: z.boolean().default(true)
});

export const updateAlertRuleSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	description: z.string().max(1000).optional(),
	condition: alertConditionSchema.optional(),
	scheduleCron: z.string().optional(),
	enabled: z.boolean().optional()
});

// ============================================================================
// Recipient Schemas
// ============================================================================

export const notificationChannelSchema = z.enum(['telegram', 'browser_push', 'email']);

export const createRecipientSchema = z.object({
	sellerId: z.number().int().positive(),
	channel: notificationChannelSchema,
	address: z.string().min(1),
	name: z.string().max(255).optional()
});

// ============================================================================
// Type exports from schemas
// ============================================================================

export type AlertConditionInput = z.infer<typeof alertConditionSchema>;
export type CreateAlertRuleSchemaInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleSchemaInput = z.infer<typeof updateAlertRuleSchema>;
export type CreateRecipientSchemaInput = z.infer<typeof createRecipientSchema>;
