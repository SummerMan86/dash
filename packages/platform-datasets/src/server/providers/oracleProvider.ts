/**
 * Oracle Provider — first real-time non-Postgres backend.
 *
 * Uses node-oracledb Thin mode (no Instant Client needed).
 * Lazy pool initialization on first use.
 * Timeout + best-effort statement cancellation.
 *
 * Canonical reference: docs/architecture_dashboard_bi.md §7
 */
import oracledb from 'oracledb';
import type { DatasetFieldType, DatasetResponse, JsonValue } from '../../model';
import type { DatasetIr, IrExpr } from '../../model';
import type { Provider, ProviderEntry, ServerContext } from '../../model';
import { CONTRACT_VERSION } from '../../model';
import { qIdent, safeSortDir, buildColumnIndex, inferFields, serializeOrderBy } from './shared';

const PROVIDER = 'oracleProvider';

// ---------------------------------------------------------------------------
// Pool lifecycle — lazy init, graceful shutdown
// ---------------------------------------------------------------------------

// Multi-connection pool management: one pool per connectionName.
// Env vars: ORACLE_{NAME}_USER, ORACLE_{NAME}_PASSWORD, ORACLE_{NAME}_CONNECT_STRING
// Fallback for default/first connection: ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING
const pools = new Map<string, oracledb.Pool>();
const poolPromises = new Map<string, Promise<oracledb.Pool>>();

function getOracleConfig(connectionName: string) {
	const prefix = `ORACLE_${connectionName.toUpperCase()}_`;
	const user = process.env[`${prefix}USER`] ?? process.env.ORACLE_USER;
	const password = process.env[`${prefix}PASSWORD`] ?? process.env.ORACLE_PASSWORD;
	const connectString = process.env[`${prefix}CONNECT_STRING`] ?? process.env.ORACLE_CONNECT_STRING;
	if (!user || !password || !connectString) {
		throw new Error(`${PROVIDER}: Oracle connection '${connectionName}' not configured`);
	}
	return { user, password, connectString };
}

async function getPool(connectionName: string): Promise<oracledb.Pool> {
	const existing = pools.get(connectionName);
	if (existing) return existing;
	const pending = poolPromises.get(connectionName);
	if (pending) return pending;
	const promise = (async () => {
		const config = getOracleConfig(connectionName);
		const pool = await oracledb.createPool({
			...config,
			poolMin: 1,
			poolMax: 4,
			poolIncrement: 1,
		});
		pools.set(connectionName, pool);
		return pool;
	})();
	promise.catch(() => { poolPromises.delete(connectionName); });
	poolPromises.set(connectionName, promise);
	return promise;
}

// Graceful shutdown — close all pools
let shutdownRegistered = false;
if (typeof process !== 'undefined' && !shutdownRegistered) {
	shutdownRegistered = true;
	const shutdown = async () => {
		for (const pool of pools.values()) {
			try { await pool.close(0); } catch { /* ignore */ }
		}
		pools.clear();
		poolPromises.clear();
	};
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

// ---------------------------------------------------------------------------
// SQL generation (Oracle dialect)
// ---------------------------------------------------------------------------

const SAFE_OPS = new Set(['=', '!=', '<', '<=', '>', '>=', 'in', 'like']);

function exprToSql(expr: IrExpr, binds: unknown[], columns: Record<string, DatasetFieldType>): string {
	switch (expr.kind) {
		case 'col': {
			if (!(expr.name in columns)) throw new Error(`${PROVIDER}: unknown column "${expr.name}"`);
			return qIdent(expr.name, PROVIDER);
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
			if (!SAFE_OPS.has(expr.op)) throw new Error(`${PROVIDER}: unsupported operator: ${expr.op}`);
			if (expr.op === 'in') {
				// IN requires col on left and literal array on right
				if (expr.right.kind !== 'lit' || !Array.isArray(expr.right.value)) {
					throw new Error(`${PROVIDER}: IN requires a literal array on the right side`);
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
	}
}

function buildSelectSql(
	irQuery: DatasetIr & { kind: 'select' },
	entry: ProviderEntry,
	columns: Record<string, DatasetFieldType>,
): { text: string; binds: unknown[]; selectedFields: Array<{ outputName: string; sourceCol: string }> } {
	if (entry.source.kind !== 'oracle') {
		throw new Error(`${PROVIDER}: expected oracle source, got ${entry.source.kind}`);
	}

	const { schema, table } = entry.source;
	const binds: unknown[] = [];
	const rel = `${qIdent(schema, PROVIDER)}.${qIdent(table, PROVIDER)}`;

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
	const whereSql = irQuery.where ? ` WHERE ${exprToSql(irQuery.where, binds, columns)}` : '';

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

// ---------------------------------------------------------------------------
// Oracle Provider
// ---------------------------------------------------------------------------

export const oracleProvider: Provider = {
	async execute(irQuery: DatasetIr, entry: ProviderEntry, ctx: ServerContext): Promise<DatasetResponse> {
		if (irQuery.kind !== 'select') throw new Error(`${PROVIDER}: unsupported IR kind`);
		if (irQuery.from.kind !== 'dataset') throw new Error(`${PROVIDER}: unsupported source`);

		const datasetId = irQuery.from.id;
		const columns = buildColumnIndex(entry.fields);

		// Build SQL
		const { text, binds, selectedFields } = buildSelectSql(irQuery, entry, columns);

		// Execution hints
		const timeoutMs = entry.execution?.timeoutMs ?? 10_000;

		if (entry.source.kind !== 'oracle') throw new Error(`${PROVIDER}: expected oracle source`);
		const connectionName = entry.source.connectionName;
		const oraPool = await getPool(connectionName);
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

			return {
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
