import { z } from 'zod';

import type { EmisMapBBox } from './types';

function parseBbox(value: string): EmisMapBBox | null {
	const rawParts = value.split(',');
	if (rawParts.length !== 4) {
		return null;
	}

	const parts = rawParts.map((part) => Number(part.trim()));

	if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
		return null;
	}

	const [west, south, east, north] = parts;
	if (west < -180 || west > 180 || east < -180 || east > 180) return null;
	if (south < -90 || south > 90 || north < -90 || north > 90) return null;
	if (east <= west || north <= south) return null;

	return [west, south, east, north];
}

export const mapBboxSchema = z
	.string()
	.trim()
	.transform((value, context) => {
		const parsed = parseBbox(value);
		if (!parsed) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'bbox must be west,south,east,north in WGS84'
			});
			return z.NEVER;
		}

		return parsed;
	});

export const mapObjectsQuerySchema = z.object({
	bbox: mapBboxSchema,
	q: z.string().trim().min(1).max(255).optional(),
	objectType: z.string().uuid().optional(),
	country: z.string().trim().length(2).optional(),
	status: z.string().trim().min(1).max(50).optional(),
	limit: z.number().int().min(1).max(500).default(200)
});

export const mapNewsQuerySchema = z
	.object({
		bbox: mapBboxSchema,
		q: z.string().trim().min(1).max(255).optional(),
		source: z.string().uuid().optional(),
		country: z.string().trim().length(2).optional(),
		newsType: z.string().trim().min(1).max(100).optional(),
		dateFrom: z.string().datetime({ offset: true }).optional(),
		dateTo: z.string().datetime({ offset: true }).optional(),
		objectId: z.string().uuid().optional(),
		limit: z.number().int().min(1).max(500).default(200)
	})
	.refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
		message: 'dateFrom must be before or equal to dateTo',
		path: ['dateTo']
	});

export type MapObjectsQuerySchemaInput = z.infer<typeof mapObjectsQuerySchema>;
export type MapNewsQuerySchemaInput = z.infer<typeof mapNewsQuerySchema>;
