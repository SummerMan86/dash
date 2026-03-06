import { get, writable, derived, type Readable, type Writable } from 'svelte/store';

import type { FilterState, FilterValue, FilterValues } from './types';
import { toLegacyFilterState } from './types';
import { getSpec } from './registry';

// ============================================================================
// LEGACY API (backward compatibility)
// ============================================================================

/**
 * @deprecated Use new filter store API instead.
 */
export type FilterStore = {
	state: Writable<FilterState>;
	snapshot: Readable<FilterState>;
	set: (next: FilterState) => void;
	patch: (patch: Partial<FilterState>) => void;
	reset: () => void;
	getSnapshot: () => FilterState;
};

function sanitizeLegacy(next: FilterState): FilterState {
	const out: FilterState = {};
	if (next.dateFrom) out.dateFrom = String(next.dateFrom);
	if (next.dateTo) out.dateTo = String(next.dateTo);
	if (Array.isArray(next.status) && next.status.length) out.status = next.status.map(String);
	if (Array.isArray(next.role) && next.role.length) out.role = next.role.map(String);
	if (Array.isArray(next.mcc) && next.mcc.length) out.mcc = next.mcc.map(String);
	if (typeof next.client === 'string' && next.client.trim()) out.client = next.client.trim();
	return out;
}

/**
 * @deprecated Use createFilterStoreV2 instead.
 */
export function createFilterStore(initial: FilterState = {}): FilterStore {
	const initialSanitized = sanitizeLegacy(initial);
	const state = writable<FilterState>(initialSanitized);
	const snapshot: Readable<FilterState> = { subscribe: state.subscribe };

	function set(next: FilterState) {
		state.set(sanitizeLegacy(next));
	}

	function patch(p: Partial<FilterState>) {
		state.update((cur) => sanitizeLegacy({ ...cur, ...p }));
	}

	function reset() {
		state.set(initialSanitized);
	}

	function getSnapshot() {
		return get(state);
	}

	return { state, snapshot, set, patch, reset, getSnapshot };
}

// ============================================================================
// NEW FILTER STORE API
// ============================================================================

/**
 * Internal state structure for the new filter store.
 */
type FilterStoreState = {
	/** Global scope values */
	global: FilterValues;
	/** Page scope values, keyed by pageId */
	pages: Record<string, FilterValues>;
	/** Currently active page */
	activePageId: string | null;
};

/**
 * New filter store API with scope support.
 */
export type FilterStoreV2 = {
	// === Stores ===
	/** Raw global values */
	global: Readable<FilterValues>;
	/** Raw page values for active page */
	page: Readable<FilterValues>;
	/** Merged effective values (global + page, page wins) */
	effective: Readable<FilterValues>;

	// === Mutations ===
	/** Set a filter value */
	setFilter: (filterId: string, value: FilterValue) => void;
	/** Set multiple filter values */
	setFilters: (values: FilterValues) => void;
	/** Reset a specific filter to default */
	resetFilter: (filterId: string) => void;
	/** Reset all filters in a scope */
	resetScope: (scope: 'global' | 'page') => void;
	/** Reset all filters */
	resetAll: () => void;

	// === Page Management ===
	/** Set active page (for page-scoped filters) */
	setActivePage: (pageId: string | null) => void;
	/** Get active page ID */
	getActivePage: () => string | null;

	// === Sync Access ===
	/** Get effective values synchronously (for fetchDataset) */
	getEffectiveSnapshot: () => FilterValues;
	/** Get global values synchronously */
	getGlobalSnapshot: () => FilterValues;
};

/**
 * Sanitize filter value - remove empty values.
 */
function sanitizeValue(value: FilterValue): FilterValue {
	if (value === null || value === undefined) return null;
	if (value === '') return null;
	if (Array.isArray(value) && value.length === 0) return null;
	if (typeof value === 'object' && !Array.isArray(value)) {
		const range = value as { from?: string; to?: string };
		if (!range.from && !range.to) return null;
	}
	return value;
}

function isEqualFilterValue(a: FilterValue, b: FilterValue): boolean {
	if (a === b) return true;
	if (a === null || b === null) return a === b;

	// Arrays (e.g. multiSelect)
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b)) return false;
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) return false;
		}
		return true;
	}

	// Plain objects (e.g. dateRange)
	if (typeof a === 'object' || typeof b === 'object') {
		if (typeof a !== 'object' || typeof b !== 'object') return false;
		const ao = a as Record<string, unknown>;
		const bo = b as Record<string, unknown>;
		const ak = Object.keys(ao);
		const bk = Object.keys(bo);
		if (ak.length !== bk.length) return false;
		for (const k of ak) {
			if (ao[k] !== bo[k]) return false;
		}
		return true;
	}

	// number/string/boolean fallthrough
	return false;
}

/**
 * Create the new filter store with scope support.
 */
export function createFilterStoreV2(
	initialGlobal: FilterValues = {},
	initialPageId: string | null = null
): FilterStoreV2 {
	const state = writable<FilterStoreState>({
		global: initialGlobal,
		pages: {},
		activePageId: initialPageId
	});

	// === Derived Stores ===

	const global: Readable<FilterValues> = derived(state, ($s) => $s.global);

	const page: Readable<FilterValues> = derived(state, ($s) => {
		if (!$s.activePageId) return {};
		return $s.pages[$s.activePageId] ?? {};
	});

	const effective: Readable<FilterValues> = derived(state, ($s) => {
		const pageValues = $s.activePageId ? ($s.pages[$s.activePageId] ?? {}) : {};
		return { ...$s.global, ...pageValues };
	});

	// === Mutations ===

	function setFilter(filterId: string, value: FilterValue): void {
		const spec = getSpec(filterId);
		const scope = spec?.scope ?? 'global';
		const sanitized = sanitizeValue(value);

		state.update((s) => {
			if (scope === 'page') {
				const pageId = s.activePageId;
				if (!pageId) {
					console.warn(`setFilter: cannot set page-scoped filter "${filterId}" without active page`);
					return s;
				}
				const pageValues = { ...(s.pages[pageId] ?? {}) };
				const current = (s.pages[pageId] ?? {})[filterId] ?? null;

				// No-op updates should not emit (prevents reactive storms)
				if (sanitized === null) {
					if (!(filterId in (s.pages[pageId] ?? {}))) return s;
					delete pageValues[filterId];
				} else {
					if (isEqualFilterValue(current, sanitized)) return s;
					pageValues[filterId] = sanitized;
				}
				return {
					...s,
					pages: { ...s.pages, [pageId]: pageValues }
				};
			}

			// Global scope
			const globalValues = { ...s.global };
			const current = s.global[filterId] ?? null;

			// No-op updates should not emit (prevents reactive storms)
			if (sanitized === null) {
				if (!(filterId in s.global)) return s;
				delete globalValues[filterId];
			} else {
				if (isEqualFilterValue(current, sanitized)) return s;
				globalValues[filterId] = sanitized;
			}
			return { ...s, global: globalValues };
		});
	}

	function setFilters(values: FilterValues): void {
		for (const [id, val] of Object.entries(values)) {
			setFilter(id, val);
		}
	}

	function resetFilter(filterId: string): void {
		const spec = getSpec(filterId);
		const defaultVal = spec?.defaultValue ?? null;
		setFilter(filterId, defaultVal);
	}

	function resetScope(scope: 'global' | 'page'): void {
		state.update((s) => {
			if (scope === 'page') {
				const pageId = s.activePageId;
				if (!pageId) return s;
				return {
					...s,
					pages: { ...s.pages, [pageId]: {} }
				};
			}
			return { ...s, global: {} };
		});
	}

	function resetAll(): void {
		state.update((s) => ({
			...s,
			global: {},
			pages: {}
		}));
	}

	// === Page Management ===

	function setActivePage(pageId: string | null): void {
		state.update((s) => ({ ...s, activePageId: pageId }));
	}

	function getActivePage(): string | null {
		return get(state).activePageId;
	}

	// === Sync Access ===

	function getEffectiveSnapshot(): FilterValues {
		return get(effective);
	}

	function getGlobalSnapshot(): FilterValues {
		return get(global);
	}

	return {
		global,
		page,
		effective,
		setFilter,
		setFilters,
		resetFilter,
		resetScope,
		resetAll,
		setActivePage,
		getActivePage,
		getEffectiveSnapshot,
		getGlobalSnapshot
	};
}

// ============================================================================
// GLOBAL SINGLETONS
// ============================================================================

/**
 * @deprecated Use filterStoreV2 for new code.
 * Legacy global singleton store (for backward compatibility).
 */
export const filterStore = createFilterStore();

/**
 * New global singleton store with scope support.
 */
export const filterStoreV2 = createFilterStoreV2();

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * @deprecated Use getEffectiveFilters() instead.
 * Get legacy FilterState snapshot (for backward compatibility).
 */
export function getFilterSnapshot(): FilterState {
	return filterStore.getSnapshot();
}

/**
 * Get effective filter values synchronously.
 * This is the main function for getting current filters.
 */
export function getEffectiveFilters(): FilterValues {
	return filterStoreV2.getEffectiveSnapshot();
}

/**
 * Get effective filters in legacy format.
 * Useful for code that still expects FilterState.
 */
export function getEffectiveFiltersLegacy(): FilterState {
	const values = filterStoreV2.getEffectiveSnapshot();
	return toLegacyFilterState(values);
}

/**
 * Set a filter value.
 * Scope is determined by the filter's spec.
 */
export function setFilter(filterId: string, value: FilterValue): void {
	filterStoreV2.setFilter(filterId, value);
}

/**
 * Reset a filter to its default value.
 */
export function resetFilter(filterId: string): void {
	filterStoreV2.resetFilter(filterId);
}

/**
 * Reset all filters.
 */
export function resetAllFilters(): void {
	filterStoreV2.resetAll();
}

/**
 * Set the active page for page-scoped filters.
 */
export function setActivePage(pageId: string | null): void {
	filterStoreV2.setActivePage(pageId);
}
