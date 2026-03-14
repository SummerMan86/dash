import { json, type RequestHandler } from '@sveltejs/kit';

import { updateEmisObjectSchema } from '$entities/emis-object';
import { EmisError } from '$lib/server/emis/errors';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/http';
import { getObjectDetailQuery } from '$lib/server/emis/queries/objectQueries';
import {
	softDeleteObjectService,
	updateObjectService
} from '$lib/server/emis/services/objectService';

export const GET: RequestHandler = handleEmisRoute(async ({ params }) => {
	const id = requireUuid(params.id, 'object id');
	const object = await getObjectDetailQuery(id);
	if (!object) throw new EmisError(404, 'OBJECT_NOT_FOUND', 'Object not found');
	return json(object);
}, 'Failed to load EMIS object');

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const id = requireUuid(params.id, 'object id');
	const body = await parseJsonBody(request, updateEmisObjectSchema);
	const updated = await updateObjectService(id, body);
	return json(updated);
}, 'Failed to update EMIS object');

export const DELETE: RequestHandler = handleEmisRoute(async ({ params }) => {
	const id = requireUuid(params.id, 'object id');
	await softDeleteObjectService(id);
	return json({ ok: true });
}, 'Failed to delete EMIS object');
