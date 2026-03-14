import { z } from 'zod';

export const emisObjectLinkSchema = z.object({
	objectId: z.string().uuid(),
	linkType: z.string().trim().min(1).max(100).default('mentioned'),
	isPrimary: z.boolean().default(false),
	confidence: z.number().min(0).max(1).nullable().optional(),
	comment: z.string().trim().max(1000).nullable().optional()
});

export const attachNewsObjectsSchema = z.object({
	links: z.array(emisObjectLinkSchema).min(1)
});

export const updateNewsObjectLinkSchema = z
	.object({
		linkType: z.string().trim().min(1).max(100).optional(),
		isPrimary: z.boolean().optional(),
		confidence: z.number().min(0).max(1).nullable().optional(),
		comment: z.string().trim().max(1000).nullable().optional()
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: 'At least one field is required'
	});

export type EmisObjectLinkInput = z.infer<typeof emisObjectLinkSchema>;
export type AttachNewsObjectsSchemaInput = z.infer<typeof attachNewsObjectsSchema>;
export type UpdateNewsObjectLinkSchemaInput = z.infer<typeof updateNewsObjectLinkSchema>;
