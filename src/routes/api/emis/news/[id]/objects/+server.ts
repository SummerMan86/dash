import { json, type RequestHandler } from '@sveltejs/kit';

import { attachNewsObjectsSchema } from '$entities/emis-link';
import { resolveEmisWriteContext } from '$lib/server/emis/infra/audit';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import { attachNewsObjectsService } from '$lib/server/emis/modules/links/service';

export const POST: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const newsId = requireUuid(params.id, 'news id');
	const body = await parseJsonBody(request, attachNewsObjectsSchema);
	await attachNewsObjectsService(newsId, body, resolveEmisWriteContext(request, 'api'));
	return json({ ok: true });
}, 'Failed to attach objects to EMIS news item');
