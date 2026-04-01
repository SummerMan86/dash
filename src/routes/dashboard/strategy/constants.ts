import type { DatasetId } from '$entities/dataset';
import type { FilterOption } from '$entities/filter';

export const STRATEGY_WORKSPACE_ID = 'dashboard-strategy';

export const STRATEGY_DATASET_IDS = {
	entityOverview: 'strategy.entity_overview',
	scorecardOverview: 'strategy.scorecard_overview',
	performanceDetail: 'strategy.performance_detail',
	cascadeDetail: 'strategy.cascade_detail'
} as const satisfies Record<string, DatasetId>;

export const STRATEGY_NAV_ITEMS = [
	{
		href: '/dashboard/strategy/overview',
		label: 'Обзор',
		description: 'Обзор объектов реестра, прослеживаемости и разрывов.'
	},
	{
		href: '/dashboard/strategy/cascade',
		label: 'Прослеживаемость',
		description: 'Как объекты реестра доведены до целей, задач и KPI и где возникают разрывы.'
	},
	{
		href: '/dashboard/strategy/scorecard',
		label: 'Карта показателей',
		description: 'Взвешенный BSC-балл по департаментам и контроль отсутствующих весов.'
	},
	{
		href: '/dashboard/strategy/scorecard_v2',
		label: 'Карта v2',
		description: 'Компактная карта показателей с графиками.'
	},
	{
		href: '/dashboard/strategy/performance',
		label: 'Результативность',
		description: 'Детализация план/факт по KPI и анализ отклонений.'
	}
] as const;

export const STRATEGY_COMMON_FILTER_IDS = [
	'perspectiveCode',
	'horizonCode',
	'departmentCode'
] as const;

export const STRATEGY_OVERVIEW_FILTER_IDS = [
	...STRATEGY_COMMON_FILTER_IDS,
	'entitySearch',
	'onlyWeak'
] as const;

export const STRATEGY_SCORECARD_FILTER_IDS = [...STRATEGY_COMMON_FILTER_IDS] as const;

export const STRATEGY_CASCADE_FILTER_IDS = [...STRATEGY_COMMON_FILTER_IDS, 'entitySearch'] as const;

export const STRATEGY_PERFORMANCE_FILTER_IDS = [
	...STRATEGY_COMMON_FILTER_IDS,
	'entitySearch',
	'statusSearch'
] as const;

export const STRATEGY_PERSPECTIVE_OPTIONS: FilterOption[] = [
	{ value: 'Финансы', label: 'Финансы' },
	{ value: 'Операции', label: 'Операции' },
	{ value: 'Риски', label: 'Риски' },
	{ value: 'Люди', label: 'Люди' },
	{ value: 'Не назначено', label: 'Не назначено' }
];

export const STRATEGY_HORIZON_OPTIONS: FilterOption[] = [
	{ value: 'Долгосрочный', label: 'Долгосрочный' },
	{ value: 'Среднесрочный', label: 'Среднесрочный' },
	{ value: 'Краткосрочный', label: 'Краткосрочный' },
	{ value: 'Операционный', label: 'Операционный' }
];
