import type { EmisNewsSummary } from '@dashboard-builder/emis-contracts/emis-news';
import type { EmisObjectSummary } from '@dashboard-builder/emis-contracts/emis-object';
import type {
	EmisShipRoutePoint,
	EmisShipRouteSegment
} from '@dashboard-builder/emis-contracts/emis-ship-route';

import type { SearchResultKind } from './emisPageHelpers';
import { appendQueryParams, fetchJson, SHIP_ROUTE_LIMIT } from './emisPageHelpers';
import type { ShipRouteVesselOption } from './emisPageSelection';
import type { RouteMode } from './emisPageHelpers';

/* ── Search results loader ──────────────────────────────────────── */

export type SearchResultPayload =
	| { kind: 'objects'; rows: EmisObjectSummary[]; meta: { count: number } }
	| { kind: 'news'; rows: EmisNewsSummary[]; meta: { count: number } };

export async function loadSearchResults(
	kind: SearchResultKind,
	serverParams: Record<string, unknown>
): Promise<SearchResultPayload> {
	const endpoint = kind === 'objects' ? '/api/emis/search/objects' : '/api/emis/search/news';
	const url = new URL(endpoint, window.location.origin);
	appendQueryParams(url, serverParams);
	url.searchParams.set('limit', '50');

	const response = await fetch(`${url.pathname}?${url.searchParams.toString()}`);
	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(
			(payload &&
				typeof payload === 'object' &&
				'error' in payload &&
				typeof payload.error === 'string' &&
				payload.error) ||
				`Search request failed with status ${response.status}`
		);
	}

	if (kind === 'objects') {
		const payload = (await response.json()) as {
			rows: EmisObjectSummary[];
			meta: { count: number };
		};
		return { kind, rows: payload.rows, meta: payload.meta };
	}

	const payload = (await response.json()) as { rows: EmisNewsSummary[]; meta: { count: number } };
	return { kind, rows: payload.rows, meta: payload.meta };
}

/* ── Ship-route catalog loader ──────────────────────────────────── */

export type CatalogLoadResult = {
	rows: ShipRouteVesselOption[];
};

export async function loadShipRouteCatalogData(bbox?: string | null): Promise<CatalogLoadResult> {
	const url = new URL('/api/emis/ship-routes/vessels', window.location.origin);
	url.searchParams.set('limit', '250');
	if (bbox) {
		url.searchParams.set('bbox', bbox);
	}
	const payload = await fetchJson<{ rows: ShipRouteVesselOption[] }>(url);
	return { rows: payload.rows };
}

/* ── Ship-route data loader ─────────────────────────────────────── */

export type ShipRouteLoadResult = {
	points: EmisShipRoutePoint[];
	segments: EmisShipRouteSegment[];
};

export async function loadShipRouteData(opts: {
	shipHbkId: string;
	routeMode: RouteMode;
	dateFilters: Record<string, string>;
}): Promise<ShipRouteLoadResult> {
	if (!opts.shipHbkId) {
		return { points: [], segments: [] };
	}

	const shipHbkId = Number(opts.shipHbkId);
	const shouldLoadPoints = opts.routeMode !== 'segments';
	const shouldLoadSegments = opts.routeMode !== 'points';

	const pointsUrl = shouldLoadPoints
		? new URL('/api/emis/ship-routes/points', window.location.origin)
		: null;
	const segmentsUrl = shouldLoadSegments
		? new URL('/api/emis/ship-routes/segments', window.location.origin)
		: null;

	if (pointsUrl) {
		appendQueryParams(pointsUrl, { shipHbkId, limit: SHIP_ROUTE_LIMIT, ...opts.dateFilters });
	}
	if (segmentsUrl) {
		appendQueryParams(segmentsUrl, {
			shipHbkId,
			limit: SHIP_ROUTE_LIMIT,
			...opts.dateFilters
		});
	}

	const [pointsResponse, segmentsResponse] = await Promise.all([
		pointsUrl
			? fetchJson<{ rows: EmisShipRoutePoint[] }>(pointsUrl)
			: Promise.resolve({ rows: [] as EmisShipRoutePoint[] }),
		segmentsUrl
			? fetchJson<{ rows: EmisShipRouteSegment[] }>(segmentsUrl)
			: Promise.resolve({ rows: [] as EmisShipRouteSegment[] })
	]);

	return {
		points: pointsResponse.rows,
		segments: segmentsResponse.rows
	};
}
