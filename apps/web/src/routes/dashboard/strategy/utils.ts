import type { JsonValue } from '$entities/dataset';

export type StrategyRow = Record<string, JsonValue>;
export type SortDir = 'asc' | 'desc';
export type StrategyEntityPresentation = {
	primaryLabel: string;
	secondaryLabel: string | null;
	sourceLabel: string | null;
	sortLabel: string;
};

const GENERIC_DOCUMENT_ENTITY_PATTERN = /^(таблица|рисунок|схема|приложение)\b/i;

export function asString(value: JsonValue | undefined): string | null {
	return typeof value === 'string' && value.trim() ? value : null;
}

export function asNumber(value: JsonValue | undefined): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
		return Number(value);
	}
	return null;
}

export function asBoolean(value: JsonValue | undefined): boolean | null {
	if (typeof value === 'boolean') return value;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return null;
}

export function isGenericDocumentEntityName(value: string | null | undefined): boolean {
	return typeof value === 'string' && GENERIC_DOCUMENT_ENTITY_PATTERN.test(value.trim());
}

export function presentStrategyEntity({
	entityName,
	entitySemantics,
	fallbackLabel,
	factName
}: {
	entityName: string | null;
	entitySemantics?: string | null;
	fallbackLabel?: string | null;
	factName?: string | null;
}): StrategyEntityPresentation {
	const normalizedName = entityName?.trim() || fallbackLabel?.trim() || '—';
	const normalizedSemantics = entitySemantics?.trim() || null;
	const normalizedFactName = factName?.trim() || null;

	if (isGenericDocumentEntityName(entityName) && normalizedFactName) {
		return {
			primaryLabel: normalizedFactName,
			secondaryLabel: normalizedSemantics,
			sourceLabel: normalizedName,
			sortLabel: normalizedFactName
		};
	}

	if (isGenericDocumentEntityName(entityName) && normalizedSemantics) {
		return {
			primaryLabel: `${normalizedSemantics}: ${normalizedName}`,
			secondaryLabel: null,
			sourceLabel: null,
			sortLabel: `${normalizedSemantics} ${normalizedName}`
		};
	}

	return {
		primaryLabel: normalizedName,
		secondaryLabel: normalizedSemantics,
		sourceLabel: null,
		sortLabel: normalizedName
	};
}

function normalizeSortValue(value: unknown): number | string | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') return value.toLowerCase();
	if (typeof value === 'boolean') return value ? 1 : 0;
	return null;
}

export function sortRows<T extends Record<string, unknown>>(
	rows: T[],
	sortKey: keyof T | string,
	sortDir: SortDir
): T[] {
	const sorted = [...rows];
	sorted.sort((left, right) => {
		const a = normalizeSortValue(left[sortKey as keyof T]);
		const b = normalizeSortValue(right[sortKey as keyof T]);

		if (a === null && b === null) return 0;
		if (a === null) return 1;
		if (b === null) return -1;

		if (typeof a === 'number' && typeof b === 'number') {
			return sortDir === 'asc' ? a - b : b - a;
		}

		const cmp = String(a).localeCompare(String(b), 'ru');
		return sortDir === 'asc' ? cmp : -cmp;
	});
	return sorted;
}
