import { json, type RequestHandler } from '@sveltejs/kit';

import { createCountrySchema } from '@dashboard-builder/emis-contracts/emis-dictionary';
import { handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { listCountries } from '@dashboard-builder/emis-server/modules/dictionaries/repository';
import { createCountryService } from '@dashboard-builder/emis-server/modules/dictionaries/service';

export const GET: RequestHandler = handleEmisRoute(async () => {
	return json({ rows: await listCountries() });
}, 'Failed to load EMIS countries');

export const POST: RequestHandler = handleEmisRoute(async ({ request, locals }) => {
	assertWriteContext(request, 'api', locals);
	const body = await parseJsonBody(request, createCountrySchema);
	const created = await createCountryService(body);
	return json(created, { status: 201 });
}, 'Failed to create EMIS country');
