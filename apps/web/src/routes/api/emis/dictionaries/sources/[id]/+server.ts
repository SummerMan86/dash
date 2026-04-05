import { json, type RequestHandler } from '@sveltejs/kit';

import { updateSourceSchema } from '@dashboard-builder/emis-contracts/emis-dictionary';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { updateSourceService } from '@dashboard-builder/emis-server/modules/dictionaries/service';

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'source id');
	assertWriteContext(request, 'api', locals);
	const body = await parseJsonBody(request, updateSourceSchema);
	const updated = await updateSourceService(id, body);
	return json(updated);
}, 'Failed to update EMIS source');
