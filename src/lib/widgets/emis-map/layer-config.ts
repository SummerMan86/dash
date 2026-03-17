import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import type { EmisMapFeatureRef } from '$entities/emis-map';
import { resolveCssColorVar } from '$shared/styles/tokens';

export const EMIS_MAP_SOURCE_IDS = {
	objects: 'emis-map-objects-source',
	news: 'emis-map-news-source',
	routePoints: 'emis-map-route-points-source',
	routeSegments: 'emis-map-route-segments-source'
} as const;

export const EMIS_MAP_LAYER_IDS = {
	objects: 'emis-map-objects-layer',
	news: 'emis-map-news-layer',
	routePoints: 'emis-map-route-points-layer',
	routeSegments: 'emis-map-route-segments-layer'
} as const;

type OverlayKey = keyof typeof EMIS_MAP_SOURCE_IDS;
type LayerDefinition = Parameters<MapLibreMap['addLayer']>[0];

export const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
	type: 'FeatureCollection',
	features: []
};

export const EMPTY_LINE_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
	type: 'FeatureCollection',
	features: []
};

function getMapColor(name: `--${string}`, fallback: string) {
	return resolveCssColorVar(name) ?? fallback;
}

type MapExpression = any;

function buildObjectSelectedMatch(selectedId: string | null) {
	return ['==', ['get', 'id'], selectedId ?? ''] as MapExpression;
}

function buildNewsSelectedMatch(selectedId: string | null) {
	return ['==', ['get', 'id'], selectedId ?? ''] as MapExpression;
}

function buildObjectRadius(selectedId: string | null) {
	const baseRadius = [
		'match',
		['get', 'status'],
		'active',
		7,
		'planned',
		6.5,
		'inactive',
		5.5,
		'archived',
		4.5,
		6
	] as MapExpression;

	return ['case', buildObjectSelectedMatch(selectedId), ['+', baseRadius, 2.5], baseRadius] as MapExpression;
}

function buildNewsRadius(selectedId: string | null) {
	const baseRadius = [
		'interpolate',
		['linear'],
		['coalesce', ['get', 'importance'], 1],
		1,
		5,
		3,
		7,
		5,
		9
	] as MapExpression;

	return ['case', buildNewsSelectedMatch(selectedId), ['+', baseRadius, 2.5], baseRadius] as MapExpression;
}

function createObjectLayer(): LayerDefinition {
	return {
		id: EMIS_MAP_LAYER_IDS.objects,
		type: 'circle',
		source: EMIS_MAP_SOURCE_IDS.objects,
		paint: {
			'circle-radius': buildObjectRadius(null),
			'circle-color': [
				'match',
				['get', 'status'],
				'active',
				getMapColor('--color-success', '#198038'),
				'planned',
				getMapColor('--color-info', '#4589ff'),
				'inactive',
				getMapColor('--color-warning', '#f1c21b'),
				'archived',
				getMapColor('--color-muted-foreground', '#525252'),
				getMapColor('--color-success', '#198038')
			],
			'circle-stroke-width': ['case', buildObjectSelectedMatch(null), 3.5, 1.5],
			'circle-stroke-color': [
				'case',
				buildObjectSelectedMatch(null),
				getMapColor('--color-foreground', '#161616'),
				getMapColor('--color-background', '#ffffff')
			],
			'circle-opacity': 0.92
		}
	};
}

function createNewsLayer(): LayerDefinition {
	return {
		id: EMIS_MAP_LAYER_IDS.news,
		type: 'circle',
		source: EMIS_MAP_SOURCE_IDS.news,
		paint: {
			'circle-radius': buildNewsRadius(null),
			'circle-color': [
				'match',
				['coalesce', ['get', 'importance'], 0],
				5,
				getMapColor('--color-error', '#da1e28'),
				4,
				getMapColor('--color-destructive-hover', '#a2191f'),
				3,
				getMapColor('--color-warning', '#f1c21b'),
				2,
				getMapColor('--color-info', '#4589ff'),
				1,
				getMapColor('--color-success', '#198038'),
				getMapColor('--color-muted-foreground', '#525252')
			],
			'circle-stroke-width': ['case', buildNewsSelectedMatch(null), 3.5, 1.5],
			'circle-stroke-color': [
				'case',
				buildNewsSelectedMatch(null),
				getMapColor('--color-background', '#ffffff'),
				getMapColor('--color-foreground', '#161616')
			],
			'circle-opacity': 0.82
		}
	};
}

function createRouteSegmentsLayer(): LayerDefinition {
	return {
		id: EMIS_MAP_LAYER_IDS.routeSegments,
		type: 'line',
		source: EMIS_MAP_SOURCE_IDS.routeSegments,
		paint: {
			'line-color': getMapColor('--color-info', '#4589ff'),
			'line-width': 2.5,
			'line-opacity': 0.75
		},
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		}
	};
}

function createRoutePointsLayer(): LayerDefinition {
	return {
		id: EMIS_MAP_LAYER_IDS.routePoints,
		type: 'circle',
		source: EMIS_MAP_SOURCE_IDS.routePoints,
		paint: {
			'circle-radius': 4.5,
			'circle-color': getMapColor('--color-warning', '#f1c21b'),
			'circle-stroke-width': 1.25,
			'circle-stroke-color': getMapColor('--color-background', '#ffffff'),
			'circle-opacity': 0.9
		}
	};
}

export function ensureEmisOverlayLayers(map: MapLibreMap) {
	if (!map.getSource(EMIS_MAP_SOURCE_IDS.objects)) {
		map.addSource(EMIS_MAP_SOURCE_IDS.objects, {
			type: 'geojson',
			data: EMPTY_FEATURE_COLLECTION
		});
	}

	if (!map.getSource(EMIS_MAP_SOURCE_IDS.news)) {
		map.addSource(EMIS_MAP_SOURCE_IDS.news, {
			type: 'geojson',
			data: EMPTY_FEATURE_COLLECTION
		});
	}

	if (!map.getSource(EMIS_MAP_SOURCE_IDS.routePoints)) {
		map.addSource(EMIS_MAP_SOURCE_IDS.routePoints, {
			type: 'geojson',
			data: EMPTY_FEATURE_COLLECTION
		});
	}

	if (!map.getSource(EMIS_MAP_SOURCE_IDS.routeSegments)) {
		map.addSource(EMIS_MAP_SOURCE_IDS.routeSegments, {
			type: 'geojson',
			data: EMPTY_LINE_FEATURE_COLLECTION
		});
	}

	if (!map.getLayer(EMIS_MAP_LAYER_IDS.objects)) {
		map.addLayer(createObjectLayer());
	}

	if (!map.getLayer(EMIS_MAP_LAYER_IDS.news)) {
		map.addLayer(createNewsLayer());
	}

	if (!map.getLayer(EMIS_MAP_LAYER_IDS.routeSegments)) {
		map.addLayer(createRouteSegmentsLayer());
	}

	if (!map.getLayer(EMIS_MAP_LAYER_IDS.routePoints)) {
		map.addLayer(createRoutePointsLayer());
	}
}

export function setEmisOverlayData(
	map: MapLibreMap,
	key: OverlayKey,
	data: GeoJSON.FeatureCollection
) {
	const source = map.getSource(EMIS_MAP_SOURCE_IDS[key]) as GeoJSONSource | undefined;
	source?.setData(data);
}

export function setEmisRouteData(
	map: MapLibreMap,
	points: GeoJSON.FeatureCollection,
	segments: GeoJSON.FeatureCollection
) {
	const pointSource = map.getSource(EMIS_MAP_SOURCE_IDS.routePoints) as GeoJSONSource | undefined;
	pointSource?.setData(points);

	const segmentSource = map.getSource(EMIS_MAP_SOURCE_IDS.routeSegments) as GeoJSONSource | undefined;
	segmentSource?.setData(segments);
}

export function setEmisOverlaySelection(map: MapLibreMap, selection: EmisMapFeatureRef | null) {
	const objectSelectionId = selection?.kind === 'object' ? selection.id : null;
	const newsSelectionId = selection?.kind === 'news' ? selection.id : null;

	if (map.getLayer(EMIS_MAP_LAYER_IDS.objects)) {
		map.setPaintProperty(EMIS_MAP_LAYER_IDS.objects, 'circle-radius', buildObjectRadius(objectSelectionId));
		map.setPaintProperty(EMIS_MAP_LAYER_IDS.objects, 'circle-stroke-width', [
			'case',
			buildObjectSelectedMatch(objectSelectionId),
			3.5,
			1.5
		]);
		map.setPaintProperty(EMIS_MAP_LAYER_IDS.objects, 'circle-stroke-color', [
			'case',
			buildObjectSelectedMatch(objectSelectionId),
			getMapColor('--color-foreground', '#161616'),
			getMapColor('--color-background', '#ffffff')
		]);
	}

	if (map.getLayer(EMIS_MAP_LAYER_IDS.news)) {
		map.setPaintProperty(EMIS_MAP_LAYER_IDS.news, 'circle-radius', buildNewsRadius(newsSelectionId));
		map.setPaintProperty(EMIS_MAP_LAYER_IDS.news, 'circle-stroke-width', [
			'case',
			buildNewsSelectedMatch(newsSelectionId),
			3.5,
			1.5
		]);
		map.setPaintProperty(EMIS_MAP_LAYER_IDS.news, 'circle-stroke-color', [
			'case',
			buildNewsSelectedMatch(newsSelectionId),
			getMapColor('--color-background', '#ffffff'),
			getMapColor('--color-foreground', '#161616')
		]);
	}
}
