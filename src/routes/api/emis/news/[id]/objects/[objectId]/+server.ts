import { json, type RequestHandler } from '@sveltejs/kit';

import { updateNewsObjectLinkSchema } from '$entities/emis-link';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/http';
import {
	deleteNewsObjectLinkService,
	updateNewsObjectLinkService
} from '$lib/server/emis/services/linkService';

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const newsId = requireUuid(params.id, 'news id');
	const objectId = requireUuid(params.objectId, 'object id');
	const body = await parseJsonBody(request, updateNewsObjectLinkSchema);
	await updateNewsObjectLinkService(newsId, objectId, body);
	return json({ ok: true });
}, 'Failed to update EMIS news-object link');

export const DELETE: RequestHandler = handleEmisRoute(async ({ params }) => {
	const newsId = requireUuid(params.id, 'news id');
	const objectId = requireUuid(params.objectId, 'object id');
	await deleteNewsObjectLinkService(newsId, objectId);
	return json({ ok: true });
}, 'Failed to delete EMIS news-object link');
