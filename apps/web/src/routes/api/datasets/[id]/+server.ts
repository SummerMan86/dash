import { json, type RequestHandler } from '@sveltejs/kit';

import type { DatasetQuery } from '$entities/dataset';
import { CONTRACT_VERSION } from '$entities/dataset';

import { compileDataset } from '$lib/server/datasets/compile';
import { mockProvider } from '$lib/server/providers/mockProvider';
import { postgresProvider } from '$lib/server/providers/postgresProvider';

/**
 * Transport adapter (HTTP).
 *
 * This file is allowed to know about:
 * - HTTP (Request/Response)
 * - SvelteKit routing (`params.id`)
 * - server layer (`compileDataset`, providers)
 *
 * This file should NOT contain:
 * - SQL or Cube logic
 * - chart/UI logic
 *
 * High-level flow:
 * 1) Validate DatasetQuery contract
 * 2) Build server context (tenant/user)
 * 3) Compile DatasetQuery -> IR
 * 4) Execute IR via a Provider adapter
 * 5) Return DatasetResponse
 */
function getUnknownProp(obj: unknown, key: string): unknown {
	if (typeof obj !== 'object' || obj === null) return undefined;
	if (!(key in obj)) return undefined;
	return (obj as Record<string, unknown>)[key];
}

function getTenantId(request: Request): string {
	// MVP: in real app, derive from auth/session/JWT. Here we accept a header for testing.
	return request.headers.get('x-tenant-id')?.trim() || 'demo';
}

function isPostgresDataset(datasetId: string): boolean {
	return (
		datasetId.startsWith('wildberries.') ||
		datasetId.startsWith('emis.') ||
		datasetId.startsWith('strategy.')
	);
}

function jsonDatasetError(status: number, code: string, error: string) {
	return json({ error, code }, { status });
}

export const POST: RequestHandler = async ({ params, request }) => {
	const datasetId = params.id;
	if (!datasetId) {
		return jsonDatasetError(400, 'DATASET_ID_MISSING', 'Missing dataset id');
	}

	let query: DatasetQuery;
	try {
		query = (await request.json()) as DatasetQuery;
	} catch {
		return jsonDatasetError(400, 'DATASET_INVALID_JSON', 'Invalid JSON body');
	}

	if (!query || typeof query !== 'object') {
		return jsonDatasetError(400, 'DATASET_INVALID_QUERY', 'Invalid query');
	}
	if (query.contractVersion !== CONTRACT_VERSION) {
		const got = getUnknownProp(query, 'contractVersion');
		return jsonDatasetError(
			400,
			'DATASET_UNSUPPORTED_CONTRACT_VERSION',
			`Unsupported contractVersion: ${String(got ?? 'missing')}`
		);
	}

	const ctx = { tenantId: getTenantId(request) };

	let ir;
	try {
		ir = compileDataset(datasetId, query);
	} catch (e: unknown) {
		const code = getUnknownProp(e, 'code');
		if (code === 'DATASET_NOT_FOUND') {
			return jsonDatasetError(404, 'DATASET_NOT_FOUND', 'Dataset not found');
		}
		return jsonDatasetError(500, 'DATASET_COMPILE_FAILED', 'Failed to compile dataset query');
	}

	try {
		const provider = isPostgresDataset(datasetId) ? postgresProvider : mockProvider;
		const response = await provider.execute(ir, ctx);
		// Echo requestId if present (helps UI dedup/tracing).
		if (query.requestId) response.requestId = query.requestId;
		return json(response);
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : '';
		if (isPostgresDataset(datasetId) && message.includes('DATABASE_URL')) {
			return jsonDatasetError(
				500,
				'DATASET_DATABASE_URL_MISSING',
				'DATABASE_URL is not set (required for postgres-backed datasets)'
			);
		}
		return jsonDatasetError(500, 'DATASET_EXECUTION_FAILED', 'Failed to execute dataset query');
	}
};
