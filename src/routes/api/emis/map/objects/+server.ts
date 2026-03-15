import { json, type RequestHandler } from '@sveltejs/kit';

import { mapObjectsQuerySchema } from '$entities/emis-map';
import { EmisError } from '$lib/server/emis/infra/errors';
import { handleEmisRoute, parseIntParam } from '$lib/server/emis/infra/http';
import { mapObjectsQuery } from '$lib/server/emis/modules/map/queries';

function parseMapObjectsQuery(url: URL) {
	const parsed = mapObjectsQuerySchema.safeParse({
		bbox: url.searchParams.get('bbox') || undefined,
		q: url.searchParams.get('q')?.trim() || undefined,
		objectType: url.searchParams.get('objectType') || undefined,
		country: url.searchParams.get('country') || undefined,
		status: url.searchParams.get('status') || undefined,
		limit: parseIntParam(url.searchParams.get('limit'), 200, { min: 1, max: 500 })
	});

	if (!parsed.success) {
		throw new EmisError(
			400,
			'INVALID_MAP_OBJECTS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid EMIS map objects query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseMapObjectsQuery(url);
	const featureCollection = await mapObjectsQuery(query);
	return json(featureCollection);
}, 'Failed to load EMIS map objects');
