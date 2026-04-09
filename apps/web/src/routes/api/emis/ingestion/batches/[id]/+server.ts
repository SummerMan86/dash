import { json, type RequestHandler } from '@sveltejs/kit';

import { isSessionAuthReady, type EmisSession } from '$lib/server/emis/infra/auth';
import { handleEmisRoute } from '$lib/server/emis/infra/http';
import { requireUuid } from '@dashboard-builder/emis-server/infra/http';
import { getImportRunDetail } from '@dashboard-builder/emis-server/modules/ingestion/queries';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';

export const GET: RequestHandler = handleEmisRoute(async ({ params, locals }) => {
	if (isSessionAuthReady()) {
		const session: EmisSession | null | undefined = locals?.emisSession;
		if (!session) throw new EmisError(401, 'UNAUTHORIZED', 'Authentication required.');
	}

	const id = requireUuid(params.id, 'Batch ID');
	const run = await getImportRunDetail(id);
	if (!run) throw new EmisError(404, 'BATCH_NOT_FOUND', 'Batch not found');
	return json(run);
});
