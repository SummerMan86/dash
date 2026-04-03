import type { RequestHandler } from '@sveltejs/kit';

import { listEmisShipRouteSegmentsQuerySchema } from '@dashboard-builder/emis-contracts/emis-ship-route';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import {
	EMIS_DEFAULT_SHIP_ROUTE_GEOMETRY_LIMIT,
	EMIS_MAX_OFFSET,
	EMIS_MAX_SHIP_ROUTE_GEOMETRY_LIMIT,
	handleEmisRoute,
	jsonEmisList,
	parseListParams,
	parseOptionalStrictInt
} from '$lib/server/emis/infra/http';
import { listShipRouteSegmentsQuery } from '@dashboard-builder/emis-server/modules/ship-routes/queries';

function parseShipRouteSegmentsQuery(url: URL) {
	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_SHIP_ROUTE_GEOMETRY_LIMIT,
		maxLimit: EMIS_MAX_SHIP_ROUTE_GEOMETRY_LIMIT,
		maxOffset: EMIS_MAX_OFFSET,
		limitCode: 'INVALID_SHIP_ROUTE_SEGMENTS_LIMIT',
		offsetCode: 'INVALID_SHIP_ROUTE_SEGMENTS_OFFSET'
	});

	const parsed = listEmisShipRouteSegmentsQuerySchema.safeParse({
		shipHbkId: parseOptionalStrictInt(url.searchParams.get('shipHbkId'), {
			paramName: 'shipHbkId',
			code: 'INVALID_SHIP_ROUTE_SEGMENTS_QUERY',
			min: 1
		}),
		dateFrom: url.searchParams.get('dateFrom') || undefined,
		dateTo: url.searchParams.get('dateTo') || undefined,
		limit: paging.limit,
		offset: paging.offset
	});

	if (!parsed.success) {
		throw new EmisError(
			400,
			'INVALID_SHIP_ROUTE_SEGMENTS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid ship route segments query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseShipRouteSegmentsQuery(url);
	const rows = await listShipRouteSegmentsQuery(query);
	return jsonEmisList(rows, {
		limit: query.limit,
		offset: query.offset,
		sort: [
			{ field: 'fromFetchedAt', dir: 'asc' },
			{ field: 'segmentSeqShip', dir: 'asc' }
		]
	});
}, 'Failed to load EMIS ship route segments');
