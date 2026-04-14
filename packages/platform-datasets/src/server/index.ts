/**
 * Server-side dataset runtime: compile, definitions, providers.
 */
import { registerProvider } from './executeDatasetQuery';
import { postgresProvider } from './providers/postgresProvider';
import { oracleProvider } from './providers/oracleProvider';
import { clickhouseProvider } from './providers/clickhouseProvider';

// Auto-register package-owned providers.
// External providers (mock, etc.) must be registered by the app bootstrap.
registerProvider('postgres', postgresProvider);
registerProvider('oracle', oracleProvider);
registerProvider('clickhouse', clickhouseProvider);

export { genericCompile } from './genericCompile';
export { postgresProvider } from './providers/postgresProvider';
export { oracleProvider } from './providers/oracleProvider';
export { clickhouseProvider, _closeClientForTesting as _closeClickHouseForTesting } from './providers/clickhouseProvider';
export { executeDatasetQuery, DatasetExecutionError, registerProvider } from './executeDatasetQuery';
export { getRegistryEntry, isRegisteredDataset, listRegisteredDatasets } from './registry';
export type { RegistryEntry } from './registry';
export { getDatasetSchema } from './getDatasetSchema';
export type { DatasetSchemaField, DatasetSchemaResponse } from './getDatasetSchema';
