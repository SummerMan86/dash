import { json, type RequestHandler } from '@sveltejs/kit';

import { updateEmisObjectSchema } from '@dashboard-builder/emis-contracts/emis-object';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import { getObjectDetailQuery } from '@dashboard-builder/emis-server/modules/objects/queries';
import {
	softDeleteObjectService,
	updateObjectService
} from '@dashboard-builder/emis-server/modules/objects/service';

export const GET: RequestHandler = handleEmisRoute(async ({ params }) => {
	const id = requireUuid(params.id, 'object id');
	const object = await getObjectDetailQuery(id);
	if (!object) throw new EmisError(404, 'OBJECT_NOT_FOUND', 'Object not found');
	return json(object);
}, 'Failed to load EMIS object');

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'object id');
	const body = await parseJsonBody(request, updateEmisObjectSchema);
	const updated = await updateObjectService(id, body, assertWriteContext(request, 'api', locals));
	return json(updated);
}, 'Failed to update EMIS object');

export const DELETE: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'object id');
	await softDeleteObjectService(id, assertWriteContext(request, 'api', locals));
	return json({ ok: true });
}, 'Failed to delete EMIS object');
