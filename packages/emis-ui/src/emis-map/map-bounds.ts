import maplibregl from 'maplibre-gl';
import type { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl';

import { resolveVisibleLayers, type EmisLayerMode } from './overlay-fetch';

function extendFeatureCollectionBounds(bounds: LngLatBounds, fc: GeoJSON.FeatureCollection | null) {
	if (!fc?.features?.length) return false;

	let hasFeatures = false;
	for (const feature of fc.features) {
		if (!feature.geometry) continue;
		if (feature.geometry.type === 'Point') {
			const [lng, lat] = feature.geometry.coordinates;
			if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
			bounds.extend([lng, lat]);
			hasFeatures = true;
		} else if (feature.geometry.type === 'LineString') {
			for (const [lng, lat] of feature.geometry.coordinates) {
				if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
				bounds.extend([lng, lat]);
				hasFeatures = true;
			}
		}
	}

	return hasFeatures;
}

export function buildRouteBounds(
	routePointsData: GeoJSON.FeatureCollection<GeoJSON.Point>,
	routeSegmentsData: GeoJSON.FeatureCollection<GeoJSON.LineString>
) {
	const bounds = new maplibregl.LngLatBounds();
	let hasCoordinates = false;

	for (const feature of routePointsData.features) {
		if (feature.geometry?.type !== 'Point') continue;
		const [lng, lat] = feature.geometry.coordinates;
		if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
		bounds.extend([lng, lat]);
		hasCoordinates = true;
	}

	for (const feature of routeSegmentsData.features) {
		if (feature.geometry?.type !== 'LineString') continue;
		for (const [lng, lat] of feature.geometry.coordinates) {
			if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
			bounds.extend([lng, lat]);
			hasCoordinates = true;
		}
	}

	return hasCoordinates ? bounds : null;
}

export function fitVisibleEmisBounds(args: {
	map: MapLibreMap;
	layer: EmisLayerMode;
	latestObjectsFC: GeoJSON.FeatureCollection | null;
	latestNewsFC: GeoJSON.FeatureCollection | null;
	latestVesselsFC: GeoJSON.FeatureCollection | null;
	routePointsData: GeoJSON.FeatureCollection<GeoJSON.Point>;
	routeSegmentsData: GeoJSON.FeatureCollection<GeoJSON.LineString>;
}) {
	const bounds = new maplibregl.LngLatBounds();
	let hasFeatures = false;
	const { showObjects, showNews, showVessels } = resolveVisibleLayers(args.layer);

	if (showObjects) hasFeatures ||= extendFeatureCollectionBounds(bounds, args.latestObjectsFC);
	if (showNews) hasFeatures ||= extendFeatureCollectionBounds(bounds, args.latestNewsFC);
	if (showVessels) hasFeatures ||= extendFeatureCollectionBounds(bounds, args.latestVesselsFC);

	hasFeatures ||= extendFeatureCollectionBounds(bounds, args.routePointsData);
	hasFeatures ||= extendFeatureCollectionBounds(bounds, args.routeSegmentsData);

	if (hasFeatures) {
		args.map.fitBounds(bounds, { padding: 50, maxZoom: 12 });
	}
}

export function maybeFitRouteBounds(args: {
	map: MapLibreMap;
	routePointsData: GeoJSON.FeatureCollection<GeoJSON.Point>;
	routeSegmentsData: GeoJSON.FeatureCollection<GeoJSON.LineString>;
	routeFocusKey: string | number | null;
	resolvedRouteFocusKey: string | number | null;
}) {
	if (args.routeFocusKey === null || args.routeFocusKey === args.resolvedRouteFocusKey) {
		return args.resolvedRouteFocusKey;
	}

	const bounds = buildRouteBounds(args.routePointsData, args.routeSegmentsData);
	if (!bounds) return args.resolvedRouteFocusKey;

	args.map.fitBounds(bounds, {
		padding: { top: 84, right: 72, bottom: 84, left: 72 },
		maxZoom: 8,
		duration: 900
	});

	return args.routeFocusKey;
}
