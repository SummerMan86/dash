import type { RequestHandler } from '@sveltejs/kit';

import { listEmisNewsQuerySchema } from '$entities/emis-news';
import { EmisError } from '$lib/server/emis/infra/errors';
import {
	EMIS_DEFAULT_LIST_LIMIT,
	EMIS_MAX_LIST_LIMIT,
	EMIS_MAX_OFFSET,
	handleEmisRoute,
	jsonEmisList,
	parseListParams
} from '$lib/server/emis/infra/http';
import { listNewsQuery } from '$lib/server/emis/modules/news/queries';

const NEWS_LIST_SORT = [
	{ field: 'publishedAt', dir: 'desc' as const },
	{ field: 'id', dir: 'desc' as const }
];

function parseSearchNewsQuery(url: URL) {
	const paging = parseListParams(url.searchParams, {
		defaultLimit: EMIS_DEFAULT_LIST_LIMIT,
		maxLimit: EMIS_MAX_LIST_LIMIT,
		maxOffset: EMIS_MAX_OFFSET,
		limitCode: 'INVALID_SEARCH_NEWS_LIMIT',
		offsetCode: 'INVALID_SEARCH_NEWS_OFFSET'
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
			'INVALID_SEARCH_NEWS_QUERY',
			parsed.error.issues[0]?.message ?? 'Invalid EMIS news search query'
		);
	}

	return parsed.data;
}

export const GET: RequestHandler = handleEmisRoute(async ({ url }) => {
	const query = parseSearchNewsQuery(url);
	const rows = await listNewsQuery(query);
	return jsonEmisList(rows, {
		limit: query.limit,
		offset: query.offset,
		sort: NEWS_LIST_SORT
	});
}, 'Failed to search EMIS news');
