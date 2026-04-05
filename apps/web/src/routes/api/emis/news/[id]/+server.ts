import { json, type RequestHandler } from '@sveltejs/kit';

import { updateEmisNewsSchema } from '@dashboard-builder/emis-contracts/emis-news';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import { getNewsDetailQuery } from '@dashboard-builder/emis-server/modules/news/queries';
import {
	softDeleteNewsService,
	updateNewsService
} from '@dashboard-builder/emis-server/modules/news/service';

export const GET: RequestHandler = handleEmisRoute(async ({ params }) => {
	const id = requireUuid(params.id, 'news id');
	const news = await getNewsDetailQuery(id);
	if (!news) throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
	return json(news);
}, 'Failed to load EMIS news item');

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'news id');
	const body = await parseJsonBody(request, updateEmisNewsSchema);
	const updated = await updateNewsService(id, body, assertWriteContext(request, 'api', locals));
	return json(updated);
}, 'Failed to update EMIS news item');

export const DELETE: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'news id');
	await softDeleteNewsService(id, assertWriteContext(request, 'api', locals));
	return json({ ok: true });
}, 'Failed to delete EMIS news item');
