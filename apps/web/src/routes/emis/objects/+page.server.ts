import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { listEmisObjectsQuerySchema } from '$entities/emis-object';
import { EmisError } from '$lib/server/emis/infra/errors';
import {
	EMIS_DEFAULT_LIST_LIMIT,
	EMIS_MAX_LIST_LIMIT,
	EMIS_MAX_OFFSET,
	parseListParams
} from '$lib/server/emis/infra/http';
import { listCountries, listObjectTypes } from '$lib/server/emis/modules/dictionaries/repository';
import { listObjectsQuery } from '$lib/server/emis/modules/objects/queries';

function parseObjectsCatalogQuery(url: URL) {
	try {
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
			throw error(400, parsed.error.issues[0]?.message ?? 'Invalid EMIS object catalog query');
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
	const filters = parseObjectsCatalogQuery(url);
	const [rows, countries, objectTypes] = await Promise.all([
		listObjectsQuery(filters),
		listCountries(),
		listObjectTypes()
	]);

	const hasPrev = filters.offset > 0;
	const hasNext = rows.length === filters.limit;

	return {
		filters,
		rows,
		countries,
		objectTypes,
		pagination: {
			page: Math.floor(filters.offset / filters.limit) + 1,
			hasPrev,
			hasNext,
			prevOffset: hasPrev ? Math.max(0, filters.offset - filters.limit) : 0,
			nextOffset: filters.offset + filters.limit
		}
	};
};
