export type IsoDateString = string;

/**
 * Global filters shared across widgets/datasets.
 *
 * Keep this small and cross-cutting (time range, tenant-wide facets).
 * Dataset-specific knobs should go into DatasetQuery.params.
 *
 * Tip for beginners:
 * - this is like the "global dashboard state" (date range, selected categories, etc.)
 * - widgets should not invent their own separate filters; they should reuse this
 */
export type FilterState = {
	dateFrom?: IsoDateString;
	dateTo?: IsoDateString;
	status?: string[]; // e.g. SUCCESS/REJECTED
	role?: string[]; // e.g. DEBTOR/CREDITOR
	mcc?: string[]; // mcc codes
	client?: string; // free-text
};


