import { z } from 'zod';

export const pointGeometrySchema = z.object({
	type: z.literal('Point'),
	coordinates: z
		.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
		.refine(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat), {
			message: 'Point coordinates must be finite numbers'
		})
});

export type PointGeometryInput = z.infer<typeof pointGeometrySchema>;
