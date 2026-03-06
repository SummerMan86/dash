import type { DatasetId, DatasetIr, DatasetQuery } from '$entities/dataset';

import { PAYMENT_DATASETS, compilePaymentDataset, type PaymentDatasetId } from './definitions/paymentAnalytics';
import {
	WILDBERRIES_DATASETS,
	compileWildberriesDataset,
	type WildberriesDatasetId
} from './definitions/wildberriesOfficeDay';

type KnownDatasetId = PaymentDatasetId | WildberriesDatasetId;

/**
 * Dataset compiler entrypoint.
 *
 * This is the "routing layer" for dataset definitions:
 * - it picks the right dataset definition based on datasetId
 * - it returns IR (which providers can execute)
 *
 * Think of it as a registry, but implemented with simple code for MVP.
 */
export function isKnownDatasetId(id: string): id is KnownDatasetId {
	return (
		Object.values(PAYMENT_DATASETS).includes(id as PaymentDatasetId) ||
		Object.values(WILDBERRIES_DATASETS).includes(id as WildberriesDatasetId)
	);
}

export function compileDataset(datasetId: DatasetId, query: DatasetQuery): DatasetIr {
	if (Object.values(PAYMENT_DATASETS).includes(datasetId as PaymentDatasetId)) {
		return compilePaymentDataset(datasetId as PaymentDatasetId, query);
	}
	if (Object.values(WILDBERRIES_DATASETS).includes(datasetId as WildberriesDatasetId)) {
		return compileWildberriesDataset(datasetId as WildberriesDatasetId, query);
	}
	// This error code is used by the HTTP layer to return 404.
	throw Object.assign(new Error(`Unknown datasetId: ${datasetId}`), { code: 'DATASET_NOT_FOUND' });
}


