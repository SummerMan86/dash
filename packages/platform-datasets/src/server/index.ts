/**
 * Server-side dataset runtime: compile, definitions, providers.
 */
import { registerProvider } from './executeDatasetQuery';
import { postgresProvider } from './providers/postgresProvider';
import { oracleProvider } from './providers/oracleProvider';

// Auto-register package-owned providers.
// External providers (mock, etc.) must be registered by the app bootstrap.
registerProvider('postgres', postgresProvider);
registerProvider('oracle', oracleProvider);

export { compileDataset, isKnownDatasetId } from './compile';
export { genericCompile } from './genericCompile';
export { postgresProvider } from './providers/postgresProvider';
export { oracleProvider } from './providers/oracleProvider';
export { executeDatasetQuery, DatasetExecutionError, registerProvider } from './executeDatasetQuery';
export { getRegistryEntry, isRegisteredDataset, listRegisteredDatasets } from './registry';
export type { RegistryEntry } from './registry';
export { getDatasetSchema } from './getDatasetSchema';
export type { DatasetSchemaField, DatasetSchemaResponse } from './getDatasetSchema';
