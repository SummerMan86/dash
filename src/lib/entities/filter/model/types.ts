export type IsoDateString = string;

// ============================================================================
// LEGACY TYPES (backward compatibility)
// ============================================================================

/**
 * Global filters shared across widgets/datasets.
 *
 * @deprecated Use FilterSpec + FilterValues instead for new code.
 * This type is kept for backward compatibility with existing code.
 */
export type FilterState = {
	dateFrom?: IsoDateString;
	dateTo?: IsoDateString;
	status?: string[]; // e.g. SUCCESS/REJECTED
	role?: string[]; // e.g. DEBTOR/CREDITOR
	mcc?: string[]; // mcc codes
	client?: string; // free-text
};

// ============================================================================
// NEW FILTER SYSTEM TYPES
// ============================================================================

/**
 * Filter UI types.
 * - dateRange: two date pickers (from/to)
 * - select: single value dropdown
 * - multiSelect: multiple values with checkboxes
 * - text: free text input
 */
export type FilterType = 'dateRange' | 'select' | 'multiSelect' | 'text';

/**
 * Filter scope determines where the filter value is stored.
 * - global: shared across all pages (e.g., date range)
 * - page: local to a specific page (e.g., brand filter on products page)
 */
export type FilterScope = 'global' | 'page';

/**
 * Filter application mode determines where filtering happens.
 * - server: filter is applied as SQL WHERE clause
 * - client: filter is applied in JS after fetch (fast, no refetch)
 * - hybrid: applied both on server and client
 */
export type FilterApply = 'server' | 'client' | 'hybrid';

/**
 * Option for select/multiSelect filters.
 */
export type FilterOption = {
	value: string;
	label: string;
	disabled?: boolean;
};

/**
 * Dynamic values source for select/multiSelect.
 * Options will be fetched from a dataset.
 */
export type ValuesSource = {
	datasetId: string;
	valueField: string;
	labelField?: string;
};

/**
 * Binding describes how a filter maps to a specific dataset field.
 */
export type FilterBinding = {
	/** Column name in the dataset */
	field: string;
	/** Transform value before applying */
	transform?: 'string' | 'number' | 'date' | 'array';
};

/**
 * FilterSpec is the declarative definition of a filter.
 *
 * Example:
 * ```ts
 * const dateRangeFilter: FilterSpec = {
 *   id: 'dateRange',
 *   type: 'dateRange',
 *   label: 'Период',
 *   scope: 'global',
 *   apply: 'server',
 *   bindings: {
 *     'wildberries.fact_product_period': { field: 'dt' }
 *   }
 * };
 * ```
 */
export type FilterSpec = {
	/** Unique filter identifier */
	id: string;
	/** Filter UI type */
	type: FilterType;
	/** Display label */
	label: string;
	/** Placeholder text */
	placeholder?: string;
	/** Default value */
	defaultValue?: FilterValue;

	/** Where the filter state lives */
	scope: FilterScope;
	/** Where filtering is executed */
	apply: FilterApply;

	/**
	 * Maps this filter to dataset fields.
	 * Key = datasetId, Value = how to apply the filter
	 */
	bindings: Record<string, FilterBinding>;

	/** Static options for select/multiSelect */
	options?: FilterOption[];
	/** Dynamic options from dataset */
	valuesSource?: ValuesSource;
};

/**
 * Runtime filter value.
 * - string: text, select
 * - string[]: multiSelect
 * - { from?, to? }: dateRange
 * - null: unset
 */
export type FilterValue =
	| string
	| number
	| string[]
	| { from?: string; to?: string }
	| null;

/**
 * Runtime filter values storage.
 * Key = FilterSpec.id, Value = current value
 */
export type FilterValues = Record<string, FilterValue>;

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert new FilterValues to legacy FilterState format.
 * Used for backward compatibility with existing code.
 */
export function toLegacyFilterState(values: FilterValues): FilterState {
	const legacy: FilterState = {};

	for (const [key, val] of Object.entries(values)) {
		if (val === null || val === undefined) continue;

		// Handle dateRange specially
		if (typeof val === 'object' && !Array.isArray(val)) {
			const range = val as { from?: string; to?: string };
			if (range.from) legacy.dateFrom = range.from;
			if (range.to) legacy.dateTo = range.to;
			continue;
		}

		// Map known legacy fields
		switch (key) {
			case 'status':
			case 'role':
			case 'mcc':
				if (Array.isArray(val)) legacy[key] = val as string[];
				break;
			case 'client':
				if (typeof val === 'string') legacy.client = val;
				break;
		}
	}

	return legacy;
}


