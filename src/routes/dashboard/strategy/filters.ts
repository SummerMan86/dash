import type { FilterSpec } from '$entities/filter';

import {
	STRATEGY_DATASET_IDS,
	STRATEGY_HORIZON_OPTIONS,
	STRATEGY_PERSPECTIVE_OPTIONS
} from './constants';

export const strategyFilters: FilterSpec[] = [
	{
		id: 'perspectiveCode',
		urlKey: 'perspective',
		type: 'select',
		label: 'Перспектива',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[STRATEGY_DATASET_IDS.entityOverview]: { param: 'perspectiveCode' },
			[STRATEGY_DATASET_IDS.scorecardOverview]: { param: 'perspectiveCode' },
			[STRATEGY_DATASET_IDS.performanceDetail]: { param: 'perspectiveCode' },
			[STRATEGY_DATASET_IDS.cascadeDetail]: { param: 'perspectiveCode' }
		},
		options: STRATEGY_PERSPECTIVE_OPTIONS
	},
	{
		id: 'horizonCode',
		urlKey: 'horizon',
		type: 'select',
		label: 'Горизонт',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[STRATEGY_DATASET_IDS.entityOverview]: { param: 'horizonCode' },
			[STRATEGY_DATASET_IDS.scorecardOverview]: { param: 'horizonCode' },
			[STRATEGY_DATASET_IDS.performanceDetail]: { param: 'horizonCode' },
			[STRATEGY_DATASET_IDS.cascadeDetail]: { param: 'horizonCode' }
		},
		options: STRATEGY_HORIZON_OPTIONS
	},
	{
		id: 'departmentCode',
		urlKey: 'department',
		type: 'text',
		label: 'Департамент',
		placeholder: 'Код, например КД',
		scope: 'workspace',
		apply: 'server',
		bindings: {
			[STRATEGY_DATASET_IDS.entityOverview]: { param: 'departmentCode' },
			[STRATEGY_DATASET_IDS.scorecardOverview]: { param: 'departmentCode' },
			[STRATEGY_DATASET_IDS.performanceDetail]: { param: 'departmentCode' },
			[STRATEGY_DATASET_IDS.cascadeDetail]: { param: 'departmentCode' }
		}
	},
	{
		id: 'entitySearch',
		urlKey: 'entity',
		type: 'text',
		label: 'Поиск по объекту реестра',
		placeholder: 'По названию стратегии, плана или документа',
		scope: 'workspace',
		apply: 'client',
		bindings: {
			[STRATEGY_DATASET_IDS.entityOverview]: { field: 'entity_name' },
			[STRATEGY_DATASET_IDS.performanceDetail]: { field: 'entity_name' },
			[STRATEGY_DATASET_IDS.cascadeDetail]: { field: 'entity_name' }
		}
	},
	{
		id: 'onlyWeak',
		urlKey: 'weak',
		type: 'select',
		label: 'Слабые объекты',
		scope: 'owner',
		apply: 'client',
		bindings: {
			[STRATEGY_DATASET_IDS.entityOverview]: { field: 'weak_entity_flag' }
		},
		options: [
			{ value: 'true', label: 'Только слабые' },
			{ value: 'false', label: 'Только стабильные' }
		]
	},
	{
		id: 'statusSearch',
		urlKey: 'status',
		type: 'text',
		label: 'Статус KPI',
		placeholder: 'Поиск по статусу',
		scope: 'owner',
		apply: 'client',
		bindings: {
			[STRATEGY_DATASET_IDS.performanceDetail]: { field: 'status_label' }
		}
	}
];
