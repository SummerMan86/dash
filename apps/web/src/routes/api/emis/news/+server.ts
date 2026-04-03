import { json, type RequestHandler } from '@sveltejs/kit';

import { createEmisNewsSchema, listEmisNewsQuerySchema } from '$entities/emis-news';
import { resolveEmisWriteContext } from '$lib/server/emis/infra/audit';
import { EmisError } from '$lib/server/emis/infra/errors';
import {
	EMIS_DEFAULT_LIST_LIMIT,
	EMIS_MAX_LIST_LIMIT,
	EMIS_MAX_OFFSET,
	handleEmisRoute,
	jsonEmisList,
	parseListParams,
	parseJsonBody
} from '$lib/server/emis/infra/http';
import { listNewsQuery } from '$lib/server/emis/modules/news/queries';
import { createNewsService } from '$lib/server/emis/modules/news/service';

const NEWS_LIST_SORT = [
	{ field: 'publishedAt', dir: 'desc' as const },
	{ field: 'id', dir: 'desc' as const }
];

function parseListQuery(url: URL) {
	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_LIST_LIMIT,
		maxLimit: EMIS_MAX_LIST_LIMIT,
		maxOffset: EMIS_MAX_OFFSET,
		limitCode: 'INVALID_NEWS_LIMIT',
		offsetCode: 'INVALID_NEWS_OFFSET'
	});

	const parsed = listEmisNewsQuerySchema.safeParse({
		q: url.searchParams.get('q')?.trim() || undefined,
		source: url.searchParams.get('source') || undefined,
		country: url.searchParams.get('country') || undefined,
		newsType: url.searchParams.get('newsType') || undefined,
		dateFrom: url.searchParams.get('dateFrom') || undefined,
		dateTo: url.searchParams.get('dateTo') || undefined,
		objectId: url.searchParams.get('objectId') || undefined,
		limit: paging.limit,
		offset: paging.offset
	});

	if (!parsed.success) {
		throw new EmisError(
			400,
			'INVALID_NEWS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid news query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseListQuery(url);
	const rows = await listNewsQuery(query);
	return jsonEmisList(rows, {
		limit: query.limit,
		offset: query.offset,
		sort: NEWS_LIST_SORT
	});
}, 'Failed to load EMIS news');

export const POST: RequestHandler = handleEmisRoute(async ({ request }) => {
	const body = await parseJsonBody(request, createEmisNewsSchema);
	const created = await createNewsService(body, resolveEmisWriteContext(request, 'api'));
	return json(created, { status: 201 });
}, 'Failed to create EMIS news item');
