import { json, type RequestHandler } from '@sveltejs/kit';

import { updateNewsObjectLinkSchema } from '@dashboard-builder/emis-contracts/emis-link';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import {
	deleteNewsObjectLinkService,
	updateNewsObjectLinkService
} from '@dashboard-builder/emis-server/modules/links/service';

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const newsId = requireUuid(params.id, 'news id');
	const objectId = requireUuid(params.objectId, 'object id');
	const body = await parseJsonBody(request, updateNewsObjectLinkSchema);
	await updateNewsObjectLinkService(
		newsId,
		objectId,
		body,
		assertWriteContext(request, 'api')
	);
	return json({ ok: true });
}, 'Failed to update EMIS news-object link');

export const DELETE: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const newsId = requireUuid(params.id, 'news id');
	const objectId = requireUuid(params.objectId, 'object id');
	await deleteNewsObjectLinkService(newsId, objectId, assertWriteContext(request, 'api'));
	return json({ ok: true });
}, 'Failed to delete EMIS news-object link');
