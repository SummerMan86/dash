import type { RequestHandler } from '@sveltejs/kit';

import { listBatchObjectsQuerySchema } from '@dashboard-builder/emis-contracts/emis-ingestion';
import { isSessionAuthReady, type EmisSession } from '$lib/server/emis/infra/auth';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import {
	EMIS_DEFAULT_LIST_LIMIT,
	EMIS_MAX_LIST_LIMIT,
	EMIS_MAX_OFFSET,
	handleEmisRoute,
	jsonEmisList,
	parseListParams
} from '$lib/server/emis/infra/http';
import { requireUuid } from '@dashboard-builder/emis-server/infra/http';
import { listRunCandidates } from '@dashboard-builder/emis-server/modules/ingestion/queries';

const CANDIDATE_SORT = [{ field: 'createdAt', dir: 'desc' as const }];

export const GET: RequestHandler = handleEmisRoute(async ({ url, params, locals }) => {
	if (isSessionAuthReady()) {
		const session: EmisSession | null | undefined = locals?.emisSession;
		if (!session) throw new EmisError(401, 'UNAUTHORIZED', 'Authentication required.');
	}

	const runId = requireUuid(params.id, 'Batch ID');
	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_LIST_LIMIT,
		maxLimit: EMIS_MAX_LIST_LIMIT,
		maxOffset: EMIS_MAX_OFFSET
	});

	const filters = listBatchObjectsQuerySchema.parse({
		status: url.searchParams.get('status') ?? undefined,
		resolution: url.searchParams.get('resolution') ?? undefined,
		limit: paging.limit,
		offset: paging.offset
	});

	const rows = await listRunCandidates(runId, filters);
	return jsonEmisList(rows, { ...paging, sort: CANDIDATE_SORT });
});
