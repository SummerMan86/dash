import { json, type RequestHandler } from '@sveltejs/kit';

import { attachNewsObjectsSchema } from '@dashboard-builder/emis-contracts/emis-link';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import { attachNewsObjectsService } from '@dashboard-builder/emis-server/modules/links/service';

export const POST: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const newsId = requireUuid(params.id, 'news id');
	const body = await parseJsonBody(request, attachNewsObjectsSchema);
	await attachNewsObjectsService(newsId, body, assertWriteContext(request, 'api'));
	return json({ ok: true });
}, 'Failed to attach objects to EMIS news item');
