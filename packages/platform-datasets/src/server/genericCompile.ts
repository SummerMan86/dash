/**
 * Generic compiler for declarative dataset definitions.
 *
 * Takes a registry entry with queryBindings and produces SelectIr
 * from typed params. No custom compile function needed.
 *
 * Canonical reference: docs/architecture_dashboard_bi_target.md §1
 */
import type { SelectIr, IrExpr, IrValue } from '../model';
import type { DatasetFieldDef, DatasetFilterBinding } from '../model';
import { ir } from '../model';

type GenericCompileEntry = {
	datasetId: string;
	fields: DatasetFieldDef[];
	queryBindings?: {
		filters?: DatasetFilterBinding[];
	};
};

/**
 * Generic compile: produces SelectIr from entry metadata + typed params.
 *
 * - Selects all visible (non-hidden) fields by default
 * - Applies WHERE only from explicit queryBindings.filters
 * - Applies ORDER BY, LIMIT, OFFSET from standard params
 * - Rejects unknown sort fields
 * - Stays inside the read-model SelectIr contract
 */
export function genericCompile(
	entry: GenericCompileEntry,
	typedParams: Record<string, unknown>,
): SelectIr {
	const datasetId = entry.datasetId;

	// SELECT: all visible fields
	const select = entry.fields
		.filter((f) => !f.hidden)
		.map((f) => ({ expr: ir.col(f.name) }));

	// WHERE: from queryBindings.filters
	const whereParts: IrExpr[] = [];
	if (entry.queryBindings?.filters) {
		for (const binding of entry.queryBindings.filters) {
			const value = typedParams[binding.param];
			if (value === null || value === undefined || value === '') continue;
			if (Array.isArray(value) && value.length === 0) continue;

			switch (binding.op) {
				case 'eq':
					whereParts.push(ir.eq(ir.col(binding.field), ir.lit(value as string | number | boolean)));
					break;
				case 'gte':
					whereParts.push(ir.gte(ir.col(binding.field), ir.lit(value as string | number)));
					break;
				case 'lte':
					whereParts.push(ir.lte(ir.col(binding.field), ir.lit(value as string | number)));
					break;
				case 'in':
					if (Array.isArray(value)) {
						whereParts.push(ir.inList(ir.col(binding.field), ir.lit(value as IrValue[])));
					}
					break;
				case 'like':
					whereParts.push({
						kind: 'bin',
						op: 'like',
						left: ir.col(binding.field),
						right: ir.lit(`%${String(value)}%`),
					});
					break;
			}
		}
	}

	// ORDER BY: from standard sortBy/sortDir params
	let orderBy: SelectIr['orderBy'];
	const sortBy = typedParams.sortBy;
	if (typeof sortBy === 'string') {
		// Validate: sortBy must reference a sortable field
		const sortField = entry.fields.find((f) => f.name === sortBy && f.sortable);
		if (!sortField) {
			throw new Error(`genericCompile: unknown or non-sortable field: ${sortBy}`);
		}
		const sortDir = typedParams.sortDir === 'desc' ? 'desc' : 'asc';
		orderBy = [{ expr: ir.col(sortBy), dir: sortDir }];
	}

	// LIMIT / OFFSET: from standard params
	const limit = typeof typedParams.limit === 'number' ? typedParams.limit : undefined;
	const offset = typeof typedParams.offset === 'number' ? typedParams.offset : undefined;

	return {
		kind: 'select',
		from: { kind: 'dataset', id: datasetId },
		select,
		where: whereParts.length ? ir.and(whereParts) : undefined,
		orderBy,
		limit,
		offset,
	};
}
