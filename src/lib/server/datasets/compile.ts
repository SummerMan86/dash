import type { DatasetId, DatasetIr, DatasetQuery } from '$entities/dataset';

import { PAYMENT_DATASETS, compilePaymentDataset, type PaymentDatasetId } from './definitions/paymentAnalytics';

/**
 * Dataset compiler entrypoint.
 *
 * This is the "routing layer" for dataset definitions:
 * - it picks the right dataset definition based on datasetId
 * - it returns IR (which providers can execute)
 *
 * Think of it as a registry, but implemented with simple code for MVP.
 */
export function isKnownDatasetId(id: string): id is PaymentDatasetId {
	return Object.values(PAYMENT_DATASETS).includes(id as PaymentDatasetId);
}

export function compileDataset(datasetId: DatasetId, query: DatasetQuery): DatasetIr {
	if (isKnownDatasetId(datasetId)) return compilePaymentDataset(datasetId, query);
	// This error code is used by the HTTP layer to return 404.
	throw Object.assign(new Error(`Unknown datasetId: ${datasetId}`), { code: 'DATASET_NOT_FOUND' });
}


