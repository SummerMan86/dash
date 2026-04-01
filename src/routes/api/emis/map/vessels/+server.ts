import { json, type RequestHandler } from '@sveltejs/kit';

import { mapVesselsQuerySchema } from '$entities/emis-map';
import { EmisError } from '$lib/server/emis/infra/errors';
import {
	EMIS_DEFAULT_MAP_LIMIT,
	EMIS_MAX_MAP_LIMIT,
	handleEmisRoute,
	parseStrictIntParam
} from '$lib/server/emis/infra/http';
import { mapVesselsQuery } from '$lib/server/emis/modules/map/queries';

function parseMapVesselsQuery(url: URL) {
	const parsed = mapVesselsQuerySchema.safeParse({
		bbox: url.searchParams.get('bbox') || undefined,
		q: url.searchParams.get('q')?.trim() || undefined,
		limit: parseStrictIntParam(url.searchParams.get('limit'), EMIS_DEFAULT_MAP_LIMIT, {
			min: 1,
			max: EMIS_MAX_MAP_LIMIT,
			paramName: 'limit',
			code: 'INVALID_MAP_VESSELS_LIMIT'
		})
	});

	if (!parsed.success) {
		throw new EmisError(
			400,
			'INVALID_MAP_VESSELS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid EMIS map vessels query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseMapVesselsQuery(url);
	const featureCollection = await mapVesselsQuery(query);
	return json(featureCollection);
}, 'Failed to load EMIS map vessels');
