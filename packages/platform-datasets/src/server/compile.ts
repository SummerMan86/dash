import type { DatasetId, DatasetIr, DatasetQuery } from '../model';

import {
	PAYMENT_DATASETS,
	compilePaymentDataset,
	type PaymentDatasetId
} from './definitions/paymentAnalytics';
import {
	WILDBERRIES_DATASETS,
	compileWildberriesDataset,
	type WildberriesDatasetId
} from './definitions/wildberriesOfficeDay';
import {
	PRODUCT_PERIOD_DATASETS,
	compileProductPeriodDataset,
	type ProductPeriodDatasetId
} from './definitions/wildberriesProductPeriod';
import {
	EMIS_MART_DATASETS,
	compileEmisMartDataset,
	type EmisMartDatasetId
} from './definitions/emisMart';
import {
	STRATEGY_MART_DATASETS,
	compileStrategyMartDataset,
	type StrategyMartDatasetId
} from './definitions/strategyMart';

type KnownDatasetId =
	| PaymentDatasetId
	| WildberriesDatasetId
	| ProductPeriodDatasetId
	| EmisMartDatasetId
	| StrategyMartDatasetId;

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
		Object.values(WILDBERRIES_DATASETS).includes(id as WildberriesDatasetId) ||
		Object.values(PRODUCT_PERIOD_DATASETS).includes(id as ProductPeriodDatasetId) ||
		Object.values(EMIS_MART_DATASETS).includes(id as EmisMartDatasetId) ||
		Object.values(STRATEGY_MART_DATASETS).includes(id as StrategyMartDatasetId)
	);
}

export function compileDataset(datasetId: DatasetId, query: DatasetQuery): DatasetIr {
	if (Object.values(PAYMENT_DATASETS).includes(datasetId as PaymentDatasetId)) {
		return compilePaymentDataset(datasetId as PaymentDatasetId, query);
	}
	if (Object.values(WILDBERRIES_DATASETS).includes(datasetId as WildberriesDatasetId)) {
		return compileWildberriesDataset(datasetId as WildberriesDatasetId, query);
	}
	if (Object.values(PRODUCT_PERIOD_DATASETS).includes(datasetId as ProductPeriodDatasetId)) {
		return compileProductPeriodDataset(datasetId as ProductPeriodDatasetId, query);
	}
	if (Object.values(EMIS_MART_DATASETS).includes(datasetId as EmisMartDatasetId)) {
		return compileEmisMartDataset(datasetId as EmisMartDatasetId, query);
	}
	if (Object.values(STRATEGY_MART_DATASETS).includes(datasetId as StrategyMartDatasetId)) {
		return compileStrategyMartDataset(datasetId as StrategyMartDatasetId, query);
	}
	// This error code is used by the HTTP layer to return 404.
	throw Object.assign(new Error(`Unknown datasetId: ${datasetId}`), { code: 'DATASET_NOT_FOUND' });
}
