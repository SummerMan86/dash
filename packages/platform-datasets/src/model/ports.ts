import type { DatasetResponse } from './contract';
import type { DatasetId } from './contract';
import type { DatasetIr } from './ir';
import type { SourceDescriptor, DatasetFieldDef } from './registry';

/**
 * ServerContext is NOT part of DatasetQuery.
 *
 * Why:
 * - tenant/user comes from auth/session (server-derived)
 * - keeping it out of DatasetQuery makes the contract portable and cache-friendly
 *
 * In a real app you will likely add:
 * - roles/scopes/permissions
 * - locale/timezone
 * - tracing ids
 */
export type ServerContext = {
	tenantId: string;
	userId?: string;
	scopes?: string[];
	/** Correlation / tracing id. Must NOT affect cache identity. */
	requestId?: string;
	locale?: string;
	timezone?: string;
};

export interface Provider {
	/**
	 * Execute a compiled IR on a particular backend (Oracle/Postgres/Cube/mock).
	 *
	 * Providers are "adapters" in Ports & Adapters / Hexagonal Architecture.
	 * The *port* is this interface, owned by the core.
	 *
	 * `entry` provides registry-owned metadata: source descriptor, fields.
	 */
	execute: (ir: DatasetIr, entry: ProviderEntry, ctx: ServerContext) => Promise<DatasetResponse>;
}

/**
 * Minimal entry shape that providers need for execution.
 * Satisfied by both DatasetRegistryEntry and server RegistryEntry.
 */
export type ProviderEntry = {
	datasetId: DatasetId;
	source: SourceDescriptor;
	fields: DatasetFieldDef[];
	cache?: { ttlMs: number; refreshIntervalMs?: number; staleWhileRevalidate?: boolean };
	execution?: { defaultLimit?: number; maxLimit?: number; timeoutMs?: number };
};
