import { json, type RequestHandler } from '@sveltejs/kit';

import { createSourceSchema } from '@dashboard-builder/emis-contracts/emis-dictionary';
import { handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { listSources } from '@dashboard-builder/emis-server/modules/dictionaries/repository';
import { createSourceService } from '@dashboard-builder/emis-server/modules/dictionaries/service';

export const GET: RequestHandler = handleEmisRoute(async () => {
	return json({ rows: await listSources() });
}, 'Failed to load EMIS sources');

export const POST: RequestHandler = handleEmisRoute(async ({ request, locals }) => {
	assertWriteContext(request, 'api', locals);
	const body = await parseJsonBody(request, createSourceSchema);
	const created = await createSourceService(body);
	return json(created, { status: 201 });
}, 'Failed to create EMIS source');
