import type { FilterSpec } from '@dashboard-builder/platform-filters';

export const productAnalyticsFilters: FilterSpec[] = [
	{
		id: 'dateRange',
		sharedKey: 'dateRange',
		urlKey: 'dateRange',
		type: 'dateRange',
		label: 'Период',
		scope: 'shared',
		apply: 'server',
		bindings: {
			'wildberries.fact_product_period': {
				field: 'dt',
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			},
			'wildberries.fact_product_office_day': {
				field: 'dt',
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			}
		}
	}
];
