import { z } from 'zod';

const routeDateTimeSchema = z.string().datetime({ offset: true });

export const listEmisShipRouteVesselsQuerySchema = z.object({
	q: z.string().trim().min(1).max(255).optional(),
	limit: z.number().int().min(1).max(500).default(250),
	offset: z.number().int().min(0).default(0)
});

const shipRouteBaseQuerySchema = z
	.object({
		shipHbkId: z.number().int().positive(),
		dateFrom: routeDateTimeSchema.optional(),
		dateTo: routeDateTimeSchema.optional(),
		limit: z.number().int().min(1).max(5000).default(5000),
		offset: z.number().int().min(0).default(0)
	})
	.refine(
		(value) =>
			!value.dateFrom ||
			!value.dateTo ||
			new Date(value.dateFrom).getTime() <= new Date(value.dateTo).getTime(),
		{
			message: 'dateFrom must be less than or equal to dateTo'
		}
	);

export const listEmisShipRoutePointsQuerySchema = shipRouteBaseQuerySchema;
export const listEmisShipRouteSegmentsQuerySchema = shipRouteBaseQuerySchema;

export type ListEmisShipRouteVesselsQueryInput = z.infer<
	typeof listEmisShipRouteVesselsQuerySchema
>;
export type ListEmisShipRoutePointsQueryInput = z.infer<typeof listEmisShipRoutePointsQuerySchema>;
export type ListEmisShipRouteSegmentsQueryInput = z.infer<
	typeof listEmisShipRouteSegmentsQuerySchema
>;
