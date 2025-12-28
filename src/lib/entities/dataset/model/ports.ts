import type { DatasetResponse } from './contract';
import type { DatasetIr } from './ir';

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
};

export interface Provider {
	/**
	 * Execute a compiled IR on a particular backend (Oracle/Postgres/Cube/mock).
	 *
	 * Providers are "adapters" in Ports & Adapters / Hexagonal Architecture.
	 * The *port* is this interface, owned by the core (`entities/dataset`).
	 *
	 * Must be deterministic for the same (ir, ctx) inputs.
	 */
	execute: (ir: DatasetIr, ctx: ServerContext) => Promise<DatasetResponse>;
}


