import type { FilterOption, FilterSpec } from '@dashboard-builder/platform-filters';

export const EMIS_FILTER_TARGETS = {
	searchObjects: 'emis.search.objects',
	searchNews: 'emis.search.news',
	mapObjects: 'emis.map.objects',
	mapNews: 'emis.map.news',
	mapVessels: 'emis.map.vessels',
	shipRoutePoints: 'emis.route.points',
	shipRouteSegments: 'emis.route.segments'
} as const;

export const EMIS_PRIMARY_FILTER_IDS = [
	'layer',
	'q',
	'country',
	'dateRange',
	'objectType',
	'status',
	'source',
	'newsType',
	'objectId'
] as const;

export const EMIS_SHIP_ROUTE_FILTER_IDS = ['shipHbkId'] as const;

const shipRouteModeOptions: FilterOption[] = [
	{ value: 'both', label: 'Точки и сегменты' },
	{ value: 'points', label: 'Только точки' },
	{ value: 'segments', label: 'Только сегменты' }
];

const layerOptions: FilterOption[] = [
	{ value: 'all', label: 'Все слои' },
	{ value: 'objects', label: 'Только объекты' },
	{ value: 'news', label: 'Только новости' },
	{ value: 'vessels', label: 'Суда' }
];

const objectStatusOptions: FilterOption[] = [
	{ value: 'active', label: 'active' },
	{ value: 'inactive', label: 'inactive' },
	{ value: 'planned', label: 'planned' },
	{ value: 'archived', label: 'archived' }
];

export const emisWorkspaceFilters: FilterSpec[] = [
	{
		id: 'layer',
		urlKey: 'layer',
		type: 'select',
		label: 'Слои',
		scope: 'workspace',
		apply: 'client',
		defaultValue: 'all',
		bindings: {},
		options: layerOptions
	},
	{
		id: 'q',
		urlKey: 'q',
		type: 'text',
		label: 'Поиск',
		placeholder: 'Название, заголовок...',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[EMIS_FILTER_TARGETS.searchObjects]: { param: 'q' },
			[EMIS_FILTER_TARGETS.searchNews]: { param: 'q' },
			[EMIS_FILTER_TARGETS.mapObjects]: { param: 'q' },
			[EMIS_FILTER_TARGETS.mapNews]: { param: 'q' },
			[EMIS_FILTER_TARGETS.mapVessels]: { param: 'q' }
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
			[EMIS_FILTER_TARGETS.searchObjects]: { param: 'country' },
			[EMIS_FILTER_TARGETS.searchNews]: { param: 'country' },
			[EMIS_FILTER_TARGETS.mapObjects]: { param: 'country' },
			[EMIS_FILTER_TARGETS.mapNews]: { param: 'country' }
		},
		optionsSource: {
			kind: 'endpoint',
			url: '/api/emis/dictionaries/countries',
			valueField: 'code',
			labelField: 'nameRu'
		}
	},
	{
		id: 'dateRange',
		sharedKey: 'dateRange',
		urlKey: 'dateRange',
		type: 'dateRange',
		label: 'Период публикации',
		scope: 'shared',
		apply: 'server',
		bindings: {
			[EMIS_FILTER_TARGETS.searchNews]: {
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			},
			[EMIS_FILTER_TARGETS.mapNews]: {
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			}
		}
	},
	{
		id: 'objectType',
		urlKey: 'objectType',
		type: 'select',
		label: 'Тип объекта',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[EMIS_FILTER_TARGETS.searchObjects]: { param: 'objectType' },
			[EMIS_FILTER_TARGETS.mapObjects]: { param: 'objectType' }
		},
		optionsSource: {
			kind: 'endpoint',
			url: '/api/emis/dictionaries/object-types',
			valueField: 'id',
			labelField: 'name'
		}
	},
	{
		id: 'status',
		urlKey: 'status',
		type: 'select',
		label: 'Статус объекта',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[EMIS_FILTER_TARGETS.searchObjects]: { param: 'status' },
			[EMIS_FILTER_TARGETS.mapObjects]: { param: 'status' }
		},
		options: objectStatusOptions
	},
	{
		id: 'source',
		urlKey: 'source',
		type: 'select',
		label: 'Источник',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[EMIS_FILTER_TARGETS.searchNews]: { param: 'source' },
			[EMIS_FILTER_TARGETS.mapNews]: { param: 'source' }
		},
		optionsSource: {
			kind: 'endpoint',
			url: '/api/emis/dictionaries/sources',
			valueField: 'id',
			labelField: 'name'
		}
	},
	{
		id: 'newsType',
		urlKey: 'newsType',
		type: 'text',
		label: 'Тип новости',
		placeholder: 'incident, update...',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[EMIS_FILTER_TARGETS.searchNews]: { param: 'newsType' },
			[EMIS_FILTER_TARGETS.mapNews]: { param: 'newsType' }
		}
	},
	{
		id: 'objectId',
		urlKey: 'objectId',
		type: 'text',
		label: 'Object UUID',
		placeholder: 'UUID объекта',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[EMIS_FILTER_TARGETS.searchNews]: { param: 'objectId' },
			[EMIS_FILTER_TARGETS.mapNews]: { param: 'objectId' }
		}
	},
	{
		id: 'shipHbkId',
		urlKey: 'shipHbkId',
		type: 'select',
		label: 'Судно',
		placeholder: 'Выберите судно...',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[EMIS_FILTER_TARGETS.shipRoutePoints]: { param: 'shipHbkId', transform: 'number' },
			[EMIS_FILTER_TARGETS.shipRouteSegments]: { param: 'shipHbkId', transform: 'number' }
		},
		optionsSource: {
			kind: 'endpoint',
			url: '/api/emis/ship-routes/vessels',
			valueField: 'shipHbkId',
			labelField: 'vesselLabel'
		}
	},
	{
		id: 'routeMode',
		urlKey: 'routeMode',
		type: 'select',
		label: 'Route mode',
		scope: 'workspace',
		apply: 'client',
		defaultValue: 'both',
		bindings: {},
		options: shipRouteModeOptions
	}
];
