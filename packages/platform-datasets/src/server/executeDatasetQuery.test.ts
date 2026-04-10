import { describe, it, expect, afterEach } from 'vitest';
import type { DatasetQuery, DatasetResponse } from '../model';
import type { Provider, ServerContext } from '../model';
import { CONTRACT_VERSION } from '../model';
import { DatasetExecutionError, registerProvider, executeDatasetQuery } from './executeDatasetQuery';
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
