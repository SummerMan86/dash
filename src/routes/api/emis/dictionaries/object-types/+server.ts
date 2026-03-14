import { json, type RequestHandler } from '@sveltejs/kit';

import { handleEmisRoute } from '$lib/server/emis/http';
import { listObjectTypes } from '$lib/server/emis/repositories/dictionaryRepository';

export const GET: RequestHandler = handleEmisRoute(async () => {
	return json({ rows: await listObjectTypes() });
}, 'Failed to load EMIS object types');
