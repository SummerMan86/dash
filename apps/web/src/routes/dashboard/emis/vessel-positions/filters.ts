import type { FilterOption, FilterSpec } from '@dashboard-builder/platform-filters';

export const VESSEL_POSITIONS_FILTER_TARGETS = {
	mapVessels: 'emis.map.vessels',
	mapNews: 'emis.map.news'
} as const;

const layerOptions: FilterOption[] = [
	{ value: 'vessels+news', label: 'Суда + Новости' },
	{ value: 'vessels', label: 'Только суда' },
	{ value: 'news', label: 'Только новости' }
];

export const vesselPositionsFilters: FilterSpec[] = [
	{
		id: 'layer',
		urlKey: 'layer',
		type: 'select',
		label: 'Слои',
		scope: 'workspace',
		apply: 'client',
		defaultValue: 'vessels+news',
		bindings: {},
		options: layerOptions
	},
	{
		id: 'q',
		urlKey: 'q',
		type: 'text',
		label: 'Поиск',
		placeholder: 'Название, IMO, MMSI, заголовок...',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[VESSEL_POSITIONS_FILTER_TARGETS.mapVessels]: { param: 'q' },
			[VESSEL_POSITIONS_FILTER_TARGETS.mapNews]: { param: 'q' }
		}
	},
	{
		id: 'flag',
		urlKey: 'flag',
		type: 'text',
		label: 'Флаг',
		placeholder: 'PA, LR, MH...',
		scope: 'workspace',
		apply: 'client',
		bindings: {}
	},
	{
		id: 'vesselType',
		urlKey: 'vesselType',
		type: 'text',
		label: 'Тип судна',
		placeholder: 'Tanker, LNG...',
		scope: 'workspace',
		apply: 'client',
		bindings: {}
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
			[VESSEL_POSITIONS_FILTER_TARGETS.mapNews]: { param: 'newsType' }
		}
	},
	{
		id: 'source',
		urlKey: 'source',
		type: 'select',
		label: 'Источник',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[VESSEL_POSITIONS_FILTER_TARGETS.mapNews]: { param: 'source' }
		},
		optionsSource: {
			kind: 'endpoint',
			url: '/api/emis/dictionaries/sources',
			valueField: 'id',
			labelField: 'name'
		}
	}
];
