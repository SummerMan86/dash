import { json, type RequestHandler } from '@sveltejs/kit';

import { createEmisNewsSchema, listEmisNewsQuerySchema } from '$entities/emis-news';
import { EmisError } from '$lib/server/emis/infra/errors';
import { handleEmisRoute, parseIntParam, parseJsonBody } from '$lib/server/emis/infra/http';
import { listNewsQuery } from '$lib/server/emis/modules/news/queries';
import { createNewsService } from '$lib/server/emis/modules/news/service';

function parseListQuery(url: URL) {
	const parsed = listEmisNewsQuerySchema.safeParse({
		q: url.searchParams.get('q')?.trim() || undefined,
		source: url.searchParams.get('source') || undefined,
		country: url.searchParams.get('country') || undefined,
		newsType: url.searchParams.get('newsType') || undefined,
		dateFrom: url.searchParams.get('dateFrom') || undefined,
		dateTo: url.searchParams.get('dateTo') || undefined,
		objectId: url.searchParams.get('objectId') || undefined,
		limit: parseIntParam(url.searchParams.get('limit'), 50, { min: 1, max: 100 }),
		offset: parseIntParam(url.searchParams.get('offset'), 0, { min: 0, max: 10_000 })
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
	return json({ rows, meta: { count: rows.length } });
}, 'Failed to load EMIS news');

export const POST: RequestHandler = handleEmisRoute(async ({ request }) => {
	const body = await parseJsonBody(request, createEmisNewsSchema);
	const created = await createNewsService(body);
	return json(created, { status: 201 });
}, 'Failed to create EMIS news item');
