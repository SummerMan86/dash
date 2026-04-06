import { json, type RequestHandler } from '@sveltejs/kit';

import { resolveConflictSchema } from '@dashboard-builder/emis-contracts/emis-ingestion';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { isSessionAuthReady, hasMinRole, type EmisSession } from '$lib/server/emis/infra/auth';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { requireUuid } from '@dashboard-builder/emis-server/infra/http';
import { resolveConflict } from '@dashboard-builder/emis-server/modules/ingestion/service';

export const POST: RequestHandler = handleEmisRoute(async ({ request, params, locals }) => {
	// Admin-only: enforce admin role when session auth is active
	if (isSessionAuthReady()) {
		const session: EmisSession | null | undefined = locals?.emisSession;
		if (!session) throw new EmisError(401, 'UNAUTHORIZED', 'Authentication required.');
		if (!hasMinRole(session.role, 'admin')) {
			throw new EmisError(403, 'FORBIDDEN', 'Admin role required for conflict resolution.');
		}
	}

	const candidateId = requireUuid(params.id, 'Conflict ID');
	const ctx = assertWriteContext(request, 'api', locals);
	const body = await parseJsonBody(request, resolveConflictSchema);
	await resolveConflict(candidateId, body.resolution, body.targetObjectId, ctx.actorId);
	return json({ ok: true });
});
