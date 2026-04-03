import type { Pool, PoolClient } from 'pg';

import { getPgPool } from '@dashboard-builder/db';

export type Queryable = Pool | PoolClient;

export function getDb(client?: PoolClient): Queryable {
	return client ?? getPgPool();
}

export async function withTransaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
	const pool = getPgPool();
	const client = await pool.connect();

	try {
		await client.query('BEGIN');
		const result = await run(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
