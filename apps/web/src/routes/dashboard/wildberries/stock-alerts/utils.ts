/**
 * Re-export from canonical location in widgets layer.
 * Utils moved to $widgets/stock-alerts to fix layer-boundary violation.
 */
export {
	calculateStatus,
	getStatusColor,
	getStatusTextColor,
	getStatusLabel
} from '$widgets/stock-alerts/utils';
