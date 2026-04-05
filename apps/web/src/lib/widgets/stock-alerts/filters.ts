import type { FilterSpec } from '@dashboard-builder/platform-filters';
import type { ScenarioParams } from './types';

/**
 * Типы для пресетов сценариев
 */
export type PresetName = 'balanced' | 'aggressive' | 'conservative';

export type PresetInfo = {
	name: PresetName;
	label: string;
	description: string;
	params: ScenarioParams;
};

/**
 * Пресеты сценариев (hardcoded для демо)
 *
 * L = 20 дней для всех (доставка из Китая)
 * Разница в Safety stock (S)
 *
 * Порог риска = L + S
 *
 * Будущее: интеграция с conf.calc_params_common
 */
export const SCENARIO_PRESETS: Record<PresetName, PresetInfo> = {
	balanced: {
		name: 'balanced',
		label: 'Сбалансированный',
		description: 'Оптимальный баланс между запасом и риском',
		params: { L: 20, S: 10, R: 7, W: 28 }
	},
	aggressive: {
		name: 'aggressive',
		label: 'Агрессивный',
		description: 'Минимальный запас, выше риск дефицита',
		params: { L: 20, S: 5, R: 5, W: 21 }
	},
	conservative: {
		name: 'conservative',
		label: 'Консервативный',
		description: 'Большой запас, минимальный риск',
		params: { L: 20, S: 15, R: 10, W: 35 }
	}
} as const;

/** Пресет по умолчанию */
export const DEFAULT_PRESET: PresetName = 'balanced';

/** Получить параметры по имени пресета */
export function getPresetParams(name: PresetName): ScenarioParams {
	return SCENARIO_PRESETS[name].params;
}

/** Список пресетов для UI */
export const PRESET_LIST: PresetInfo[] = Object.values(SCENARIO_PRESETS);

/**
 * Filter specifications for the Stock Alerts page.
 *
 * Global filters (scope: 'global'):
 * - dateRange: shared across all pages, applied server-side
 *
 * Region filter is handled locally in the page component
 * to enable fast client-side filtering without re-fetching.
 */
export const stockAlertFilters: FilterSpec[] = [
	{
		id: 'dateRange',
		sharedKey: 'dateRange',
		urlKey: 'dateRange',
		type: 'dateRange',
		label: 'Период',
		scope: 'shared',
		apply: 'server',
		bindings: {
			'wildberries.fact_product_office_day': {
				field: 'dt',
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			}
		}
	}
];
