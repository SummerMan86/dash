import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { DatasetQuery, DatasetResponse } from '../model';
import type { Provider, ServerContext } from '../model';
import { CONTRACT_VERSION } from '../model';
import { DatasetExecutionError, registerProvider, executeDatasetQuery, _resetCacheForTesting } from './executeDatasetQuery';
import { getRegistryEntry } from './registry';

// --- Test fixtures ---

const stubCtx: ServerContext = { tenantId: 'test-tenant', requestId: 'req-1' };

const stubQuery: DatasetQuery = {
	contractVersion: CONTRACT_VERSION,
	requestId: 'req-1',
	params: {},
};

const stubResponse: DatasetResponse = {
	contractVersion: CONTRACT_VERSION,
	datasetId: 'wildberries.fact_product_office_day',
	fields: [{ name: 'id', type: 'string' }],
	rows: [{ id: 'row1' }],
};

const stubPostgresProvider: Provider = {
	async execute(_ir, _entry, _ctx) {
		return { ...stubResponse };
	},
};

const stubMockProvider: Provider = {
	async execute(_ir, _entry, _ctx) {
		return { ...stubResponse, datasetId: 'payment.kpi', meta: { source: 'mock' as const } };
	},
};

// --- Restore providers after each test ---

afterEach(() => {
	registerProvider('postgres', stubPostgresProvider);
	registerProvider('mock', stubMockProvider);
});

// --- Tests ---

describe('DatasetExecutionError', () => {
	it('carries code, retryable, and requestId', () => {
		const err = new DatasetExecutionError('DATASET_NOT_FOUND', 'not found', false, 'req-1');
		expect(err.code).toBe('DATASET_NOT_FOUND');
		expect(err.retryable).toBe(false);
		expect(err.requestId).toBe('req-1');
		expect(err.message).toBe('not found');
		expect(err.name).toBe('DatasetExecutionError');
	});

	it('serializes to JSON', () => {
		const err = new DatasetExecutionError('DATASET_TIMEOUT', 'timed out', true, 'req-2');
		const json = err.toJSON();
		expect(json).toEqual({
			error: 'timed out',
			code: 'DATASET_TIMEOUT',
			retryable: true,
			requestId: 'req-2',
		});
	});

	it('omits requestId from JSON when undefined', () => {
		const err = new DatasetExecutionError('DATASET_NOT_FOUND', 'not found', false);
		const json = err.toJSON();
		expect(json).not.toHaveProperty('requestId');
	});
});

describe('executeDatasetQuery', () => {
	it('executes a known postgres dataset', async () => {
		const result = await executeDatasetQuery(
			'wildberries.fact_product_office_day',
			stubQuery,
			stubCtx,
		);
		expect(result.contractVersion).toBe(CONTRACT_VERSION);
		expect(result.datasetId).toBe('wildberries.fact_product_office_day');
		expect(result.requestId).toBe('req-1');
	});

	it('echoes requestId in response without mutating provider result', async () => {
		const query: DatasetQuery = { ...stubQuery, requestId: 'my-trace-id' };
		const result = await executeDatasetQuery(
			'wildberries.fact_product_office_day',
			query,
			stubCtx,
		);
		expect(result.requestId).toBe('my-trace-id');
	});

	it('throws DATASET_NOT_FOUND for unknown dataset', async () => {
		try {
			await executeDatasetQuery('unknown.dataset', stubQuery, stubCtx);
			expect.fail('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(DatasetExecutionError);
			const err = e as DatasetExecutionError;
			expect(err.code).toBe('DATASET_NOT_FOUND');
			expect(err.retryable).toBe(false);
		}
	});

	it('throws UNSUPPORTED_BACKEND when provider not registered', async () => {
		// Simulate missing provider by registering undefined for mock kind
		registerProvider('mock', undefined as unknown as Provider);

		try {
			await executeDatasetQuery('payment.kpi', stubQuery, stubCtx);
			expect.fail('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(DatasetExecutionError);
			const err = e as DatasetExecutionError;
			expect(err.code).toBe('UNSUPPORTED_BACKEND');
			expect(err.retryable).toBe(false);
		}
		// afterEach restores mock provider
	});

	it('throws DATASET_EXECUTION_FAILED on provider error', async () => {
		registerProvider('postgres', {
			async execute(_ir, _entry) {
				throw new Error('connection refused');
			},
		});

		try {
			await executeDatasetQuery('wildberries.fact_product_office_day', stubQuery, stubCtx);
			expect.fail('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(DatasetExecutionError);
			const err = e as DatasetExecutionError;
			expect(err.code).toBe('DATASET_EXECUTION_FAILED');
			expect(err.retryable).toBe(false);
		}
	});

	it('throws DATASET_CONNECTION_ERROR when DATABASE_URL missing', async () => {
		registerProvider('postgres', {
			async execute(_ir, _entry) {
				throw new Error('DATABASE_URL is not configured');
			},
		});

		try {
			await executeDatasetQuery('wildberries.fact_product_office_day', stubQuery, stubCtx);
			expect.fail('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(DatasetExecutionError);
			const err = e as DatasetExecutionError;
			expect(err.code).toBe('DATASET_CONNECTION_ERROR');
			// Verify no internal details leak to client
			expect(err.message).not.toContain('DATABASE_URL');
		}
	});

	describe('provider routing', () => {
		// Use distinct providers per kind to verify the correct one is called.
		const postgresTracker: Provider = {
			async execute(_ir, _entry) {
				return { ...stubResponse, meta: { source: 'postgres' as const } };
			},
		};
		const mockTracker: Provider = {
			async execute(_ir, _entry) {
				return { ...stubResponse, meta: { source: 'mock' as const } };
			},
		};

		it('routes wildberries.* to postgres provider', async () => {
			registerProvider('postgres', postgresTracker);
			registerProvider('mock', mockTracker);

			const result = await executeDatasetQuery(
				'wildberries.fact_product_office_day',
				stubQuery,
				stubCtx,
			);
			expect(result.meta?.source).toBe('postgres');
		});

		it('routes emis.* to postgres provider', async () => {
			registerProvider('postgres', postgresTracker);
			registerProvider('mock', mockTracker);

			const result = await executeDatasetQuery('emis.news_flat', stubQuery, stubCtx);
			expect(result.meta?.source).toBe('postgres');
		});

		it('routes strategy.* to postgres provider', async () => {
			registerProvider('postgres', postgresTracker);
			registerProvider('mock', mockTracker);

			const result = await executeDatasetQuery(
				'strategy.entity_overview',
				stubQuery,
				stubCtx,
			);
			expect(result.meta?.source).toBe('postgres');
		});

		it('routes payment.* to mock provider', async () => {
			registerProvider('postgres', postgresTracker);
			registerProvider('mock', mockTracker);

			const result = await executeDatasetQuery('payment.kpi', stubQuery, stubCtx);
			expect(result.meta?.source).toBe('mock');
		});
	});
});

describe('registry', () => {
	it('returns entry for all postgres datasets', () => {
		const pgDatasets = [
			'wildberries.fact_product_office_day', 'wildberries.fact_product_period',
			'emis.news_flat', 'emis.object_news_facts', 'emis.objects_dim', 'emis.ship_route_vessels',
			'strategy.entity_overview', 'strategy.scorecard_overview',
			'strategy.performance_detail', 'strategy.cascade_detail',
		];
		for (const id of pgDatasets) {
			const entry = getRegistryEntry(id);
			expect(entry, `missing entry for ${id}`).toBeDefined();
			expect(entry!.source.kind).toBe('postgres');
		}
	});

	it('returns entry for all mock datasets', () => {
		const mockDatasets = ['payment.kpi', 'payment.timeseriesDaily', 'payment.topClients', 'payment.mccSummary'];
		for (const id of mockDatasets) {
			const entry = getRegistryEntry(id);
			expect(entry, `missing entry for ${id}`).toBeDefined();
			expect(entry!.source.kind).toBe('mock');
		}
	});

	it('returns entry for all oracle datasets', () => {
		const oracleDatasets = [
			'ifts.system_parameters', 'ifts.payment_stats',
			'ifts.message_stats', 'ifts.operday_state',
		];
		for (const id of oracleDatasets) {
			const entry = getRegistryEntry(id);
			expect(entry, `missing entry for ${id}`).toBeDefined();
			expect(entry!.source.kind).toBe('oracle');
		}
	});

	it('returns undefined for unknown dataset', () => {
		expect(getRegistryEntry('unknown.dataset')).toBeUndefined();
	});

	it('entry fields match postgresProvider column count', () => {
		const entry = getRegistryEntry('wildberries.fact_product_office_day');
		expect(entry).toBeDefined();
		expect(entry!.fields.length).toBe(18); // 18 columns in original DATASETS mapping
	});

	it('entry source contains correct schema and table', () => {
		const entry = getRegistryEntry('strategy.entity_overview');
		expect(entry).toBeDefined();
		expect(entry!.source).toEqual({
			kind: 'postgres',
			schema: 'mart_strategy',
			table: 'slobi_entity_overview',
		});
	});
});

// ---------------------------------------------------------------------------
// Cache middleware tests
// ---------------------------------------------------------------------------

describe('executeDatasetQuery cache middleware', () => {
	// ifts.payment_stats has cache: { ttlMs: 15_000 } — use it to verify caching
	const cachedDatasetId = 'ifts.payment_stats';
	const cachedResponse: DatasetResponse = {
		contractVersion: CONTRACT_VERSION,
		datasetId: cachedDatasetId,
		fields: [{ name: 'PAYM_STAT_ID', type: 'number' }],
		rows: [{ PAYM_STAT_ID: 42 }],
		meta: { executedAt: new Date().toISOString(), sourceKind: 'oracle' },
	};

	let executionCount: number;
	const trackingOracleProvider: Provider = {
		async execute(_ir, _entry, _ctx) {
			executionCount++;
			return { ...cachedResponse };
		},
	};

	// Non-cached dataset for contrast (wildberries.fact_product_office_day has no cache config)
	const nonCachedDatasetId = 'wildberries.fact_product_office_day';

	beforeEach(() => {
		vi.useFakeTimers();
		_resetCacheForTesting();
		executionCount = 0;
		registerProvider('oracle', trackingOracleProvider);
		registerProvider('postgres', stubPostgresProvider);
		registerProvider('mock', stubMockProvider);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('skips compile+execute on cache hit for dataset with ttlMs > 0', async () => {
		// First call — cache miss, provider executes
		await executeDatasetQuery(cachedDatasetId, stubQuery, stubCtx);
		expect(executionCount).toBe(1);

		// Second call — cache hit, provider NOT called
		await executeDatasetQuery(cachedDatasetId, stubQuery, stubCtx);
		expect(executionCount).toBe(1);
	});

	it('returns cacheAgeMs > 0 on cache hit', async () => {
		await executeDatasetQuery(cachedDatasetId, stubQuery, stubCtx);

		vi.advanceTimersByTime(3_000);

		const result = await executeDatasetQuery(cachedDatasetId, stubQuery, stubCtx);
		expect(result.meta?.cacheAgeMs).toBeGreaterThanOrEqual(3_000);
	});

	it('cache expires after ttlMs and re-executes', async () => {
		await executeDatasetQuery(cachedDatasetId, stubQuery, stubCtx);
		expect(executionCount).toBe(1);

		// Advance past ttlMs (15_000)
		vi.advanceTimersByTime(16_000);

		await executeDatasetQuery(cachedDatasetId, stubQuery, stubCtx);
		expect(executionCount).toBe(2);
	});

	it('does NOT cache datasets without ttlMs', async () => {
		let pgExecCount = 0;
		registerProvider('postgres', {
			async execute(_ir, _entry, _ctx) {
				pgExecCount++;
				return { ...stubResponse };
			},
		});

		await executeDatasetQuery(nonCachedDatasetId, stubQuery, stubCtx);
		await executeDatasetQuery(nonCachedDatasetId, stubQuery, stubCtx);
		expect(pgExecCount).toBe(2);
	});

	it('does NOT cache errors — provider failure is not stored', async () => {
		let shouldFail = true;
		registerProvider('oracle', {
			async execute(_ir, _entry, _ctx) {
				executionCount++;
				if (shouldFail) {
					shouldFail = false;
					throw new Error('transient failure');
				}
				return { ...cachedResponse };
			},
		});

		// First call fails
		await expect(executeDatasetQuery(cachedDatasetId, stubQuery, stubCtx)).rejects.toThrow();
		expect(executionCount).toBe(1);

		// Second call succeeds — provider is called (error was not cached)
		const result = await executeDatasetQuery(cachedDatasetId, stubQuery, stubCtx);
		expect(executionCount).toBe(2);
		expect(result.datasetId).toBe(cachedDatasetId);
	});

	it('separates cache by tenantId', async () => {
		const ctxA: ServerContext = { tenantId: 'tenant-A', requestId: 'r1' };
		const ctxB: ServerContext = { tenantId: 'tenant-B', requestId: 'r2' };

		await executeDatasetQuery(cachedDatasetId, stubQuery, ctxA);
		expect(executionCount).toBe(1);

		// Different tenant — cache miss, provider called
		await executeDatasetQuery(cachedDatasetId, stubQuery, ctxB);
		expect(executionCount).toBe(2);

		// Same tenant A again — cache hit
		await executeDatasetQuery(cachedDatasetId, stubQuery, ctxA);
		expect(executionCount).toBe(2);
	});

	it('echoes requestId on cache hit without including it in cache key', async () => {
		const query1: DatasetQuery = { ...stubQuery, requestId: 'req-A' };
		await executeDatasetQuery(cachedDatasetId, query1, stubCtx);

		const query2: DatasetQuery = { ...stubQuery, requestId: 'req-B' };
		const result = await executeDatasetQuery(cachedDatasetId, query2, stubCtx);

		// Should get cache hit despite different requestId
		expect(executionCount).toBe(1);
		// requestId comes from query, not from cache
		expect(result.requestId).toBe('req-B');
	});
});
