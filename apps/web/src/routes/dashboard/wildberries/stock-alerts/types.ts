/**
 * Re-export from canonical location in widgets layer.
 * Types and helpers moved to $widgets/stock-alerts to fix layer-boundary violation.
 */
export {
	type StockStatus,
	type ScenarioParams,
	type OfficeAggregation,
	type SkuDetail,
	type StockAlertKpi,
	type FactProductOfficeDayRow,
	asFactRow
} from '$widgets/stock-alerts/types';
