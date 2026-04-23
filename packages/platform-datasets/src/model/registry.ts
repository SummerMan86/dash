/**
 * Dataset Registry contracts — target-state types for the BI refactor.
 *
 * These types are additive: they coexist with the current runtime
 * and do not change route behavior until BR-2+.
 *
 * Canonical reference: docs/bi/architecture.md §1
 */
import type { z } from 'zod';
import type { DatasetId, DatasetField, JsonValue } from './contract';
import type { DatasetIr } from './ir';

// ---------------------------------------------------------------------------
// SourceDescriptor — "where data lives"
// ---------------------------------------------------------------------------

export type SourceDescriptor =
	| { kind: 'postgres'; schema: string; table: string }
	| { kind: 'oracle'; connectionName: string; schema: string; table: string }
	| { kind: 'clickhouse'; database: string; table: string }
	| { kind: 'cube'; cubeName: string }
	| { kind: 'mock'; fixtureId: string };

// ---------------------------------------------------------------------------
// DatasetFieldDef — enriched field metadata
// ---------------------------------------------------------------------------

export type DatasetFieldDef = DatasetField & {
	/** Whether the field can be used as a filter target via queryBindings. */
	filterable?: boolean;
	/** Whether the field can be used in ORDER BY. */
	sortable?: boolean;
	/** Hidden fields are suppressed from /schema introspection responses. */
	hidden?: boolean;
};

// ---------------------------------------------------------------------------
// DatasetFilterBinding — declarative param-to-field mapping for genericCompile
// ---------------------------------------------------------------------------

export type DatasetFilterBinding = {
	/** Wire param name in DatasetQuery.params */
	param: string;
	/** Target column/field name in the source */
	field: string;
	/** Comparison operator */
	op: 'eq' | 'gte' | 'lte' | 'in' | 'like';
};

// ---------------------------------------------------------------------------
// DatasetAccess — coarse-grained read access policy
// ---------------------------------------------------------------------------

export type DatasetAccess = {
	/** Scopes required to query or introspect this dataset. */
	requiredScopes?: string[];
};

// ---------------------------------------------------------------------------
// Cache hints — provider-owned server-side caching
// ---------------------------------------------------------------------------

export type DatasetCacheHints = {
	/** Normal freshness budget for cached reads (ms). */
	ttlMs: number;
	/** Optional proactive refresh/pre-warm interval (ms). */
	refreshIntervalMs?: number;
	/** Allow bounded stale reads while a background refresh is in progress. */
	staleWhileRevalidate?: boolean;
};

// ---------------------------------------------------------------------------
// Execution hints — dataset-level limits and timeouts
// ---------------------------------------------------------------------------

export type DatasetExecutionHints = {
	/** Default row limit if the client does not specify one. */
	defaultLimit?: number;
	/** Hard maximum row limit. */
	maxLimit?: number;
	/** Dataset-level execution budget (ms). */
	timeoutMs?: number;
};

// ---------------------------------------------------------------------------
// DatasetRegistryEntry — one canonical entry per dataset
// ---------------------------------------------------------------------------

export type DatasetRegistryEntry<
	TParams = Record<string, JsonValue>,
	TRow = Record<string, JsonValue>,
> = {
	datasetId: DatasetId;
	source: SourceDescriptor;
	fields: DatasetFieldDef[];
	paramsSchema: z.ZodType<TParams>;
	queryBindings?: {
		filters?: DatasetFilterBinding[];
	};
	/**
	 * Custom compile function. If omitted, genericCompile() is used with queryBindings.
	 *
	 * Custom compile receives typed params (output of paramsSchema.parse).
	 * executeDatasetQuery merges query.filters + query.params before parsing,
	 * so compile functions see a single flat bag and never touch DatasetQuery directly.
	 */
	compile?: (datasetId: DatasetId, params: TParams) => DatasetIr;
	/** Optional Zod schema for row validation (dev/test). */
	rowSchema?: z.ZodType<TRow>;
	access?: DatasetAccess;
	cache?: DatasetCacheHints;
	execution?: DatasetExecutionHints;
};
