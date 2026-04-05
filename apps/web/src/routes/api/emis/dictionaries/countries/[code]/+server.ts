import { json, type RequestHandler } from '@sveltejs/kit';

import { updateCountrySchema } from '@dashboard-builder/emis-contracts/emis-dictionary';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { updateCountryService } from '@dashboard-builder/emis-server/modules/dictionaries/service';

function requireCountryCode(value: string | undefined): string {
	if (!value || value.trim().length !== 2) {
		throw new EmisError(400, 'INVALID_ID', 'Invalid country code');
	}
	return value.trim().toUpperCase();
}

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request }) => {
	const code = requireCountryCode(params.code);
	assertWriteContext(request, 'api');
	const body = await parseJsonBody(request, updateCountrySchema);
	const updated = await updateCountryService(code, body);
	return json(updated);
}, 'Failed to update EMIS country');
