import { z } from 'zod';

import { pointGeometrySchema } from '$entities/emis-geo';

const nullableShortText = z.string().trim().max(255).nullable().optional();
const nullableLongText = z.string().trim().max(5000).nullable().optional();

export const listEmisNewsQuerySchema = z.object({
	q: z.string().trim().min(1).max(255).optional(),
	source: z.string().uuid().optional(),
	country: z.string().trim().length(2).optional(),
	newsType: z.string().trim().min(1).max(100).optional(),
	dateFrom: z.string().datetime({ offset: true }).optional(),
	dateTo: z.string().datetime({ offset: true }).optional(),
	objectId: z.string().uuid().optional(),
	limit: z.number().int().min(1).max(100).default(50),
	offset: z.number().int().min(0).default(0)
});

export const createEmisNewsSchema = z.object({
	sourceId: z.string().uuid(),
	sourceItemId: nullableShortText,
	url: z.string().url().nullable().optional(),
	title: z.string().trim().min(1).max(500),
	summary: nullableLongText,
	body: nullableLongText,
	language: z.string().trim().length(2).nullable().optional(),
	publishedAt: z.string().datetime({ offset: true }),
	countryCode: z.string().trim().length(2).nullable().optional(),
	region: nullableShortText,
	newsType: z.string().trim().min(1).max(100).nullable().optional(),
	importance: z.number().int().min(1).max(5).nullable().optional(),
	geometry: pointGeometrySchema.nullable().optional(),
	isManual: z.boolean().default(false),
	meta: z.record(z.string(), z.unknown()).default({})
});

export const updateEmisNewsSchema = z
	.object({
		sourceId: z.string().uuid().optional(),
		sourceItemId: nullableShortText,
		url: z.string().url().nullable().optional(),
		title: z.string().trim().min(1).max(500).optional(),
		summary: nullableLongText,
		body: nullableLongText,
		language: z.string().trim().length(2).nullable().optional(),
		publishedAt: z.string().datetime({ offset: true }).optional(),
		countryCode: z.string().trim().length(2).nullable().optional(),
		region: nullableShortText,
		newsType: z.string().trim().min(1).max(100).nullable().optional(),
		importance: z.number().int().min(1).max(5).nullable().optional(),
		geometry: pointGeometrySchema.nullable().optional(),
		isManual: z.boolean().optional(),
		meta: z.record(z.string(), z.unknown()).optional()
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: 'At least one field is required'
	});

export type ListEmisNewsQueryInput = z.infer<typeof listEmisNewsQuerySchema>;
export type CreateEmisNewsSchemaInput = z.infer<typeof createEmisNewsSchema>;
export type UpdateEmisNewsSchemaInput = z.infer<typeof updateEmisNewsSchema>;
