import { describe, it, expect } from 'vitest';
import {
	idle, loading, ok, error,
	normalizeDatasetError,
	type AsyncState,
	type DatasetClientError,
} from './client';

describe('AsyncState helpers', () => {
	it('creates idle state', () => {
		const state: AsyncState<string> = idle();
		expect(state.status).toBe('idle');
	});

	it('creates loading state', () => {
		const state: AsyncState<string> = loading();
		expect(state.status).toBe('loading');
	});

	it('creates ok state', () => {
		const state = ok({ count: 42 });
		expect(state.status).toBe('ok');
		if (state.status === 'ok') {
			expect(state.data).toEqual({ count: 42 });
			expect(state.refreshing).toBeUndefined();
		}
	});

	it('creates ok state with refreshing flag', () => {
		const state = ok('data', true);
		expect(state.status).toBe('ok');
		if (state.status === 'ok') {
			expect(state.refreshing).toBe(true);
		}
	});

	it('creates error state without previous data', () => {
		const err: DatasetClientError = { code: 'TEST', message: 'fail', retryable: false };
		const state = error<string>(err);
		expect(state.status).toBe('error');
		if (state.status === 'error') {
			expect(state.error.code).toBe('TEST');
			expect(state.data).toBeUndefined();
		}
	});

	it('creates error state preserving previous data', () => {
		const err: DatasetClientError = { code: 'TEST', message: 'fail', retryable: true };
		const state = error(err, 'previous');
		expect(state.status).toBe('error');
		if (state.status === 'error') {
			expect(state.data).toBe('previous');
			expect(state.error.retryable).toBe(true);
		}
	});
});

describe('normalizeDatasetError', () => {
	it('parses server JSON error (DatasetError shape)', () => {
		const body = JSON.stringify({
			error: 'Dataset not found',
			code: 'DATASET_NOT_FOUND',
			retryable: false,
			requestId: 'req-1',
		});
		const err = normalizeDatasetError(null, body);
		expect(err.code).toBe('DATASET_NOT_FOUND');
		expect(err.message).toBe('Dataset not found');
		expect(err.retryable).toBe(false);
		expect(err.requestId).toBe('req-1');
	});

	it('parses server error without requestId', () => {
		const body = JSON.stringify({
			error: 'Timeout',
			code: 'DATASET_TIMEOUT',
			retryable: true,
		});
		const err = normalizeDatasetError(null, body);
		expect(err.code).toBe('DATASET_TIMEOUT');
		expect(err.retryable).toBe(true);
		expect(err.requestId).toBeUndefined();
	});

	it('handles non-JSON response body', () => {
		const err = normalizeDatasetError(new Error('fetch failed'), 'Internal Server Error');
		expect(err.code).toBe('CLIENT_ERROR');
		expect(err.message).toBe('fetch failed');
	});

	it('handles TypeError as network error', () => {
		const err = normalizeDatasetError(new TypeError('Failed to fetch'));
		expect(err.code).toBe('NETWORK_ERROR');
		expect(err.retryable).toBe(true);
	});

	it('handles unknown error', () => {
		const err = normalizeDatasetError('something weird');
		expect(err.code).toBe('UNKNOWN_ERROR');
		expect(err.retryable).toBe(false);
	});

	it('handles undefined response body', () => {
		const err = normalizeDatasetError(new Error('oops'));
		expect(err.code).toBe('CLIENT_ERROR');
		expect(err.message).toBe('oops');
	});
});
