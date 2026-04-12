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
import {
	IFTS_DATASETS,
	compileIftsDataset,
	type IftsDatasetId
} from './definitions/iftsMart';

type KnownDatasetId =
	| PaymentDatasetId
	| WildberriesDatasetId
	| ProductPeriodDatasetId
	| EmisMartDatasetId
	| StrategyMartDatasetId
	| IftsDatasetId;

/**
 * Dataset compiler entrypoint — transitional family-switch.
 *
 * TODO(BR-9): replace this switch with genericCompile() when registry entries
 * carry paramsSchema and queryBindings. After BR-9, this file should only
 * contain the escape hatch for custom compile functions, not the family routing.
 *
 * This is a dual catalog: dataset identity exists both here and in registry/index.ts.
 * Keep both in sync until genericCompile() absorbs the declarative datasets.
 */
export function isKnownDatasetId(id: string): id is KnownDatasetId {
	return (
		Object.values(PAYMENT_DATASETS).includes(id as PaymentDatasetId) ||
		Object.values(WILDBERRIES_DATASETS).includes(id as WildberriesDatasetId) ||
		Object.values(PRODUCT_PERIOD_DATASETS).includes(id as ProductPeriodDatasetId) ||
		Object.values(EMIS_MART_DATASETS).includes(id as EmisMartDatasetId) ||
		Object.values(STRATEGY_MART_DATASETS).includes(id as StrategyMartDatasetId) ||
		Object.values(IFTS_DATASETS).includes(id as IftsDatasetId)
	);
}

/**
 * Merge query.filters + query.params into a single flat bag.
 * Params override filters when keys collide (params is canonical).
 */
function mergeParams(query: DatasetQuery): Record<string, unknown> {
	return { ...query.filters, ...query.params } as Record<string, unknown>;
}

export function compileDataset(datasetId: DatasetId, query: DatasetQuery): DatasetIr {
	const params = mergeParams(query);
	if (Object.values(PAYMENT_DATASETS).includes(datasetId as PaymentDatasetId)) {
		return compilePaymentDataset(datasetId as PaymentDatasetId, params);
	}
	if (Object.values(WILDBERRIES_DATASETS).includes(datasetId as WildberriesDatasetId)) {
		return compileWildberriesDataset(datasetId as WildberriesDatasetId, params);
	}
	if (Object.values(PRODUCT_PERIOD_DATASETS).includes(datasetId as ProductPeriodDatasetId)) {
		return compileProductPeriodDataset(datasetId as ProductPeriodDatasetId, params);
	}
	if (Object.values(EMIS_MART_DATASETS).includes(datasetId as EmisMartDatasetId)) {
		return compileEmisMartDataset(datasetId as EmisMartDatasetId, params);
	}
	if (Object.values(STRATEGY_MART_DATASETS).includes(datasetId as StrategyMartDatasetId)) {
		return compileStrategyMartDataset(datasetId as StrategyMartDatasetId, params);
	}
	if (Object.values(IFTS_DATASETS).includes(datasetId as IftsDatasetId)) {
		return compileIftsDataset(datasetId as IftsDatasetId, params);
	}
	// This error code is used by the HTTP layer to return 404.
	throw Object.assign(new Error(`Unknown datasetId: ${datasetId}`), { code: 'DATASET_NOT_FOUND' });
}
