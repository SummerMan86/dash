import type { RequestHandler } from '@sveltejs/kit';

import { listBatchesQuerySchema } from '@dashboard-builder/emis-contracts/emis-ingestion';
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
import { listImportRuns } from '@dashboard-builder/emis-server/modules/ingestion/queries';

const BATCH_SORT = [{ field: 'startedAt', dir: 'desc' as const }];

export const GET: RequestHandler = handleEmisRoute(async ({ url, locals }) => {
	if (isSessionAuthReady()) {
		const session: EmisSession | null | undefined = locals?.emisSession;
		if (!session) throw new EmisError(401, 'UNAUTHORIZED', 'Authentication required.');
	}

	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_LIST_LIMIT,
		maxLimit: EMIS_MAX_LIST_LIMIT,
		maxOffset: EMIS_MAX_OFFSET
	});

	const filters = listBatchesQuerySchema.parse({
		sourceCode: url.searchParams.get('sourceCode') ?? undefined,
		status: url.searchParams.get('status') ?? undefined,
		limit: paging.limit,
		offset: paging.offset
	});

	const rows = await listImportRuns(filters);
	return jsonEmisList(rows, { ...paging, sort: BATCH_SORT });
});
