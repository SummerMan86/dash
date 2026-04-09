import { z } from 'zod';

const coordinatePair = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const pointGeometrySchema = z.object({
	type: z.literal('Point'),
	coordinates: z
		.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
		.refine(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat), {
			message: 'Point coordinates must be finite numbers'
		})
});

const lineStringGeometrySchema = z.object({
	type: z.literal('LineString'),
	coordinates: z.array(coordinatePair).min(2)
});

const polygonGeometrySchema = z.object({
	type: z.literal('Polygon'),
	coordinates: z.array(z.array(coordinatePair).min(4))
});

const multiPointGeometrySchema = z.object({
	type: z.literal('MultiPoint'),
	coordinates: z.array(coordinatePair).min(1)
});

const multiLineStringGeometrySchema = z.object({
	type: z.literal('MultiLineString'),
	coordinates: z.array(z.array(coordinatePair).min(2)).min(1)
});

const multiPolygonGeometrySchema = z.object({
	type: z.literal('MultiPolygon'),
	coordinates: z.array(z.array(z.array(coordinatePair).min(4))).min(1)
});

export const geometrySchema = z.discriminatedUnion('type', [
	pointGeometrySchema,
	lineStringGeometrySchema,
	polygonGeometrySchema,
	multiPointGeometrySchema,
	multiLineStringGeometrySchema,
	multiPolygonGeometrySchema
]);

export type PointGeometryInput = z.infer<typeof pointGeometrySchema>;
export type GeometryInput = z.infer<typeof geometrySchema>;
