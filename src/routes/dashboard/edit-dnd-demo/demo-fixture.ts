import { applyGridByIndex } from '$lib/features/dashboard-edit/model/layout';
import type { DashboardConfig, DashboardWidget } from '$lib/features/dashboard-edit/model/types';

function baseWidgets(): DashboardWidget[] {
	return [
		{
			id: 'w-1',
			type: 'line',
			title: 'Revenue Trend',
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: 'revenue', dimension: 'date' }
		},
		{
			id: 'w-2',
			type: 'bar',
			title: 'Top Clients',
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: 'revenue', dimension: 'client' }
		},
		{
			id: 'w-3',
			type: 'pie',
			title: 'Category Split',
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: 'transactions', dimension: 'mcc' }
		},
		{
			id: 'w-4',
			type: 'kpi',
			title: 'Total Volume',
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: 'revenue', dimension: 'date' }
		},
		{
			id: 'w-5',
			type: 'kpi',
			title: 'Transactions',
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: 'transactions', dimension: 'date' }
		},
		{
			id: 'w-6',
			type: 'kpi',
			title: 'Rejection Rate',
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: 'rejection_rate', dimension: 'date' }
		},
		{
			id: 'w-7',
			type: 'table',
			title: 'Top MCC',
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: 'revenue', dimension: 'mcc' }
		},
		{
			id: 'w-8',
			type: 'stat',
			title: 'Active Clients',
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: 'active_clients', dimension: 'date' }
		}
	];
}

export function createDemoDashboard(): DashboardConfig {
	const widgets = applyGridByIndex(baseWidgets());

	return {
		id: 'demo-dashboard',
		title: 'Edit DnD Demo',
		widgets
	};
}
