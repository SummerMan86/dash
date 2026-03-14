import 'dotenv/config';

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'db', 'migrations');
const SEEDS_DIR = path.join(ROOT_DIR, 'db', 'seeds');
const MIGRATION_SCOPE = 'emis';
const APP_SCHEMA = 'emis';
const MIGRATIONS_TABLE = `${APP_SCHEMA}.schema_migrations`;

function requireDatabaseUrl() {
	const url = process.env.DATABASE_URL?.trim();
	if (!url) {
		throw new Error('DATABASE_URL is required for db commands');
	}
	return url;
}

async function createClient() {
	const client = new Client({
		connectionString: requireDatabaseUrl()
	});
	await client.connect();
	return client;
}

async function listSqlFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b));
}

async function ensureMigrationsTable(client) {
	await client.query(`CREATE SCHEMA IF NOT EXISTS ${APP_SCHEMA}`);
	await client.query(`
		CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
			filename TEXT NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			PRIMARY KEY (filename)
		)
	`);
}

async function loadAppliedMigrations(client) {
	const result = await client.query(`SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename`);
	return new Set(result.rows.map((row) => row.filename));
}

async function executeSqlFile(client, absoluteFilePath) {
	const sql = await readFile(absoluteFilePath, 'utf8');
	if (!sql.trim()) return;
	await client.query(sql);
}

async function runMigrations(client) {
	await ensureMigrationsTable(client);
	const applied = await loadAppliedMigrations(client);
	const files = await listSqlFiles(MIGRATIONS_DIR);

	for (const file of files) {
		if (applied.has(file)) {
			console.log(`[db:migrate] skip ${file}`);
			continue;
		}

		const fullPath = path.join(MIGRATIONS_DIR, file);
		console.log(`[db:migrate] apply ${file}`);
		await client.query('BEGIN');
		try {
			await executeSqlFile(client, fullPath);
			await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`, [file]);
			await client.query('COMMIT');
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		}
	}
}

async function runSeeds(client) {
	const files = await listSqlFiles(SEEDS_DIR);
	for (const file of files) {
		const fullPath = path.join(SEEDS_DIR, file);
		console.log(`[db:seed] apply ${file}`);
		await client.query('BEGIN');
		try {
			await executeSqlFile(client, fullPath);
			await client.query('COMMIT');
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		}
	}
}

async function resetSchema(client) {
	console.log('[db:reset] drop schema emis');
	await client.query('DROP SCHEMA IF EXISTS emis CASCADE');
}

async function showStatus(client) {
	await ensureMigrationsTable(client);
	const applied = await loadAppliedMigrations(client);
	const files = await listSqlFiles(MIGRATIONS_DIR);

	console.log(`[db:status] scope=${MIGRATION_SCOPE}`);
	for (const file of files) {
		const marker = applied.has(file) ? 'applied' : 'pending';
		console.log(`- ${marker}: ${file}`);
	}
}

async function main() {
	const command = process.argv[2];

	if (!command || !['status', 'migrate', 'seed', 'reset'].includes(command)) {
		console.error('Usage: node ./scripts/db.mjs <status|migrate|seed|reset>');
		process.exitCode = 1;
		return;
	}

	const client = await createClient();

	try {
		switch (command) {
			case 'status':
				await showStatus(client);
				break;
			case 'migrate':
				await runMigrations(client);
				break;
			case 'seed':
				await runSeeds(client);
				break;
			case 'reset':
				await resetSchema(client);
				await runMigrations(client);
				await runSeeds(client);
				break;
		}
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
