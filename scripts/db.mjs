import 'dotenv/config';

import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SEEDS_DIR = path.join(ROOT_DIR, 'db', 'seeds');
const DEMO_FIXTURES_DIR = path.join(ROOT_DIR, 'db', 'demo-fixtures');
const SNAPSHOT_FILE = path.join(ROOT_DIR, 'db', 'current_schema.sql');
const PENDING_CHANGES_FILE = path.join(ROOT_DIR, 'db', 'pending_changes.sql');
const SCHEMA_CATALOG_FILE = path.join(ROOT_DIR, 'db', 'schema_catalog.md');
const APPLIED_CHANGES_FILE = path.join(ROOT_DIR, 'db', 'applied_changes.md');
const DB_MODE = 'snapshot-first';
const ACTIVE_SCHEMAS = ['emis', 'stg_emis', 'mart_emis', 'mart'];
const RESET_SCHEMAS = [
	'mart',
	'mart_emis',
	'stg_emis',
	'emis',
	'staging',
	'mart_back2103',
	'staging_back2103'
];

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

async function maybeCreateClient() {
	const url = process.env.DATABASE_URL?.trim();
	if (!url) return null;
	const client = new Client({
		connectionString: url
	});
	await client.connect();
	return client;
}

async function listSqlFiles(dir) {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
			.map((entry) => entry.name)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		return [];
	}
}

async function fileExists(filePath) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

function stripSqlComments(sql) {
	return sql
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split('\n')
		.map((line) => line.replace(/--.*$/, '').trim())
		.join('\n');
}

function hasExecutableSql(sql) {
	return stripSqlComments(sql).trim().length > 0;
}

async function readSqlFileIfPresent(filePath) {
	if (!(await fileExists(filePath))) {
		return null;
	}
	return readFile(filePath, 'utf8');
}

async function executeSqlFile(client, absoluteFilePath) {
	const sql = await readFile(absoluteFilePath, 'utf8');
	if (!sql.trim()) return;
	await client.query(sql);
}

async function runSqlDir(client, dir, label) {
	const files = await listSqlFiles(dir);
	for (const file of files) {
		const fullPath = path.join(dir, file);
		console.log(`[${label}] apply ${file}`);
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

async function applySnapshot(client) {
	const sql = await readSqlFileIfPresent(SNAPSHOT_FILE);
	if (!sql || !hasExecutableSql(sql)) {
		throw new Error(`Snapshot file is missing or empty: ${SNAPSHOT_FILE}`);
	}
	console.log(`[db:reset] apply snapshot ${path.relative(ROOT_DIR, SNAPSHOT_FILE)}`);
	await client.query(sql);
}

async function applyPendingChanges(client) {
	const sql = await readSqlFileIfPresent(PENDING_CHANGES_FILE);
	if (!sql || !hasExecutableSql(sql)) {
		console.log('[db:apply] no executable SQL in db/pending_changes.sql');
		return false;
	}

	console.log('[db:apply] apply db/pending_changes.sql');
	await client.query('BEGIN');
	try {
		await client.query(sql);
		await client.query('COMMIT');
		console.log(
			'[db:apply] done; export the snapshot and update db/applied_changes.md if the contract changed'
		);
		return true;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	}
}

async function runSeeds(client) {
	await runSqlDir(client, SEEDS_DIR, 'db:seed');
}

async function runDemoFixtures(client) {
	await runSqlDir(client, DEMO_FIXTURES_DIR, 'db:demo');
}

async function resetSchemas(client) {
	for (const schemaName of RESET_SCHEMAS) {
		console.log(`[db:reset] drop schema ${schemaName}`);
		await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
	}
}

async function showStatus(client) {
	const [seedFiles, demoFixtureFiles, snapshotSql, pendingChangesSql] = await Promise.all([
		listSqlFiles(SEEDS_DIR),
		listSqlFiles(DEMO_FIXTURES_DIR),
		readSqlFileIfPresent(SNAPSHOT_FILE),
		readSqlFileIfPresent(PENDING_CHANGES_FILE)
	]);

	console.log(`[db:status] mode=${DB_MODE}`);
	console.log(
		`- baseline: ${(await fileExists(SNAPSHOT_FILE)) ? 'present' : 'missing'} (${path.relative(ROOT_DIR, SNAPSHOT_FILE)})`
	);
	console.log(
		`- schema catalog: ${(await fileExists(SCHEMA_CATALOG_FILE)) ? 'present' : 'missing'} (${path.relative(ROOT_DIR, SCHEMA_CATALOG_FILE)})`
	);
	console.log(
		`- applied changes: ${(await fileExists(APPLIED_CHANGES_FILE)) ? 'present' : 'missing'} (${path.relative(ROOT_DIR, APPLIED_CHANGES_FILE)})`
	);
	console.log(
		`- pending patch: ${
			pendingChangesSql && hasExecutableSql(pendingChangesSql) ? 'non-empty' : 'empty'
		} (${path.relative(ROOT_DIR, PENDING_CHANGES_FILE)})`
	);
	console.log(
		`- snapshot SQL: ${snapshotSql && hasExecutableSql(snapshotSql) ? 'ready' : 'missing or empty'}`
	);
	console.log(`- reference seeds: ${seedFiles.length} file(s)`);
	console.log(`- demo fixtures: ${demoFixtureFiles.length} file(s)`);

	if (!client) {
		console.log('- live database: skipped (DATABASE_URL is not set)');
		return;
	}

	const result = await client.query(
		`
		SELECT
			n.nspname AS schema_name,
			COUNT(*) FILTER (WHERE c.relkind = 'r')::int AS tables_count,
			COUNT(*) FILTER (WHERE c.relkind = 'v')::int AS views_count,
			COUNT(*) FILTER (WHERE c.relkind = 'm')::int AS materialized_views_count
		FROM pg_namespace n
		LEFT JOIN pg_class c
			ON c.relnamespace = n.oid
			AND c.relkind IN ('r', 'v', 'm')
		WHERE n.nspname = ANY($1::text[])
		GROUP BY n.nspname
		ORDER BY n.nspname
	`,
		[ACTIVE_SCHEMAS]
	);

	const liveBySchema = new Map(result.rows.map((row) => [row.schema_name, row]));
	for (const schemaName of ACTIVE_SCHEMAS) {
		const row = liveBySchema.get(schemaName);
		if (!row) {
			console.log(`- live schema ${schemaName}: missing`);
			continue;
		}

		console.log(
			`- live schema ${schemaName}: tables=${row.tables_count}, views=${row.views_count}, matviews=${row.materialized_views_count}`
		);
	}
}

async function main() {
	const command = process.argv[2];

	if (!command || !['status', 'apply', 'seed', 'demo', 'reset'].includes(command)) {
		console.error('Usage: node ./scripts/db.mjs <status|apply|seed|demo|reset>');
		process.exitCode = 1;
		return;
	}

	const client = command === 'status' ? await maybeCreateClient() : await createClient();

	try {
		switch (command) {
			case 'status':
				await showStatus(client);
				break;
			case 'apply':
				await applyPendingChanges(client);
				break;
			case 'seed':
				await runSeeds(client);
				break;
			case 'demo':
				await runDemoFixtures(client);
				break;
			case 'reset':
				await resetSchemas(client);
				await applySnapshot(client);
				await runSeeds(client);
				break;
		}
	} finally {
		if (client) {
			await client.end();
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
