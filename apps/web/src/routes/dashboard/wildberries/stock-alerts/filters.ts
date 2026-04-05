/**
 * Re-export from canonical location in widgets layer.
 * Filters moved to $widgets/stock-alerts to fix layer-boundary violation.
 */
export {
	type PresetName,
	type PresetInfo,
	SCENARIO_PRESETS,
	DEFAULT_PRESET,
	getPresetParams,
	PRESET_LIST,
	stockAlertFilters
} from '$widgets/stock-alerts/filters';
