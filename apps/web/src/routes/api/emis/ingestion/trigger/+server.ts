import { json, type RequestHandler } from '@sveltejs/kit';

import { triggerIngestionSchema } from '@dashboard-builder/emis-contracts/emis-ingestion';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { isSessionAuthReady, hasMinRole, type EmisSession } from '$lib/server/emis/infra/auth';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { triggerIngestion } from '@dashboard-builder/emis-server/modules/ingestion/service';

export const POST: RequestHandler = handleEmisRoute(async ({ request, locals }) => {
	// Admin-only: enforce admin role when session auth is active
	if (isSessionAuthReady()) {
		const session: EmisSession | null | undefined = locals?.emisSession;
		if (!session) throw new EmisError(401, 'UNAUTHORIZED', 'Authentication required.');
		if (!hasMinRole(session.role, 'admin')) {
			throw new EmisError(403, 'FORBIDDEN', 'Admin role required for ingestion trigger.');
		}
	}

	const ctx = assertWriteContext(request, 'api', locals);
	const body = await parseJsonBody(request, triggerIngestionSchema);
	const runId = await triggerIngestion(body, ctx.actorId);
	return json({ id: runId }, { status: 201 });
});
