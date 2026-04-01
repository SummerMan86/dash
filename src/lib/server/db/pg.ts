import { Pool } from 'pg';

let pool: Pool | undefined;

export function getPgPool(): Pool {
	if (pool) return pool;

	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL is not set (required for postgres provider)');
	}

	// Keep settings minimal for MVP. Tune later (timeouts, pool size, ssl, etc.).
	pool = new Pool({ connectionString });
	return pool;
}
