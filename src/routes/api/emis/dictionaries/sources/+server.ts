import { json, type RequestHandler } from '@sveltejs/kit';

import { handleEmisRoute } from '$lib/server/emis/http';
import { listSources } from '$lib/server/emis/repositories/dictionaryRepository';

export const GET: RequestHandler = handleEmisRoute(async () => {
	return json({ rows: await listSources() });
}, 'Failed to load EMIS sources');
