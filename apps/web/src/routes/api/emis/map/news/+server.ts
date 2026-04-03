import { json, type RequestHandler } from '@sveltejs/kit';

import { mapNewsQuerySchema } from '@dashboard-builder/emis-contracts/emis-map';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import {
	EMIS_DEFAULT_MAP_LIMIT,
	EMIS_MAX_MAP_LIMIT,
	handleEmisRoute,
	parseStrictIntParam
} from '$lib/server/emis/infra/http';
import { mapNewsQuery } from '@dashboard-builder/emis-server/modules/map/queries';

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
		limit: parseStrictIntParam(url.searchParams.get('limit'), EMIS_DEFAULT_MAP_LIMIT, {
			min: 1,
			max: EMIS_MAX_MAP_LIMIT,
			paramName: 'limit',
			code: 'INVALID_MAP_NEWS_LIMIT'
		})
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
