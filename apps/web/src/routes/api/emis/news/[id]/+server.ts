import { json, type RequestHandler } from '@sveltejs/kit';

import { updateEmisNewsSchema } from '@dashboard-builder/emis-contracts/emis-news';
import { resolveEmisWriteContext } from '@dashboard-builder/emis-server/infra/audit';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import { getNewsDetailQuery } from '@dashboard-builder/emis-server/modules/news/queries';
import { softDeleteNewsService, updateNewsService } from '@dashboard-builder/emis-server/modules/news/service';

export const GET: RequestHandler = handleEmisRoute(async ({ params }) => {
	const id = requireUuid(params.id, 'news id');
	const news = await getNewsDetailQuery(id);
	if (!news) throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
	return json(news);
}, 'Failed to load EMIS news item');

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const id = requireUuid(params.id, 'news id');
	const body = await parseJsonBody(request, updateEmisNewsSchema);
	const updated = await updateNewsService(id, body, resolveEmisWriteContext(request, 'api'));
	return json(updated);
}, 'Failed to update EMIS news item');

export const DELETE: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const id = requireUuid(params.id, 'news id');
	await softDeleteNewsService(id, resolveEmisWriteContext(request, 'api'));
	return json({ ok: true });
}, 'Failed to delete EMIS news item');
