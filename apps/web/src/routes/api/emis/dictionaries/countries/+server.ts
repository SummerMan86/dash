import { json, type RequestHandler } from '@sveltejs/kit';

import { handleEmisRoute } from '$lib/server/emis/infra/http';
import { listCountries } from '$lib/server/emis/modules/dictionaries/repository';

export const GET: RequestHandler = handleEmisRoute(async () => {
	return json({ rows: await listCountries() });
}, 'Failed to load EMIS countries');
