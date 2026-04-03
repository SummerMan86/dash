import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { listEmisNewsQuerySchema } from '$entities/emis-news';
import { EmisError } from '$lib/server/emis/infra/errors';
import {
	EMIS_DEFAULT_LIST_LIMIT,
	EMIS_MAX_LIST_LIMIT,
	EMIS_MAX_OFFSET,
	normalizeDateTimeParam,
	parseListParams
} from '$lib/server/emis/infra/http';
import { listCountries, listSources } from '$lib/server/emis/modules/dictionaries/repository';
import { listNewsQuery } from '$lib/server/emis/modules/news/queries';

function parseNewsCatalogQuery(url: URL) {
	try {
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
			dateFrom: normalizeDateTimeParam(url.searchParams.get('dateFrom')),
			dateTo: normalizeDateTimeParam(url.searchParams.get('dateTo')),
			objectId: url.searchParams.get('objectId') || undefined,
			limit: paging.limit,
			offset: paging.offset
		});

		if (!parsed.success) {
			throw error(400, parsed.error.issues[0]?.message ?? 'Invalid EMIS news catalog query');
		}

		return parsed.data;
	} catch (cause) {
		if (cause instanceof EmisError && cause.status === 400) {
			throw error(400, cause.message);
		}
		throw cause;
	}
}

export const load: PageServerLoad = async ({ url }) => {
	const filters = parseNewsCatalogQuery(url);
	const [rows, countries, sources] = await Promise.all([
		listNewsQuery(filters),
		listCountries(),
		listSources()
	]);

	const hasPrev = filters.offset > 0;
	const hasNext = rows.length === filters.limit;

	return {
		filters,
		rows,
		countries,
		sources,
		pagination: {
			page: Math.floor(filters.offset / filters.limit) + 1,
			hasPrev,
			hasNext,
			prevOffset: hasPrev ? Math.max(0, filters.offset - filters.limit) : 0,
			nextOffset: filters.offset + filters.limit
		}
	};
};
