import type { EmisGeometry } from '@dashboard-builder/emis-contracts/emis-geo';

import type { NormalizedCandidate, SourceAdapter } from './types';

/**
 * OSM type tag → EMIS object type code mapping.
 * Isolated from transport/fetch so mapping rules are easy to review and extend.
 */
const OSM_TYPE_MAP: Record<string, string> = {
	port: 'port',
	terminal: 'terminal',
	storage: 'storage',
	substation: 'substation',
	power_plant: 'power_plant',
	refinery: 'refinery'
};

/**
 * Map an OSM Overpass element geometry to an EmisGeometry.
 * Handles: node → Point, way → LineString/Polygon, relation → Multi*.
 */
function mapOsmGeometry(element: Record<string, unknown>): EmisGeometry | null {
	const type = element.type as string | undefined;

	if (type === 'node') {
		const lat = element.lat as number | undefined;
		const lon = element.lon as number | undefined;
		if (lat == null || lon == null) return null;
		return { type: 'Point', coordinates: [lon, lat] };
	}

	if (type === 'way') {
		const geometry = element.geometry as Array<{ lat: number; lon: number }> | undefined;
		if (!geometry || geometry.length < 2) return null;
		const coords: [number, number][] = geometry.map((p) => [p.lon, p.lat]);
		const isClosed =
			coords.length >= 4 &&
			coords[0][0] === coords[coords.length - 1][0] &&
			coords[0][1] === coords[coords.length - 1][1];
		if (isClosed) return { type: 'Polygon', coordinates: [coords] };
		return { type: 'LineString', coordinates: coords };
	}

	if (type === 'relation') {
		const members = element.members as Array<Record<string, unknown>> | undefined;
		if (!members) return null;
		const outerWays = members.filter((m) => m.role === 'outer' && m.geometry);
		if (outerWays.length === 0) return null;
		const rings = outerWays.map((m) => {
			const geom = m.geometry as Array<{ lat: number; lon: number }>;
			return geom.map((p): [number, number] => [p.lon, p.lat]);
		});
		if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
		return { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) };
	}

	return null;
}

/** Tag keys checked in priority order — first match wins. */
const OSM_TAG_KEYS = ['power', 'man_made', 'industrial', 'landuse', 'amenity', 'harbour'] as const;

function inferObjectTypeCode(tags: Record<string, string>): string | null {
	for (const key of OSM_TAG_KEYS) {
		const value = tags[key];
		if (value && value in OSM_TYPE_MAP) return OSM_TYPE_MAP[value];
	}
	return null;
}

function normalizeOsmElement(element: Record<string, unknown>): NormalizedCandidate {
	const tags = (element.tags ?? {}) as Record<string, string>;
	const osmId = String(element.id ?? '');
	const osmType = String(element.type ?? '');

	return {
		sourceRef: `${osmType}/${osmId}`,
		rawPayload: element,
		name: tags['name:ru'] || tags.name || null,
		nameEn: tags['name:en'] || null,
		objectTypeCode: inferObjectTypeCode(tags),
		countryCode: null,
		geometry: mapOsmGeometry(element)
	};
}

export const osmAdapter: SourceAdapter = {
	sourceCode: 'osm',

	async fetch(params: Record<string, unknown>): Promise<NormalizedCandidate[]> {
		const query = params.query as string | undefined;
		if (!query) throw new Error('OSM adapter requires a "query" param (Overpass QL)');

		const baseUrl =
			(params.baseUrl as string | undefined) ?? 'https://overpass-api.de/api/interpreter';

		const response = await fetch(baseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: `data=${encodeURIComponent(query)}`
		});

		if (!response.ok) {
			throw new Error(`OSM Overpass responded with ${response.status}: ${response.statusText}`);
		}

		const data = (await response.json()) as { elements?: Record<string, unknown>[] };
		const elements = data.elements ?? [];

		return elements.map(normalizeOsmElement);
	}
};
