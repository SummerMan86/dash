import type { RequestHandler } from '@sveltejs/kit';

import { listEmisShipRouteVesselsQuerySchema } from '@dashboard-builder/emis-contracts/emis-ship-route';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import {
	EMIS_DEFAULT_SHIP_ROUTE_VESSELS_LIMIT,
	EMIS_MAX_OFFSET,
	EMIS_MAX_SHIP_ROUTE_VESSELS_LIMIT,
	handleEmisRoute,
	jsonEmisList,
	parseListParams
} from '$lib/server/emis/infra/http';
import { listShipRouteVesselsQuery } from '@dashboard-builder/emis-server/modules/ship-routes/queries';

const SHIP_ROUTE_VESSEL_SORT = [
	{ field: 'lastFetchedAt', dir: 'desc' as const },
	{ field: 'shipHbkId', dir: 'asc' as const }
];

function parseShipRouteVesselsQuery(url: URL) {
	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_SHIP_ROUTE_VESSELS_LIMIT,
		maxLimit: EMIS_MAX_SHIP_ROUTE_VESSELS_LIMIT,
		maxOffset: EMIS_MAX_OFFSET,
		limitCode: 'INVALID_SHIP_ROUTE_VESSELS_LIMIT',
		offsetCode: 'INVALID_SHIP_ROUTE_VESSELS_OFFSET'
	});

	const rawBbox = url.searchParams.get('bbox')?.trim() || undefined;

	const parsed = listEmisShipRouteVesselsQuerySchema.safeParse({
		q: url.searchParams.get('q')?.trim() || undefined,
		bbox: rawBbox,
		limit: paging.limit,
		offset: paging.offset
	});

	if (!parsed.success) {
		throw new EmisError(
			400,
			'INVALID_SHIP_ROUTE_VESSELS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid ship route vessels query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseShipRouteVesselsQuery(url);
	const rows = await listShipRouteVesselsQuery(query);

	return jsonEmisList(
		rows.map((row) => ({
			...row,
			vesselLabel: `${row.vesselName} · HBK ${row.shipHbkId}`
		})),
		{
			limit: query.limit,
			offset: query.offset,
			sort: SHIP_ROUTE_VESSEL_SORT
		}
	);
}, 'Failed to load EMIS ship route vessels');
