/**
 * Minimal ambient type declarations for oracledb (Thin mode).
 * oracledb 6.x does not ship .d.ts files.
 */
declare module 'oracledb' {
	export const OUT_FORMAT_OBJECT: number;

	export interface PoolAttributes {
		user: string;
		password: string;
		connectString: string;
		poolMin?: number;
		poolMax?: number;
		poolIncrement?: number;
	}

	export interface ExecuteOptions {
		outFormat?: number;
		fetchArraySize?: number;
		maxRows?: number;
	}

	export interface Result<T = Record<string, unknown>> {
		rows?: T[];
		metaData?: Array<{ name: string }>;
		rowsAffected?: number;
	}

	export interface Connection {
		callTimeout: number;
		execute<T = Record<string, unknown>>(
			sql: string,
			binds?: unknown[] | Record<string, unknown>,
			options?: ExecuteOptions,
		): Promise<Result<T>>;
		close(): Promise<void>;
	}

	export interface Pool {
		getConnection(): Promise<Connection>;
		close(drainTime?: number): Promise<void>;
	}

	export function createPool(attrs: PoolAttributes): Promise<Pool>;
	export function getConnection(attrs: Omit<PoolAttributes, 'poolMin' | 'poolMax' | 'poolIncrement'>): Promise<Connection>;
}
