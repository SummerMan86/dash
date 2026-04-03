import { json, type RequestHandler } from '@sveltejs/kit';

import { handleEmisRoute } from '$lib/server/emis/infra/http';
import { listSources } from '$lib/server/emis/modules/dictionaries/repository';

export const GET: RequestHandler = handleEmisRoute(async () => {
	return json({ rows: await listSources() });
}, 'Failed to load EMIS sources');
