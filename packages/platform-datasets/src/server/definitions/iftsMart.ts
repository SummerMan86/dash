import type { DatasetId, DatasetIr } from '../../model';
import { ir } from '../../model';

export const IFTS_DATASETS = {
	systemParameters: 'ifts.system_parameters',
	paymentStats: 'ifts.payment_stats',
	messageStats: 'ifts.message_stats',
	operdayState: 'ifts.operday_state',
} as const satisfies Record<string, DatasetId>;

export type IftsDatasetId = (typeof IFTS_DATASETS)[keyof typeof IFTS_DATASETS];

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
		return Number(value);
	return undefined;
}

function asString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const s = value.trim();
	return s ? s : undefined;
}

function clampLimit(value: unknown, fallback: number): number {
	const n = asNumber(value);
	if (typeof n !== 'number') return fallback;
	return Math.max(0, Math.min(50_000, Math.floor(n)));
}

export function compileIftsDataset(
	datasetId: IftsDatasetId,
	params: Record<string, unknown>,
): DatasetIr {

	switch (datasetId) {
		case IFTS_DATASETS.systemParameters:
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('OPERDAY') },
					{ expr: ir.col('SESSION_ID') },
					{ expr: ir.col('SERVICE') },
					{ expr: ir.col('PROJECT_CODE') },
					{ expr: ir.col('SYS_NAME') },
					{ expr: ir.col('QUEUE_SIZE') },
					{ expr: ir.col('QUEUE_AMOUNT') },
					{ expr: ir.col('MAX_QUEUE_SIZE') },
					{ expr: ir.col('MAX_QUEUE_AMOUNT') },
				],
				limit: 1,
			};

		case IFTS_DATASETS.paymentStats: {
			const limit = clampLimit(params.limit, 500);
			const service = asString(params.service);
			const whereParts = [];
			if (service) whereParts.push(ir.eq(ir.col('SERVICE'), ir.lit(service)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('PAYM_STAT_ID') },
					{ expr: ir.col('OPERDAY_ID') },
					{ expr: ir.col('COLLECT_TIME') },
					{ expr: ir.col('SERVICE') },
					{ expr: ir.col('PAYM_PROCESSED_TOTAL') },
					{ expr: ir.col('PAYM_PROCESSED_PERIOD') },
					{ expr: ir.col('PAYM_QUEUED_IN_PERIOD') },
					{ expr: ir.col('PAYM_QUEUED_OUT_PERIOD') },
					{ expr: ir.col('PAYM_QUEUED_CURRENT') },
					{ expr: ir.col('PAYM_REJECTED_TOTAL') },
					{ expr: ir.col('PAYM_REJECTED_PERIOD') },
				],
				where: whereParts.length ? ir.and(whereParts) : undefined,
				orderBy: [{ expr: ir.col('COLLECT_TIME'), dir: 'desc' }],
				limit,
			};
		}

		case IFTS_DATASETS.messageStats: {
			const limit = clampLimit(params.limit, 500);
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('MSGS_STAT_ID') },
					{ expr: ir.col('OPERDAY_ID') },
					{ expr: ir.col('COLLECT_TIME') },
					{ expr: ir.col('IM_PROCESSED_TOTAL') },
					{ expr: ir.col('IM_PROCESSED_TIME_AVG') },
					{ expr: ir.col('IM_PROCESSED_PERIOD') },
					{ expr: ir.col('IM_REJECTED_TOTAL') },
					{ expr: ir.col('IM_REJECTED_PERIOD') },
					{ expr: ir.col('OM_PROCESSED_TOTAL') },
					{ expr: ir.col('OM_PROCESSED_TOTAL_TIME_AVG') },
					{ expr: ir.col('OM_PROCESSED_PERIOD') },
					{ expr: ir.col('OM_REJECTED_TOTAL') },
					{ expr: ir.col('OM_REJECTED_PERIOD') },
				],
				orderBy: [{ expr: ir.col('COLLECT_TIME'), dir: 'desc' }],
				limit,
			};
		}

		case IFTS_DATASETS.operdayState: {
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('OPERDAY_STATE_ID') },
					{ expr: ir.col('OPERDAY_ID') },
					{ expr: ir.col('STATE_ID') },
					{ expr: ir.col('STATUS') },
					{ expr: ir.col('START_TIME') },
					{ expr: ir.col('FINISH_TIME') },
				],
				orderBy: [{ expr: ir.col('START_TIME'), dir: 'asc' }],
			};
		}
	}
}
