import { json, type RequestHandler } from '@sveltejs/kit';

import { attachNewsObjectsSchema } from '$entities/emis-link';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/http';
import { attachNewsObjectsService } from '$lib/server/emis/services/linkService';

export const POST: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const newsId = requireUuid(params.id, 'news id');
	const body = await parseJsonBody(request, attachNewsObjectsSchema);
	await attachNewsObjectsService(newsId, body);
	return json({ ok: true });
}, 'Failed to attach objects to EMIS news item');
