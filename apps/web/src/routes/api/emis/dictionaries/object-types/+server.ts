import { json, type RequestHandler } from '@sveltejs/kit';

import { handleEmisRoute } from '$lib/server/emis/infra/http';
import { listObjectTypes } from '@dashboard-builder/emis-server/modules/dictionaries/repository';

export const GET: RequestHandler = handleEmisRoute(async () => {
	return json({ rows: await listObjectTypes() });
}, 'Failed to load EMIS object types');
