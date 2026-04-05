/**
 * GET /api/emis/readyz — DB-backed runtime readiness check.
 *
 * Unlike /api/emis/health (file/snapshot readiness), this endpoint verifies
 * that the runtime can actually serve EMIS requests:
 *   1. DATABASE_URL is set
 *   2. PostgreSQL is reachable
 *   3. Required schemas exist: emis, stg_emis, mart_emis, mart
 *   4. Published views/contracts that UI/BI reads are accessible
 *
 * Returns:
 *   200 { status: 'ready', checks: {...} }            — all critical checks pass
 *   503 { status: 'not_ready', checks: {...}, failures: [...] } — any critical check fails
 *
 * Canonical contract: docs/emis_observability_contract.md section 3.2.
 */

import { json, type RequestHandler } from '@sveltejs/kit';

const REQUIRED_SCHEMAS = ['emis', 'stg_emis', 'mart_emis', 'mart'] as const;

/**
 * Published views that UI/BI consumers read. Grouped by schema for clarity.
 * Each entry is checked with a lightweight `SELECT 1 FROM <view> LIMIT 0`.
 */
const PUBLISHED_VIEWS = [
	'mart.emis_news_flat',
	'mart.emis_objects_dim',
	'mart.emis_object_news_facts',
	'mart.emis_ship_route_vessels',
	'mart_emis.ship_route_points',
	'mart_emis.ship_route_segments'
] as const;

// Module-load guard: every view name must be a safe dotted identifier.
const SAFE_VIEW_RE = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i;
for (const v of PUBLISHED_VIEWS) {
	if (!SAFE_VIEW_RE.test(v)) throw new Error(`PUBLISHED_VIEWS: unsafe identifier "${v}"`);
}

interface CheckResult {
	ok: boolean;
	detail?: string;
}

type CheckMap = Record<string, CheckResult>;

export const GET: RequestHandler = async () => {
	const checks: CheckMap = {};
	const failures: string[] = [];
	const startMs = Date.now();

	// 1. DATABASE_URL set
	const dbUrl = process.env.DATABASE_URL?.trim();
	if (!dbUrl) {
		checks['database_url'] = { ok: false, detail: 'DATABASE_URL is not set' };
		failures.push('database_url');
		return json(
			{
				status: 'not_ready',
				checks,
				failures,
				durationMs: Date.now() - startMs
			},
			{ status: 503 }
		);
	}
	checks['database_url'] = { ok: true };

	// 2..4 require a DB connection
	let pool;
	try {
		// Dynamic import to avoid top-level side-effects when DATABASE_URL is missing.
		// getPgPool() from @dashboard-builder/db is the canonical pool singleton.
		const { getPgPool } = await import('@dashboard-builder/db');
		pool = getPgPool();
	} catch (e) {
		console.warn('[readyz] pool init failed:', e instanceof Error ? e.message : String(e));
		checks['pg_connectivity'] = {
			ok: false,
			detail: 'pool initialization failed'
		};
		failures.push('pg_connectivity');
		return json(
			{
				status: 'not_ready',
				checks,
				failures,
				durationMs: Date.now() - startMs
			},
			{ status: 503 }
		);
	}

	// 2. PostgreSQL connectivity
	try {
		await pool.query('SELECT 1');
		checks['pg_connectivity'] = { ok: true };
	} catch (e) {
		console.warn('[readyz] pg connectivity failed:', e instanceof Error ? e.message : String(e));
		checks['pg_connectivity'] = {
			ok: false,
			detail: 'connection failed'
		};
		failures.push('pg_connectivity');
		// If we cannot reach PG, skip schema/view checks
		return json(
			{
				status: 'not_ready',
				checks,
				failures,
				durationMs: Date.now() - startMs
			},
			{ status: 503 }
		);
	}

	// 3. Required schemas
	try {
		const { rows } = await pool.query<{ schema_name: string }>(
			`SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1)`,
			[REQUIRED_SCHEMAS as unknown as string[]]
		);
		const found = new Set(rows.map((r) => r.schema_name));

		for (const schema of REQUIRED_SCHEMAS) {
			const ok = found.has(schema);
			checks[`schema:${schema}`] = ok ? { ok: true } : { ok: false, detail: 'schema not found' };
			if (!ok) failures.push(`schema:${schema}`);
		}
	} catch (e) {
		console.warn('[readyz] schema check failed:', e instanceof Error ? e.message : String(e));
		for (const schema of REQUIRED_SCHEMAS) {
			checks[`schema:${schema}`] = {
				ok: false,
				detail: 'query failed'
			};
			failures.push(`schema:${schema}`);
		}
	}

	// 4. Published views
	for (const view of PUBLISHED_VIEWS) {
		try {
			await pool.query(`SELECT 1 FROM ${view} LIMIT 0`);
			checks[`view:${view}`] = { ok: true };
		} catch (e) {
			console.warn(`[readyz] view check failed for ${view}:`, e instanceof Error ? e.message : String(e));
			checks[`view:${view}`] = {
				ok: false,
				detail: 'view not accessible'
			};
			failures.push(`view:${view}`);
		}
	}

	const status = failures.length === 0 ? 'ready' : 'not_ready';
	const httpStatus = failures.length === 0 ? 200 : 503;

	const body: Record<string, unknown> = {
		status,
		checks,
		durationMs: Date.now() - startMs
	};
	if (failures.length > 0) {
		body.failures = failures;
	}

	return json(body, { status: httpStatus });
};
