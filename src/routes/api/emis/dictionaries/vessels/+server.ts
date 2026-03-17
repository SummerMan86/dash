import { json, type RequestHandler } from '@sveltejs/kit';

import { handleEmisRoute } from '$lib/server/emis/infra/http';
import { listShipRouteVessels } from '$lib/server/emis/modules/dictionaries/repository';

export const GET: RequestHandler = handleEmisRoute(async () => {
	const rows = await listShipRouteVessels();
	return json({
		rows: rows.map((row) => ({
			...row,
			vesselLabel: `${row.vesselName} · HBK ${row.shipHbkId}`
		}))
	});
}, 'Failed to load EMIS ship route vessels');
