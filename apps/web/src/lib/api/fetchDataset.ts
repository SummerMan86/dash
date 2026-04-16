import type {
	DatasetId,
	DatasetQuery,
	DatasetResponse,
	DatasetClientError,
	JsonValue
} from '@dashboard-builder/platform-datasets';
import { CONTRACT_VERSION, normalizeDatasetError } from '@dashboard-builder/platform-datasets';
import {
	getFilterSnapshot,
	getEffectiveFilters,
	planFiltersForDataset,
	hasFiltersForDataset,
	hasFiltersForTarget,
	getActiveFilterRuntime,
	type FilterRuntimeContext,
	type FilterValues
} from '@dashboard-builder/platform-filters';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * `fetchDataset()` is the canonical facade for dataset-backed BI/read-side UI.
 *
 * Why a single facade is useful:
 * - global filters are merged in one place (no filter duplication across widgets)
 * - later we can add caching/dedup/retry in one place
 * - widgets stay simple and do not depend on server implementation details
 *
 * Typical flow:
 * Widget -> fetchDataset({ id, params }) -> HTTP POST /api/datasets/:id -> DatasetResponse
 *
 * Note:
 * - dedicated operational flows (for example `/api/emis/*`) may call their own transport directly
 * - this helper is intentionally scoped to dataset/IR-backed contracts
 */
export type FetchDatasetArgs = {
	id: DatasetId;
	/**
	 * Flat dataset params — the canonical wire bag.
	 * Planner output and page/widget params are merged here client-side before transport.
	 * This is the ONLY input to the server on the canonical path.
	 */
	params?: Record<string, JsonValue>;
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
	/**
	 * @deprecated Legacy filter context for non-migrated pages (strategy, EMIS).
	 * When present, fetchDataset falls back to legacy filter merge path.
	 * Migrated pages should NOT pass this — use explicit params from planner instead.
	 */
	filterContext?: {
		snapshot?: Record<string, JsonValue>;
		workspaceId?: string;
		ownerId?: string;
	};
	/**
	 * @deprecated Extra filters for legacy path only. Ignored on canonical path.
	 */
	filters?: Record<string, JsonValue>;
	/**
	 * @deprecated Skip client-side filtering. Only applies to legacy path.
	 */
	skipClientFilter?: boolean;
};

/**
 * Client-side fetch error with normalized DatasetClientError shape.
 * Thrown by fetchDataset on HTTP or network errors.
 */
export class DatasetFetchError extends Error {
	readonly clientError: DatasetClientError;

	constructor(clientError: DatasetClientError) {
		super(clientError.message);
		this.name = 'DatasetFetchError';
		this.clientError = clientError;
	}
}

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
	if (!doFetch)
		throw new Error('fetchDataset: no fetch available (provide args.fetch in SSR/load)');

	// Resolve query — canonical path (default) or legacy path (when filterContext is present)
	let plan: ReturnType<typeof planFiltersForDataset> | null = null;
	let query: DatasetQuery;

	if (!args.filterContext) {
		// --- Canonical path (default) ---
		// All params are provided explicitly by the caller.
		// Planner output is merged into params by the page, not by fetchDataset.
		query = {
			contractVersion: CONTRACT_VERSION,
			...(args.requestId ? { requestId: args.requestId } : {}),
			...(args.params ? { params: args.params } : {}),
		};
	} else {
		// --- Legacy path (deprecated, non-migrated pages) ---
		// Kept for backward compatibility with strategy/EMIS pages that still
		// pass filterContext. Will be removed when all pages are migrated.
		const effectiveFilters =
			(args.filterContext.snapshot as FilterValues | undefined) ?? getEffectiveFilters();
		const runtimeContext: FilterRuntimeContext | undefined =
			args.filterContext.workspaceId && args.filterContext.ownerId
				? {
						workspaceId: args.filterContext.workspaceId,
						ownerId: args.filterContext.ownerId,
					}
				: (getActiveFilterRuntime() ?? undefined);

		plan = (
			runtimeContext
				? hasFiltersForTarget(args.id, runtimeContext)
				: hasFiltersForDataset(args.id)
		)
			? planFiltersForDataset(args.id, effectiveFilters, runtimeContext)
			: null;

		const legacyFilters = getFilterSnapshot() as unknown as Record<string, JsonValue>;
		const mergedFilters: Record<string, JsonValue> = {
			...legacyFilters,
			...(plan?.serverParams ?? {}),
			...(args.filters ?? {}),
		};

		query = {
			contractVersion: CONTRACT_VERSION,
			...(args.requestId ? { requestId: args.requestId } : {}),
			...(Object.keys(mergedFilters).length ? { filters: mergedFilters } : {}),
			...(args.params ? { params: args.params } : {}),
		};
	}

	// Cache key uses the request payload. Client-side post-filtering stays outside it.
	const key = makeKey(args.id, query);
	const now = Date.now();
	const ttlMs = args.cache?.ttlMs ?? 0;

	if (ttlMs > 0) {
		// TTL cache: returns quickly without hitting network.
		const cached = memoryCache.get(key);
		if (cached && cached.expiresAt > now) {
			// Apply client filter to cached data too
			if (!args.skipClientFilter && plan?.clientFilterFn) {
				return {
					...cached.value,
					rows: cached.value.rows.filter(plan.clientFilterFn)
				};
			}
			return cached.value;
		}
	}

	// In-flight dedup: if another component is already fetching the same key, await it.
	const existing = inFlight.get(key);
	if (existing) {
		const result = await existing;
		// Apply client filter to deduped result
		if (!args.skipClientFilter && plan?.clientFilterFn) {
			return {
				...result,
				rows: result.rows.filter(plan.clientFilterFn)
			};
		}
		return result;
	}

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
			const text = await res.text().catch(() => '');
			throw new DatasetFetchError(normalizeDatasetError(new Error(`HTTP ${res.status}`), text));
		}

		const data = (await res.json()) as DatasetResponse;
		if (ttlMs > 0) memoryCache.set(key, { expiresAt: now + ttlMs, value: data });
		return data;
	})().finally(() => {
		// Always remove the in-flight marker when done (success or failure).
		inFlight.delete(key);
	});

	inFlight.set(key, p);

	const result = await p;

	// Apply client-side filtering if needed
	if (!args.skipClientFilter && plan?.clientFilterFn) {
		return {
			...result,
			rows: result.rows.filter(plan.clientFilterFn)
		};
	}

	return result;
}
