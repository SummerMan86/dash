import { z } from 'zod';

// --- Countries ---

export const createCountrySchema = z.object({
	code: z.string().trim().length(2, 'Country code must be exactly 2 characters').toUpperCase(),
	nameRu: z.string().trim().min(1, 'nameRu is required').max(255),
	nameEn: z.string().trim().min(1, 'nameEn is required').max(255)
});

export const updateCountrySchema = z
	.object({
		nameRu: z.string().trim().min(1).max(255).optional(),
		nameEn: z.string().trim().min(1).max(255).optional()
	})
	.refine((v) => Object.keys(v).length > 0, {
		message: 'At least one field is required'
	});

// --- Object Types ---

export const createObjectTypeSchema = z.object({
	code: z.string().trim().min(1, 'code is required').max(100),
	name: z.string().trim().min(1, 'name is required').max(255),
	geometryKind: z.enum(['point', 'linestring', 'polygon', 'mixed']),
	iconKey: z.string().trim().max(100).nullable().optional()
});

export const updateObjectTypeSchema = z
	.object({
		code: z.string().trim().min(1).max(100).optional(),
		name: z.string().trim().min(1).max(255).optional(),
		geometryKind: z.enum(['point', 'linestring', 'polygon', 'mixed']).optional(),
		iconKey: z.string().trim().max(100).nullable().optional()
	})
	.refine((v) => Object.keys(v).length > 0, {
		message: 'At least one field is required'
	});

// --- Sources ---

export const createSourceSchema = z.object({
	code: z.string().trim().min(1, 'code is required').max(100),
	name: z.string().trim().min(1, 'name is required').max(255),
	kind: z.string().trim().min(1, 'kind is required').max(100),
	baseUrl: z.string().trim().url().max(2048).nullable().optional(),
	isActive: z.boolean().default(true)
});

export const updateSourceSchema = z
	.object({
		code: z.string().trim().min(1).max(100).optional(),
		name: z.string().trim().min(1).max(255).optional(),
		kind: z.string().trim().min(1).max(100).optional(),
		baseUrl: z.string().trim().url().max(2048).nullable().optional(),
		isActive: z.boolean().optional()
	})
	.refine((v) => Object.keys(v).length > 0, {
		message: 'At least one field is required'
	});

// Inferred types
export type CreateCountryInput = z.infer<typeof createCountrySchema>;
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>;
export type CreateObjectTypeInput = z.infer<typeof createObjectTypeSchema>;
export type UpdateObjectTypeInput = z.infer<typeof updateObjectTypeSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
