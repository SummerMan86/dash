import { json, type RequestHandler } from '@sveltejs/kit';

import { mapNewsQuerySchema } from '$entities/emis-map';
import { EmisError } from '$lib/server/emis/infra/errors';
import { handleEmisRoute, parseIntParam } from '$lib/server/emis/infra/http';
import { mapNewsQuery } from '$lib/server/emis/modules/map/queries';

function parseMapNewsQuery(url: URL) {
	const parsed = mapNewsQuerySchema.safeParse({
		bbox: url.searchParams.get('bbox') || undefined,
		q: url.searchParams.get('q')?.trim() || undefined,
		source: url.searchParams.get('source') || undefined,
		country: url.searchParams.get('country') || undefined,
		newsType: url.searchParams.get('newsType') || undefined,
		dateFrom: url.searchParams.get('dateFrom') || undefined,
		dateTo: url.searchParams.get('dateTo') || undefined,
		objectId: url.searchParams.get('objectId') || undefined,
		limit: parseIntParam(url.searchParams.get('limit'), 200, { min: 1, max: 500 })
	});

	if (!parsed.success) {
		throw new EmisError(
			400,
			'INVALID_MAP_NEWS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid EMIS map news query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseMapNewsQuery(url);
	const featureCollection = await mapNewsQuery(query);
	return json(featureCollection);
}, 'Failed to load EMIS map news');
