import { json, type RequestHandler } from '@sveltejs/kit';

import {
	createEmisObjectSchema,
	listEmisObjectsQuerySchema
} from '@dashboard-builder/emis-contracts/emis-object';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import {
	EMIS_DEFAULT_LIST_LIMIT,
	EMIS_MAX_LIST_LIMIT,
	EMIS_MAX_OFFSET,
	handleEmisRoute,
	jsonEmisList,
	parseListParams,
	parseJsonBody
} from '$lib/server/emis/infra/http';
import { listObjectsQuery } from '@dashboard-builder/emis-server/modules/objects/queries';
import { createObjectService } from '@dashboard-builder/emis-server/modules/objects/service';

const OBJECTS_LIST_SORT = [
	{ field: 'name', dir: 'asc' as const },
	{ field: 'id', dir: 'asc' as const }
];

function parseListQuery(url: URL) {
	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_LIST_LIMIT,
		maxLimit: EMIS_MAX_LIST_LIMIT,
		maxOffset: EMIS_MAX_OFFSET,
		limitCode: 'INVALID_OBJECTS_LIMIT',
		offsetCode: 'INVALID_OBJECTS_OFFSET'
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
			'INVALID_OBJECTS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid objects query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseListQuery(url);
	const rows = await listObjectsQuery(query);
	return jsonEmisList(rows, {
		limit: query.limit,
		offset: query.offset,
		sort: OBJECTS_LIST_SORT
	});
}, 'Failed to load EMIS objects');

export const POST: RequestHandler = handleEmisRoute(async ({ request, locals }) => {
	const body = await parseJsonBody(request, createEmisObjectSchema);
	const created = await createObjectService(body, assertWriteContext(request, 'api', locals));
	return json(created, { status: 201 });
}, 'Failed to create EMIS object');
