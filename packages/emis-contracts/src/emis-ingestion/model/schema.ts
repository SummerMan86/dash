import { z } from 'zod';

const importRunStatusSchema = z.enum([
	'started',
	'fetching',
	'matching',
	'completed',
	'failed'
]);

const candidateStatusSchema = z.enum([
	'pending',
	'matched',
	'published',
	'held',
	'rejected',
	'error'
]);

const candidateResolutionSchema = z.enum([
	'unique',
	'duplicate_with_clear_winner',
	'possible_duplicate_low_confidence',
	'invalid_or_unmapped'
]);

export const triggerIngestionSchema = z.object({
	sourceCode: z.string().trim().min(1).max(50),
	params: z.record(z.string(), z.unknown()).optional().default({})
});

export const resolveConflictSchema = z.object({
	resolution: candidateResolutionSchema,
	targetObjectId: z.string().uuid().optional()
});

export const listBatchesQuerySchema = z.object({
	sourceCode: z.string().trim().min(1).max(50).optional(),
	status: importRunStatusSchema.optional(),
	limit: z.number().int().min(1).max(200).default(50),
	offset: z.number().int().min(0).default(0)
});

export const listBatchObjectsQuerySchema = z.object({
	status: candidateStatusSchema.optional(),
	resolution: candidateResolutionSchema.optional(),
	limit: z.number().int().min(1).max(200).default(50),
	offset: z.number().int().min(0).default(0)
});

const geometryTypeSchema = z.enum([
	'Point',
	'LineString',
	'Polygon',
	'MultiPoint',
	'MultiLineString',
	'MultiPolygon'
]);

/** Conflicts are candidates not yet published or rejected — status filter is limited accordingly. */
const conflictStatusSchema = z.enum(['pending', 'matched', 'held', 'error']);

export const listConflictsQuerySchema = z.object({
	sourceCode: z.string().trim().min(1).max(50).optional(),
	status: conflictStatusSchema.optional(),
	geometryType: geometryTypeSchema.optional(),
	mapped: z
		.enum(['true', 'false'])
		.transform((v) => v === 'true')
		.optional(),
	limit: z.number().int().min(1).max(200).default(50),
	offset: z.number().int().min(0).default(0)
});

export type TriggerIngestionSchemaInput = z.infer<typeof triggerIngestionSchema>;
export type ResolveConflictSchemaInput = z.infer<typeof resolveConflictSchema>;
export type ListBatchesQuerySchemaInput = z.infer<typeof listBatchesQuerySchema>;
export type ListBatchObjectsQuerySchemaInput = z.infer<typeof listBatchObjectsQuerySchema>;
export type ListConflictsQuerySchemaInput = z.infer<typeof listConflictsQuerySchema>;
