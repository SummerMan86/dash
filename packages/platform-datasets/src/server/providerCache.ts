/**
 * Shared bounded LRU cache for provider responses.
 *
 * Internal to platform-datasets — not exported from the public ./server entrypoint.
 * Cache key contract: docs/bi/architecture.md §4 (Cache Strategy).
 * Provider extension rules: docs/bi/architecture.md §7.
 */
import { LRUCache } from 'lru-cache';
import type { DatasetResponse } from '../model';

// ---------------------------------------------------------------------------
// Cache key builder
// ---------------------------------------------------------------------------

const EXCLUDED_KEY_PARAMS = new Set(['requestId']);

/**
 * Builds a deterministic cache key from dataset identity + params + tenant.
 * `requestId` is excluded from cache identity per architecture contract.
 * Segments are separated by `\0` to prevent collision when datasetId or
 * tenantId contain regular separators like `:`.
 */
export function buildCacheKey(
	datasetId: string,
	params: Record<string, unknown>,
	tenantId: string,
): string {
	const sortedParams = Object.keys(params)
		.filter((k) => !EXCLUDED_KEY_PARAMS.has(k))
		.sort()
		.map((k) => `${k}=${JSON.stringify(params[k])}`)
		.join('&');
	return `${datasetId}\0${tenantId}\0${sortedParams}`;
}

// ---------------------------------------------------------------------------
// Cache entry + factory
// ---------------------------------------------------------------------------

type CachedEntry = {
	response: DatasetResponse;
	/** Unix timestamp (ms) at which this entry was cached. */
	cachedAt: number;
	expiresAt: number;
};

type CacheHit = {
	response: DatasetResponse;
	/** Unix timestamp (ms) at which this entry was cached. */
	cachedAt: number;
};

export interface ProviderCache {
	get(key: string): CacheHit | null;
	set(key: string, response: DatasetResponse, ttlMs: number): void;
}

/**
 * Creates a bounded LRU cache for provider responses.
 *
 * TTL is enforced manually via Date.now() on read (not via lru-cache's
 * built-in performance.now()-based TTL) so that vi.useFakeTimers() works
 * in tests. Expired entries that are never read again remain in LRU slots
 * until evicted by capacity pressure — acceptable for bounded max of 200.
 *
 * @param opts.maxEntries - Maximum number of cached entries (default 200)
 */
export function createProviderCache(opts?: { maxEntries?: number }): ProviderCache {
	const maxEntries = opts?.maxEntries ?? 200;

	const lru = new LRUCache<string, CachedEntry>({
		max: maxEntries,
	});

	return {
		get(key: string): CacheHit | null {
			const entry = lru.get(key);
			if (!entry) return null;
			// Manual TTL check — Date.now()-based so fake timers work in tests
			if (Date.now() > entry.expiresAt) {
				lru.delete(key);
				return null;
			}
			// structuredClone ensures callers cannot mutate cached data
			return {
				response: structuredClone(entry.response),
				cachedAt: entry.cachedAt,
			};
		},

		set(key: string, response: DatasetResponse, ttlMs: number): void {
			const now = Date.now();
			lru.set(key, {
				response: structuredClone(response),
				cachedAt: now,
				expiresAt: now + ttlMs,
			});
		},
	};
}
