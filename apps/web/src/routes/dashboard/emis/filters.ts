import type { FilterSpec } from '@dashboard-builder/platform-filters';

export const emisBiFilters: FilterSpec[] = [
	{
		id: 'dateRange',
		sharedKey: 'dateRange',
		urlKey: 'dateRange',
		type: 'dateRange',
		label: 'Период публикации',
		scope: 'shared',
		apply: 'server',
		bindings: {
			'emis.news_flat': {
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			},
			'emis.object_news_facts': {
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			}
		}
	},
	{
		id: 'country',
		urlKey: 'country',
		type: 'select',
		label: 'Страна',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.news_flat': { param: 'countryCode' },
			'emis.object_news_facts': { param: 'countryCode' },
			'emis.objects_dim': { param: 'countryCode' }
		},
		optionsSource: {
			kind: 'endpoint',
			url: '/api/emis/dictionaries/countries',
			valueField: 'code',
			labelField: 'nameRu'
		}
	},
	{
		id: 'sourceOrigin',
		urlKey: 'sourceOrigin',
		type: 'select',
		label: 'Provenance',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.news_flat': { param: 'sourceOrigin' },
			'emis.objects_dim': { param: 'sourceOrigin' }
		},
		options: [
			{ value: 'seed', label: 'seed' },
			{ value: 'manual', label: 'manual' },
			{ value: 'import', label: 'import' },
			{ value: 'ingestion', label: 'ingestion' }
		]
	},
	{
		id: 'isManual',
		urlKey: 'isManual',
		type: 'select',
		label: 'Manual news',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.news_flat': { param: 'isManual' }
		},
		options: [
			{ value: 'true', label: 'Только manual' },
			{ value: 'false', label: 'Только non-manual' }
		]
	},
	{
		id: 'status',
		urlKey: 'status',
		type: 'select',
		label: 'Статус объекта',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.objects_dim': { param: 'status' }
		},
		options: [
			{ value: 'active', label: 'active' },
			{ value: 'inactive', label: 'inactive' },
			{ value: 'planned', label: 'planned' },
			{ value: 'archived', label: 'archived' }
		]
	}
];
