import { json, type RequestHandler } from '@sveltejs/kit';

import { updateObjectTypeSchema } from '@dashboard-builder/emis-contracts/emis-dictionary';
import { handleEmisRoute, parseJsonBody, requireUuid } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { updateObjectTypeService } from '@dashboard-builder/emis-server/modules/dictionaries/service';

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'object type id');
	assertWriteContext(request, 'api', locals);
	const body = await parseJsonBody(request, updateObjectTypeSchema);
	const updated = await updateObjectTypeService(id, body);
	return json(updated);
}, 'Failed to update EMIS object type');
