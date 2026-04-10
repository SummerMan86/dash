import { json, type RequestHandler } from '@sveltejs/kit';

import {
	getDatasetSchema,
	DatasetExecutionError,
} from '@dashboard-builder/platform-datasets/server';

/**
 * Dataset schema introspection endpoint (HTTP thin shell).
 *
 * GET /api/datasets/:id/schema
 *
 * Returns field metadata and source kind without executing a data query.
 * Uses the same access policy as POST /api/datasets/:id.
 * Hidden fields are suppressed from the response.
 */

const ERROR_STATUS_MAP: Record<string, number> = {
	DATASET_NOT_FOUND: 404,
	DATASET_ACCESS_DENIED: 403,
};

export const GET: RequestHandler = async ({ params, request }) => {
	const datasetId = params.id;
	if (!datasetId) {
		return json({ error: 'Missing dataset id', code: 'DATASET_ID_MISSING' }, { status: 400 });
	}

	const requestId = request.headers.get('x-request-id')?.slice(0, 128) || undefined;

	try {
		const schema = getDatasetSchema(datasetId, requestId);
		return json(schema);
	} catch (e: unknown) {
		if (e instanceof DatasetExecutionError) {
			const status = ERROR_STATUS_MAP[e.code] ?? 500;
			return json(e.toJSON(), { status });
		}
		return json(
			{ error: 'Unexpected error', code: 'DATASET_EXECUTION_FAILED' },
			{ status: 500 },
		);
	}
};
