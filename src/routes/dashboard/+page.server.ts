import type { PageServerLoad } from './$types';

import type { DashboardConfig } from '$lib/features/dashboard-edit/model/types';

// Heights adjusted for rowHeightPx=24: finer grid step for smoother positioning
function createEditorDashboardFixture(): DashboardConfig {
	return {
		id: 'editor-fixture',
		title: 'Dashboard Editor',
		widgets: [
			{
				id: 'w-1',
				type: 'kpi',
				title: 'Revenue',
				layout: { x: 0, y: 0, w: 3, h: 5 },
				config: { measure: 'revenue', dimension: 'date' }
			},
			{
				id: 'w-2',
				type: 'stat',
				title: 'Transactions',
				layout: { x: 3, y: 0, w: 3, h: 5 },
				config: { measure: 'transactions', dimension: 'date' }
			},
			{
				id: 'w-3',
				type: 'line',
				title: 'Trend',
				layout: { x: 6, y: 0, w: 6, h: 10 },
				config: { measure: 'revenue', dimension: 'date' }
			},
			{
				id: 'w-4',
				type: 'bar',
				title: 'By category',
				layout: { x: 0, y: 5, w: 6, h: 7 },
				config: { measure: 'revenue', dimension: 'mcc' }
			},
			{
				id: 'w-5',
				type: 'pie',
				title: 'Distribution',
				layout: { x: 6, y: 10, w: 4, h: 7 },
				config: { measure: 'revenue', dimension: 'region' }
			},
			{
				id: 'w-6',
				type: 'table',
				title: 'Details',
				layout: { x: 0, y: 12, w: 12, h: 10 },
				config: { measure: 'transactions', dimension: 'client' }
			}
		]
	};
}

export const load: PageServerLoad = async () => {
	return {
		dashboard: createEditorDashboardFixture()
	};
};
