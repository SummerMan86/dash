/**
 * Package-orchestrated dataset execution.
 *
 * This is the single entrypoint for dataset query execution.
 * Route handlers delegate here after transport parsing and context derivation.
 *
 * Flow:
 *   1. Validate dataset exists (compile-time check via isKnownDatasetId)
 *   2. Access check (placeholder — registry-based check arrives in BR-3)
 *   3. Compile DatasetQuery → IR
 *   4. Resolve provider (transitional: prefix-based until BR-3 registry)
 *   5. Execute IR via provider
 *   6. Return DatasetResponse
 *
 * Canonical reference: docs/architecture_dashboard_bi_target.md §1
 */
import type { DatasetId, DatasetQuery, DatasetResponse, DatasetErrorCode } from '../model';
import type { Provider, ServerContext } from '../model';
import { compileDataset, isKnownDatasetId } from './compile';

// ---------------------------------------------------------------------------
// DatasetExecutionError — typed error for dataset operations
// ---------------------------------------------------------------------------

export class DatasetExecutionError extends Error {
	readonly code: DatasetErrorCode;
	readonly retryable: boolean;
	readonly requestId?: string;

	constructor(code: DatasetErrorCode, message: string, retryable: boolean, requestId?: string) {
		super(message);
		this.name = 'DatasetExecutionError';
		this.code = code;
		this.retryable = retryable;
		this.requestId = requestId;
	}

	toJSON() {
		return {
			error: this.message,
			code: this.code,
			retryable: this.retryable,
			...(this.requestId ? { requestId: this.requestId } : {}),
		};
	}
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const providerRegistry = new Map<string, Provider>();

/**
 * Register a provider for a given source kind.
 * Called at module load time by the app bootstrap.
 */
export function registerProvider(kind: string, provider: Provider): void {
	providerRegistry.set(kind, provider);
}

/**
 * Transitional provider resolution by dataset id prefix.
 * Will be replaced by entry.source.kind lookup in BR-3.
 */
function resolveProviderKind(datasetId: string): string {
	if (
		datasetId.startsWith('wildberries.') ||
		datasetId.startsWith('emis.') ||
		datasetId.startsWith('strategy.')
	) {
		return 'postgres';
	}
	return 'mock';
}

// ---------------------------------------------------------------------------
// executeDatasetQuery — package-orchestrated execution
// ---------------------------------------------------------------------------

export async function executeDatasetQuery(
	datasetId: DatasetId,
	query: DatasetQuery,
	ctx: ServerContext,
): Promise<DatasetResponse> {
	const requestId = query.requestId;

	// 1. Validate dataset exists
	if (!isKnownDatasetId(datasetId)) {
		// Sanitize reflected value: truncate and restrict to safe characters
		const safeId = datasetId.slice(0, 64).replace(/[^a-zA-Z0-9._-]/g, '');
		throw new DatasetExecutionError(
			'DATASET_NOT_FOUND',
			`Unknown dataset: ${safeId}`,
			false,
			requestId,
		);
	}

	// 2. Access check (placeholder — registry-based check arrives in BR-3)
	// When registry entries exist: assertDatasetAccess(entry, ctx)

	// 3. Compile
	let ir;
	try {
		ir = compileDataset(datasetId, query);
	} catch (e: unknown) {
		// Log original error server-side; don't leak internals to client
		console.error('[dataset] compile error:', e instanceof Error ? e.message : e);
		throw new DatasetExecutionError(
			'DATASET_EXECUTION_FAILED',
			'Failed to compile dataset query',
			false,
			requestId,
		);
	}

	// 4. Resolve provider
	const providerKind = resolveProviderKind(datasetId);
	const provider = providerRegistry.get(providerKind);
	if (!provider) {
		throw new DatasetExecutionError(
			'UNSUPPORTED_BACKEND',
			`No provider registered for source kind: ${providerKind}`,
			false,
			requestId,
		);
	}

	// 5. Execute
	try {
		const response = await provider.execute(ir, ctx);
		return requestId ? { ...response, requestId } : response;
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);

		// Log original error server-side; don't leak internals to client
		console.error('[dataset] execution error:', message);

		// TODO(BR-3): replace string-sniff with typed ProviderError after provider contract update
		if (message.includes('DATABASE_URL')) {
			throw new DatasetExecutionError(
				'DATASET_CONNECTION_ERROR',
				'Database connection not configured',
				false,
				requestId,
			);
		}

		throw new DatasetExecutionError(
			'DATASET_EXECUTION_FAILED',
			'Dataset query execution failed',
			false,
			requestId,
		);
	}
}
