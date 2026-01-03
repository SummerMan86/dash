import type { DatasetField, DatasetResponse, JsonValue } from '$entities/dataset';
import type { DatasetIr, IrExpr, IrOrderBy, IrSelectItem } from '$entities/dataset';
import type { Provider, ServerContext } from '$entities/dataset';
import { CONTRACT_VERSION } from '$entities/dataset';

import { getPgPool } from '$lib/server/db/pg';

type ColumnType = DatasetField['type'];

type DatasetSqlMapping = {
	relation: { schema: string; table: string };
	columns: Record<string, ColumnType>;
};

const DATASETS: Record<string, DatasetSqlMapping> = {
	'wildberries.fact_product_office_day': {
		relation: { schema: 'mart', table: 'fact_product_office_day' },
		columns: {
			nm_id: 'number',
			chrt_id: 'number',
			office_id: 'number',
			dt: 'date',
			loaded_at: 'datetime',
			size_name: 'string',
			office_name: 'string',
			region_name: 'string',
			stock_count: 'number',
			stock_sum: 'number',
			buyout_count: 'number',
			buyout_sum: 'number',
			buyout_percent: 'number',
			sale_rate_days: 'number',
			avg_stock_turnover_days: 'number',
			to_client_count: 'number',
			from_client_count: 'number'
		}
	}
};

function isSafeIdent(name: string): boolean {
	// Conservative SQL identifier rule: letters/underscore, then letters/numbers/underscore.
	// We use this for schema/table/column/alias names.
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function qIdent(name: string): string {
	if (!isSafeIdent(name)) throw new Error(`postgresProvider: unsafe identifier: ${name}`);
	return `"${name}"`;
}

function colTypeFor(mapping: DatasetSqlMapping, colName: string): ColumnType {
	const t = mapping.columns[colName];
	if (!t) throw new Error(`postgresProvider: unknown column "${colName}" for dataset`);
	return t;
}

class SqlBuilder {
	values: unknown[] = [];
	addParam(value: unknown): string {
		this.values.push(value);
		return `$${this.values.length}`;
	}
}

function castParam(param: string, colType: ColumnType): string {
	// Only cast where it matters for Postgres operators.
	switch (colType) {
		case 'date':
			return `${param}::date`;
		case 'datetime':
			return `${param}::timestamptz`;
		default:
			return param;
	}
}

function exprToSql(expr: IrExpr, b: SqlBuilder, mapping: DatasetSqlMapping): string {
	switch (expr.kind) {
		case 'col': {
			if (!mapping.columns[expr.name]) throw new Error(`postgresProvider: unknown column "${expr.name}"`);
			return qIdent(expr.name);
		}
		case 'lit': {
			// Values are always parameterized.
			return b.addParam(expr.value);
		}
		case 'and': {
			if (!expr.items.length) return 'TRUE';
			return `(${expr.items.map((it) => exprToSql(it, b, mapping)).join(' AND ')})`;
		}
		case 'or': {
			if (!expr.items.length) return 'FALSE';
			return `(${expr.items.map((it) => exprToSql(it, b, mapping)).join(' OR ')})`;
		}
		case 'not': {
			return `(NOT ${exprToSql(expr.item, b, mapping)})`;
		}
		case 'bin': {
			// Special handling for comparisons so we can cast params based on column type.
			if (expr.left.kind === 'col' && expr.right.kind === 'lit') {
				const t = colTypeFor(mapping, expr.left.name);
				const left = exprToSql(expr.left, b, mapping);
				const rawParam = b.addParam(expr.right.value);
				const right = castParam(rawParam, t);
				if (expr.op === 'in') {
					// MVP: allow `col IN (array)` via `= ANY($n)` if caller passed an array literal.
					// Note: IR type doesn't declare arrays, but we accept them at runtime for flexibility.
					if (!Array.isArray(expr.right.value as unknown)) {
						throw new Error(`postgresProvider: IN requires array literal on the right side`);
					}
					return `(${left} = ANY(${rawParam}))`;
				}
				return `(${left} ${expr.op} ${right})`;
			}

			if (expr.op === 'in') {
				// We only support `col IN (arrayLiteral)` in MVP.
				throw new Error(`postgresProvider: IN is only supported as col IN (arrayLiteral)`);
			}

			const left = exprToSql(expr.left, b, mapping);
			const right = exprToSql(expr.right, b, mapping);
			return `(${left} ${expr.op} ${right})`;
		}
		case 'call': {
			// MVP: keep providers simple; definitions for MVP should avoid aggregations.
			throw new Error(`postgresProvider: call() not supported in MVP (${expr.name})`);
		}
	}
}

function selectItemSql(item: IrSelectItem, b: SqlBuilder, mapping: DatasetSqlMapping): { sql: string; name?: string } {
	// MVP restriction: select items should be simple columns (optional alias).
	if (item.expr.kind !== 'col') throw new Error(`postgresProvider: only column select items supported in MVP`);

	const colName = item.expr.name;
	if (!mapping.columns[colName]) throw new Error(`postgresProvider: unknown column "${colName}"`);

	const base = qIdent(colName);
	const as = item.as ? qIdent(item.as) : undefined;
	return { sql: as ? `${base} AS ${as}` : base, name: item.as ?? colName };
}

function orderBySql(orderBy: IrOrderBy[] | undefined, b: SqlBuilder, mapping: DatasetSqlMapping): string {
	if (!orderBy?.length) return '';
	const parts = orderBy.map((rule) => {
		if (rule.expr.kind !== 'col') throw new Error(`postgresProvider: ORDER BY supports only columns in MVP`);
		if (!mapping.columns[rule.expr.name]) throw new Error(`postgresProvider: unknown ORDER BY column "${rule.expr.name}"`);
		return `${qIdent(rule.expr.name)} ${rule.dir.toUpperCase()}`;
	});
	return ` ORDER BY ${parts.join(', ')}`;
}

function inferFields(
	mapping: DatasetSqlMapping,
	items: Array<{ outputName: string; sourceCol: string }>
): DatasetField[] {
	return items.map(({ outputName, sourceCol }) => ({
		name: outputName,
		type: mapping.columns[sourceCol] ?? 'unknown'
	}));
}

export const postgresProvider: Provider = {
	async execute(irQuery: DatasetIr, ctx: ServerContext): Promise<DatasetResponse> {
		if (irQuery.kind !== 'select') throw new Error(`postgresProvider: unsupported IR kind`);
		if (irQuery.from.kind !== 'dataset') throw new Error(`postgresProvider: unsupported source`);

		const datasetId = irQuery.from.id;
		const mapping = DATASETS[datasetId];
		if (!mapping) throw new Error(`postgresProvider: no SQL mapping for datasetId "${datasetId}"`);

		if (irQuery.groupBy?.length) throw new Error(`postgresProvider: groupBy not supported in MVP`);

		const b = new SqlBuilder();

		const rel = `${qIdent(mapping.relation.schema)}.${qIdent(mapping.relation.table)}`;
		const selectParts: string[] = [];
		const selectedFields: Array<{ outputName: string; sourceCol: string }> = [];
		for (const item of irQuery.select) {
			const { sql, name } = selectItemSql(item, b, mapping);
			selectParts.push(sql);
			if (item.expr.kind === 'col' && name) {
				selectedFields.push({ outputName: name, sourceCol: item.expr.name });
			}
		}
		if (!selectParts.length) throw new Error(`postgresProvider: empty select list`);

		const whereSql = irQuery.where ? ` WHERE ${exprToSql(irQuery.where, b, mapping)}` : '';
		const orderBy = orderBySql(irQuery.orderBy, b, mapping);

		let limitSql = '';
		if (typeof irQuery.limit === 'number') {
			const limit = Math.max(0, Math.min(50_000, Math.floor(irQuery.limit)));
			const p = b.addParam(limit);
			limitSql = ` LIMIT ${p}`;
		}

		const text = `SELECT ${selectParts.join(', ')} FROM ${rel}${whereSql}${orderBy}${limitSql}`;

		const pool = getPgPool();
		const res = await pool.query(text, b.values);

		// pg returns `unknown` values. DatasetResponse requires JsonValue, so we pass through
		// primitives and JSON-serializable values as-is (SvelteKit will JSON.stringify).
		const rows = res.rows as Array<Record<string, JsonValue>>;

		return {
			contractVersion: CONTRACT_VERSION,
			datasetId,
			fields: inferFields(mapping, selectedFields),
			rows,
			meta: {
				executedAt: new Date().toISOString(),
				tenantId: ctx.tenantId,
				source: 'postgres'
			}
		};
	}
};

