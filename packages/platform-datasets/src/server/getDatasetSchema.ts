/**
 * Dataset schema introspection — returns field metadata without executing a query.
 *
 * Uses the same registry lookup as executeDatasetQuery.
 * Hidden fields are suppressed from the response.
 * Access policy is enforced identically to query execution (placeholder for now).
 *
 * Canonical reference: docs/architecture_dashboard_bi.md §1 (Schema Introspection)
 */
import type { DatasetId, DatasetFieldType, SourceDescriptor } from '../model';
import { getRegistryEntry } from './registry';
import { DatasetExecutionError } from './executeDatasetQuery';

// ---------------------------------------------------------------------------
// Schema response shape
// ---------------------------------------------------------------------------

export type DatasetSchemaField = {
	name: string;
	type: DatasetFieldType;
	filterable?: boolean;
	sortable?: boolean;
};

export type DatasetSchemaResponse = {
	datasetId: DatasetId;
	fields: DatasetSchemaField[];
	source: { kind: SourceDescriptor['kind'] };
	// paramsSchemaJsonSchema intentionally absent — requires typed paramsSchema per dataset (BR-5+)
};

// ---------------------------------------------------------------------------
// getDatasetSchema — package-level schema lookup
// ---------------------------------------------------------------------------

export function getDatasetSchema(
	datasetId: DatasetId,
	requestId?: string,
): DatasetSchemaResponse {
	// 1. Registry lookup
	const entry = getRegistryEntry(datasetId);
	if (!entry) {
		const safeId = datasetId.slice(0, 64).replace(/[^a-zA-Z0-9._-]/g, '');
		throw new DatasetExecutionError(
			'DATASET_NOT_FOUND',
			`Unknown dataset: ${safeId}`,
			false,
			requestId,
		);
	}

	// 2. Access check (placeholder — same gate as executeDatasetQuery)
	// assertDatasetAccess(entry, ctx)

	// 3. Build schema response — suppress hidden fields
	const visibleFields: DatasetSchemaField[] = entry.fields
		.filter((f) => !f.hidden)
		.map((f) => {
			const field: DatasetSchemaField = { name: f.name, type: f.type };
			if (f.filterable) field.filterable = true;
			if (f.sortable) field.sortable = true;
			return field;
		});

	return {
		datasetId: entry.datasetId,
		fields: visibleFields,
		source: { kind: entry.source.kind },
	};
}
