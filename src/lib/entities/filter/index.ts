/**
 * Public API of `entities/filter`.
 *
 * Import from here instead of deep paths.
 *
 * New Filter System:
 * - registerFilters(specs) — register filter specs (call on page mount)
 * - getEffectiveFilters() — get current filter values
 * - setFilter(id, value) — set a filter value
 * - planFiltersForDataset(datasetId, filters) — plan server/client filtering
 *
 * Legacy API (backward compat):
 * - filterStore — old store singleton
 * - getFilterSnapshot() — old way to get filters
 */
export * from './model/types';
export * from './model/store.svelte';
export * from './model/serialization';
export * from './model/registry';
export * from './model/planner';


