/**
 * Oracle Provider — first real-time non-Postgres backend.
 *
 * Uses node-oracledb Thin mode (no Instant Client needed).
 * Lazy pool initialization on first use.
 * Bounded in-memory TTL cache per dataset+params.
 * Timeout + best-effort statement cancellation.
 *
 * Canonical reference: docs/architecture_dashboard_bi_target.md §5
 */
import oracledb from 'oracledb';
import type { DatasetField, DatasetFieldType, DatasetResponse, JsonValue } from '../../model';
import type { DatasetIr, IrExpr, IrOrderBy, IrSelectItem } from '../../model';
import type { Provider, ProviderEntry, ServerContext } from '../../model';
import type { DatasetFieldDef } from '../../model';
import { CONTRACT_VERSION } from '../../model';

// ---------------------------------------------------------------------------
// Pool lifecycle — lazy init, graceful shutdown
// ---------------------------------------------------------------------------

let pool: oracledb.Pool | null = null;
let poolPromise: Promise<oracledb.Pool> | null = null;

function getOracleConfig() {
	const user = process.env.ORACLE_USER;
	const password = process.env.ORACLE_PASSWORD;
	const connectString = process.env.ORACLE_CONNECT_STRING;
	if (!user || !password || !connectString) {
		throw new Error('oracleProvider: Oracle connection not configured');
	}
	return { user, password, connectString };
}

async function getPool(): Promise<oracledb.Pool> {
	if (pool) return pool;
	if (poolPromise) return poolPromise;
	poolPromise = (async () => {
		const config = getOracleConfig();
		pool = await oracledb.createPool({
			...config,
			poolMin: 1,
			poolMax: 4,
			poolIncrement: 1,
		});
		return pool;
	})();
	poolPromise.catch(() => { poolPromise = null; }); // allow retry on failure
	return poolPromise;
}

// Graceful shutdown — called on process termination
if (typeof process !== 'undefined') {
	const shutdown = async () => {
		if (pool) {
			try { await pool.close(0); } catch { /* ignore */ }
			pool = null;
		}
	};
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

// ---------------------------------------------------------------------------
// Bounded in-memory TTL cache
// ---------------------------------------------------------------------------

type CacheEntry = { expiresAt: number; response: DatasetResponse };
const cache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 200;

function cacheKey(datasetId: string, sqlText: string, params: Record<string, unknown>, tenantId: string): string {
	// requestId excluded from cache identity per architecture doc
	// sqlText included to prevent collision between different query shapes with same bind values
	const sortedParams = Object.keys(params).sort().map(k => `${k}=${JSON.stringify(params[k])}`).join('&');
	return `${datasetId}:${tenantId}:${sqlText}:${sortedParams}`;
}

function getCached(key: string): DatasetResponse | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
	return entry.response;
}

function setCache(key: string, response: DatasetResponse, ttlMs: number): void {
	// Evict oldest entries if at capacity
	if (cache.size >= MAX_CACHE_ENTRIES) {
		const firstKey = cache.keys().next().value;
		if (firstKey) cache.delete(firstKey);
	}
	cache.set(key, { expiresAt: Date.now() + ttlMs, response });
}

// ---------------------------------------------------------------------------
// SQL generation (Oracle dialect)
// ---------------------------------------------------------------------------

function isSafeIdent(name: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function qIdent(name: string): string {
	if (!isSafeIdent(name)) throw new Error(`oracleProvider: unsafe identifier: ${name}`);
	return `"${name}"`;
}

function buildColumnIndex(fields: DatasetFieldDef[]): Record<string, DatasetFieldType> {
	const index: Record<string, DatasetFieldType> = {};
	for (const f of fields) index[f.name] = f.type;
	return index;
}

const SAFE_OPS = new Set(['=', '!=', '<', '<=', '>', '>=', 'in', 'like']);

function exprToSql(expr: IrExpr, binds: unknown[], columns: Record<string, DatasetFieldType>): string {
	switch (expr.kind) {
		case 'col': {
			if (!columns[expr.name]) throw new Error(`oracleProvider: unknown column "${expr.name}"`);
			return qIdent(expr.name);
		}
		case 'lit': {
			binds.push(expr.value);
			return `:b${binds.length}`;
		}
		case 'and': {
			if (!expr.items.length) return '1=1';
			return `(${expr.items.map(it => exprToSql(it, binds, columns)).join(' AND ')})`;
		}
		case 'or': {
			if (!expr.items.length) return '1=0';
			return `(${expr.items.map(it => exprToSql(it, binds, columns)).join(' OR ')})`;
		}
		case 'not':
			return `(NOT ${exprToSql(expr.item, binds, columns)})`;
		case 'bin': {
			if (!SAFE_OPS.has(expr.op)) throw new Error(`oracleProvider: unsupported operator: ${expr.op}`);
			if (expr.op === 'in') {
				// IN requires col on left and literal array on right
				if (expr.right.kind !== 'lit' || !Array.isArray(expr.right.value)) {
					throw new Error('oracleProvider: IN requires a literal array on the right side');
				}
				const left = exprToSql(expr.left, binds, columns);
				const items = (expr.right.value as unknown[]).map(v => {
					binds.push(v);
					return `:b${binds.length}`;
				});
				if (!items.length) return '1=0'; // empty IN is always false
				return `(${left} IN (${items.join(', ')}))`;
			}
			const left = exprToSql(expr.left, binds, columns);
			const right = exprToSql(expr.right, binds, columns);
			return `(${left} ${expr.op} ${right})`;
		}
		case 'call':
			throw new Error(`oracleProvider: call() not supported (${expr.name})`);
	}
}

function safeSortDir(dir: string): string {
	if (dir === 'asc' || dir === 'desc') return dir.toUpperCase();
	throw new Error(`oracleProvider: invalid sort direction: ${dir}`);
}

function buildSelectSql(
	irQuery: DatasetIr & { kind: 'select' },
	entry: ProviderEntry,
	columns: Record<string, DatasetFieldType>,
): { text: string; binds: unknown[]; selectedFields: Array<{ outputName: string; sourceCol: string }> } {
	if (entry.source.kind !== 'oracle') {
		throw new Error(`oracleProvider: expected oracle source, got ${entry.source.kind}`);
	}

	const { schema, table } = entry.source;
	const binds: unknown[] = [];
	const rel = `${qIdent(schema)}.${qIdent(table)}`;

	// SELECT
	const selectParts: string[] = [];
	const selectedFields: Array<{ outputName: string; sourceCol: string }> = [];
	for (const item of irQuery.select) {
		if (item.expr.kind !== 'col') throw new Error('oracleProvider: only column select items supported');
		const colName = item.expr.name;
		if (!columns[colName]) throw new Error(`oracleProvider: unknown column "${colName}"`);
		const base = qIdent(colName);
		const alias = item.as ? qIdent(item.as) : undefined;
		selectParts.push(alias ? `${base} AS ${alias}` : base);
		selectedFields.push({ outputName: item.as ?? colName, sourceCol: colName });
	}
	if (!selectParts.length) throw new Error('oracleProvider: empty select list');

	// WHERE
	const whereSql = irQuery.where ? ` WHERE ${exprToSql(irQuery.where, binds, columns)}` : '';

	// ORDER BY
	let orderBySql = '';
	if (irQuery.orderBy?.length) {
		const parts = irQuery.orderBy.map(rule => {
			if (rule.expr.kind !== 'col') throw new Error('oracleProvider: ORDER BY supports only columns');
			if (!columns[rule.expr.name]) throw new Error(`oracleProvider: unknown ORDER BY column "${rule.expr.name}"`);
			return `${qIdent(rule.expr.name)} ${safeSortDir(rule.dir)}`;
		});
		orderBySql = ` ORDER BY ${parts.join(', ')}`;
	}

	// OFFSET/FETCH (Oracle 12c+ syntax)
	let paginationSql = '';
	if (typeof irQuery.offset === 'number' && irQuery.offset > 0) {
		binds.push(irQuery.offset);
		paginationSql += ` OFFSET :b${binds.length} ROWS`;
	}
	if (typeof irQuery.limit === 'number') {
		const limit = Math.max(0, Math.min(50_000, Math.floor(irQuery.limit)));
		binds.push(limit);
		paginationSql += ` FETCH NEXT :b${binds.length} ROWS ONLY`;
	}

	const text = `SELECT ${selectParts.join(', ')} FROM ${rel}${whereSql}${orderBySql}${paginationSql}`;
	return { text, binds, selectedFields };
}

function inferFields(
	columns: Record<string, DatasetFieldType>,
	items: Array<{ outputName: string; sourceCol: string }>,
): DatasetField[] {
	return items.map(({ outputName, sourceCol }) => ({
		name: outputName,
		type: columns[sourceCol] ?? 'unknown',
	}));
}

function serializeOrderBy(orderBy: IrOrderBy[] | undefined) {
	if (!orderBy?.length) return undefined;
	return orderBy.flatMap(rule =>
		rule.expr.kind === 'col' ? [{ field: rule.expr.name, dir: rule.dir }] : [],
	);
}

// ---------------------------------------------------------------------------
// Oracle Provider
// ---------------------------------------------------------------------------

export const oracleProvider: Provider = {
	async execute(irQuery: DatasetIr, entry: ProviderEntry, ctx: ServerContext): Promise<DatasetResponse> {
		if (irQuery.kind !== 'select') throw new Error('oracleProvider: unsupported IR kind');
		if (irQuery.from.kind !== 'dataset') throw new Error('oracleProvider: unsupported source');
		if (irQuery.groupBy?.length) throw new Error('oracleProvider: groupBy not supported');

		const datasetId = irQuery.from.id;
		const columns = buildColumnIndex(entry.fields);

		// Build SQL
		const { text, binds, selectedFields } = buildSelectSql(irQuery, entry, columns);

		// Check cache
		const ttlMs = (entry as { cache?: { ttlMs?: number } }).cache?.ttlMs ?? 0;
		if (ttlMs > 0) {
			const key = cacheKey(datasetId, text, Object.fromEntries(binds.map((v, i) => [`b${i + 1}`, v])), ctx.tenantId);
			const cached = getCached(key);
			if (cached) {
				return {
					...cached,
					meta: { ...cached.meta, cacheAgeMs: Date.now() - (cached.meta?.executedAt ? new Date(cached.meta.executedAt).getTime() : Date.now()) },
				};
			}
		}

		// Execute with timeout
		const timeoutMs = (entry as { execution?: { timeoutMs?: number } }).execution?.timeoutMs ?? 10_000;
		const oraPool = await getPool();
		let connection: oracledb.Connection | null = null;

		try {
			connection = await oraPool.getConnection();

			// Set statement timeout via callTimeout (oracledb Thin mode)
			connection.callTimeout = timeoutMs;

			const result = await connection.execute(text, binds, {
				outFormat: oracledb.OUT_FORMAT_OBJECT,
				fetchArraySize: 1000,
			});

			const rows = (result.rows ?? []) as Array<Record<string, JsonValue>>;

			const response: DatasetResponse = {
				contractVersion: CONTRACT_VERSION,
				datasetId,
				fields: inferFields(columns, selectedFields),
				rows,
				meta: {
					executedAt: new Date().toISOString(),
					tenantId: ctx.tenantId,
					sourceKind: 'oracle',
					limit: typeof irQuery.limit === 'number' ? irQuery.limit : undefined,
					offset: typeof irQuery.offset === 'number' ? irQuery.offset : undefined,
					sort: serializeOrderBy(irQuery.orderBy),
				},
			};

			// Populate cache
			if (ttlMs > 0) {
				const key = cacheKey(datasetId, text, Object.fromEntries(binds.map((v, i) => [`b${i + 1}`, v])), ctx.tenantId);
				setCache(key, response, ttlMs);
			}

			return response;
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : String(e);

			// Oracle timeout detection
			if (message.includes('NJS-123') || message.includes('DPI-1067') || message.includes('ORA-01013')) {
				const err = new Error('Oracle query timed out');
				Object.assign(err, { code: 'DATASET_TIMEOUT', retryable: true });
				throw err;
			}

			// Connection errors
			if (message.includes('NJS-500') || message.includes('NJS-521') || message.includes('ORA-12541') || message.includes('ORA-12514')) {
				const err = new Error('Oracle connection failed');
				Object.assign(err, { code: 'DATASET_CONNECTION_ERROR', retryable: true });
				throw err;
			}

			// Sanitize: never forward raw Oracle exception beyond provider boundary
			console.error('[oracleProvider] execution error:', message);
			const sanitized = new Error('Oracle query failed');
			Object.assign(sanitized, { code: 'DATASET_EXECUTION_FAILED', retryable: false });
			throw sanitized;
		} finally {
			if (connection) {
				try { await connection.close(); } catch { /* ignore close errors */ }
			}
		}
	},
};
