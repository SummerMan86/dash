/**
 * Overlay data fetching utilities for the EMIS map.
 *
 * Extracted from EmisMap.svelte to reduce component size.
 * Contains: query param helpers, typed GeoJSON fetch, layer mode type,
 * and overlay URL construction.
 */

import type {
	EmisMapNewsFeatureCollection,
	EmisMapObjectFeatureCollection,
	EmisMapVesselFeatureCollection
} from '@dashboard-builder/emis-contracts/emis-map';
import type { JsonValue } from '@dashboard-builder/platform-core';

/** Which overlay layers are active. */
export type EmisLayerMode = 'all' | 'objects' | 'news' | 'vessels' | 'vessels+news';

/** Summary payload emitted after a successful overlay fetch. */
export type OverlayFeatureData = { features: GeoJSON.Feature[]; total: number };

/** Target for flyTo commands. */
export type FlyToTarget = { lng: number; lat: number; zoom?: number } | null;

/** Which basemap source is currently active. */
export type BasemapSource = 'online' | 'offline' | 'unavailable';

/**
 * Append key/value pairs from `params` to a URL's search params.
 * Arrays are appended as repeated keys; null/undefined values are skipped.
 */
export function appendQueryParams(url: URL, params: Record<string, JsonValue>) {
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

/**
 * Fetch a typed GeoJSON FeatureCollection from the given URL.
 * Throws on non-OK responses, extracting the server error message when available.
 */
export async function fetchFeatureCollection<
	T extends
		| EmisMapObjectFeatureCollection
		| EmisMapNewsFeatureCollection
		| EmisMapVesselFeatureCollection
>(url: string, signal: AbortSignal): Promise<T> {
	const response = await fetch(url, {
		method: 'GET',
		signal,
		headers: {
			accept: 'application/geo+json, application/json'
		}
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(
			(payload &&
				typeof payload === 'object' &&
				'error' in payload &&
				typeof payload.error === 'string' &&
				payload.error) ||
				`Overlay request failed with status ${response.status}`
		);
	}

	return (await response.json()) as T;
}

export interface OverlayUrls {
	objectsUrl: URL;
	newsUrl: URL;
	vesselsUrl: URL;
}

/**
 * Build the three overlay endpoint URLs with bbox + caller-provided query params.
 */
export function buildOverlayUrls(
	bbox: string,
	objectsQuery: Record<string, JsonValue>,
	newsQuery: Record<string, JsonValue>,
	vesselsQuery: Record<string, JsonValue>
): OverlayUrls {
	const objectsUrl = new URL('/api/emis/map/objects', window.location.origin);
	const newsUrl = new URL('/api/emis/map/news', window.location.origin);
	const vesselsUrl = new URL('/api/emis/map/vessels', window.location.origin);
	objectsUrl.searchParams.set('bbox', bbox);
	newsUrl.searchParams.set('bbox', bbox);
	vesselsUrl.searchParams.set('bbox', bbox);
	appendQueryParams(objectsUrl, objectsQuery);
	appendQueryParams(newsUrl, newsQuery);
	appendQueryParams(vesselsUrl, vesselsQuery);

	return { objectsUrl, newsUrl, vesselsUrl };
}

/**
 * Compute a deduplication key for the current overlay request.
 */
export function buildOverlayKey(layer: EmisLayerMode, bbox: string, urls: OverlayUrls): string {
	return [
		layer,
		bbox,
		urls.objectsUrl.searchParams.toString(),
		urls.newsUrl.searchParams.toString(),
		urls.vesselsUrl.searchParams.toString()
	].join('|');
}

/**
 * Determine which overlay categories are visible for a given layer mode.
 */
export function resolveVisibleLayers(layer: EmisLayerMode) {
	return {
		showObjects: layer === 'all' || layer === 'objects',
		showNews: layer === 'all' || layer === 'news' || layer === 'vessels+news',
		showVessels: layer === 'all' || layer === 'vessels' || layer === 'vessels+news'
	};
}
