import type { FilterState, FilterValue, FilterValues, ResolvedFilterSpec } from './types';

/**
 * Legacy URL serialization rules.
 *
 * Kept for backward compatibility with the old filter store.
 */
const LEGACY_KEY = {
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
	const values = params
		.getAll(key)
		.map((v) => v.trim())
		.filter(Boolean);
	return values.length ? values : undefined;
}

export function toSearchParams(state: FilterState): URLSearchParams {
	const params = new URLSearchParams();

	if (state.dateFrom) params.set(LEGACY_KEY.dateFrom, String(state.dateFrom));
	if (state.dateTo) params.set(LEGACY_KEY.dateTo, String(state.dateTo));
	appendMany(params, LEGACY_KEY.status, state.status);
	appendMany(params, LEGACY_KEY.role, state.role);
	appendMany(params, LEGACY_KEY.mcc, state.mcc);
	if (typeof state.client === 'string' && state.client.trim()) {
		params.set(LEGACY_KEY.client, state.client.trim());
	}

	return params;
}

export function fromSearchParams(params: URLSearchParams): FilterState {
	const dateFrom = params.get(LEGACY_KEY.dateFrom)?.trim() || undefined;
	const dateTo = params.get(LEGACY_KEY.dateTo)?.trim() || undefined;
	const status = getMany(params, LEGACY_KEY.status);
	const role = getMany(params, LEGACY_KEY.role);
	const mcc = getMany(params, LEGACY_KEY.mcc);
	const client = params.get(LEGACY_KEY.client)?.trim() || undefined;

	return {
		...(dateFrom ? { dateFrom } : {}),
		...(dateTo ? { dateTo } : {}),
		...(status ? { status } : {}),
		...(role ? { role } : {}),
		...(mcc ? { mcc } : {}),
		...(client ? { client } : {})
	};
}

function getUrlBase(spec: ResolvedFilterSpec): string {
	if (spec.scope === 'shared' && spec.sharedKey) {
		return `sf.${spec.sharedKey}`;
	}

	if (spec.scope === 'workspace') {
		return `wf.${spec.workspaceId}._workspace.${spec.urlKey}`;
	}

	return `wf.${spec.workspaceId}.${spec.ownerId}.${spec.urlKey}`;
}

function deleteBase(params: URLSearchParams, base: string): void {
	params.delete(base);
	params.delete(`${base}.from`);
	params.delete(`${base}.to`);
}

function writeValue(params: URLSearchParams, spec: ResolvedFilterSpec, value: FilterValue): void {
	const base = getUrlBase(spec);
	deleteBase(params, base);

	if (value === null || value === undefined) return;

	if (spec.type === 'dateRange' && typeof value === 'object' && !Array.isArray(value)) {
		const range = value as { from?: string; to?: string };
		if (range.from) params.set(`${base}.from`, range.from);
		if (range.to) params.set(`${base}.to`, range.to);
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			params.append(base, String(item));
		}
		return;
	}

	params.set(base, String(value));
}

function readValue(params: URLSearchParams, spec: ResolvedFilterSpec): FilterValue {
	const base = getUrlBase(spec);

	if (spec.type === 'dateRange') {
		const from = params.get(`${base}.from`)?.trim() || undefined;
		const to = params.get(`${base}.to`)?.trim() || undefined;
		return from || to ? { from, to } : null;
	}

	if (spec.type === 'multiSelect') {
		const values = params
			.getAll(base)
			.map((value) => value.trim())
			.filter(Boolean);
		return values.length ? values : null;
	}

	const scalar = params.get(base)?.trim();
	return scalar ? scalar : null;
}

export function readRuntimeSnapshotFromSearchParams(
	params: URLSearchParams,
	specs: ResolvedFilterSpec[]
): FilterValues {
	const values: FilterValues = {};

	for (const spec of specs) {
		const value = readValue(params, spec);
		if (value !== null) {
			values[spec.filterId] = value;
		}
	}

	return values;
}

export function writeRuntimeSnapshotToSearchParams(
	current: URLSearchParams,
	specs: ResolvedFilterSpec[],
	snapshot: FilterValues
): URLSearchParams {
	const next = new URLSearchParams(current.toString());
	const workspaceIds = new Set(specs.map((spec) => spec.workspaceId));

	for (const workspaceId of workspaceIds) {
		for (const key of Array.from(next.keys())) {
			if (key.startsWith(`wf.${workspaceId}.`)) {
				next.delete(key);
			}
		}
	}

	for (const spec of specs) {
		if (spec.scope === 'shared' && spec.sharedKey) {
			deleteBase(next, getUrlBase(spec));
		}
	}

	for (const spec of specs) {
		const value = snapshot[spec.filterId] ?? null;
		writeValue(next, spec, value);
	}

	return next;
}
