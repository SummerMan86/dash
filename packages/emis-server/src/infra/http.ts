import { z } from 'zod';

import { EmisError } from './errors';

export const EMIS_DEFAULT_LIST_LIMIT = 50;
export const EMIS_MAX_LIST_LIMIT = 200;
export const EMIS_DEFAULT_MAP_LIMIT = 200;
export const EMIS_MAX_MAP_LIMIT = 500;
export const EMIS_DEFAULT_SHIP_ROUTE_VESSELS_LIMIT = 250;
export const EMIS_MAX_SHIP_ROUTE_VESSELS_LIMIT = 500;
export const EMIS_DEFAULT_SHIP_ROUTE_GEOMETRY_LIMIT = 5_000;
export const EMIS_MAX_SHIP_ROUTE_GEOMETRY_LIMIT = 5_000;
export const EMIS_MAX_OFFSET = 10_000;

export type EmisSortRule = {
	field: string;
	dir: 'asc' | 'desc';
};

export type EmisListMeta = {
	count: number;
	limit: number;
	offset: number;
	sort: EmisSortRule[];
};

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
	request: Request,
	schema: TSchema
): Promise<z.infer<TSchema>> {
	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		throw new EmisError(400, 'INVALID_JSON', 'Invalid JSON body');
	}

	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		throw new EmisError(
			400,
			'VALIDATION_ERROR',
			parsed.error.issues[0]?.message ?? 'Validation failed'
		);
	}

	return parsed.data;
}

export function requireUuid(value: string | undefined, fieldName: string): string {
	if (
		!value ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
	) {
		throw new EmisError(400, 'INVALID_ID', `Invalid ${fieldName}`);
	}
	return value;
}

export function parseIntParam(
	value: string | null,
	fallback: number,
	options: { min: number; max: number }
): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(options.min, Math.min(options.max, Math.trunc(parsed)));
}

export function parseStrictIntParam(
	value: string | null,
	fallback: number,
	options: { min: number; max: number; paramName: string; code?: string }
): number {
	if (!value) return fallback;

	const trimmed = value.trim();
	if (!trimmed) return fallback;
	if (!/^-?\d+$/.test(trimmed)) {
		throw new EmisError(
			400,
			options.code ?? 'INVALID_QUERY_PARAM',
			`${options.paramName} must be an integer`
		);
	}

	const parsed = Number(trimmed);
	if (!Number.isSafeInteger(parsed)) {
		throw new EmisError(
			400,
			options.code ?? 'INVALID_QUERY_PARAM',
			`${options.paramName} must be an integer`
		);
	}

	if (parsed < options.min || parsed > options.max) {
		throw new EmisError(
			400,
			options.code ?? 'INVALID_QUERY_PARAM',
			`${options.paramName} must be between ${options.min} and ${options.max}`
		);
	}

	return parsed;
}

export function parseListParams(
	searchParams: URLSearchParams,
	options: {
		defaultLimit?: number;
		maxLimit?: number;
		defaultOffset?: number;
		maxOffset?: number;
		limitCode?: string;
		offsetCode?: string;
	}
): { limit: number; offset: number } {
	return {
		limit: parseStrictIntParam(
			searchParams.get('limit'),
			options.defaultLimit ?? EMIS_DEFAULT_LIST_LIMIT,
			{
				min: 1,
				max: options.maxLimit ?? EMIS_MAX_LIST_LIMIT,
				paramName: 'limit',
				code: options.limitCode
			}
		),
		offset: parseStrictIntParam(searchParams.get('offset'), options.defaultOffset ?? 0, {
			min: 0,
			max: options.maxOffset ?? EMIS_MAX_OFFSET,
			paramName: 'offset',
			code: options.offsetCode
		})
	};
}

/**
 * Parse an optional strict integer query parameter.
 * Returns undefined if absent/empty; throws EmisError(400) if present but not a valid integer.
 */
export function parseOptionalStrictInt(
	value: string | null,
	options: { paramName: string; code?: string; min?: number; max?: number }
): number | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	if (!/^-?\d+$/.test(trimmed)) {
		throw new EmisError(
			400,
			options.code ?? 'INVALID_QUERY_PARAM',
			`${options.paramName} must be an integer`
		);
	}
	const parsed = Number(trimmed);
	if (!Number.isSafeInteger(parsed)) {
		throw new EmisError(
			400,
			options.code ?? 'INVALID_QUERY_PARAM',
			`${options.paramName} must be an integer`
		);
	}
	if (options.min !== undefined && parsed < options.min) {
		throw new EmisError(
			400,
			options.code ?? 'INVALID_QUERY_PARAM',
			`${options.paramName} must be >= ${options.min}`
		);
	}
	if (options.max !== undefined && parsed > options.max) {
		throw new EmisError(
			400,
			options.code ?? 'INVALID_QUERY_PARAM',
			`${options.paramName} must be <= ${options.max}`
		);
	}
	return parsed;
}

/**
 * Clamp a page-size value for list endpoints.
 * Falls back to EMIS_DEFAULT_LIST_LIMIT when undefined; result is always in [1, EMIS_MAX_LIST_LIMIT].
 */
export function clampPageSize(value: number | undefined): number {
	return Math.max(1, Math.min(EMIS_MAX_LIST_LIMIT, Math.trunc(value ?? EMIS_DEFAULT_LIST_LIMIT)));
}

/**
 * Clamp a limit value for map endpoints.
 * Falls back to EMIS_DEFAULT_MAP_LIMIT when undefined; result is always in [1, EMIS_MAX_MAP_LIMIT].
 */
export function clampMapLimit(value: number | undefined): number {
	return Math.max(1, Math.min(EMIS_MAX_MAP_LIMIT, Math.trunc(value ?? EMIS_DEFAULT_MAP_LIMIT)));
}

export function normalizeDateTimeParam(value: string | null): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) return trimmed;

	const parsed = new Date(trimmed);
	return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export function buildEmisListMeta(options: {
	count: number;
	limit: number;
	offset?: number;
	sort: EmisSortRule[];
}): EmisListMeta {
	return {
		count: options.count,
		limit: options.limit,
		offset: options.offset ?? 0,
		sort: options.sort
	};
}
