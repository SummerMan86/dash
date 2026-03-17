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
		EmisMapSelectedFeature
	} from '$entities/emis-map';
	import type { JsonValue } from '$entities/dataset';
	import { cn } from '$shared/styles/utils';
	import {
		EMPTY_FEATURE_COLLECTION,
		EMPTY_LINE_FEATURE_COLLECTION,
		ensureEmisOverlayLayers,
		EMIS_MAP_LAYER_IDS,
		setEmisOverlayData,
		setEmisRouteData,
		setEmisOverlaySelection
	} from './layer-config';
	import { acquirePmtilesProtocol, releasePmtilesProtocol } from './pmtiles-protocol';
	import { renderFeaturePopupContent } from './popup-renderers';
	import { buildPmtilesStyle } from './pmtiles-style';

	const AUTO_FALLBACK_TIMEOUT_MS = 7000;

	type BasemapSource = 'online' | 'offline' | 'unavailable';
	type EmisLayerMode = 'all' | 'objects' | 'news';

	interface Props {
		mapConfig: EmisMapConfig;
		objectsQuery?: Record<string, JsonValue>;
		newsQuery?: Record<string, JsonValue>;
		routePointsData?: GeoJSON.FeatureCollection<GeoJSON.Point>;
		routeSegmentsData?: GeoJSON.FeatureCollection<GeoJSON.LineString>;
		routeFocusKey?: string | number | null;
		layer?: EmisLayerMode;
		selectedFeature?: EmisMapFeatureRef | null;
		onFeatureSelect?: (feature: EmisMapSelectedFeature) => void;
		class?: string;
	}

	let {
		mapConfig,
		objectsQuery = {},
		newsQuery = {},
		routePointsData = EMPTY_FEATURE_COLLECTION as GeoJSON.FeatureCollection<GeoJSON.Point>,
		routeSegmentsData = EMPTY_LINE_FEATURE_COLLECTION as GeoJSON.FeatureCollection<GeoJSON.LineString>,
		routeFocusKey = null,
		layer = 'all',
		selectedFeature = null,
		onFeatureSelect,
		class: className
	}: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let mapLoaded = $state(false);
	let clientError = $state<string | null>(null);
	let overlayError = $state<string | null>(null);
	let overlaysLoading = $state(false);
	let objectsCount = $state(0);
	let newsCount = $state(0);
	let routePointsCount = $state(0);
	let routeSegmentsCount = $state(0);
	let resolvedBbox = $state<string | null>(null);
	let resolvedOverlayKey = $state<string | null>(null);
	let activeBasemapSource = $state<BasemapSource>('unavailable');
	let runtimeNote = $state<string | null>(null);
	let fallbackActivated = $state(false);

	let map: maplibregl.Map | null = null;
	let activeOverlayRequestId = 0;
	let activeOverlayAbortController: AbortController | null = null;
	let startupTimer: ReturnType<typeof setTimeout> | null = null;
	let protocolAttached = false;
	let popup: maplibregl.Popup | null = null;
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
			setEmisRouteData(map, EMPTY_FEATURE_COLLECTION, EMPTY_LINE_FEATURE_COLLECTION);
		}

		objectsCount = 0;
		newsCount = 0;
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

	function openFeaturePopup(
		feature: EmisMapSelectedFeature,
		lngLat: maplibregl.LngLatLike
	) {
		if (!map) return;

		popup?.remove();
		popup = new maplibregl.Popup({
			closeButton: true,
			closeOnClick: true,
			maxWidth: '320px',
			offset: 16
		})
			.setLngLat(lngLat)
			.setDOMContent(renderFeaturePopupContent(feature))
			.addTo(map);
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
				typeof properties.relatedObjectsCount === 'number' ? properties.relatedObjectsCount : 0
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

		targetMap.on('click', EMIS_MAP_LAYER_IDS.objects, (event) => {
			handleFeatureSelection(normalizeObjectFeature(event.features?.[0]?.properties), event.lngLat);
		});

		targetMap.on('click', EMIS_MAP_LAYER_IDS.news, (event) => {
			handleFeatureSelection(normalizeNewsFeature(event.features?.[0]?.properties), event.lngLat);
		});

		targetMap.on('mouseenter', EMIS_MAP_LAYER_IDS.objects, () => {
			targetMap.getCanvas().style.cursor = 'pointer';
		});
		targetMap.on('mouseenter', EMIS_MAP_LAYER_IDS.news, () => {
			targetMap.getCanvas().style.cursor = 'pointer';
		});
		targetMap.on('mouseleave', EMIS_MAP_LAYER_IDS.objects, () => {
			targetMap.getCanvas().style.cursor = '';
		});
		targetMap.on('mouseleave', EMIS_MAP_LAYER_IDS.news, () => {
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
		T extends EmisMapObjectFeatureCollection | EmisMapNewsFeatureCollection
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
		objectsUrl.searchParams.set('bbox', bbox);
		newsUrl.searchParams.set('bbox', bbox);
		appendQueryParams(objectsUrl, objectsQuery);
		appendQueryParams(newsUrl, newsQuery);

		const overlayKey = [
			layer,
			bbox,
			objectsUrl.searchParams.toString(),
			newsUrl.searchParams.toString()
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
			const objectsPromise =
				layer === 'news'
					? Promise.resolve(EMPTY_FEATURE_COLLECTION as EmisMapObjectFeatureCollection)
					: fetchFeatureCollection<EmisMapObjectFeatureCollection>(
							`${objectsUrl.pathname}?${objectsUrl.searchParams.toString()}`,
							controller.signal
						);
			const newsPromise =
				layer === 'objects'
					? Promise.resolve(EMPTY_FEATURE_COLLECTION as EmisMapNewsFeatureCollection)
					: fetchFeatureCollection<EmisMapNewsFeatureCollection>(
							`${newsUrl.pathname}?${newsUrl.searchParams.toString()}`,
							controller.signal
						);
			const [objects, news] = await Promise.all([objectsPromise, newsPromise]);

			if (!map || controller.signal.aborted || requestId !== activeOverlayRequestId) {
				return;
			}

			setEmisOverlayData(map, 'objects', objects);
			setEmisOverlayData(map, 'news', news);
			objectsCount = objects.features.length;
			newsCount = news.features.length;
			resolvedBbox = bbox;
			resolvedOverlayKey = overlayKey;
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
			ensureEmisOverlayLayers(map);
			setEmisOverlaySelection(map, selectedFeature);
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

		if (!mapLoaded) return;

		void refreshOverlays('filters');
	});

	$effect(() => {
		const selection = selectedFeature;

		if (!mapLoaded || !map) return;

		setEmisOverlaySelection(map, selection);
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
		class="h-[420px] w-full bg-background/80"
		aria-label="EMIS map canvas"
	></div>

	{#if !mapLoaded && !clientError && activeBasemapSource !== 'unavailable'}
		<div
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]"
		>
			<div
				class="rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs text-muted-foreground"
			>
				Загружаем карту...
			</div>
		</div>
	{/if}

	<div class="pointer-events-none absolute top-3 left-3 max-w-[min(92%,30rem)] space-y-2">
		<div
			class={cn('rounded-xl border px-3 py-2 text-xs shadow-sm backdrop-blur-sm', getStatusTone())}
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
