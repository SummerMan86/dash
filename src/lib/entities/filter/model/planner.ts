import type { JsonValue } from '$entities/dataset';
import type { FilterSpec, FilterValue, FilterValues, FilterBinding } from './types';
import { getSpecsForDataset } from './registry';

/**
 * FilterPlan - result of planning filter application for a dataset.
 *
 * serverParams: filters to send to the server (become WHERE clauses)
 * clientFilterFn: function to apply after fetch (client-side filtering)
 */
export type FilterPlan = {
	/** Params to include in server request */
	serverParams: Record<string, JsonValue>;
	/** Client-side filter function (returns true to keep row) */
	clientFilterFn: ((row: Record<string, JsonValue>) => boolean) | null;
	/** Filter IDs that affect this dataset */
	appliedFilters: string[];
};

/**
 * Transform filter value based on binding config.
 */
function transformValue(value: FilterValue, binding: FilterBinding): JsonValue {
	if (value === null || value === undefined) return null;

	switch (binding.transform) {
		case 'number':
			if (typeof value === 'string') return Number(value) || null;
			if (typeof value === 'number') return value;
			return null;
		case 'array':
			if (Array.isArray(value)) return value;
			if (typeof value === 'string') return [value];
			return null;
		case 'date':
			if (typeof value === 'string') return value;
			return null;
		case 'string':
		default:
			if (typeof value === 'string') return value;
			if (typeof value === 'number') return String(value);
			if (Array.isArray(value)) return value;
			return null;
	}
}

/**
 * Build a client filter function for a single filter.
 */
function buildClientMatcher(
	spec: FilterSpec,
	binding: FilterBinding,
	value: FilterValue
): (row: Record<string, JsonValue>) => boolean {
	const field = binding.field;

	return (row) => {
		const rowVal = row[field];

		switch (spec.type) {
			case 'dateRange': {
				if (typeof value !== 'object' || value === null || Array.isArray(value)) return true;
				const range = value as { from?: string; to?: string };
				const rowDate = String(rowVal);
				if (range.from && rowDate < range.from) return false;
				if (range.to && rowDate > range.to) return false;
				return true;
			}

			case 'multiSelect': {
				if (!Array.isArray(value) || value.length === 0) return true;
				return value.includes(String(rowVal));
			}

			case 'select': {
				if (value === null || value === '') return true;
				return String(rowVal) === String(value);
			}

			case 'text': {
				if (typeof value !== 'string' || value === '') return true;
				return String(rowVal).toLowerCase().includes(value.toLowerCase());
			}

			default:
				return true;
		}
	};
}

/**
 * Plan how to apply filters for a specific dataset.
 *
 * This function analyzes registered filters and determines:
 * - Which filters should be sent to the server (serverParams)
 * - Which filters should be applied client-side (clientFilterFn)
 *
 * @param datasetId - target dataset
 * @param effectiveFilters - current filter values
 * @returns FilterPlan with server params and client filter function
 *
 * @example
 * ```ts
 * const plan = planFiltersForDataset('wildberries.fact_product_period', filters);
 * // plan.serverParams → { dateFrom: '2024-01-01', dateTo: '2024-12-31' }
 * // plan.clientFilterFn → null (all filters are server-side)
 * ```
 */
export function planFiltersForDataset(
	datasetId: string,
	effectiveFilters: FilterValues
): FilterPlan {
	const serverParams: Record<string, JsonValue> = {};
	const clientMatchers: Array<(row: Record<string, JsonValue>) => boolean> = [];
	const appliedFilters: string[] = [];

	// Get all specs that have bindings for this dataset
	const specs = getSpecsForDataset(datasetId);

	for (const spec of specs) {
		const value = effectiveFilters[spec.id];
		if (value === null || value === undefined) continue;

		// Skip empty values
		if (value === '' || (Array.isArray(value) && value.length === 0)) continue;

		const binding = spec.bindings[datasetId];
		if (!binding) continue;

		appliedFilters.push(spec.id);

		// Handle dateRange specially (maps to two params: dateFrom/dateTo)
		if (spec.type === 'dateRange' && typeof value === 'object' && !Array.isArray(value)) {
			const range = value as { from?: string; to?: string };

			if (spec.apply === 'server' || spec.apply === 'hybrid') {
				// Convention: dateRange uses dateFrom/dateTo params
				if (range.from) serverParams.dateFrom = range.from;
				if (range.to) serverParams.dateTo = range.to;
			}

			if (spec.apply === 'client' || spec.apply === 'hybrid') {
				clientMatchers.push(buildClientMatcher(spec, binding, value));
			}

			continue;
		}

		// Regular filters
		if (spec.apply === 'server' || spec.apply === 'hybrid') {
			const transformed = transformValue(value, binding);
			if (transformed !== null) {
				serverParams[binding.field] = transformed;
			}
		}

		if (spec.apply === 'client' || spec.apply === 'hybrid') {
			clientMatchers.push(buildClientMatcher(spec, binding, value));
		}
	}

	// Compose client filter function
	const clientFilterFn =
		clientMatchers.length > 0
			? (row: Record<string, JsonValue>) => clientMatchers.every((m) => m(row))
			: null;

	return {
		serverParams,
		clientFilterFn,
		appliedFilters
	};
}

/**
 * Extract only server-side filter params for a dataset.
 * Used for building cache keys (client filters should NOT affect cache key).
 *
 * @param datasetId - target dataset
 * @param effectiveFilters - current filter values
 * @returns Server params only
 */
export function getServerParamsForDataset(
	datasetId: string,
	effectiveFilters: FilterValues
): Record<string, JsonValue> {
	const { serverParams } = planFiltersForDataset(datasetId, effectiveFilters);
	return serverParams;
}

/**
 * Check if any registered filters apply to a dataset.
 */
export function hasFiltersForDataset(datasetId: string): boolean {
	return getSpecsForDataset(datasetId).length > 0;
}
