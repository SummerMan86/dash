import type { FilterSpec, FilterValues, FilterValue } from './types';

/**
 * FilterRegistry - manages filter specifications.
 *
 * This is a singleton that stores registered filters.
 * Dashboard configs register their filters here at mount time.
 *
 * Usage:
 * ```ts
 * // On page mount
 * registerFilters(myFilterSpecs);
 *
 * // Get specs for rendering
 * const specs = getRegisteredSpecs();
 *
 * // Get specs for a specific dataset
 * const forDataset = getSpecsForDataset('wildberries.fact_product_period');
 * ```
 */

type RegistryState = {
	specs: Map<string, FilterSpec>;
	defaults: FilterValues;
};

const state: RegistryState = {
	specs: new Map(),
	defaults: {}
};

/**
 * Register filter specifications.
 * Called by dashboard/page components when they mount.
 *
 * @param specs - Array of filter specs to register
 */
export function registerFilters(specs: FilterSpec[]): void {
	for (const spec of specs) {
		state.specs.set(spec.id, spec);
		if (spec.defaultValue !== undefined) {
			state.defaults[spec.id] = spec.defaultValue;
		}
	}
}

/**
 * Unregister filters (e.g., when page unmounts).
 *
 * @param filterIds - IDs of filters to unregister
 */
export function unregisterFilters(filterIds: string[]): void {
	for (const id of filterIds) {
		state.specs.delete(id);
		delete state.defaults[id];
	}
}

/**
 * Get all registered specs.
 */
export function getRegisteredSpecs(): FilterSpec[] {
	return Array.from(state.specs.values());
}

/**
 * Get specs by scope.
 */
export function getSpecsByScope(scope: 'global' | 'page'): FilterSpec[] {
	return Array.from(state.specs.values()).filter((s) => s.scope === scope);
}

/**
 * Get specs that apply to a specific dataset.
 */
export function getSpecsForDataset(datasetId: string): FilterSpec[] {
	return Array.from(state.specs.values()).filter(
		(s) => s.bindings && datasetId in s.bindings
	);
}

/**
 * Get a specific spec by ID.
 */
export function getSpec(filterId: string): FilterSpec | undefined {
	return state.specs.get(filterId);
}

/**
 * Get default values for all registered filters.
 */
export function getDefaultValues(): FilterValues {
	return { ...state.defaults };
}

/**
 * Check if a filter is registered.
 */
export function hasFilter(filterId: string): boolean {
	return state.specs.has(filterId);
}

/**
 * Clear all registrations (for testing).
 */
export function clearRegistry(): void {
	state.specs.clear();
	state.defaults = {};
}

/**
 * Get the number of registered filters.
 */
export function getRegisteredCount(): number {
	return state.specs.size;
}
