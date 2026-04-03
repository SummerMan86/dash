import type { RequestHandler } from '@sveltejs/kit';

import { listEmisObjectsQuerySchema } from '@dashboard-builder/emis-contracts/emis-object';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import {
	EMIS_DEFAULT_LIST_LIMIT,
	EMIS_MAX_LIST_LIMIT,
	EMIS_MAX_OFFSET,
	handleEmisRoute,
	jsonEmisList,
	parseListParams
} from '$lib/server/emis/infra/http';
import { listObjectsQuery } from '@dashboard-builder/emis-server/modules/objects/queries';

const OBJECTS_LIST_SORT = [
	{ field: 'name', dir: 'asc' as const },
	{ field: 'id', dir: 'asc' as const }
];

function parseSearchObjectsQuery(url: URL) {
	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_LIST_LIMIT,
		maxLimit: EMIS_MAX_LIST_LIMIT,
		maxOffset: EMIS_MAX_OFFSET,
		limitCode: 'INVALID_SEARCH_OBJECTS_LIMIT',
		offsetCode: 'INVALID_SEARCH_OBJECTS_OFFSET'
	});

	const parsed = listEmisObjectsQuerySchema.safeParse({
		q: url.searchParams.get('q')?.trim() || undefined,
		objectType: url.searchParams.get('objectType') || undefined,
		country: url.searchParams.get('country') || undefined,
		status: url.searchParams.get('status') || undefined,
		limit: paging.limit,
		offset: paging.offset
	});

	if (!parsed.success) {
		throw new EmisError(
			400,
			'INVALID_SEARCH_OBJECTS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid EMIS object search query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseSearchObjectsQuery(url);
	const rows = await listObjectsQuery(query);
	return jsonEmisList(rows, {
		limit: query.limit,
		offset: query.offset,
		sort: OBJECTS_LIST_SORT
	});
}, 'Failed to search EMIS objects');
