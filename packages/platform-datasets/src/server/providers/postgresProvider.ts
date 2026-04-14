import type { DatasetFieldType, DatasetResponse, JsonValue } from '../../model';
import type { DatasetIr, IrExpr, IrOrderBy, IrSelectItem } from '../../model';
import type { Provider, ProviderEntry, ServerContext } from '../../model';
import { CONTRACT_VERSION } from '../../model';
import { qIdent, safeSortDir, buildColumnIndex, inferFields, serializeOrderBy } from './shared';

import pg from 'pg';
import { getPgPool } from '@dashboard-builder/db';

// pg returns bigint (OID 20) and numeric (OID 1700) as strings by default to avoid precision loss.
// Our dashboard metrics fit safely in JS number (< 2^53), so parse them as float.
pg.types.setTypeParser(20, (val: string) => parseFloat(val));
pg.types.setTypeParser(1700, (val: string) => parseFloat(val));

const PROVIDER = 'postgresProvider';

function colTypeFor(columns: Record<string, DatasetFieldType>, colName: string): DatasetFieldType {
	const t = columns[colName];
	if (!t) throw new Error(`${PROVIDER}: unknown column "${colName}" for dataset`);
	return t;
}

class SqlBuilder {
	values: unknown[] = [];
	addParam(value: unknown): string {
		this.values.push(value);
		return `$${this.values.length}`;
	}
}

function castParam(param: string, colType: DatasetFieldType): string {
	switch (colType) {
		case 'date':
			return `${param}::date`;
		case 'datetime':
			return `${param}::timestamptz`;
		default:
			return param;
	}
}

const SAFE_OPS = new Set(['=', '!=', '<', '<=', '>', '>=', 'in', 'like']);

function exprToSql(expr: IrExpr, b: SqlBuilder, columns: Record<string, DatasetFieldType>): string {
	switch (expr.kind) {
		case 'col': {
			if (!columns[expr.name])
				throw new Error(`${PROVIDER}: unknown column "${expr.name}"`);
			return qIdent(expr.name, PROVIDER);
		}
		case 'lit': {
			return b.addParam(expr.value);
		}
		case 'and': {
			if (!expr.items.length) return 'TRUE';
			return `(${expr.items.map((it) => exprToSql(it, b, columns)).join(' AND ')})`;
		}
		case 'or': {
			if (!expr.items.length) return 'FALSE';
			return `(${expr.items.map((it) => exprToSql(it, b, columns)).join(' OR ')})`;
		}
		case 'not': {
			return `(NOT ${exprToSql(expr.item, b, columns)})`;
		}
		case 'bin': {
			if (!SAFE_OPS.has(expr.op)) {
				throw new Error(`${PROVIDER}: unsupported operator: ${expr.op}`);
			}

			if (expr.left.kind === 'col' && expr.right.kind === 'lit') {
				if (expr.op === 'in') {
					if (!Array.isArray(expr.right.value)) {
						throw new Error(`${PROVIDER}: IN requires array literal on the right side`);
					}
					const left = exprToSql(expr.left, b, columns);
					const rawParam = b.addParam(expr.right.value);
					return `(${left} = ANY(${rawParam}))`;
				}
				const t = colTypeFor(columns, expr.left.name);
				const left = exprToSql(expr.left, b, columns);
				const rawParam = b.addParam(expr.right.value);
				const right = castParam(rawParam, t);
				return `(${left} ${expr.op} ${right})`;
			}

			if (expr.op === 'in') {
				throw new Error(`${PROVIDER}: IN is only supported as col IN (arrayLiteral)`);
			}

			const left = exprToSql(expr.left, b, columns);
			const right = exprToSql(expr.right, b, columns);
			return `(${left} ${expr.op} ${right})`;
		}
	}
}

function selectItemSql(
	item: IrSelectItem,
	_b: SqlBuilder,
	columns: Record<string, DatasetFieldType>,
): { sql: string; name?: string } {
	if (item.expr.kind !== 'col')
		throw new Error(`${PROVIDER}: only column select items supported in MVP`);

	const colName = item.expr.name;
	if (!columns[colName]) throw new Error(`${PROVIDER}: unknown column "${colName}"`);

	const base = qIdent(colName, PROVIDER);
	const as = item.as ? qIdent(item.as, PROVIDER) : undefined;
	return { sql: as ? `${base} AS ${as}` : base, name: item.as ?? colName };
}

function orderBySql(
	orderBy: IrOrderBy[] | undefined,
	_b: SqlBuilder,
	columns: Record<string, DatasetFieldType>,
): string {
	if (!orderBy?.length) return '';
	const parts = orderBy.map((rule) => {
		if (rule.expr.kind !== 'col')
			throw new Error(`${PROVIDER}: ORDER BY supports only columns in MVP`);
		if (!columns[rule.expr.name])
			throw new Error(`${PROVIDER}: unknown ORDER BY column "${rule.expr.name}"`);
		return `${qIdent(rule.expr.name, PROVIDER)} ${safeSortDir(rule.dir, PROVIDER)}`;
	});
	return ` ORDER BY ${parts.join(', ')}`;
}

export const postgresProvider: Provider = {
	async execute(irQuery: DatasetIr, entry: ProviderEntry, ctx: ServerContext): Promise<DatasetResponse> {
		if (irQuery.kind !== 'select') throw new Error(`${PROVIDER}: unsupported IR kind`);
		if (irQuery.from.kind !== 'dataset') throw new Error(`${PROVIDER}: unsupported source`);

		if (entry.source.kind !== 'postgres') {
			throw new Error(`${PROVIDER}: expected postgres source, got ${entry.source.kind}`);
		}

		const datasetId = irQuery.from.id;

		// Use registry-owned metadata
		const columns = buildColumnIndex(entry.fields);
		const { schema, table } = entry.source;

		const b = new SqlBuilder();
		const rel = `${qIdent(schema, PROVIDER)}.${qIdent(table, PROVIDER)}`;
		const selectParts: string[] = [];
		const selectedFields: Array<{ outputName: string; sourceCol: string }> = [];
		for (const item of irQuery.select) {
			const { sql, name } = selectItemSql(item, b, columns);
			selectParts.push(sql);
			if (item.expr.kind === 'col' && name) {
				selectedFields.push({ outputName: name, sourceCol: item.expr.name });
			}
		}
		if (!selectParts.length) throw new Error(`${PROVIDER}: empty select list`);

		const whereSql = irQuery.where ? ` WHERE ${exprToSql(irQuery.where, b, columns)}` : '';
		const orderBy = orderBySql(irQuery.orderBy, b, columns);

		let limitSql = '';
		if (typeof irQuery.limit === 'number') {
			const limit = Math.max(0, Math.min(50_000, Math.floor(irQuery.limit)));
			const p = b.addParam(limit);
			limitSql = ` LIMIT ${p}`;
		}

		let offsetSql = '';
		if (typeof irQuery.offset === 'number' && irQuery.offset > 0) {
			const offset = Math.max(0, Math.floor(irQuery.offset));
			const p = b.addParam(offset);
			offsetSql = ` OFFSET ${p}`;
		}

		const text = `SELECT ${selectParts.join(', ')} FROM ${rel}${whereSql}${orderBy}${limitSql}${offsetSql}`;

		const pool = getPgPool();
		const res = await pool.query(text, b.values);

		const rawRows = res.rows as Array<Record<string, JsonValue>>;

		return {
			contractVersion: CONTRACT_VERSION,
			datasetId,
			fields: inferFields(columns, selectedFields),
			rows: rawRows,
			meta: {
				executedAt: new Date().toISOString(),
				tenantId: ctx.tenantId,
				source: 'postgres', // deprecated — kept for backward compat; new providers should set sourceKind only
				sourceKind: 'postgres',
				limit: typeof irQuery.limit === 'number' ? irQuery.limit : undefined,
				offset: typeof irQuery.offset === 'number' ? irQuery.offset : undefined,
				sort: serializeOrderBy(irQuery.orderBy),
			},
		};
	},
};
