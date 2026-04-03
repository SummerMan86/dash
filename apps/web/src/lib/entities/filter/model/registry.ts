import type { FilterSpec, FilterValues, ResolvedFilterSpec, FilterRuntimeContext } from './types';
import { normalizeFilterScope } from './types';

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

type WorkspaceRegistryState = {
	runtimes: Map<string, Map<string, ResolvedFilterSpec>>;
};

const workspaceState: WorkspaceRegistryState = {
	runtimes: new Map()
};

function makeRuntimeKey(workspaceId: string, ownerId: string): string {
	return `${workspaceId}::${ownerId}`;
}

export function makeRegistrationKey(
	workspaceId: string,
	ownerId: string,
	filterId: string
): string {
	return `${workspaceId}:${ownerId}:${filterId}`;
}

export function resolveFilterSpecsForRuntime(
	context: FilterRuntimeContext,
	specs: FilterSpec[]
): ResolvedFilterSpec[] {
	return specs.map((spec) => ({
		...spec,
		filterId: spec.id,
		scope: normalizeFilterScope(spec.scope),
		registrationKey: makeRegistrationKey(context.workspaceId, context.ownerId, spec.id),
		workspaceId: context.workspaceId,
		ownerId: context.ownerId,
		sharedKey: spec.sharedKey,
		urlKey: spec.urlKey ?? spec.id
	}));
}

export function registerWorkspaceFilters(
	context: FilterRuntimeContext,
	specs: FilterSpec[]
): ResolvedFilterSpec[] {
	const resolved = resolveFilterSpecsForRuntime(context, specs);
	const runtimeKey = makeRuntimeKey(context.workspaceId, context.ownerId);
	const runtimeSpecs =
		workspaceState.runtimes.get(runtimeKey) ?? new Map<string, ResolvedFilterSpec>();

	for (const spec of resolved) {
		runtimeSpecs.set(spec.registrationKey, spec);
	}

	workspaceState.runtimes.set(runtimeKey, runtimeSpecs);
	return resolved;
}

export function unregisterWorkspaceFilters(
	context: FilterRuntimeContext,
	registrationKeys: string[]
): void {
	const runtimeKey = makeRuntimeKey(context.workspaceId, context.ownerId);
	const runtimeSpecs = workspaceState.runtimes.get(runtimeKey);
	if (!runtimeSpecs) return;

	for (const key of registrationKeys) {
		runtimeSpecs.delete(key);
	}

	if (runtimeSpecs.size === 0) {
		workspaceState.runtimes.delete(runtimeKey);
	}
}

export function getResolvedSpecsForRuntime(context: FilterRuntimeContext): ResolvedFilterSpec[] {
	const runtimeKey = makeRuntimeKey(context.workspaceId, context.ownerId);
	return Array.from(workspaceState.runtimes.get(runtimeKey)?.values() ?? []);
}

export function getResolvedSpecForFilter(
	context: FilterRuntimeContext,
	filterId: string
): ResolvedFilterSpec | undefined {
	return getResolvedSpecsForRuntime(context).find((spec) => spec.filterId === filterId);
}

export function getResolvedSpecsForTarget(
	context: FilterRuntimeContext,
	targetId: string
): ResolvedFilterSpec[] {
	return getResolvedSpecsForRuntime(context).filter((spec) => targetId in spec.bindings);
}

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
	return Array.from(state.specs.values()).filter((s) => s.bindings && datasetId in s.bindings);
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
	workspaceState.runtimes.clear();
}

/**
 * Get the number of registered filters.
 */
export function getRegisteredCount(): number {
	return state.specs.size;
}
