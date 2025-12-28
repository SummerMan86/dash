import { get, writable, type Readable, type Writable } from 'svelte/store';

import type { FilterState } from './types';

/**
 * FilterStore is a small explicit API around Svelte stores.
 *
 * Why this exists (for newcomers):
 * - UI should not directly mutate random objects; it should call `set()` / `patch()`.
 * - this gives us ONE place to add validation/normalization later.
 * - it is easier to test and refactor.
 */
export type FilterStore = {
	state: Writable<FilterState>;
	snapshot: Readable<FilterState>;
	set: (next: FilterState) => void;
	patch: (patch: Partial<FilterState>) => void;
	reset: () => void;
	getSnapshot: () => FilterState;
};

function sanitize(next: FilterState): FilterState {
	// MVP validation: keep only defined fields; drop empty arrays/strings.
	const out: FilterState = {};
	if (next.dateFrom) out.dateFrom = String(next.dateFrom);
	if (next.dateTo) out.dateTo = String(next.dateTo);
	if (Array.isArray(next.status) && next.status.length) out.status = next.status.map(String);
	if (Array.isArray(next.role) && next.role.length) out.role = next.role.map(String);
	if (Array.isArray(next.mcc) && next.mcc.length) out.mcc = next.mcc.map(String);
	if (typeof next.client === 'string' && next.client.trim()) out.client = next.client.trim();
	return out;
}

export function createFilterStore(initial: FilterState = {}): FilterStore {
	const initialSanitized = sanitize(initial);
	const state = writable<FilterState>(initialSanitized);
	// A stable Readable that always mirrors state (useful for consumers that want Readable only).
	const snapshot: Readable<FilterState> = { subscribe: state.subscribe };

	function set(next: FilterState) {
		state.set(sanitize(next));
	}

	function patch(p: Partial<FilterState>) {
		state.update((cur) => sanitize({ ...cur, ...p }));
	}

	function reset() {
		state.set(initialSanitized);
	}

	function getSnapshot() {
		return get(state);
	}

	return { state, snapshot, set, patch, reset, getSnapshot };
}

/**
 * Global singleton store (default app instance).
 * Apps that need per-request stores (SSR isolation) can call `createFilterStore()`.
 *
 * Rule of thumb:
 * - for pure client pages, `filterStore` is fine
 * - for SSR isolation per request, prefer `createFilterStore()` and pass it down
 */
export const filterStore = createFilterStore();

export function getFilterSnapshot(): FilterState {
	// Useful for code that wants "the current filters right now" (e.g. building a request).
	return filterStore.getSnapshot();
}


