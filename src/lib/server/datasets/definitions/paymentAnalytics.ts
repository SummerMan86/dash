import type { DatasetId, DatasetQuery } from '$entities/dataset';
import type { DatasetIr } from '$entities/dataset';
import { ir } from '$entities/dataset';

/**
 * Payment Analytics dataset ids.
 *
 * A datasetId is a stable external identifier used by UI and BFF.
 * You can safely add new datasets here (Open/Closed Principle).
 */
export const PAYMENT_DATASETS = {
	kpi: 'payment.kpi',
	timeseriesDaily: 'payment.timeseriesDaily',
	topClients: 'payment.topClients',
	mccSummary: 'payment.mccSummary'
} as const satisfies Record<string, DatasetId>;

export type PaymentDatasetId = (typeof PAYMENT_DATASETS)[keyof typeof PAYMENT_DATASETS];

function dateRangeWhere(filters: DatasetQuery['filters'] | undefined) {
	// Example of "global filters" -> IR WHERE conditions.
	// Later: Oracle/Postgres provider will compile this to SQL;
	// Cube provider will map it to timeDimensions/filters.
	const from = typeof filters?.dateFrom === 'string' ? filters.dateFrom : undefined;
	const to = typeof filters?.dateTo === 'string' ? filters.dateTo : undefined;
	if (!from && !to) return undefined;

	const parts = [];
	if (from) parts.push(ir.gte(ir.col('date'), ir.lit(from)));
	if (to) parts.push(ir.lte(ir.col('date'), ir.lit(to)));
	return parts.length === 1 ? parts[0] : ir.and(parts);
}

/**
 * Compile DatasetQuery into relational IR.
 *
 * Note: IR describes a desired query; how it's executed depends on provider (Oracle/Postgres/Cube/mock).
 */
export function compilePaymentDataset(datasetId: PaymentDatasetId, query: DatasetQuery): DatasetIr {
	// Dataset definition = schema knowledge + mapping rules.
	// It does NOT execute anything (execution is Provider's job).
	switch (datasetId) {
		case PAYMENT_DATASETS.kpi:
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('period_label') },
					{ expr: ir.col('date_from') },
					{ expr: ir.col('date_to') },
					{ expr: ir.col('total_amount') },
					{ expr: ir.col('total_count') },
					{ expr: ir.col('avg_ticket') },
					{ expr: ir.col('rejected_count') },
					{ expr: ir.col('rejected_share_pct') },
					{ expr: ir.col('active_clients_count') },
					{ expr: ir.col('avg_proc_time_sec') }
				],
				limit: 1
			};

		case PAYMENT_DATASETS.timeseriesDaily:
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('date') },
					{ expr: ir.col('status') },
					{ expr: ir.col('trx_count') },
					{ expr: ir.col('trx_amount') },
					{ expr: ir.col('avg_ticket') },
					{ expr: ir.col('rejected_count') },
					{ expr: ir.col('rejected_share_pct') }
				],
				where: dateRangeWhere(query.filters),
				orderBy: [{ expr: ir.col('date'), dir: 'asc' }]
			};

		case PAYMENT_DATASETS.topClients:
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('role') },
					{ expr: ir.col('client_name') },
					{ expr: ir.col('client_account') },
					{ expr: ir.col('trx_count') },
					{ expr: ir.col('trx_amount') },
					{ expr: ir.col('avg_ticket') },
					{ expr: ir.col('rejected_count') },
					{ expr: ir.col('rejected_share_pct') }
				],
				orderBy: [{ expr: ir.col('trx_amount'), dir: 'desc' }]
			};

		case PAYMENT_DATASETS.mccSummary:
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('mcc') },
					{ expr: ir.col('mcc_name') },
					{ expr: ir.col('trx_count') },
					{ expr: ir.col('trx_amount') },
					{ expr: ir.col('avg_ticket') },
					{ expr: ir.col('rejected_count') },
					{ expr: ir.col('rejected_share_pct') }
				],
				orderBy: [{ expr: ir.col('trx_amount'), dir: 'desc' }]
			};
	}
}


