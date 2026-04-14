/**
 * Shared utilities for dataset providers.
 *
 * Safety-critical: isSafeIdent/qIdent are the single source of truth
 * for SQL identifier validation across all providers (postgres, oracle, clickhouse).
 */
import type { DatasetField, DatasetFieldType } from '../../model';
import type { IrOrderBy } from '../../model';
import type { DatasetFieldDef } from '../../model';

// ---------------------------------------------------------------------------
// SQL identifier safety
// ---------------------------------------------------------------------------

/** Conservative SQL identifier rule: letter/underscore start, then alphanumeric/underscore. */
export function isSafeIdent(name: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

/** Quote a SQL identifier after validating it. Throws on unsafe names. */
export function qIdent(name: string, providerName: string): string {
	if (!isSafeIdent(name)) throw new Error(`${providerName}: unsafe identifier: ${name}`);
	return `"${name}"`;
}

/** Validate and normalise ORDER BY direction. */
export function safeSortDir(dir: string, providerName: string): string {
	if (dir === 'asc' || dir === 'desc') return dir.toUpperCase();
	throw new Error(`${providerName}: invalid sort direction: ${dir}`);
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

/** Build a column-name → field-type index from registry entry fields. */
export function buildColumnIndex(fields: DatasetFieldDef[]): Record<string, DatasetFieldType> {
	const index: Record<string, DatasetFieldType> = {};
	for (const f of fields) index[f.name] = f.type;
	return index;
}

/** Infer DatasetField[] from selected columns. */
export function inferFields(
	columns: Record<string, DatasetFieldType>,
	items: Array<{ outputName: string; sourceCol: string }>,
): DatasetField[] {
	return items.map(({ outputName, sourceCol }) => ({
		name: outputName,
		type: columns[sourceCol] ?? 'unknown',
	}));
}

/** Serialise IrOrderBy[] to a JSON-friendly shape for DatasetResponse.meta.sort. */
export function serializeOrderBy(orderBy: IrOrderBy[] | undefined) {
	if (!orderBy?.length) return undefined;
	return orderBy.flatMap(rule =>
		rule.expr.kind === 'col' ? [{ field: rule.expr.name, dir: rule.dir }] : [],
	);
}
