/**
 * Relational IR (Intermediate Representation).
 *
 * What this is:
 * - A small typed AST that describes "a query we want to run".
 *
 * What this is NOT:
 * - SQL text
 * - ECharts options
 * - A specific database driver
 *
 * Why it exists:
 * - Dataset definitions can compile DatasetQuery -> IR (pure, testable).
 * - Providers can execute IR on Oracle/Postgres/Cube/mock (swappable adapters).
 *
 * Rule of thumb:
 * - entities/* can depend on IR
 * - server/providers can interpret IR
 * - UI should never import IR directly (UI talks DatasetQuery/DatasetResponse).
 */
import type { DatasetId } from './contract';

export type IrValue = string | number | boolean | null;

export type IrExpr =
	| { kind: 'col'; name: string }
	| { kind: 'lit'; value: IrValue }
	| { kind: 'and'; items: IrExpr[] }
	| { kind: 'or'; items: IrExpr[] }
	| { kind: 'not'; item: IrExpr }
	| {
			kind: 'bin';
			op: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'in';
			left: IrExpr;
			right: IrExpr;
	  }
	| { kind: 'call'; name: 'sum' | 'count' | 'avg' | 'min' | 'max'; args: IrExpr[] };

export type IrSelectItem = { expr: IrExpr; as?: string };

export type IrOrderBy = { expr: IrExpr; dir: 'asc' | 'desc' };

export type DatasetSource = { kind: 'dataset'; id: DatasetId };

export type SelectIr = {
	kind: 'select';
	from: DatasetSource;
	select: IrSelectItem[];
	where?: IrExpr;
	groupBy?: IrExpr[];
	orderBy?: IrOrderBy[];
	limit?: number;
};

export type DatasetIr = SelectIr;

/**
 * Tiny helper factory for building IR nodes.
 * Keeps dataset definitions readable (less object literal noise).
 */
export const ir = {
	col(name: string): IrExpr {
		return { kind: 'col', name };
	},
	lit(value: IrValue): IrExpr {
		return { kind: 'lit', value };
	},
	and(items: IrExpr[]): IrExpr {
		return { kind: 'and', items };
	},
	or(items: IrExpr[]): IrExpr {
		return { kind: 'or', items };
	},
	not(item: IrExpr): IrExpr {
		return { kind: 'not', item };
	},
	eq(left: IrExpr, right: IrExpr): IrExpr {
		return { kind: 'bin', op: '=', left, right };
	},
	gte(left: IrExpr, right: IrExpr): IrExpr {
		return { kind: 'bin', op: '>=', left, right };
	},
	lte(left: IrExpr, right: IrExpr): IrExpr {
		return { kind: 'bin', op: '<=', left, right };
	},
	inList(left: IrExpr, right: IrExpr): IrExpr {
		return { kind: 'bin', op: 'in', left, right };
	},
	call(name: 'sum' | 'count' | 'avg' | 'min' | 'max', args: IrExpr[]) {
		return { kind: 'call', name, args } as const;
	}
};


