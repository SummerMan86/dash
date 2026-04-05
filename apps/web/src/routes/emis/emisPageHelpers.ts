import type { EmisNewsSummary } from '@dashboard-builder/emis-contracts/emis-news';
import type { EmisObjectSummary } from '@dashboard-builder/emis-contracts/emis-object';

export const SHIP_ROUTE_LIMIT = 5000;

export type SearchResultKind = 'objects' | 'news';
export type RouteMode = 'points' | 'segments' | 'both';
export type RouteUrlSelection =
	| { kind: 'route-point'; routePointId: number }
	| { kind: 'route-segment'; segmentSeqShip: number };

export function appendQueryParams(url: URL, params: Record<string, unknown>) {
	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === undefined) continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				url.searchParams.append(key, String(item));
			}
			continue;
		}

		url.searchParams.set(key, String(value));
	}
}

export function formatDate(value: string) {
	return new Date(value).toLocaleString('ru-RU');
}

export function formatCoordinate(value: number) {
	return value.toFixed(4);
}

export function formatMetric(value: number | null, suffix = '') {
	if (value === null) return 'n/a';
	return `${value.toFixed(1)}${suffix}`;
}

export function parseSearchResultKind(value: string | null | undefined): SearchResultKind | null {
	return value === 'objects' || value === 'news' ? value : null;
}

export function parseRouteMode(value: unknown): RouteMode {
	return value === 'points' || value === 'segments' ? value : 'both';
}

export function parsePositiveIntParam(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function toneClass(ready: boolean) {
	return ready
		? 'border-success/30 bg-success-muted/50 text-success-muted-foreground'
		: 'border-warning/30 bg-warning-muted/40 text-warning-muted-foreground';
}

export async function fetchJson<T>(url: URL): Promise<T> {
	const response = await fetch(`${url.pathname}?${url.searchParams.toString()}`);
	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(
			(payload &&
				typeof payload === 'object' &&
				'error' in payload &&
				typeof payload.error === 'string' &&
				payload.error) ||
				`Request failed with status ${response.status}`
		);
	}

	return (await response.json()) as T;
}

export function buildObjectSubtitle(row: EmisObjectSummary) {
	const parts = [row.objectTypeName, row.region, row.countryCode].filter(Boolean);
	return parts.length ? parts.join(' • ') : null;
}

export function buildNewsSubtitle(row: EmisNewsSummary) {
	const parts = [row.sourceName, row.newsType, row.region].filter(Boolean);
	return parts.length ? parts.join(' • ') : null;
}
