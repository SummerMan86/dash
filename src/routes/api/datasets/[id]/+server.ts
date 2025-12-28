import { json, type RequestHandler } from '@sveltejs/kit';

import type { DatasetQuery } from '$entities/dataset';
import { CONTRACT_VERSION } from '$entities/dataset';

import { compileDataset } from '$lib/server/datasets/compile';
import { mockProvider } from '$lib/server/providers/mockProvider';

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

export const POST: RequestHandler = async ({ params, request }) => {
	const datasetId = params.id;
	if (!datasetId) return json({ error: 'Missing dataset id' }, { status: 400 });

	let query: DatasetQuery;
	try {
		query = (await request.json()) as DatasetQuery;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!query || typeof query !== 'object') return json({ error: 'Invalid query' }, { status: 400 });
	if (query.contractVersion !== CONTRACT_VERSION) {
		const got = getUnknownProp(query, 'contractVersion');
		return json(
			{ error: `Unsupported contractVersion: ${String(got ?? 'missing')}` },
			{ status: 400 }
		);
	}

	const ctx = { tenantId: getTenantId(request) };

	let ir;
	try {
		ir = compileDataset(datasetId, query);
	} catch (e: unknown) {
		const code = getUnknownProp(e, 'code');
		if (code === 'DATASET_NOT_FOUND') return json({ error: 'Dataset not found' }, { status: 404 });
		return json({ error: 'Failed to compile dataset query' }, { status: 500 });
	}

	try {
		const response = await mockProvider.execute(ir, ctx);
		// Echo requestId if present (helps UI dedup/tracing).
		if (query.requestId) response.requestId = query.requestId;
		return json(response);
	} catch {
		return json({ error: 'Failed to execute dataset query' }, { status: 500 });
	}
};


