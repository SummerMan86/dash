import maplibregl from 'maplibre-gl';
import type { LngLatLike, Map as MapLibreMap, Popup } from 'maplibre-gl';

import type {
	EmisMapSelectedFeature,
	EmisMapSelectedRouteFeature
} from '@dashboard-builder/emis-contracts/emis-map';
import {
	normalizeObjectFeature,
	normalizeNewsFeature,
	normalizeVesselFeature,
	normalizeRoutePointFeature,
	normalizeRouteSegmentFeature
} from './feature-normalizers';
import { EMIS_MAP_LAYER_IDS } from './layer-config';
import {
	renderFeaturePopupContent,
	renderRoutePopupContent,
	renderVesselTooltipContent
} from './popup-renderers';

type EmisMapSelectionHandlers = {
	getOnFeatureSelect?: () => ((feature: EmisMapSelectedFeature) => void) | undefined;
	getOnRouteFeatureSelect?: () => ((feature: EmisMapSelectedRouteFeature) => void) | undefined;
};

export type EmisMapInteractionController = {
	bindOverlayInteractions(targetMap: MapLibreMap): void;
	destroy(): void;
};

export function createEmisMapInteractions(
	handlers: EmisMapSelectionHandlers = {}
): EmisMapInteractionController {
	let popup: Popup | null = null;
	let vesselTooltip: Popup | null = null;

	function destroy() {
		vesselTooltip?.remove();
		vesselTooltip = null;
		popup?.remove();
		popup = null;
	}

	function openFeaturePopup(targetMap: MapLibreMap, feature: EmisMapSelectedFeature, lngLat: LngLatLike) {
		vesselTooltip?.remove();
		vesselTooltip = null;
		popup?.remove();
		popup = null;

		const featurePopup = new maplibregl.Popup({
			closeButton: true,
			closeOnClick: true,
			maxWidth: '320px',
			offset: 16
		})
			.setLngLat(lngLat)
			.setDOMContent(renderFeaturePopupContent(feature))
			.addTo(targetMap);
		featurePopup.on('close', () => {
			popup = null;
		});
		popup = featurePopup;
	}

	function openRoutePopup(
		targetMap: MapLibreMap,
		feature: EmisMapSelectedRouteFeature,
		lngLat: LngLatLike
	) {
		popup?.remove();
		popup = null;
		const routePopup = new maplibregl.Popup({
			closeButton: true,
			closeOnClick: true,
			maxWidth: '320px',
			offset: 16
		})
			.setLngLat(lngLat)
			.setDOMContent(renderRoutePopupContent(feature))
			.addTo(targetMap);
		routePopup.on('close', () => {
			popup = null;
		});
		popup = routePopup;
	}

	function bindOverlayInteractions(targetMap: MapLibreMap) {
		const handleFeatureSelection = (feature: EmisMapSelectedFeature | null, lngLat: LngLatLike) => {
			if (!feature) return;
			handlers.getOnFeatureSelect?.()?.(feature);
			openFeaturePopup(targetMap, feature, lngLat);
		};

		const handleRouteFeatureSelection = (
			feature: EmisMapSelectedRouteFeature | null,
			lngLat: LngLatLike
		) => {
			if (!feature) return;
			handlers.getOnRouteFeatureSelect?.()?.(feature);
			openRoutePopup(targetMap, feature, lngLat);
		};

		targetMap.on('click', EMIS_MAP_LAYER_IDS.objects, (event) => {
			handleFeatureSelection(normalizeObjectFeature(event.features?.[0]?.properties), event.lngLat);
		});

		targetMap.on('click', EMIS_MAP_LAYER_IDS.news, (event) => {
			handleFeatureSelection(normalizeNewsFeature(event.features?.[0]?.properties), event.lngLat);
		});
		targetMap.on('click', EMIS_MAP_LAYER_IDS.vessels, (event) => {
			handleFeatureSelection(normalizeVesselFeature(event.features?.[0]?.properties), event.lngLat);
		});

		targetMap.on('click', EMIS_MAP_LAYER_IDS.routePoints, (event) => {
			const feature = event.features?.[0];
			handleRouteFeatureSelection(
				normalizeRoutePointFeature(feature?.properties, feature?.geometry),
				event.lngLat
			);
		});
		targetMap.on('click', EMIS_MAP_LAYER_IDS.routeSegments, (event) => {
			const feature = event.features?.[0];
			handleRouteFeatureSelection(
				normalizeRouteSegmentFeature(feature?.properties, feature?.geometry),
				event.lngLat
			);
		});

		targetMap.on('mouseenter', EMIS_MAP_LAYER_IDS.objects, () => {
			targetMap.getCanvas().style.cursor = 'pointer';
		});
		targetMap.on('mouseenter', EMIS_MAP_LAYER_IDS.news, () => {
			targetMap.getCanvas().style.cursor = 'pointer';
		});
		targetMap.on('mouseenter', EMIS_MAP_LAYER_IDS.vessels, (event) => {
			targetMap.getCanvas().style.cursor = 'pointer';

			// Don't show tooltip if a click-popup is already open.
			if (popup) return;

			const props = normalizeVesselFeature(event.features?.[0]?.properties);
			if (!props) return;

			vesselTooltip?.remove();
			vesselTooltip = new maplibregl.Popup({
				closeButton: false,
				closeOnClick: false,
				anchor: 'bottom',
				offset: 12,
				className: 'emis-vessel-tooltip'
			})
				.setLngLat(event.lngLat)
				.setDOMContent(renderVesselTooltipContent(props))
				.addTo(targetMap);
		});
		targetMap.on('mouseenter', EMIS_MAP_LAYER_IDS.routePoints, () => {
			targetMap.getCanvas().style.cursor = 'pointer';
		});
		targetMap.on('mouseenter', EMIS_MAP_LAYER_IDS.routeSegments, () => {
			targetMap.getCanvas().style.cursor = 'pointer';
		});
		targetMap.on('mouseleave', EMIS_MAP_LAYER_IDS.objects, () => {
			targetMap.getCanvas().style.cursor = '';
		});
		targetMap.on('mouseleave', EMIS_MAP_LAYER_IDS.news, () => {
			targetMap.getCanvas().style.cursor = '';
		});
		targetMap.on('mouseleave', EMIS_MAP_LAYER_IDS.vessels, () => {
			targetMap.getCanvas().style.cursor = '';
			vesselTooltip?.remove();
			vesselTooltip = null;
		});
		targetMap.on('mouseleave', EMIS_MAP_LAYER_IDS.routePoints, () => {
			targetMap.getCanvas().style.cursor = '';
		});
		targetMap.on('mouseleave', EMIS_MAP_LAYER_IDS.routeSegments, () => {
			targetMap.getCanvas().style.cursor = '';
		});
	}

	return {
		bindOverlayInteractions,
		destroy
	};
}
