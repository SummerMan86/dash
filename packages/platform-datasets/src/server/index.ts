/**
 * Server-side dataset runtime: compile, definitions, providers.
 */
import { registerProvider } from './executeDatasetQuery';
import { postgresProvider } from './providers/postgresProvider';

// Auto-register the postgres provider (package-owned).
// External providers (mock, oracle, etc.) must be registered by the app bootstrap.
registerProvider('postgres', postgresProvider);

export { compileDataset, isKnownDatasetId } from './compile';
export { postgresProvider } from './providers/postgresProvider';
export { executeDatasetQuery, DatasetExecutionError, registerProvider } from './executeDatasetQuery';
export { getRegistryEntry, isRegisteredDataset, listRegisteredDatasets } from './registry';
export type { RegistryEntry } from './registry';
