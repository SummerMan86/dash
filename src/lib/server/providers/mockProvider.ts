import type { DatasetResponse, JsonValue } from '$entities/dataset';
import type { DatasetIr, IrExpr, IrOrderBy, IrSelectItem } from '$entities/dataset';
import type { Provider, ServerContext } from '$entities/dataset';
import { CONTRACT_VERSION } from '$entities/dataset';

import { kpiSummary, mccSummary, timeseriesDaily, topClients } from '$shared/fixtures/paymentAnalytics';

type Row = Record<string, JsonValue>;

/**
 * Mock provider.
 *
 * This is a Provider adapter that executes IR *in memory* on fixture arrays.
 *
 * Why it exists:
 * - lets you wire the full request path (UI -> BFF -> compile -> execute) without a DB
 * - makes it easy for newcomers to understand the architecture end-to-end
 *
 * Limitations (MVP):
 * - supports only a subset of IR (no groupBy, no aggregations)
 * - intended for demos/tests, not production
 */
function isTruthy(value: unknown): boolean {
	// Intentionally avoid `Boolean(value)` to satisfy `no-extra-boolean-cast`.
	return value ? true : false;
}

function isComparablePrimitive(value: unknown): value is string | number {
	return typeof value === 'string' || typeof value === 'number';
}

function compareUnknown(a: unknown, b: unknown): number {
	if (a === b) return 0;
	if (typeof a === 'number' && typeof b === 'number') return a > b ? 1 : -1;
	if (typeof a === 'string' && typeof b === 'string') return a > b ? 1 : -1;
	// Fallback for mixed/other types: compare stringified values.
	const as = String(a);
	const bs = String(b);
	return as === bs ? 0 : as > bs ? 1 : -1;
}

function datasetRows(datasetId: string): Row[] {
	// Map datasetId -> fixture array.
	// In real providers, datasetId maps to SQL/Cube query definitions.
	switch (datasetId) {
		case 'payment.kpi':
			return kpiSummary as unknown as Row[];
		case 'payment.timeseriesDaily':
			return timeseriesDaily as unknown as Row[];
		case 'payment.topClients':
			return topClients as unknown as Row[];
		case 'payment.mccSummary':
			return mccSummary as unknown as Row[];
		default:
			return [];
	}
}

function evalExpr(expr: IrExpr, row: Row): unknown {
	// Evaluate a single expression against a single row.
	// This is effectively a tiny interpreter for the IR expression subset.
	switch (expr.kind) {
		case 'col':
			return row[expr.name];
		case 'lit':
			return expr.value;
		case 'and':
			return expr.items.every((it) => isTruthy(evalExpr(it, row)));
		case 'or':
			return expr.items.some((it) => isTruthy(evalExpr(it, row)));
		case 'not':
			return !isTruthy(evalExpr(expr.item, row));
		case 'bin': {
			const l = evalExpr(expr.left, row);
			const r = evalExpr(expr.right, row);
			switch (expr.op) {
				case '=':
					return l === r;
				case '!=':
					return l !== r;
				case '<':
					return isComparablePrimitive(l) && isComparablePrimitive(r) ? l < r : false;
				case '<=':
					return isComparablePrimitive(l) && isComparablePrimitive(r) ? l <= r : false;
				case '>':
					return isComparablePrimitive(l) && isComparablePrimitive(r) ? l > r : false;
				case '>=':
					return isComparablePrimitive(l) && isComparablePrimitive(r) ? l >= r : false;
				case 'in':
					return Array.isArray(r) ? r.includes(l as never) : false;
				default:
					return false;
			}
		}
		case 'call': {
			// MVP: no aggregation execution in mockProvider yet.
			// Definitions in MVP avoid `call`/groupBy; future providers can implement properly.
			throw new Error(`mockProvider: call() not supported (${expr.name})`);
		}
	}
}

function project(select: IrSelectItem[], row: Row): Row {
	// Convert a source row into an output row using the SELECT list.
	const out: Row = {};
	for (const item of select) {
		const v = evalExpr(item.expr, row) as JsonValue;
		const key = item.as ?? (item.expr.kind === 'col' ? item.expr.name : undefined);
		if (!key) continue;
		out[key] = v;
	}
	return out;
}

function compareOrder(orderBy: IrOrderBy[] | undefined, a: Row, b: Row): number {
	// ORDER BY comparator.
	if (!orderBy?.length) return 0;
	for (const rule of orderBy) {
		const av = evalExpr(rule.expr, a);
		const bv = evalExpr(rule.expr, b);
		const cmp = compareUnknown(av, bv);
		if (cmp === 0) continue;
		const dir = rule.dir === 'asc' ? 1 : -1;
		return cmp * dir;
	}
	return 0;
}

function inferFields(rows: Row[]) {
	// Very naive schema inference for demos.
	const sample = rows[0] ?? {};
	return Object.keys(sample).map((name) => ({ name, type: 'unknown' as const }));
}

export const mockProvider: Provider = {
	async execute(irQuery: DatasetIr, ctx: ServerContext): Promise<DatasetResponse> {
		// The execute method is what the BFF calls after compiling DatasetQuery -> IR.
		if (irQuery.kind !== 'select') throw new Error(`mockProvider: unsupported IR kind`);
		if (irQuery.from.kind !== 'dataset') throw new Error(`mockProvider: unsupported source`);

		const datasetId = irQuery.from.id;
		let rows = datasetRows(datasetId);

		if (irQuery.where) rows = rows.filter((r) => isTruthy(evalExpr(irQuery.where as IrExpr, r)));

		if (irQuery.orderBy?.length) rows = [...rows].sort((a, b) => compareOrder(irQuery.orderBy, a, b));

		if (typeof irQuery.limit === 'number') rows = rows.slice(0, Math.max(0, irQuery.limit));

		const projected = rows.map((r) => project(irQuery.select, r));

		return {
			contractVersion: CONTRACT_VERSION,
			datasetId,
			fields: inferFields(projected),
			rows: projected,
			meta: {
				executedAt: new Date().toISOString(),
				tenantId: ctx.tenantId,
				source: 'mock'
			}
		};
	}
};


