import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONTRACT_VERSION } from '@dashboard-builder/platform-datasets';

vi.mock('$lib/server/providers/mockProvider', () => ({
	mockProvider: {},
}));

vi.mock('@dashboard-builder/platform-datasets/server', async () => {
	const actual = await vi.importActual<typeof import('@dashboard-builder/platform-datasets/server')>(
		'@dashboard-builder/platform-datasets/server',
	);

	return {
		...actual,
		executeDatasetQuery: vi.fn(),
		registerProvider: vi.fn(),
	};
});

import { POST } from './+server';
import {
	DatasetExecutionError,
	executeDatasetQuery,
} from '@dashboard-builder/platform-datasets/server';

const executeDatasetQueryMock = vi.mocked(executeDatasetQuery);

const validQuery = {
	contractVersion: CONTRACT_VERSION,
	requestId: 'req-123',
	params: { limit: 10 },
};

function createRequest(body: string, headers?: HeadersInit) {
	return new Request('http://localhost/api/datasets/test-id', {
		method: 'POST',
		body,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	});
}

describe('POST /api/datasets/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 400 when dataset ID is missing', async () => {
		const response = await POST({
			params: { id: undefined } as unknown as { id: string },
			request: createRequest(JSON.stringify(validQuery)),
		} as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: 'Missing dataset id',
			code: 'DATASET_ID_MISSING',
		});
		expect(executeDatasetQueryMock).not.toHaveBeenCalled();
	});

	it('returns 400 with DATASET_INVALID_JSON when JSON body is invalid', async () => {
		const response = await POST({
			params: { id: 'test-id' },
			request: createRequest('{'),
		} as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: 'Invalid JSON body',
			code: 'DATASET_INVALID_JSON',
		});
		expect(executeDatasetQueryMock).not.toHaveBeenCalled();
	});

	it.each([null, 'text', 123])(
		'returns 400 with DATASET_INVALID_QUERY when query is %p',
		async (payload) => {
			const response = await POST({
				params: { id: 'test-id' },
				request: createRequest(JSON.stringify(payload)),
			} as unknown as Parameters<typeof POST>[0]);

			expect(response.status).toBe(400);
			await expect(response.json()).resolves.toEqual({
				error: 'Invalid query',
				code: 'DATASET_INVALID_QUERY',
			});
			expect(executeDatasetQueryMock).not.toHaveBeenCalled();
		},
	);

	it('returns 400 with DATASET_UNSUPPORTED_CONTRACT_VERSION when contractVersion does not match', async () => {
		const response = await POST({
			params: { id: 'test-id' },
			request: createRequest(
				JSON.stringify({
					...validQuery,
					contractVersion: 'v999',
				}),
			),
		} as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: 'Unsupported contractVersion: v999',
			code: 'DATASET_UNSUPPORTED_CONTRACT_VERSION',
		});
		expect(executeDatasetQueryMock).not.toHaveBeenCalled();
	});

	it('returns 200 with the dataset response on success', async () => {
		const responseBody = {
			contractVersion: CONTRACT_VERSION,
			datasetId: 'test-id',
			requestId: 'req-123',
			fields: [{ name: 'value', type: 'number' as const }],
			rows: [{ value: 42 }],
			meta: { tenantId: 'tenant-a', sourceKind: 'mock' },
		};

		executeDatasetQueryMock.mockResolvedValueOnce(responseBody);

		const response = await POST({
			params: { id: 'test-id' },
			request: createRequest(JSON.stringify(validQuery), {
				'x-tenant-id': ' tenant-a ',
			}),
		} as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(responseBody);
		expect(executeDatasetQueryMock).toHaveBeenCalledWith('test-id', validQuery, {
			tenantId: 'tenant-a',
			requestId: 'req-123',
		});
	});

	it.each([
		['DATASET_NOT_FOUND', 404],
		['DATASET_ACCESS_DENIED', 403],
		['DATASET_INVALID_PARAMS', 400],
		['UNSUPPORTED_BACKEND', 500],
		['DATASET_EXECUTION_FAILED', 500],
		['DATASET_TIMEOUT', 504],
		['DATASET_CONNECTION_ERROR', 503],
	] as const)('maps %s to HTTP %i', async (code, status) => {
		const error = new DatasetExecutionError(code, `${code} message`, true, 'req-err');
		executeDatasetQueryMock.mockRejectedValueOnce(error);

		const response = await POST({
			params: { id: 'test-id' },
			request: createRequest(JSON.stringify(validQuery), {
				'x-tenant-id': 'tenant-b',
			}),
		} as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toEqual(error.toJSON());
		expect(executeDatasetQueryMock).toHaveBeenCalledWith('test-id', validQuery, {
			tenantId: 'tenant-b',
			requestId: 'req-123',
		});
	});

	it('returns 500 with DATASET_EXECUTION_FAILED for unexpected errors', async () => {
		executeDatasetQueryMock.mockRejectedValueOnce(new Error('boom'));

		const response = await POST({
			params: { id: 'test-id' },
			request: createRequest(JSON.stringify(validQuery)),
		} as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({
			error: 'Unexpected error',
			code: 'DATASET_EXECUTION_FAILED',
		});
		expect(executeDatasetQueryMock).toHaveBeenCalledWith('test-id', validQuery, {
			tenantId: 'demo',
			requestId: 'req-123',
		});
	});
});
