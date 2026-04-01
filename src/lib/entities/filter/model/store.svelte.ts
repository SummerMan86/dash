import { get, writable, derived, type Readable, type Writable } from 'svelte/store';

import type {
	FilterState,
	FilterValue,
	FilterValues,
	ResolvedFilterSpec,
	FilterRuntimeContext,
	NormalizedFilterScope
} from './types';
import { toLegacyFilterState } from './types';
import { getResolvedSpecForFilter, getResolvedSpecsForRuntime, getSpec } from './registry';

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
					console.warn(
						`setFilter: cannot set page-scoped filter "${filterId}" without active page`
					);
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
// WORKSPACE RUNTIME STORE
// ============================================================================

type WorkspaceRuntimeState = {
	shared: FilterValues;
	workspace: Record<string, FilterValues>;
	owner: Record<string, Record<string, FilterValues>>;
	active: FilterRuntimeContext | null;
};

const initialRuntimeState: WorkspaceRuntimeState = {
	shared: {},
	workspace: {},
	owner: {},
	active: null
};

export const filterRuntimeState = writable<WorkspaceRuntimeState>(initialRuntimeState);

function getRuntimeSpecs(
	context: FilterRuntimeContext,
	resolvedSpecs?: ResolvedFilterSpec[]
): ResolvedFilterSpec[] {
	return resolvedSpecs ?? getResolvedSpecsForRuntime(context);
}

function getWorkspaceValues(state: WorkspaceRuntimeState, workspaceId: string): FilterValues {
	return state.workspace[workspaceId] ?? {};
}

function getOwnerValues(
	state: WorkspaceRuntimeState,
	workspaceId: string,
	ownerId: string
): FilterValues {
	return state.owner[workspaceId]?.[ownerId] ?? {};
}

function getStoredValueForSpec(
	state: WorkspaceRuntimeState,
	spec: ResolvedFilterSpec
): FilterValue | undefined {
	switch (spec.scope) {
		case 'shared':
			return spec.sharedKey ? state.shared[spec.sharedKey] : undefined;
		case 'workspace':
			return getWorkspaceValues(state, spec.workspaceId)[spec.urlKey];
		case 'owner':
			return getOwnerValues(state, spec.workspaceId, spec.ownerId)[spec.urlKey];
	}
}

function buildRuntimeSnapshot(
	state: WorkspaceRuntimeState,
	specs: ResolvedFilterSpec[],
	includeDefaults: boolean
): FilterValues {
	const snapshot: FilterValues = {};

	for (const spec of specs) {
		const storedValue = getStoredValueForSpec(state, spec);
		if (storedValue !== undefined) {
			snapshot[spec.filterId] = storedValue;
			continue;
		}

		if (includeDefaults && spec.defaultValue !== undefined) {
			snapshot[spec.filterId] = spec.defaultValue;
		}
	}

	return snapshot;
}

function applyRuntimeMutation(
	state: WorkspaceRuntimeState,
	spec: ResolvedFilterSpec,
	value: FilterValue
): WorkspaceRuntimeState {
	const sanitized = sanitizeValue(value);
	const next = {
		...state,
		shared: state.shared,
		workspace: state.workspace,
		owner: state.owner
	};

	if (spec.scope === 'shared') {
		if (!spec.sharedKey) return state;
		const current = state.shared[spec.sharedKey] ?? null;
		if (isEqualFilterValue(current, sanitized)) return state;

		const sharedValues = { ...state.shared };
		if (sanitized === null) delete sharedValues[spec.sharedKey];
		else sharedValues[spec.sharedKey] = sanitized;

		next.shared = sharedValues;
		return next;
	}

	if (spec.scope === 'workspace') {
		const currentWorkspace = getWorkspaceValues(state, spec.workspaceId);
		const current = currentWorkspace[spec.urlKey] ?? null;
		if (isEqualFilterValue(current, sanitized)) return state;

		const workspaceValues = { ...currentWorkspace };
		if (sanitized === null) delete workspaceValues[spec.urlKey];
		else workspaceValues[spec.urlKey] = sanitized;

		next.workspace = {
			...state.workspace,
			[spec.workspaceId]: workspaceValues
		};
		return next;
	}

	const currentOwnerValues = getOwnerValues(state, spec.workspaceId, spec.ownerId);
	const current = currentOwnerValues[spec.urlKey] ?? null;
	if (isEqualFilterValue(current, sanitized)) return state;

	const ownerValues = { ...currentOwnerValues };
	if (sanitized === null) delete ownerValues[spec.urlKey];
	else ownerValues[spec.urlKey] = sanitized;

	next.owner = {
		...state.owner,
		[spec.workspaceId]: {
			...(state.owner[spec.workspaceId] ?? {}),
			[spec.ownerId]: ownerValues
		}
	};
	return next;
}

export function setActiveFilterRuntime(context: FilterRuntimeContext | null): void {
	filterRuntimeState.update((state) => ({ ...state, active: context }));
}

export function getActiveFilterRuntime(): FilterRuntimeContext | null {
	return get(filterRuntimeState).active;
}

export function getRuntimeRawSnapshot(
	context: FilterRuntimeContext,
	resolvedSpecs?: ResolvedFilterSpec[]
): FilterValues {
	return buildRuntimeSnapshot(
		get(filterRuntimeState),
		getRuntimeSpecs(context, resolvedSpecs),
		false
	);
}

export function getRuntimeSnapshotForState(
	state: WorkspaceRuntimeState,
	context: FilterRuntimeContext,
	resolvedSpecs: ResolvedFilterSpec[],
	includeDefaults = true
): FilterValues {
	return buildRuntimeSnapshot(state, getRuntimeSpecs(context, resolvedSpecs), includeDefaults);
}

export function getRuntimeFilterSnapshot(
	context: FilterRuntimeContext,
	resolvedSpecs?: ResolvedFilterSpec[]
): FilterValues {
	return buildRuntimeSnapshot(
		get(filterRuntimeState),
		getRuntimeSpecs(context, resolvedSpecs),
		true
	);
}

export function setRuntimeFilter(
	context: FilterRuntimeContext,
	filterId: string,
	value: FilterValue,
	resolvedSpecs?: ResolvedFilterSpec[]
): void {
	const spec =
		getRuntimeSpecs(context, resolvedSpecs).find((item) => item.filterId === filterId) ??
		getResolvedSpecForFilter(context, filterId);
	if (!spec) return;

	filterRuntimeState.update((state) => applyRuntimeMutation(state, spec, value));
}

export function setRuntimeFilters(
	context: FilterRuntimeContext,
	values: FilterValues,
	resolvedSpecs?: ResolvedFilterSpec[]
): void {
	const specs = getRuntimeSpecs(context, resolvedSpecs);
	const specsByFilterId = new Map(specs.map((spec) => [spec.filterId, spec]));

	filterRuntimeState.update((state) => {
		let nextState = state;

		for (const [filterId, value] of Object.entries(values)) {
			const spec = specsByFilterId.get(filterId);
			if (!spec) continue;
			nextState = applyRuntimeMutation(nextState, spec, value);
		}

		return nextState;
	});
}

export function resetRuntimeScope(
	context: FilterRuntimeContext,
	scope: NormalizedFilterScope | 'all',
	resolvedSpecs?: ResolvedFilterSpec[]
): void {
	const specs = getRuntimeSpecs(context, resolvedSpecs).filter(
		(spec) => scope === 'all' || spec.scope === scope
	);
	if (specs.length === 0) return;

	filterRuntimeState.update((state) => {
		let nextState = state;
		for (const spec of specs) {
			nextState = applyRuntimeMutation(nextState, spec, null);
		}
		return nextState;
	});
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
	const activeRuntime = getActiveFilterRuntime();
	if (activeRuntime) {
		return getRuntimeFilterSnapshot(activeRuntime);
	}
	return filterStoreV2.getEffectiveSnapshot();
}

/**
 * Get effective filters in legacy format.
 * Useful for code that still expects FilterState.
 */
export function getEffectiveFiltersLegacy(): FilterState {
	const values = getEffectiveFilters();
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
