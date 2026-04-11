import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DatasetResponse } from '../model';
import { CONTRACT_VERSION } from '../model';
import { createProviderCache, buildCacheKey } from './providerCache';

// --- Fixtures ---

function makeResponse(datasetId: string, overrides?: Partial<DatasetResponse>): DatasetResponse {
	return {
		contractVersion: CONTRACT_VERSION,
		datasetId,
		fields: [{ name: 'id', type: 'string' }],
		rows: [{ id: '1' }],
		...overrides,
	};
}

describe('buildCacheKey', () => {
	it('produces deterministic key for same inputs regardless of param order', () => {
		const a = buildCacheKey('ds1', { z: 1, a: 'x' }, 'tenant-1');
		const b = buildCacheKey('ds1', { a: 'x', z: 1 }, 'tenant-1');
		expect(a).toBe(b);
	});

	it('separates tenants', () => {
		const a = buildCacheKey('ds1', { p: 1 }, 'tenant-A');
		const b = buildCacheKey('ds1', { p: 1 }, 'tenant-B');
		expect(a).not.toBe(b);
	});

	it('excludes requestId from key identity', () => {
		const a = buildCacheKey('ds1', { requestId: 'req-1', p: 1 }, 'tenant-1');
		const b = buildCacheKey('ds1', { requestId: 'req-2', p: 1 }, 'tenant-1');
		expect(a).toBe(b);
	});

	it('differentiates different datasets', () => {
		const a = buildCacheKey('ds1', { p: 1 }, 'tenant-1');
		const b = buildCacheKey('ds2', { p: 1 }, 'tenant-1');
		expect(a).not.toBe(b);
	});

	it('differentiates different params', () => {
		const a = buildCacheKey('ds1', { p: 1 }, 'tenant-1');
		const b = buildCacheKey('ds1', { p: 2 }, 'tenant-1');
		expect(a).not.toBe(b);
	});

	it('does not collide when datasetId or tenantId contain colon', () => {
		const a = buildCacheKey('ds:t', { p: 1 }, 'X');
		const b = buildCacheKey('ds', { p: 1 }, 't:X');
		expect(a).not.toBe(b);
	});
});

describe('createProviderCache', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns null on cache miss', () => {
		const cache = createProviderCache({ maxEntries: 10 });
		const result = cache.get('nonexistent');
		expect(result).toBeNull();
	});

	it('returns cached response on hit', () => {
		const cache = createProviderCache({ maxEntries: 10 });
		const resp = makeResponse('ds1');
		cache.set('key1', resp, 60_000);
		const hit = cache.get('key1');
		expect(hit).not.toBeNull();
		expect(hit!.response.datasetId).toBe('ds1');
		expect(hit!.cachedAt).toBeGreaterThan(0);
	});

	it('returns cachedAt timestamp reflecting when entry was stored', () => {
		const cache = createProviderCache({ maxEntries: 10 });
		const now = Date.now();
		const resp = makeResponse('ds1');
		cache.set('key1', resp, 60_000);

		vi.advanceTimersByTime(5_000);

		const hit = cache.get('key1');
		expect(hit).not.toBeNull();
		expect(hit!.cachedAt).toBe(now);
	});

	it('expires entries after TTL', () => {
		const cache = createProviderCache({ maxEntries: 10 });
		cache.set('key1', makeResponse('ds1'), 1_000);

		// Still alive at 999ms
		vi.advanceTimersByTime(999);
		expect(cache.get('key1')).not.toBeNull();

		// Expired at 1001ms
		vi.advanceTimersByTime(2);
		expect(cache.get('key1')).toBeNull();
	});

	it('separates entries by tenant via key', () => {
		const cache = createProviderCache({ maxEntries: 10 });
		const keyA = buildCacheKey('ds1', { p: 1 }, 'tenant-A');
		const keyB = buildCacheKey('ds1', { p: 1 }, 'tenant-B');

		cache.set(keyA, makeResponse('ds1', { rows: [{ id: 'A' }] }), 60_000);
		cache.set(keyB, makeResponse('ds1', { rows: [{ id: 'B' }] }), 60_000);

		const hitA = cache.get(keyA);
		const hitB = cache.get(keyB);
		expect(hitA!.response.rows[0].id).toBe('A');
		expect(hitB!.response.rows[0].id).toBe('B');
	});

	it('evicts least-recently-used entries when at capacity', () => {
		const cache = createProviderCache({ maxEntries: 3 });

		cache.set('k1', makeResponse('ds1'), 60_000);
		cache.set('k2', makeResponse('ds2'), 60_000);
		cache.set('k3', makeResponse('ds3'), 60_000);

		// Access k1 to make it recently used
		cache.get('k1');

		// Add k4 — should evict k2 (least recently used)
		cache.set('k4', makeResponse('ds4'), 60_000);

		expect(cache.get('k1')).not.toBeNull(); // accessed recently
		expect(cache.get('k2')).toBeNull();     // evicted (LRU)
		expect(cache.get('k3')).not.toBeNull(); // still in cache
		expect(cache.get('k4')).not.toBeNull(); // just added
	});

	it('stores response immutably — write-side isolation', () => {
		const cache = createProviderCache({ maxEntries: 10 });
		const resp = makeResponse('ds1');
		cache.set('key1', resp, 60_000);

		// Mutate original — cached copy should be unaffected
		resp.rows.push({ id: '2' });
		const hit = cache.get('key1');
		expect(hit!.response.rows).toHaveLength(1);
	});

	it('returns response immutably — read-side isolation', () => {
		const cache = createProviderCache({ maxEntries: 10 });
		cache.set('key1', makeResponse('ds1'), 60_000);

		const hit1 = cache.get('key1');
		hit1!.response.rows.push({ id: 'injected' });

		const hit2 = cache.get('key1');
		expect(hit2!.response.rows).toHaveLength(1);
	});
});
