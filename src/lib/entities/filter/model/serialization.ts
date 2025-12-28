import type { FilterState } from './types';

/**
 * URL serialization rules.
 *
 * We intentionally keep URL keys short and stable (from/to/status...),
 * so links can be shared and bookmarked.
 *
 * Arrays are encoded as repeated keys:
 *   status=SUCCESS&status=REJECTED
 */
const KEY = {
	dateFrom: 'from',
	dateTo: 'to',
	status: 'status',
	role: 'role',
	mcc: 'mcc',
	client: 'client'
} as const;

function appendMany(params: URLSearchParams, key: string, values: string[] | undefined) {
	if (!values?.length) return;
	for (const v of values) {
		const s = String(v).trim();
		if (s) params.append(key, s);
	}
}

function getMany(params: URLSearchParams, key: string): string[] | undefined {
	const values = params.getAll(key).map((v) => v.trim()).filter(Boolean);
	return values.length ? values : undefined;
}

/**
 * Convert FilterState to URLSearchParams.
 * Format is stable and human-readable:
 * - scalars: `from=YYYY-MM-DD`
 * - arrays: repeated keys: `status=SUCCESS&status=REJECTED`
 */
export function toSearchParams(state: FilterState): URLSearchParams {
	const params = new URLSearchParams();

	if (state.dateFrom) params.set(KEY.dateFrom, String(state.dateFrom));
	if (state.dateTo) params.set(KEY.dateTo, String(state.dateTo));
	appendMany(params, KEY.status, state.status);
	appendMany(params, KEY.role, state.role);
	appendMany(params, KEY.mcc, state.mcc);
	if (typeof state.client === 'string' && state.client.trim()) params.set(KEY.client, state.client.trim());

	return params;
}

/**
 * Parse FilterState from URLSearchParams.
 * Unknown keys are ignored.
 */
export function fromSearchParams(params: URLSearchParams): FilterState {
	// Unknown keys are ignored so we can add new filters later without breaking old links.
	const dateFrom = params.get(KEY.dateFrom)?.trim() || undefined;
	const dateTo = params.get(KEY.dateTo)?.trim() || undefined;
	const status = getMany(params, KEY.status);
	const role = getMany(params, KEY.role);
	const mcc = getMany(params, KEY.mcc);
	const client = params.get(KEY.client)?.trim() || undefined;

	return {
		...(dateFrom ? { dateFrom } : {}),
		...(dateTo ? { dateTo } : {}),
		...(status ? { status } : {}),
		...(role ? { role } : {}),
		...(mcc ? { mcc } : {}),
		...(client ? { client } : {})
	};
}


