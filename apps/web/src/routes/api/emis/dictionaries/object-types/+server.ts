import { json, type RequestHandler } from '@sveltejs/kit';

import { createObjectTypeSchema } from '@dashboard-builder/emis-contracts/emis-dictionary';
import { handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { listObjectTypes } from '@dashboard-builder/emis-server/modules/dictionaries/repository';
import { createObjectTypeService } from '@dashboard-builder/emis-server/modules/dictionaries/service';

export const GET: RequestHandler = handleEmisRoute(async () => {
	return json({ rows: await listObjectTypes() });
}, 'Failed to load EMIS object types');

export const POST: RequestHandler = handleEmisRoute(async ({ request, locals }) => {
	assertWriteContext(request, 'api', locals);
	const body = await parseJsonBody(request, createObjectTypeSchema);
	const created = await createObjectTypeService(body);
	return json(created, { status: 201 });
}, 'Failed to create EMIS object type');
