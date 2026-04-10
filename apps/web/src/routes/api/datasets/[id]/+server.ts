import { json, type RequestHandler } from '@sveltejs/kit';

import type { DatasetQuery } from '@dashboard-builder/platform-datasets';
import { CONTRACT_VERSION } from '@dashboard-builder/platform-datasets';
import {
	executeDatasetQuery,
	DatasetExecutionError,
	registerProvider,
} from '@dashboard-builder/platform-datasets/server';
import { mockProvider } from '$lib/server/providers/mockProvider';

// Register app-owned providers at module load time.
// Postgres is auto-registered by the package.
registerProvider('mock', mockProvider);

/**
 * Dataset query transport adapter (HTTP thin shell).
 *
 * Responsibilities:
 * - parse and validate the transport contract
 * - derive ServerContext from request
 * - delegate to executeDatasetQuery()
 * - map typed errors to HTTP responses
 *
 * This file must NOT contain: SQL, provider logic, dataset-specific rules.
 */

// TODO: derive tenantId from verified session/JWT, not untrusted header.
// Current x-tenant-id header is an MVP placeholder for testing.
function getTenantId(request: Request): string {
	return request.headers.get('x-tenant-id')?.trim() || 'demo';
}

function jsonError(status: number, code: string, error: string) {
	return json({ error, code }, { status });
}

const ERROR_STATUS_MAP: Record<string, number> = {
	DATASET_NOT_FOUND: 404,
	DATASET_ACCESS_DENIED: 403,
	DATASET_INVALID_PARAMS: 400,
	UNSUPPORTED_BACKEND: 500,
	DATASET_EXECUTION_FAILED: 500,
	DATASET_TIMEOUT: 504,
	DATASET_CONNECTION_ERROR: 503,
};

export const POST: RequestHandler = async ({ params, request }) => {
	// 1. Parse transport
	const datasetId = params.id;
	if (!datasetId) {
		return jsonError(400, 'DATASET_ID_MISSING', 'Missing dataset id');
	}

	let query: DatasetQuery;
	try {
		query = (await request.json()) as DatasetQuery;
	} catch {
		return jsonError(400, 'DATASET_INVALID_JSON', 'Invalid JSON body');
	}

	if (!query || typeof query !== 'object') {
		return jsonError(400, 'DATASET_INVALID_QUERY', 'Invalid query');
	}

	// 2. Validate contract version
	if (query.contractVersion !== CONTRACT_VERSION) {
		return jsonError(
			400,
			'DATASET_UNSUPPORTED_CONTRACT_VERSION',
			`Unsupported contractVersion: ${String(query.contractVersion ?? 'missing')}`,
		);
	}

	// 3. Derive server context
	const ctx = {
		tenantId: getTenantId(request),
		requestId: query.requestId,
	};

	// 4. Delegate to package orchestration
	try {
		const response = await executeDatasetQuery(datasetId, query, ctx);
		return json(response);
	} catch (e: unknown) {
		if (e instanceof DatasetExecutionError) {
			const status = ERROR_STATUS_MAP[e.code] ?? 500;
			return json(e.toJSON(), { status });
		}
		return jsonError(500, 'DATASET_EXECUTION_FAILED', 'Unexpected error');
	}
};
