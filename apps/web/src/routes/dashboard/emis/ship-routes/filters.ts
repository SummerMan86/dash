import type { FilterSpec } from '$entities/filter';

export const emisShipRouteBiFilters: FilterSpec[] = [
	{
		id: 'dateRange',
		sharedKey: 'dateRange',
		urlKey: 'dateRange',
		type: 'dateRange',
		label: 'Последняя загрузка',
		scope: 'shared',
		apply: 'server',
		bindings: {
			'emis.ship_route_vessels': {
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			}
		}
	},
	{
		id: 'q',
		urlKey: 'q',
		type: 'text',
		label: 'Судно',
		placeholder: 'Название судна...',
		scope: 'workspace',
		apply: 'client',
		bindings: {
			'emis.ship_route_vessels': { field: 'vessel_name' }
		}
	},
	{
		id: 'flag',
		urlKey: 'flag',
		type: 'text',
		label: 'Флаг',
		placeholder: 'PA, RU, LR...',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.ship_route_vessels': { param: 'flag' }
		}
	},
	{
		id: 'vesselType',
		urlKey: 'vesselType',
		type: 'text',
		label: 'Тип судна',
		placeholder: 'Tanker, LNG...',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			'emis.ship_route_vessels': { param: 'vesselType' }
		}
	}
];
