import { json, type RequestHandler } from '@sveltejs/kit';

import { createEmisObjectSchema, listEmisObjectsQuerySchema } from '$entities/emis-object';
import { EmisError } from '$lib/server/emis/errors';
import { handleEmisRoute, parseIntParam, parseJsonBody } from '$lib/server/emis/http';
import { listObjectsQuery } from '$lib/server/emis/queries/objectQueries';
import { createObjectService } from '$lib/server/emis/services/objectService';

function parseListQuery(url: URL) {
	const parsed = listEmisObjectsQuerySchema.safeParse({
		q: url.searchParams.get('q')?.trim() || undefined,
		objectType: url.searchParams.get('objectType') || undefined,
		country: url.searchParams.get('country') || undefined,
		status: url.searchParams.get('status') || undefined,
		limit: parseIntParam(url.searchParams.get('limit'), 50, { min: 1, max: 100 }),
		offset: parseIntParam(url.searchParams.get('offset'), 0, { min: 0, max: 10_000 })
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
	return json({ rows, meta: { count: rows.length } });
}, 'Failed to load EMIS objects');

export const POST: RequestHandler = handleEmisRoute(async ({ request }) => {
	const body = await parseJsonBody(request, createEmisObjectSchema);
	const created = await createObjectService(body);
	return json(created, { status: 201 });
}, 'Failed to create EMIS object');
