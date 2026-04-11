/**
 * Package-orchestrated dataset execution.
 *
 * This is the single entrypoint for dataset query execution.
 * Route handlers delegate here after transport parsing and context derivation.
 *
 * Flow:
 *   1. Registry lookup
 *   2. Access check (placeholder — full enforcement in a future slice)
 *   3. Parse params via entry.paramsSchema
 *   4. Compile: entry.compile (custom) or genericCompile (declarative)
 *   5. Resolve provider by entry.source.kind
 *   6. Execute IR via provider (entry-owned metadata)
 *   7. Return DatasetResponse
 *
 * Canonical reference: docs/architecture_dashboard_bi.md §1
 */
import type { DatasetId, DatasetQuery, DatasetResponse, DatasetErrorCode, DatasetIr } from '../model';
import type { Provider, ServerContext } from '../model';
import { getRegistryEntry } from './registry';
import { genericCompile } from './genericCompile';

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

// ---------------------------------------------------------------------------
// Structured query telemetry — minimal signal per query completion/failure
// ---------------------------------------------------------------------------

type QuerySignal = {
	datasetId: string;
	sourceKind: string;
	requestId?: string;
	compileMs?: number;
	executeMs?: number;
	totalMs: number;
	rowCount?: number;
	cacheHit?: boolean;
	errorCode?: string;
};

function emitQuerySignal(signal: QuerySignal): void {
	// Structured JSON log — minimal first-wave sink.
	// Future: replace with proper telemetry pipeline.
	console.log(JSON.stringify({ ...signal, ts: new Date().toISOString(), kind: 'dataset_query' }));
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

	// 1. Registry lookup
	const entry = getRegistryEntry(datasetId);
	if (!entry) {
		const safeId = datasetId.slice(0, 64).replace(/[^a-zA-Z0-9._-]/g, '');
		throw new DatasetExecutionError(
			'DATASET_NOT_FOUND',
			`Unknown dataset: ${safeId}`,
			false,
			requestId,
		);
	}

	// 2. Access check (placeholder — full enforcement in a future slice)
	// assertDatasetAccess(entry, ctx)

	const t0 = Date.now();
	const sourceKind = entry.source.kind;

	// 3. Parse params via entry.paramsSchema (target flow step 3)
	let typedParams: Record<string, unknown>;
	try {
		typedParams = entry.paramsSchema.parse(query.params ?? {});
	} catch (e: unknown) {
		const totalMs = Date.now() - t0;
		console.error('[dataset] params validation error:', e instanceof Error ? e.message : e);
		emitQuerySignal({ datasetId, sourceKind, requestId, totalMs, errorCode: 'DATASET_INVALID_PARAMS' });
		throw new DatasetExecutionError(
			'DATASET_INVALID_PARAMS',
			'Invalid dataset query parameters',
			false,
			requestId,
		);
	}

	// 4. Compile: custom compile or genericCompile from queryBindings
	let ir: DatasetIr;
	try {
		if (entry.compile) {
			ir = entry.compile(datasetId, query);
		} else {
			ir = genericCompile(entry, typedParams);
		}
	} catch (e: unknown) {
		const totalMs = Date.now() - t0;
		console.error('[dataset] compile error:', e instanceof Error ? e.message : e);
		emitQuerySignal({ datasetId, sourceKind, requestId, totalMs, errorCode: 'DATASET_EXECUTION_FAILED' });
		throw new DatasetExecutionError(
			'DATASET_EXECUTION_FAILED',
			'Failed to compile dataset query',
			false,
			requestId,
		);
	}

	const compileMs = Date.now() - t0;

	// 5. Resolve provider by entry.source.kind
	const provider = providerRegistry.get(sourceKind);
	if (!provider) {
		emitQuerySignal({ datasetId, sourceKind, requestId, totalMs: Date.now() - t0, errorCode: 'UNSUPPORTED_BACKEND' });
		throw new DatasetExecutionError(
			'UNSUPPORTED_BACKEND',
			`No provider registered for source kind: ${sourceKind}`,
			false,
			requestId,
		);
	}

	// 6. Execute with registry-owned entry
	try {
		const response = await provider.execute(ir, entry, ctx);
		const totalMs = Date.now() - t0;
		const executeMs = totalMs - compileMs;
		emitQuerySignal({
			datasetId, sourceKind, requestId, compileMs, executeMs, totalMs,
			rowCount: response.rows.length,
			cacheHit: (response.meta?.cacheAgeMs ?? 0) > 0,
		});
		return requestId ? { ...response, requestId } : response;
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		const totalMs = Date.now() - t0;
		console.error('[dataset] execution error:', message);

		if (message.includes('DATABASE_URL')) {
			emitQuerySignal({ datasetId, sourceKind, requestId, totalMs, errorCode: 'DATASET_CONNECTION_ERROR' });
			throw new DatasetExecutionError(
				'DATASET_CONNECTION_ERROR',
				'Database connection not configured',
				false,
				requestId,
			);
		}

		const errorCode = (e as { code?: string }).code ?? 'DATASET_EXECUTION_FAILED';
		const retryable = errorCode === 'DATASET_TIMEOUT' || errorCode === 'DATASET_CONNECTION_ERROR';
		emitQuerySignal({ datasetId, sourceKind, requestId, totalMs, errorCode });
		throw new DatasetExecutionError(
			errorCode as DatasetErrorCode,
			'Dataset query execution failed',
			retryable,
			requestId,
		);
	}
}
