import type { FilterSpec } from '$entities/filter';

/**
 * Filter specifications for the Office-Day page.
 *
 * Global filters (scope: 'global'):
 * - dateRange: shared across all pages
 *
 * Dataset-specific params (nmId, officeId, etc.) are kept as local state
 * because they are specific to this dataset and don't make sense globally.
 */
export const officeDayFilters: FilterSpec[] = [
	{
		id: 'dateRange',
		type: 'dateRange',
		label: 'Период',
		scope: 'global',
		apply: 'server',
		bindings: {
			'wildberries.fact_product_office_day': { field: 'dt' },
			'wildberries.fact_product_period': { field: 'dt' }
		}
	}
];
