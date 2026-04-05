import type { FilterSpec } from '@dashboard-builder/platform-filters';

const provenanceOptions = [
	{ value: 'seed', label: 'seed' },
	{ value: 'manual', label: 'manual' },
	{ value: 'import', label: 'import' },
	{ value: 'ingestion', label: 'ingestion' }
];

const booleanOptions = [
	{ value: 'true', label: 'Да' },
	{ value: 'false', label: 'Нет' }
];

export const emisProvenanceFilters: FilterSpec[] = [
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
		id: 'newsSourceOrigin',
		urlKey: 'newsSourceOrigin',
		type: 'select',
		label: 'News provenance',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.news_flat': { param: 'sourceOrigin' },
			'emis.object_news_facts': { param: 'newsSourceOrigin' }
		},
		options: provenanceOptions
	},
	{
		id: 'objectSourceOrigin',
		urlKey: 'objectSourceOrigin',
		type: 'select',
		label: 'Object provenance',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.objects_dim': { param: 'sourceOrigin' },
			'emis.object_news_facts': { param: 'objectSourceOrigin' }
		},
		options: provenanceOptions
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
		options: booleanOptions
	},
	{
		id: 'hasGeometry',
		urlKey: 'hasGeometry',
		type: 'select',
		label: 'News geometry',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.news_flat': { param: 'hasGeometry' }
		},
		options: booleanOptions
	},
	{
		id: 'status',
		urlKey: 'status',
		type: 'select',
		label: 'Object status',
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
