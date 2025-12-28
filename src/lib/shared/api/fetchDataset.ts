import type { DatasetId, DatasetQuery, DatasetResponse, JsonValue } from '$entities/dataset';
import { CONTRACT_VERSION } from '$entities/dataset';
import { getFilterSnapshot } from '$entities/filter';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * `fetchDataset()` is the ONLY function UI code should use to load datasets.
 *
 * Why a single facade is useful:
 * - global filters are merged in one place (no filter duplication across widgets)
 * - later we can add caching/dedup/retry in one place
 * - widgets stay simple and do not depend on server implementation details
 *
 * Typical flow:
 * Widget -> fetchDataset({ id, params }) -> HTTP POST /api/datasets/:id -> DatasetResponse
 */
export type FetchDatasetArgs = {
	id: DatasetId;
	/**
	 * Dataset-specific params (widget config etc).
	 * Global filters are merged in automatically from `entities/filter`.
	 */
	params?: Record<string, JsonValue>;
	/**
	 * Extra filters to merge on top of global filters (optional).
	 * If keys overlap, `filters` wins over global snapshot.
	 */
	filters?: Record<string, JsonValue>;
	requestId?: string;
	/**
	 * Supply SvelteKit `fetch` in load functions, or leave undefined to use global `fetch`.
	 */
	fetch?: FetchLike;
	/**
	 * Testing-only hook for current demo: sent as `x-tenant-id`.
	 * In real app tenant/user context should come from auth/cookies (server derived).
	 */
	tenantId?: string;
	/**
	 * Cache control (client-side).
	 */
	cache?: { ttlMs?: number };
};

type CacheEntry = { expiresAt: number; value: DatasetResponse };

// Deduplicate identical requests that are currently in flight.
// Key is derived from datasetId + stable-stringified DatasetQuery.
const inFlight = new Map<string, Promise<DatasetResponse>>();
// Very small in-memory TTL cache (client-only). This is intentionally minimal for MVP.
const memoryCache = new Map<string, CacheEntry>();

function stableStringify(value: unknown): string {
	// Stable stringify = JSON stringify with sorted object keys.
	// This ensures cache keys are deterministic across runs.
	if (value === null) return 'null';
	if (typeof value !== 'object') return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	const obj = value as Record<string, unknown>;
	const keys = Object.keys(obj).sort();
	return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function makeKey(id: DatasetId, query: DatasetQuery): string {
	return `${id}:${stableStringify(query)}`;
}

export async function fetchDataset(args: FetchDatasetArgs): Promise<DatasetResponse> {
	const doFetch: FetchLike | undefined =
		args.fetch ?? (typeof fetch !== 'undefined' ? (fetch as FetchLike) : undefined);
	if (!doFetch) throw new Error('fetchDataset: no fetch available (provide args.fetch in SSR/load)');

	// Merge global filters (single source of truth) + per-call overrides.
	const globalFilters = getFilterSnapshot() as unknown as Record<string, JsonValue>;
	const mergedFilters: Record<string, JsonValue> = { ...globalFilters, ...(args.filters ?? {}) };

	// This is the only request payload format the BFF understands.
	const query: DatasetQuery = {
		contractVersion: CONTRACT_VERSION,
		...(args.requestId ? { requestId: args.requestId } : {}),
		...(Object.keys(mergedFilters).length ? { filters: mergedFilters } : {}),
		...(args.params ? { params: args.params } : {})
	};

	const key = makeKey(args.id, query);
	const now = Date.now();
	const ttlMs = args.cache?.ttlMs ?? 0;

	if (ttlMs > 0) {
		// TTL cache: returns quickly without hitting network.
		const cached = memoryCache.get(key);
		if (cached && cached.expiresAt > now) return cached.value;
	}

	// In-flight dedup: if another component is already fetching the same key, await it.
	const existing = inFlight.get(key);
	if (existing) return existing;

	const p = (async () => {
		const res = await doFetch(`/api/datasets/${encodeURIComponent(String(args.id))}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				...(args.tenantId ? { 'x-tenant-id': args.tenantId } : {})
			},
			body: JSON.stringify(query)
		});

		if (!res.ok) {
			// Keep the error readable for beginners (status + body).
			const text = await res.text().catch(() => '');
			throw new Error(`fetchDataset: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
		}

		const data = (await res.json()) as DatasetResponse;
		if (ttlMs > 0) memoryCache.set(key, { expiresAt: now + ttlMs, value: data });
		return data;
	})()
		.finally(() => {
			// Always remove the in-flight marker when done (success or failure).
			inFlight.delete(key);
		});

	inFlight.set(key, p);
	return p;
}


