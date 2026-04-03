<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import type {
		EmisMapConfig,
		EmisMapFeatureRef,
		EmisMapNewsFeatureCollection,
		EmisMapNewsFeatureProperties,
		EmisMapObjectFeatureCollection,
		EmisMapObjectFeatureProperties,
		EmisMapVesselFeatureCollection,
		EmisMapVesselFeatureProperties,
		EmisMapRouteFeatureRef,
		EmisMapSelectedFeature,
		EmisMapSelectedRouteFeature
	} from '@dashboard-builder/emis-contracts/emis-map';
	import type { JsonValue } from '@dashboard-builder/platform-datasets';
	import { cn } from '@dashboard-builder/platform-ui';
	import {
		EMPTY_FEATURE_COLLECTION,
		EMPTY_LINE_FEATURE_COLLECTION,
		ensureEmisOverlayLayers,
		EMIS_MAP_LAYER_IDS,
		setEmisOverlayData,
		setEmisRouteData,
		setEmisOverlaySelection,
		setEmisRouteSelection
	} from './layer-config';
	import { acquirePmtilesProtocol, releasePmtilesProtocol } from './pmtiles-protocol';
	import {
		renderFeaturePopupContent,
		renderRoutePopupContent,
		renderVesselTooltipContent
	} from './popup-renderers';
	import { buildPmtilesStyle } from './pmtiles-style';

	const AUTO_FALLBACK_TIMEOUT_MS = 7000;

	type BasemapSource = 'online' | 'offline' | 'unavailable';
	type EmisLayerMode = 'all' | 'objects' | 'news' | 'vessels' | 'vessels+news';

	type FlyToTarget = { lng: number; lat: number; zoom?: number } | null;
	type OverlayFeatureData = { features: GeoJSON.Feature[]; total: number };

	interface Props {
		mapConfig: EmisMapConfig;
		objectsQuery?: Record<string, JsonValue>;
		newsQuery?: Record<string, JsonValue>;
		vesselsQuery?: Record<string, JsonValue>;
		routePointsData?: GeoJSON.FeatureCollection<GeoJSON.Point>;
		routeSegmentsData?: GeoJSON.FeatureCollection<GeoJSON.LineString>;
		routeFocusKey?: string | number | null;
		layer?: EmisLayerMode;
		selectedFeature?: EmisMapFeatureRef | null;
		selectedRouteFeature?: EmisMapRouteFeatureRef | null;
		flyToTarget?: FlyToTarget;
		onFeatureSelect?: (feature: EmisMapSelectedFeature) => void;
		onRouteFeatureSelect?: (feature: EmisMapSelectedRouteFeature) => void;
		onVesselsLoaded?: (data: OverlayFeatureData) => void;
		onNewsLoaded?: (data: OverlayFeatureData) => void;
		diagnostics?: boolean;
		showFitBounds?: boolean;
		mapHeight?: string;
		class?: string;
	}

	let {
		mapConfig,
		objectsQuery = {},
		newsQuery = {},
		vesselsQuery = {},
		routePointsData = EMPTY_FEATURE_COLLECTION as GeoJSON.FeatureCollection<GeoJSON.Point>,
		routeSegmentsData = EMPTY_LINE_FEATURE_COLLECTION as GeoJSON.FeatureCollection<GeoJSON.LineString>,
		routeFocusKey = null,
		layer = 'all',
		selectedFeature = null,
		selectedRouteFeature = null,
		flyToTarget = null as FlyToTarget,
		onFeatureSelect,
		onRouteFeatureSelect,
		onVesselsLoaded,
		onNewsLoaded,
		diagnostics = true,
		showFitBounds = true,
		mapHeight = 'h-[420px]',
		class: className
	}: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let mapLoaded = $state(false);
	let clientError = $state<string | null>(null);
	let overlayError = $state<string | null>(null);
	let overlaysLoading = $state(false);
	let objectsCount = $state(0);
	let newsCount = $state(0);
	let vesselsCount = $state(0);
	let routePointsCount = $state(0);
	let routeSegmentsCount = $state(0);
	let resolvedBbox = $state<string | null>(null);
	let resolvedOverlayKey = $state<string | null>(null);
	let activeBasemapSource = $state<BasemapSource>('unavailable');
	let runtimeNote = $state<string | null>(null);
	let fallbackActivated = $state(false);

	let map: maplibregl.Map | null = null;
	let latestObjectsFC: GeoJSON.FeatureCollection | null = null;
	let latestNewsFC: GeoJSON.FeatureCollection | null = null;
	let latestVesselsFC: GeoJSON.FeatureCollection | null = null;
	let activeOverlayRequestId = 0;
	let activeOverlayAbortController: AbortController | null = null;
	let startupTimer: ReturnType<typeof setTimeout> | null = null;
	let protocolAttached = false;
	let popup: maplibregl.Popup | null = null;
	let vesselTooltip: maplibregl.Popup | null = null;
	let resolvedRouteFocusKey: string | number | null = null;

	function getStatusTone() {
		if (mapConfig.runtimeStatus === 'ready') {
			return 'border-success/30 bg-success-muted/50 text-success-muted-foreground';
		}
		if (mapConfig.runtimeStatus === 'degraded') {
			return 'border-warning/30 bg-warning-muted/50 text-warning-muted-foreground';
		}
		return 'border-error/30 bg-error-muted/50 text-error-muted-foreground';
	}

	function getActiveBasemapLabel() {
		if (activeBasemapSource === 'online') return 'online';
		if (activeBasemapSource === 'offline')
			return fallbackActivated ? 'offline-fallback' : 'offline';
		return 'not-started';
	}

	function canStartOnline() {
		return Boolean(mapConfig.onlineStyleUrl);
	}

	function canStartOffline() {
		return Boolean(
			mapConfig.offlinePmtilesSources.length &&
				mapConfig.offlineSpriteUrl &&
				mapConfig.offlineGlyphsUrl &&
				mapConfig.offlineAssets.pmtiles &&
				mapConfig.offlineAssets.sprites &&
				mapConfig.offlineAssets.fonts &&
				mapConfig.offlineAssets.manifest
		);
	}

	function canAutoFallback() {
		return mapConfig.requestedMode === 'auto' && mapConfig.autoFallbackEnabled && canStartOffline();
	}

	function buildBboxParam(targetMap: maplibregl.Map) {
		const bounds = targetMap.getBounds();
		return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
			.map((value) => value.toFixed(6))
			.join(',');
	}

	function clearStartupTimer() {
		if (startupTimer) {
			clearTimeout(startupTimer);
			startupTimer = null;
		}
	}

	function resetOverlaySources() {
		if (map) {
			setEmisOverlayData(map, 'objects', EMPTY_FEATURE_COLLECTION);
			setEmisOverlayData(map, 'news', EMPTY_FEATURE_COLLECTION);
			setEmisOverlayData(map, 'vessels', EMPTY_FEATURE_COLLECTION);
			setEmisRouteData(map, EMPTY_FEATURE_COLLECTION, EMPTY_LINE_FEATURE_COLLECTION);
		}

		latestObjectsFC = null;
		latestNewsFC = null;
		latestVesselsFC = null;
		objectsCount = 0;
		newsCount = 0;
		vesselsCount = 0;
		routePointsCount = 0;
		routeSegmentsCount = 0;
		resolvedBbox = null;
		resolvedOverlayKey = null;
		resolvedRouteFocusKey = null;
	}

	function appendQueryParams(url: URL, params: Record<string, JsonValue>) {
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

	function destroyMapRuntime() {
		clearStartupTimer();
		activeOverlayAbortController?.abort();
		activeOverlayAbortController = null;
		vesselTooltip?.remove();
		vesselTooltip = null;
		popup?.remove();
		popup = null;
		map?.remove();
		map = null;
		if (protocolAttached) {
			releasePmtilesProtocol();
			protocolAttached = false;
		}
		mapLoaded = false;
		overlaysLoading = false;
		resetOverlaySources();
	}

	function applyMapLanguage(targetMap: maplibregl.Map) {
		const lang = mapConfig.mapLanguage;
		if (!lang) return;

		const nameKey = `name:${lang}`;
		const style = targetMap.getStyle();
		if (!style?.layers) return;

		for (const layer of style.layers) {
			const textField = (layer as any).layout?.['text-field'];
			if (!textField) continue;

			const replaced = replaceNameInExpression(textField, nameKey);
			if (replaced !== textField) {
				targetMap.setLayoutProperty(layer.id, 'text-field', replaced);
			}
		}
	}

	function replaceNameInExpression(expr: unknown, nameKey: string): unknown {
		if (typeof expr === 'string') {
			if (expr === '{name:en}') return `{${nameKey}}`;
			if (expr === '{name:latin}') return `{${nameKey}}`;
			return expr
				.replace(/\{name:en\}/g, `{${nameKey}}`)
				.replace(/\{name:latin\}/g, `{${nameKey}}`);
		}
		if (!Array.isArray(expr)) return expr;

		if (expr[0] === 'get' && (expr[1] === 'name:en' || expr[1] === 'name:latin')) {
			return ['coalesce', ['get', nameKey], ['get', 'name:en'], ['get', 'name']];
		}
		if (expr[0] === 'coalesce') {
			const hasNameEn = expr.some(
				(e: unknown) =>
					Array.isArray(e) && e[0] === 'get' && (e[1] === 'name:en' || e[1] === 'name:latin')
			);
			if (hasNameEn) {
				return ['coalesce', ['get', nameKey], ...expr.slice(1)];
			}
		}
		return expr.map((item: unknown) => replaceNameInExpression(item, nameKey));
	}

	function openFeaturePopup(feature: EmisMapSelectedFeature, lngLat: maplibregl.LngLatLike) {
		if (!map) return;

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
			.addTo(map);
		featurePopup.on('close', () => {
			popup = null;
		});
		popup = featurePopup;
	}

	function openRoutePopup(feature: EmisMapSelectedRouteFeature, lngLat: maplibregl.LngLatLike) {
		if (!map) return;

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
			.addTo(map);
		routePopup.on('close', () => {
			popup = null;
		});
		popup = routePopup;
	}

	function normalizeObjectFeature(
		properties: GeoJSON.GeoJsonProperties | null | undefined
	): EmisMapObjectFeatureProperties | null {
		if (
			!properties ||
			typeof properties.id !== 'string' ||
			typeof properties.title !== 'string' ||
			typeof properties.objectTypeId !== 'string' ||
			typeof properties.objectTypeCode !== 'string' ||
			typeof properties.objectTypeName !== 'string' ||
			typeof properties.status !== 'string' ||
			typeof properties.updatedAt !== 'string'
		) {
			return null;
		}

		return {
			id: properties.id,
			kind: 'object',
			title: properties.title,
			subtitle: typeof properties.subtitle === 'string' ? properties.subtitle : null,
			colorKey: typeof properties.colorKey === 'string' ? properties.colorKey : 'object',
			objectTypeId: properties.objectTypeId,
			objectTypeCode: properties.objectTypeCode,
			objectTypeName: properties.objectTypeName,
			countryCode: typeof properties.countryCode === 'string' ? properties.countryCode : null,
			region: typeof properties.region === 'string' ? properties.region : null,
			status: properties.status,
			updatedAt: properties.updatedAt
		};
	}

	function normalizeNewsFeature(
		properties: GeoJSON.GeoJsonProperties | null | undefined
	): EmisMapNewsFeatureProperties | null {
		if (
			!properties ||
			typeof properties.id !== 'string' ||
			typeof properties.title !== 'string' ||
			typeof properties.sourceId !== 'string' ||
			typeof properties.sourceName !== 'string' ||
			typeof properties.publishedAt !== 'string'
		) {
			return null;
		}

		return {
			id: properties.id,
			kind: 'news',
			title: properties.title,
			subtitle: typeof properties.subtitle === 'string' ? properties.subtitle : null,
			colorKey: typeof properties.colorKey === 'string' ? properties.colorKey : 'news',
			sourceId: properties.sourceId,
			sourceName: properties.sourceName,
			countryCode: typeof properties.countryCode === 'string' ? properties.countryCode : null,
			region: typeof properties.region === 'string' ? properties.region : null,
			newsType: typeof properties.newsType === 'string' ? properties.newsType : null,
			importance: typeof properties.importance === 'number' ? properties.importance : null,
			publishedAt: properties.publishedAt,
			relatedObjectsCount:
				typeof properties.relatedObjectsCount === 'number' ? properties.relatedObjectsCount : 0,
			summary: typeof properties.summary === 'string' ? properties.summary : null,
			url: typeof properties.url === 'string' ? properties.url : null
		};
	}

	function normalizeVesselFeature(
		properties: GeoJSON.GeoJsonProperties | null | undefined
	): EmisMapVesselFeatureProperties | null {
		if (
			!properties ||
			typeof properties.id !== 'string' ||
			typeof properties.title !== 'string' ||
			typeof properties.shipHbkId !== 'number' ||
			typeof properties.lastFetchedAt !== 'string' ||
			typeof properties.lastLatitude !== 'number' ||
			typeof properties.lastLongitude !== 'number'
		) {
			return null;
		}

		return {
			id: properties.id,
			kind: 'vessel',
			title: properties.title,
			subtitle: typeof properties.subtitle === 'string' ? properties.subtitle : null,
			colorKey: typeof properties.colorKey === 'string' ? properties.colorKey : 'vessel',
			shipHbkId: properties.shipHbkId,
			imo: typeof properties.imo === 'number' ? properties.imo : null,
			mmsi: typeof properties.mmsi === 'number' ? properties.mmsi : null,
			flag: typeof properties.flag === 'string' ? properties.flag : null,
			callsign: typeof properties.callsign === 'string' ? properties.callsign : null,
			vesselType: typeof properties.vesselType === 'string' ? properties.vesselType : null,
			lastFetchedAt: properties.lastFetchedAt,
			lastLatitude: properties.lastLatitude,
			lastLongitude: properties.lastLongitude,
			pointsCount: typeof properties.pointsCount === 'number' ? properties.pointsCount : 0,
			routeDaysCount: typeof properties.routeDaysCount === 'number' ? properties.routeDaysCount : 0
		};
	}

	function normalizeRoutePointFeature(
		properties: GeoJSON.GeoJsonProperties | null | undefined,
		geometry: GeoJSON.Geometry | null | undefined
	): EmisMapSelectedRouteFeature | null {
		if (
			!properties ||
			typeof properties.routePointId !== 'number' ||
			typeof properties.shipHbkId !== 'number' ||
			typeof properties.vesselName !== 'string' ||
			typeof properties.pointSeqShip !== 'number' ||
			typeof properties.fetchedAt !== 'string' ||
			!geometry ||
			geometry.type !== 'Point'
		) {
			return null;
		}

		return {
			kind: 'route-point',
			routePointId: properties.routePointId,
			shipHbkId: properties.shipHbkId,
			vesselName: properties.vesselName,
			pointSeqShip: properties.pointSeqShip,
			fetchedAt: properties.fetchedAt,
			latitude: Number(geometry.coordinates[1]),
			longitude: Number(geometry.coordinates[0]),
			speed: typeof properties.speed === 'number' ? properties.speed : null,
			course: typeof properties.course === 'number' ? properties.course : null,
			heading: typeof properties.heading === 'number' ? properties.heading : null
		};
	}

	function normalizeRouteSegmentFeature(
		properties: GeoJSON.GeoJsonProperties | null | undefined,
		geometry: GeoJSON.Geometry | null | undefined
	): EmisMapSelectedRouteFeature | null {
		if (
			!properties ||
			typeof properties.shipHbkId !== 'number' ||
			typeof properties.vesselName !== 'string' ||
			typeof properties.segmentSeqShip !== 'number' ||
			typeof properties.fromFetchedAt !== 'string' ||
			!geometry ||
			geometry.type !== 'LineString' ||
			geometry.coordinates.length < 2
		) {
			return null;
		}

		return {
			kind: 'route-segment',
			shipHbkId: properties.shipHbkId,
			vesselName: properties.vesselName,
			segmentSeqShip: properties.segmentSeqShip,
			fromFetchedAt: properties.fromFetchedAt,
			fromLatitude: Number(geometry.coordinates[0][1]),
			fromLongitude: Number(geometry.coordinates[0][0]),
			toLatitude: Number(geometry.coordinates[geometry.coordinates.length - 1][1]),
			toLongitude: Number(geometry.coordinates[geometry.coordinates.length - 1][0]),
			gapMinutes: typeof properties.gapMinutes === 'number' ? properties.gapMinutes : null,
			fromSpeed: typeof properties.fromSpeed === 'number' ? properties.fromSpeed : null,
			fromCourse: typeof properties.fromCourse === 'number' ? properties.fromCourse : null
		};
	}

	function bindOverlayInteractions(targetMap: maplibregl.Map) {
		const handleFeatureSelection = (
			feature: EmisMapSelectedFeature | null,
			lngLat: maplibregl.LngLatLike
		) => {
			if (!feature) return;
			onFeatureSelect?.(feature);
			openFeaturePopup(feature, lngLat);
		};
		const handleRouteFeatureSelection = (
			feature: EmisMapSelectedRouteFeature | null,
			lngLat: maplibregl.LngLatLike
		) => {
			if (!feature) return;
			onRouteFeatureSelect?.(feature);
			openRoutePopup(feature, lngLat);
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

			// Don't show tooltip if a click-popup is already open
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

	function syncRouteOverlays() {
		if (!map || !mapLoaded) return;

		setEmisRouteData(map, routePointsData, routeSegmentsData);
		routePointsCount = routePointsData.features.length;
		routeSegmentsCount = routeSegmentsData.features.length;
	}

	function buildRouteBounds() {
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

	function handleFitBounds() {
		if (!map) return;

		const bounds = new maplibregl.LngLatBounds();
		let hasFeatures = false;

		function extendFromFC(fc: GeoJSON.FeatureCollection | null) {
			if (!fc?.features?.length) return;
			for (const f of fc.features) {
				if (!f.geometry) continue;
				if (f.geometry.type === 'Point') {
					const [lng, lat] = f.geometry.coordinates;
					if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
					bounds.extend([lng, lat]);
					hasFeatures = true;
				} else if (f.geometry.type === 'LineString') {
					for (const [lng, lat] of f.geometry.coordinates) {
						if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
						bounds.extend([lng, lat]);
						hasFeatures = true;
					}
				}
			}
		}

		const showObjects = layer === 'all' || layer === 'objects';
		const showNews = layer === 'all' || layer === 'news' || layer === 'vessels+news';
		const showVessels = layer === 'vessels' || layer === 'vessels+news';

		if (showObjects) extendFromFC(latestObjectsFC);
		if (showNews) extendFromFC(latestNewsFC);
		if (showVessels) extendFromFC(latestVesselsFC);

		// Also include route data if present
		extendFromFC(routePointsData);
		extendFromFC(routeSegmentsData);

		if (hasFeatures) {
			map.fitBounds(bounds, { padding: 50, maxZoom: 12 });
		}
	}

	function maybeFitRouteBounds() {
		if (!map || !mapLoaded || routeFocusKey === null || routeFocusKey === resolvedRouteFocusKey) {
			return;
		}

		const bounds = buildRouteBounds();
		if (!bounds) return;

		resolvedRouteFocusKey = routeFocusKey;
		map.fitBounds(bounds, {
			padding: { top: 84, right: 72, bottom: 84, left: 72 },
			maxZoom: 8,
			duration: 900
		});
	}

	function getMapStyle(source: Exclude<BasemapSource, 'unavailable'>) {
		if (source === 'online') {
			return mapConfig.onlineStyleUrl;
		}

		if (
			!mapConfig.offlinePmtilesSources.length ||
			!mapConfig.offlineGlyphsUrl ||
			!mapConfig.offlineSpriteUrl
		) {
			return null;
		}

		return buildPmtilesStyle({
			sources: mapConfig.offlinePmtilesSources.map((pmtilesSource) => ({
				url: pmtilesSource.url,
				maxzoom: pmtilesSource.maxzoom
			})),
			glyphsUrl: mapConfig.offlineGlyphsUrl,
			spriteUrl: mapConfig.offlineSpriteUrl
		});
	}

	async function fetchFeatureCollection<
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

	async function refreshOverlays(reason: 'load' | 'moveend' | 'filters') {
		if (!map || !mapLoaded) return;

		const bbox = buildBboxParam(map);
		const objectsUrl = new URL('/api/emis/map/objects', window.location.origin);
		const newsUrl = new URL('/api/emis/map/news', window.location.origin);
		const vesselsUrl = new URL('/api/emis/map/vessels', window.location.origin);
		objectsUrl.searchParams.set('bbox', bbox);
		newsUrl.searchParams.set('bbox', bbox);
		vesselsUrl.searchParams.set('bbox', bbox);
		appendQueryParams(objectsUrl, objectsQuery);
		appendQueryParams(newsUrl, newsQuery);
		appendQueryParams(vesselsUrl, vesselsQuery);

		const overlayKey = [
			layer,
			bbox,
			objectsUrl.searchParams.toString(),
			newsUrl.searchParams.toString(),
			vesselsUrl.searchParams.toString()
		].join('|');

		if (reason !== 'load' && overlayKey === resolvedOverlayKey && !overlayError) {
			return;
		}

		overlayError = null;
		overlaysLoading = true;

		const requestId = ++activeOverlayRequestId;
		activeOverlayAbortController?.abort();

		const controller = new AbortController();
		activeOverlayAbortController = controller;

		try {
			const showObjects = layer === 'all' || layer === 'objects';
			const showNews = layer === 'all' || layer === 'news' || layer === 'vessels+news';
			const showVessels = layer === 'vessels' || layer === 'vessels+news';

			const objectsPromise = showObjects
				? fetchFeatureCollection<EmisMapObjectFeatureCollection>(
						`${objectsUrl.pathname}?${objectsUrl.searchParams.toString()}`,
						controller.signal
					)
				: Promise.resolve(EMPTY_FEATURE_COLLECTION as EmisMapObjectFeatureCollection);
			const newsPromise = showNews
				? fetchFeatureCollection<EmisMapNewsFeatureCollection>(
						`${newsUrl.pathname}?${newsUrl.searchParams.toString()}`,
						controller.signal
					)
				: Promise.resolve(EMPTY_FEATURE_COLLECTION as EmisMapNewsFeatureCollection);
			const vesselsPromise = showVessels
				? fetchFeatureCollection<EmisMapVesselFeatureCollection>(
						`${vesselsUrl.pathname}?${vesselsUrl.searchParams.toString()}`,
						controller.signal
					)
				: Promise.resolve(EMPTY_FEATURE_COLLECTION as EmisMapVesselFeatureCollection);
			const [objects, news, vessels] = await Promise.all([
				objectsPromise,
				newsPromise,
				vesselsPromise
			]);

			if (!map || controller.signal.aborted || requestId !== activeOverlayRequestId) {
				return;
			}

			setEmisOverlayData(map, 'objects', objects);
			setEmisOverlayData(map, 'news', news);
			setEmisOverlayData(map, 'vessels', vessels);
			latestObjectsFC = objects;
			latestNewsFC = news;
			latestVesselsFC = vessels;
			objectsCount = objects.features.length;
			newsCount = news.features.length;
			vesselsCount = vessels.features.length;
			resolvedBbox = bbox;
			resolvedOverlayKey = overlayKey;

			if (vessels.features.length > 0) {
				onVesselsLoaded?.({ features: vessels.features, total: vessels.features.length });
			}
			if (news.features.length > 0) {
				onNewsLoaded?.({ features: news.features, total: news.features.length });
			}
		} catch (error) {
			if (controller.signal.aborted) return;

			overlayError =
				error instanceof Error ? error.message : 'Unable to resolve EMIS overlay layers';
			resetOverlaySources();
		} finally {
			if (requestId === activeOverlayRequestId) {
				overlaysLoading = false;
			}
		}
	}

	function triggerAutoFallback(reason: string) {
		if (!canAutoFallback() || fallbackActivated) {
			clientError = reason;
			return;
		}

		fallbackActivated = true;
		runtimeNote =
			'Online basemap failed during startup. Switched once to the local PMTiles bundle.';
		startRuntime('offline', reason);
	}

	function startRuntime(
		source: Exclude<BasemapSource, 'unavailable'>,
		reason: string | null = null
	) {
		const style = getMapStyle(source);
		if (!container || !style) {
			activeBasemapSource = 'unavailable';
			clientError = 'No basemap configuration is available for the requested runtime.';
			return;
		}

		destroyMapRuntime();
		clientError = null;
		overlayError = null;
		activeBasemapSource = source;

		if (source === 'offline') {
			acquirePmtilesProtocol();
			protocolAttached = true;
			runtimeNote =
				runtimeNote ??
				(mapConfig.requestedMode === 'offline'
					? 'Using the local PMTiles basemap.'
					: 'Auto mode started directly with the local PMTiles basemap.');
		} else {
			runtimeNote =
				mapConfig.requestedMode === 'auto' && canAutoFallback()
					? 'Auto mode started with the online basemap and can fall back locally if startup fails.'
					: `Using ${mapConfig.onlineProvider} online basemap.`;
		}

		if (reason) {
			runtimeNote = `${runtimeNote} Reason: ${reason}`;
		}

		map = new maplibregl.Map({
			container,
			style,
			center: mapConfig.initialCenter,
			zoom: mapConfig.initialZoom,
			attributionControl: { compact: true }
		});

		if (source === 'online' && canAutoFallback()) {
			startupTimer = setTimeout(() => {
				if (!mapLoaded) {
					triggerAutoFallback(
						`Online basemap did not finish loading within ${AUTO_FALLBACK_TIMEOUT_MS / 1000} seconds.`
					);
				}
			}, AUTO_FALLBACK_TIMEOUT_MS);
		}

		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }));
		map.on('load', () => {
			clearStartupTimer();
			if (!map) return;
			applyMapLanguage(map);
			ensureEmisOverlayLayers(map);
			setEmisOverlaySelection(map, selectedFeature);
			setEmisRouteSelection(map, selectedRouteFeature);
			syncRouteOverlays();
			bindOverlayInteractions(map);
			mapLoaded = true;
			void refreshOverlays('load');
			maybeFitRouteBounds();
		});
		map.on('error', (event) => {
			const nextError =
				event.error instanceof Error ? event.error.message : 'Unknown map runtime error';
			if (source === 'online' && !mapLoaded && canAutoFallback()) {
				triggerAutoFallback(nextError);
				return;
			}

			clearStartupTimer();
			clientError = nextError;
		});
		map.on('moveend', () => {
			void refreshOverlays('moveend');
		});
	}

	function resolveInitialBasemapSource(): Exclude<BasemapSource, 'unavailable'> | null {
		if (mapConfig.effectiveMode === 'offline') {
			return canStartOffline() ? 'offline' : null;
		}

		if (mapConfig.effectiveMode === 'online') {
			return canStartOnline() ? 'online' : null;
		}

		if (mapConfig.effectiveMode === 'auto') {
			if (canStartOnline()) return 'online';
			if (canStartOffline()) return 'offline';
		}

		return null;
	}

	$effect(() => {
		const _layer = layer;
		const _objectsQuery = JSON.stringify(objectsQuery);
		const _newsQuery = JSON.stringify(newsQuery);
		const _vesselsQuery = JSON.stringify(vesselsQuery);

		if (!mapLoaded) return;

		void refreshOverlays('filters');
	});

	$effect(() => {
		const selection = selectedFeature;

		if (!mapLoaded || !map) return;

		setEmisOverlaySelection(map, selection);
	});

	$effect(() => {
		const selection = selectedRouteFeature;

		if (!mapLoaded || !map) return;

		setEmisRouteSelection(map, selection);
	});

	$effect(() => {
		const _routePointsKey = JSON.stringify(routePointsData);
		const _routeSegmentsKey = JSON.stringify(routeSegmentsData);

		if (!mapLoaded) return;

		syncRouteOverlays();
		maybeFitRouteBounds();
	});

	$effect(() => {
		const _routeFocusKey = routeFocusKey;

		if (!mapLoaded) return;

		maybeFitRouteBounds();
	});

	let lastFlyToKey: string | null = null;
	$effect(() => {
		const target = flyToTarget;

		if (!mapLoaded || !map || !target) return;

		const key = `${target.lng},${target.lat},${target.zoom ?? ''}`;
		if (key === lastFlyToKey) return;
		lastFlyToKey = key;

		map.flyTo({
			center: [target.lng, target.lat],
			zoom: target.zoom ?? 6,
			duration: 1200
		});
	});

	onMount(() => {
		const initialSource = resolveInitialBasemapSource();
		if (container && initialSource) {
			startRuntime(initialSource);
		}

		return () => {
			destroyMapRuntime();
		};
	});
</script>

<div class={cn('relative overflow-hidden rounded-2xl border border-border bg-muted/10', className)}>
	<div
		bind:this={container}
		class={cn(mapHeight, 'w-full bg-background/80')}
		aria-label="EMIS map canvas"
	></div>

	{#if showFitBounds && mapLoaded}
		<button
			type="button"
			class="absolute bottom-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-muted"
			onclick={handleFitBounds}
			title="Показать все объекты"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
			</svg>
		</button>
	{/if}

	<!-- Map legend -->
	{#if mapLoaded}
		<div
			class="absolute right-3 bottom-3 z-10 rounded-md border border-border/60 bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm"
		>
			<div class="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
				Обозначения
			</div>
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-2">
					<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#4589ff"></span>
					<span class="text-[11px] text-foreground/80">Позиция судна</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#da1e28"></span>
					<span class="text-[11px] text-foreground/80">Критическое событие</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#a2191f"></span>
					<span class="text-[11px] text-foreground/80">Важное событие</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#f1c21b"></span>
					<span class="text-[11px] text-foreground/80">Событие средней важности</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#198038"></span>
					<span class="text-[11px] text-foreground/80"
						>Незначительное событие / Активный объект</span
					>
				</div>
				<div class="flex items-center gap-2">
					<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#525252"></span>
					<span class="text-[11px] text-foreground/80">Архивный объект / Без категории</span>
				</div>
			</div>
		</div>
	{/if}

	{#if !mapLoaded && !clientError && activeBasemapSource !== 'unavailable'}
		<div
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]"
		>
			<div
				class="flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs text-muted-foreground"
			>
				<svg
					class="size-3.5 animate-spin text-muted-foreground/70"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
				Загружаем карту...
			</div>
		</div>
	{/if}

	{#if diagnostics}
		<div class="pointer-events-none absolute top-3 left-3 max-w-[min(92%,30rem)] space-y-2">
			<div
				class={cn(
					'rounded-xl border px-3 py-2 text-xs shadow-sm backdrop-blur-sm',
					getStatusTone()
				)}
			>
				<div class="flex flex-wrap items-center gap-2">
					<span class="font-semibold tracking-[0.18em] uppercase">Map</span>
					<span class="rounded-full border border-current/20 px-2 py-0.5">
						requested: {mapConfig.requestedMode}
					</span>
					<span class="rounded-full border border-current/20 px-2 py-0.5">
						effective: {mapConfig.effectiveMode}
					</span>
					<span class="rounded-full border border-current/20 px-2 py-0.5">
						active: {getActiveBasemapLabel()}
					</span>
					<span class="rounded-full border border-current/20 px-2 py-0.5">
						status: {mapConfig.runtimeStatus}
					</span>
				</div>
				<p class="mt-2 leading-relaxed">{mapConfig.statusMessage}</p>
				{#if runtimeNote}
					<p class="mt-2 leading-relaxed">{runtimeNote}</p>
				{/if}
			</div>

			<div
				class="rounded-xl border border-border/70 bg-background/92 px-3 py-2 text-xs text-muted-foreground shadow-sm"
			>
				<div class="grid gap-1">
					<div>
						<span class="font-medium text-foreground">Online style:</span>
						{mapConfig.onlineStyleUrl ?? 'not configured'}
					</div>
					<div>
						<span class="font-medium text-foreground">Offline PMTiles:</span>
						{mapConfig.offlinePmtilesUrl ?? 'not configured'}
					</div>
					<div>
						<span class="font-medium text-foreground">Offline sources:</span>
						{mapConfig.offlinePmtilesSources.length}
					</div>
					<div>
						<span class="font-medium text-foreground">Offline glyphs:</span>
						{mapConfig.offlineGlyphsUrl ?? 'not configured'}
					</div>
					<div>
						<span class="font-medium text-foreground">Offline sprite:</span>
						{mapConfig.offlineSpriteUrl ?? 'not configured'}
					</div>
					<div>
						<span class="font-medium text-foreground">Asset root:</span>
						{mapConfig.assetRootUrl}
					</div>
					<div>
						<span class="font-medium text-foreground">Checked:</span>
						{new Date(mapConfig.checkedAt).toLocaleString()}
					</div>
				</div>
			</div>

			<div
				class="rounded-xl border border-border/70 bg-background/92 px-3 py-2 text-xs text-muted-foreground shadow-sm"
			>
				<div class="flex items-center justify-between gap-3">
					<span class="font-medium text-foreground">Overlay layers</span>
					<span class="rounded-full border border-border/60 px-2 py-0.5 uppercase">
						{overlaysLoading ? 'loading' : 'live'}
					</span>
				</div>
				<div class="mt-2 grid gap-1">
					<div>
						<span class="font-medium text-foreground">Objects:</span>
						{objectsCount}
					</div>
					<div>
						<span class="font-medium text-foreground">News:</span>
						{newsCount}
					</div>
					<div>
						<span class="font-medium text-foreground">Vessels:</span>
						{vesselsCount}
					</div>
					<div>
						<span class="font-medium text-foreground">Route points:</span>
						{routePointsCount}
					</div>
					<div>
						<span class="font-medium text-foreground">Route segments:</span>
						{routeSegmentsCount}
					</div>
					<div>
						<span class="font-medium text-foreground">Viewport bbox:</span>
						{resolvedBbox ?? 'pending'}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if clientError}
		<div
			class="absolute inset-x-3 bottom-3 rounded-xl border border-error/30 bg-background/95 p-3 text-sm text-error"
		>
			<div class="font-medium">Map runtime error</div>
			<p class="mt-1 text-xs text-muted-foreground">{clientError}</p>
		</div>
	{:else if overlayError}
		<div
			class="absolute inset-x-3 bottom-3 rounded-xl border border-warning/30 bg-background/95 p-3 text-sm text-muted-foreground"
		>
			<div class="font-medium text-foreground">Overlay endpoints недоступны</div>
			<p class="mt-1 text-xs leading-relaxed">{overlayError}</p>
		</div>
	{:else if mapConfig.runtimeStatus === 'missing-assets' || mapConfig.runtimeStatus === 'misconfigured'}
		<div
			class="absolute inset-x-3 bottom-3 rounded-xl border border-warning/30 bg-background/95 p-3 text-sm text-muted-foreground"
		>
			<div class="font-medium text-foreground">Карта ожидает online/offline basemap contract</div>
			<p class="mt-1 text-xs leading-relaxed">
				Сейчас runtime не стартует, потому что не хватает online style или локального PMTiles
				bundle. Настройте <span class="font-mono">EMIS_MAP_MODE=auto</span> вместе с
				<span class="font-mono">EMIS_MAPTILER_KEY</span> для online basemap и подготовьте offline
				assets через <span class="font-mono">pnpm map:pmtiles:setup</span> или
				<span class="font-mono"
					>pnpm map:assets:install -- --source /abs/path/to/offline-bundle</span
				>.
			</p>
		</div>
	{/if}
</div>
