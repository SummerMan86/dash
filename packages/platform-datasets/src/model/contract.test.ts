import { describe, it, expect } from 'vitest';
import type { DatasetError, DatasetErrorCode, DatasetResponse } from './contract';
import { CONTRACT_VERSION } from './contract';
import type { SelectIr } from './ir';
import { ir } from './ir';

describe('DatasetError', () => {
	it('represents a non-retryable error', () => {
		const err: DatasetError = {
			error: 'Dataset not found',
			code: 'DATASET_NOT_FOUND',
			retryable: false,
		};
		expect(err.retryable).toBe(false);
	});

	it('represents a retryable timeout error', () => {
		const err: DatasetError = {
			error: 'Query timed out after 5000ms',
			code: 'DATASET_TIMEOUT',
			retryable: true,
			requestId: 'req-123',
		};
		expect(err.retryable).toBe(true);
		expect(err.requestId).toBe('req-123');
	});

	it('maps retryable guidance per error code', () => {
		const nonRetryable: DatasetErrorCode[] = [
			'DATASET_NOT_FOUND',
			'DATASET_ACCESS_DENIED',
			'DATASET_INVALID_PARAMS',
			'UNSUPPORTED_BACKEND',
		];
		const retryable: DatasetErrorCode[] = [
			'DATASET_TIMEOUT',
			'DATASET_CONNECTION_ERROR',
		];
		for (const code of nonRetryable) {
			const err: DatasetError = { error: 'test', code, retryable: false };
			expect(err.retryable).toBe(false);
		}
		for (const code of retryable) {
			const err: DatasetError = { error: 'test', code, retryable: true };
			expect(err.retryable).toBe(true);
		}
	});
});

describe('DatasetResponse meta freshness', () => {
	it('supports totalCount in meta', () => {
		const resp: DatasetResponse = {
			contractVersion: CONTRACT_VERSION,
			datasetId: 'test.example',
			fields: [],
			rows: [],
			meta: { totalCount: 1500 },
		};
		expect(resp.meta?.totalCount).toBe(1500);
	});

	it('supports sourceKind in meta', () => {
		const resp: DatasetResponse = {
			contractVersion: CONTRACT_VERSION,
			datasetId: 'test.oracle',
			fields: [],
			rows: [],
			meta: { sourceKind: 'oracle', cacheAgeMs: 0 },
		};
		expect(resp.meta?.sourceKind).toBe('oracle');
		expect(resp.meta?.cacheAgeMs).toBe(0);
	});

	it('supports clickhouse in source enum', () => {
		const resp: DatasetResponse = {
			contractVersion: CONTRACT_VERSION,
			datasetId: 'test.ch',
			fields: [],
			rows: [],
			meta: { source: 'clickhouse' },
		};
		expect(resp.meta?.source).toBe('clickhouse');
	});
});

describe('SelectIr offset', () => {
	it('supports offset in SelectIr', () => {
		const query: SelectIr = {
			kind: 'select',
			from: { kind: 'dataset', id: 'test.paginated' },
			select: [{ expr: ir.col('id') }],
			limit: 100,
			offset: 200,
		};
		expect(query.offset).toBe(200);
		expect(query.limit).toBe(100);
	});

	it('offset is optional and defaults to undefined', () => {
		const query: SelectIr = {
			kind: 'select',
			from: { kind: 'dataset', id: 'test.no_offset' },
			select: [{ expr: ir.col('id') }],
		};
		expect(query.offset).toBeUndefined();
	});
});

describe('ContractVersion strategy', () => {
	it('stays at v1 with additive extensions', () => {
		expect(CONTRACT_VERSION).toBe('v1');
	});
});
