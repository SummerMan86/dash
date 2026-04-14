/**
 * ClickHouse Provider — analytical backend for historical/aggregated data.
 *
 * Uses @clickhouse/client (HTTP interface).
 * Lazy client initialization on first use.
 * IR-to-SQL translation for ClickHouse dialect.
 *
 * Current IR constraints:
 * - SELECT supports only column references (expr.kind === 'col'),
 *   not computed expressions or aggregations. This matches the
 *   postgres and oracle providers' current scope.
 *
 * Env: CLICKHOUSE_URL (default http://localhost:8123),
 *      CLICKHOUSE_USER, CLICKHOUSE_PASSWORD, CLICKHOUSE_DB.
 */
import { createClient, ClickHouseError } from '@clickhouse/client';
import type { ClickHouseClient } from '@clickhouse/client';
import type { DatasetFieldType, DatasetResponse, JsonValue } from '../../model';
import type { DatasetIr, IrExpr } from '../../model';
import type { Provider, ProviderEntry, ServerContext } from '../../model';
import { CONTRACT_VERSION } from '../../model';
import { qIdent, safeSortDir, buildColumnIndex, inferFields, serializeOrderBy } from './shared';

const PROVIDER = 'clickhouseProvider';

// ---------------------------------------------------------------------------
// Client lifecycle — lazy init, graceful shutdown
// ---------------------------------------------------------------------------

let client: ClickHouseClient | null = null;

function getClient(): ClickHouseClient {
	if (client) return client;
	const password = process.env.CLICKHOUSE_PASSWORD;
	if (!password) {
		throw new Error(`${PROVIDER}: CLICKHOUSE_PASSWORD env var is required`);
	}
	client = createClient({
		url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
		username: process.env.CLICKHOUSE_USER ?? 'default',
		password,
		database: process.env.CLICKHOUSE_DB ?? 'analytics',
		request_timeout: 30_000,
		clickhouse_settings: {
			max_execution_time: 30,
		},
	});
	return client;
}

/** Reset client for test isolation (matches _resetCacheForTesting pattern). */
export async function _closeClientForTesting(): Promise<void> {
	if (client) {
		try { await client.close(); } catch { /* ignore */ }
		client = null;
	}
}

let shutdownRegistered = false;
if (typeof process !== 'undefined' && !shutdownRegistered) {
	shutdownRegistered = true;
	const shutdown = async () => { await _closeClientForTesting(); };
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

// ---------------------------------------------------------------------------
// SQL generation (ClickHouse dialect)
// ---------------------------------------------------------------------------

const SAFE_OPS = new Set(['=', '!=', '<', '<=', '>', '>=', 'in', 'like']);

/**
 * ClickHouse uses {name:Type} syntax for parameterized queries.
 * We track params as named entries: p1, p2, ... with their values and CH types.
 */
type ChParam = { name: string; value: unknown; chType: string };

function inferChType(value: unknown): string {
	if (typeof value === 'string') return 'String';
	if (typeof value === 'number') return Number.isInteger(value) ? 'Int64' : 'Float64';
	if (typeof value === 'boolean') return 'UInt8';
	if (value === null) return 'Nullable(String)';
	if (Array.isArray(value)) {
		if (!value.length) return 'Array(String)';
		return `Array(${inferChType(value[0])})`;
	}
	return 'String';
}

function exprToSql(
	expr: IrExpr,
	params: ChParam[],
	columns: Record<string, DatasetFieldType>,
): string {
	switch (expr.kind) {
		case 'col': {
			if (!(expr.name in columns)) throw new Error(`${PROVIDER}: unknown column "${expr.name}"`);
			return qIdent(expr.name, PROVIDER);
		}
		case 'lit': {
			const name = `p${params.length + 1}`;
			const chType = inferChType(expr.value);
			params.push({ name, value: expr.value, chType });
			return `{${name}:${chType}}`;
		}
		case 'and': {
			if (!expr.items.length) return '1';
			return `(${expr.items.map(it => exprToSql(it, params, columns)).join(' AND ')})`;
		}
		case 'or': {
			if (!expr.items.length) return '0';
			return `(${expr.items.map(it => exprToSql(it, params, columns)).join(' OR ')})`;
		}
		case 'not':
			return `(NOT ${exprToSql(expr.item, params, columns)})`;
		case 'bin': {
			if (!SAFE_OPS.has(expr.op)) throw new Error(`${PROVIDER}: unsupported operator: ${expr.op}`);
			if (expr.op === 'in') {
				if (expr.right.kind !== 'lit' || !Array.isArray(expr.right.value)) {
					throw new Error(`${PROVIDER}: IN requires a literal array on the right side`);
				}
				const left = exprToSql(expr.left, params, columns);
				const name = `p${params.length + 1}`;
				const arr = expr.right.value as unknown[];
				const elementType = arr.length ? inferChType(arr[0]) : 'String';
				params.push({ name, value: arr, chType: `Array(${elementType})` });
				return `(${left} IN {${name}:Array(${elementType})})`;
			}
			const left = exprToSql(expr.left, params, columns);
			const right = exprToSql(expr.right, params, columns);
			return `(${left} ${expr.op} ${right})`;
		}
	}
}

/**
 * Build a SELECT statement in ClickHouse dialect.
 *
 * Constraint: only `expr.kind === 'col'` is supported in the select list.
 * Computed expressions and aggregations will throw at this stage.
 */
function buildSelectSql(
	irQuery: DatasetIr & { kind: 'select' },
	entry: ProviderEntry,
	columns: Record<string, DatasetFieldType>,
): { text: string; params: ChParam[]; selectedFields: Array<{ outputName: string; sourceCol: string }> } {
	if (entry.source.kind !== 'clickhouse') {
		throw new Error(`${PROVIDER}: expected clickhouse source, got ${entry.source.kind}`);
	}

	const { database, table } = entry.source;
	const params: ChParam[] = [];
	const rel = `${qIdent(database, PROVIDER)}.${qIdent(table, PROVIDER)}`;

	// SELECT
	const selectParts: string[] = [];
	const selectedFields: Array<{ outputName: string; sourceCol: string }> = [];
	for (const item of irQuery.select) {
		if (item.expr.kind !== 'col') throw new Error(`${PROVIDER}: only column select items supported`);
		const colName = item.expr.name;
		if (!columns[colName]) throw new Error(`${PROVIDER}: unknown column "${colName}"`);
		const base = qIdent(colName, PROVIDER);
		const alias = item.as ? qIdent(item.as, PROVIDER) : undefined;
		selectParts.push(alias ? `${base} AS ${alias}` : base);
		selectedFields.push({ outputName: item.as ?? colName, sourceCol: colName });
	}
	if (!selectParts.length) throw new Error(`${PROVIDER}: empty select list`);

	// WHERE
	const whereSql = irQuery.where ? ` WHERE ${exprToSql(irQuery.where, params, columns)}` : '';

	// ORDER BY
	let orderBySql = '';
	if (irQuery.orderBy?.length) {
		const parts = irQuery.orderBy.map(rule => {
			if (rule.expr.kind !== 'col') throw new Error(`${PROVIDER}: ORDER BY supports only columns`);
			if (!columns[rule.expr.name]) throw new Error(`${PROVIDER}: unknown ORDER BY column "${rule.expr.name}"`);
			return `${qIdent(rule.expr.name, PROVIDER)} ${safeSortDir(rule.dir, PROVIDER)}`;
		});
		orderBySql = ` ORDER BY ${parts.join(', ')}`;
	}

	// LIMIT / OFFSET (ClickHouse standard syntax)
	let limitSql = '';
	if (typeof irQuery.limit === 'number') {
		const limit = Math.max(0, Math.min(50_000, Math.floor(irQuery.limit)));
		const name = `p${params.length + 1}`;
		params.push({ name, value: limit, chType: 'UInt64' });
		limitSql = ` LIMIT {${name}:UInt64}`;
	}

	// ClickHouse requires LIMIT before OFFSET; bare OFFSET is a syntax error.
	let offsetSql = '';
	if (typeof irQuery.offset === 'number' && irQuery.offset > 0 && limitSql) {
		const offset = Math.max(0, Math.floor(irQuery.offset));
		const name = `p${params.length + 1}`;
		params.push({ name, value: offset, chType: 'UInt64' });
		offsetSql = ` OFFSET {${name}:UInt64}`;
	}

	const text = `SELECT ${selectParts.join(', ')} FROM ${rel}${whereSql}${orderBySql}${limitSql}${offsetSql}`;
	return { text, params, selectedFields };
}

// ---------------------------------------------------------------------------
// ClickHouse Provider
// ---------------------------------------------------------------------------

export const clickhouseProvider: Provider = {
	async execute(irQuery: DatasetIr, entry: ProviderEntry, ctx: ServerContext): Promise<DatasetResponse> {
		if (irQuery.kind !== 'select') throw new Error(`${PROVIDER}: unsupported IR kind`);
		if (irQuery.from.kind !== 'dataset') throw new Error(`${PROVIDER}: unsupported source`);

		const datasetId = irQuery.from.id;
		const columns = buildColumnIndex(entry.fields);

		// Build SQL
		const { text, params, selectedFields } = buildSelectSql(irQuery, entry, columns);

		// Build query_params for @clickhouse/client
		const queryParams: Record<string, unknown> = {};
		for (const p of params) {
			queryParams[p.name] = p.value;
		}

		const timeoutMs = entry.execution?.timeoutMs ?? 10_000;
		const ch = getClient();

		try {
			const result = await ch.query({
				query: text,
				query_params: queryParams,
				format: 'JSONEachRow',
				clickhouse_settings: {
					max_execution_time: Math.ceil(timeoutMs / 1000),
				},
			});

			const rows = await result.json<Record<string, JsonValue>>();

			return {
				contractVersion: CONTRACT_VERSION,
				datasetId,
				fields: inferFields(columns, selectedFields),
				rows,
				meta: {
					executedAt: new Date().toISOString(),
					tenantId: ctx.tenantId,
					sourceKind: 'clickhouse',
					limit: typeof irQuery.limit === 'number' ? irQuery.limit : undefined,
					offset: typeof irQuery.offset === 'number' ? irQuery.offset : undefined,
					sort: serializeOrderBy(irQuery.orderBy),
				},
			};
		} catch (e: unknown) {
			// Structured error classification via ClickHouseError.code
			if (e instanceof ClickHouseError) {
				const code = e.code;
				if (code === 'TIMEOUT_EXCEEDED' || code === 'SOCKET_TIMEOUT' || code === 'TOO_SLOW') {
					const err = new Error('ClickHouse query timed out');
					Object.assign(err, { code: 'DATASET_TIMEOUT', retryable: true });
					throw err;
				}
				// All other ClickHouse server errors
				console.error(`[${PROVIDER}] ClickHouse error (code=${code}):`, e.message);
				const sanitized = new Error('ClickHouse query failed');
				Object.assign(sanitized, { code: 'DATASET_EXECUTION_FAILED', retryable: false });
				throw sanitized;
			}

			// Non-ClickHouse errors (network, etc.) — fall back to message matching
			const message = e instanceof Error ? e.message : String(e);

			if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND') || message.includes('connect')) {
				const err = new Error('ClickHouse connection failed');
				Object.assign(err, { code: 'DATASET_CONNECTION_ERROR', retryable: true });
				throw err;
			}

			// Sanitize: never forward raw exception beyond provider boundary
			console.error(`[${PROVIDER}] execution error:`, message);
			const sanitized = new Error('ClickHouse query failed');
			Object.assign(sanitized, { code: 'DATASET_EXECUTION_FAILED', retryable: false });
			throw sanitized;
		}
	},
};
