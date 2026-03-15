import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

export const EMIS_MAP_SOURCE_IDS = {
	objects: 'emis-map-objects-source',
	news: 'emis-map-news-source'
} as const;

export const EMIS_MAP_LAYER_IDS = {
	objects: 'emis-map-objects-layer',
	news: 'emis-map-news-layer'
} as const;

type OverlayKey = keyof typeof EMIS_MAP_SOURCE_IDS;
type LayerDefinition = Parameters<MapLibreMap['addLayer']>[0];

export const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
	type: 'FeatureCollection',
	features: []
};

const OBJECT_LAYER = {
	id: EMIS_MAP_LAYER_IDS.objects,
	type: 'circle',
	source: EMIS_MAP_SOURCE_IDS.objects,
	paint: {
		'circle-radius': [
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
		],
		'circle-color': [
			'match',
			['get', 'status'],
			'active',
			'#146c5b',
			'planned',
			'#1769aa',
			'inactive',
			'#9a6700',
			'archived',
			'#667085',
			'#146c5b'
		],
		'circle-stroke-width': 1.5,
		'circle-stroke-color': '#f8fafc',
		'circle-opacity': 0.92
	}
} satisfies LayerDefinition;

const NEWS_LAYER = {
	id: EMIS_MAP_LAYER_IDS.news,
	type: 'circle',
	source: EMIS_MAP_SOURCE_IDS.news,
	paint: {
		'circle-radius': [
			'interpolate',
			['linear'],
			['coalesce', ['get', 'importance'], 1],
			1,
			5,
			3,
			7,
			5,
			9
		],
		'circle-color': [
			'match',
			['coalesce', ['get', 'importance'], 0],
			5,
			'#b42318',
			4,
			'#d92d20',
			3,
			'#f79009',
			2,
			'#2e90fa',
			1,
			'#12b76a',
			'#7a7f85'
		],
		'circle-stroke-width': 1.5,
		'circle-stroke-color': '#101828',
		'circle-opacity': 0.82
	}
} satisfies LayerDefinition;

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

	if (!map.getLayer(EMIS_MAP_LAYER_IDS.objects)) {
		map.addLayer(OBJECT_LAYER);
	}

	if (!map.getLayer(EMIS_MAP_LAYER_IDS.news)) {
		map.addLayer(NEWS_LAYER);
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
