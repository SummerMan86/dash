import type { RequestHandler } from '@sveltejs/kit';

import { listEmisShipRoutePointsQuerySchema } from '@dashboard-builder/emis-contracts/emis-ship-route';
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
import { listShipRoutePointsQuery } from '@dashboard-builder/emis-server/modules/ship-routes/queries';

function parseShipRoutePointsQuery(url: URL) {
	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_SHIP_ROUTE_GEOMETRY_LIMIT,
		maxLimit: EMIS_MAX_SHIP_ROUTE_GEOMETRY_LIMIT,
		maxOffset: EMIS_MAX_OFFSET,
		limitCode: 'INVALID_SHIP_ROUTE_POINTS_LIMIT',
		offsetCode: 'INVALID_SHIP_ROUTE_POINTS_OFFSET'
	});

	const parsed = listEmisShipRoutePointsQuerySchema.safeParse({
		shipHbkId: parseOptionalStrictInt(url.searchParams.get('shipHbkId'), {
			paramName: 'shipHbkId',
			code: 'INVALID_SHIP_ROUTE_POINTS_QUERY',
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
			'INVALID_SHIP_ROUTE_POINTS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid ship route points query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseShipRoutePointsQuery(url);
	const rows = await listShipRoutePointsQuery(query);
	return jsonEmisList(rows, {
		limit: query.limit,
		offset: query.offset,
		sort: [
			{ field: 'fetchedAt', dir: 'asc' },
			{ field: 'pointSeqShip', dir: 'asc' }
		]
	});
}, 'Failed to load EMIS ship route points');
