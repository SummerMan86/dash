import { json, type RequestHandler } from '@sveltejs/kit';

import { updateEmisObjectSchema } from '$entities/emis-object';
import { resolveEmisWriteContext } from '$lib/server/emis/infra/audit';
import { EmisError } from '$lib/server/emis/infra/errors';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import { getObjectDetailQuery } from '$lib/server/emis/modules/objects/queries';
import {
	softDeleteObjectService,
	updateObjectService
} from '$lib/server/emis/modules/objects/service';

export const GET: RequestHandler = handleEmisRoute(async ({ params }) => {
	const id = requireUuid(params.id, 'object id');
	const object = await getObjectDetailQuery(id);
	if (!object) throw new EmisError(404, 'OBJECT_NOT_FOUND', 'Object not found');
	return json(object);
}, 'Failed to load EMIS object');

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const id = requireUuid(params.id, 'object id');
	const body = await parseJsonBody(request, updateEmisObjectSchema);
	const updated = await updateObjectService(id, body, resolveEmisWriteContext(request, 'api'));
	return json(updated);
}, 'Failed to update EMIS object');

export const DELETE: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const id = requireUuid(params.id, 'object id');
	await softDeleteObjectService(id, resolveEmisWriteContext(request, 'api'));
	return json({ ok: true });
}, 'Failed to delete EMIS object');
