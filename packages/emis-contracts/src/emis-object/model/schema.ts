import { z } from 'zod';

import { pointGeometrySchema } from '../../emis-geo';

const nullableShortText = z.string().trim().max(255).nullable().optional();
const nullableLongText = z.string().trim().max(5000).nullable().optional();
const jsonRecordSchema = z.record(z.string(), z.unknown()).default({});
const statusSchema = z.enum(['active', 'inactive', 'planned', 'archived']);

export const listEmisObjectsQuerySchema = z.object({
	q: z.string().trim().min(1).max(255).optional(),
	objectType: z.string().uuid().optional(),
	country: z.string().trim().length(2).optional(),
	status: z.string().trim().min(1).max(50).optional(),
	limit: z.number().int().min(1).max(200).default(50),
	offset: z.number().int().min(0).default(0)
});

export const createEmisObjectSchema = z.object({
	externalId: nullableShortText,
	objectTypeId: z.string().uuid(),
	name: z.string().trim().min(1).max(255),
	nameEn: nullableShortText,
	countryCode: z.string().trim().length(2).nullable().optional(),
	region: nullableShortText,
	status: statusSchema.default('active'),
	operatorName: nullableShortText,
	description: nullableLongText,
	attributes: jsonRecordSchema,
	geometry: pointGeometrySchema,
	sourceNote: nullableLongText
});

export const updateEmisObjectSchema = z
	.object({
		externalId: nullableShortText,
		objectTypeId: z.string().uuid().optional(),
		name: z.string().trim().min(1).max(255).optional(),
		nameEn: nullableShortText,
		countryCode: z.string().trim().length(2).nullable().optional(),
		region: nullableShortText,
		status: statusSchema.optional(),
		operatorName: nullableShortText,
		description: nullableLongText,
		attributes: z.record(z.string(), z.unknown()).optional(),
		geometry: pointGeometrySchema.optional(),
		sourceNote: nullableLongText
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: 'At least one field is required'
	});

export type ListEmisObjectsQueryInput = z.infer<typeof listEmisObjectsQuerySchema>;
export type CreateEmisObjectSchemaInput = z.infer<typeof createEmisObjectSchema>;
export type UpdateEmisObjectSchemaInput = z.infer<typeof updateEmisObjectSchema>;
