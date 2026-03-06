import type { FilterSpec } from '$entities/filter';

export const productAnalyticsFilters: FilterSpec[] = [
	{
		id: 'dateRange',
		type: 'dateRange',
		label: 'Период',
		scope: 'global',
		apply: 'server',
		bindings: {
			'wildberries.fact_product_period': { field: 'dt' },
			'wildberries.fact_product_office_day': { field: 'dt' }
		}
	}
];
