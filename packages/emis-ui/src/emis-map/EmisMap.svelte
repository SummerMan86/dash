<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import type {
		EmisMapConfig,
		EmisMapFeatureRef,
		EmisMapRouteFeatureRef,
		EmisMapSelectedFeature,
		EmisMapSelectedRouteFeature,
		EmisMapNewsFeatureCollection,
		EmisMapObjectFeatureCollection,
		EmisMapVesselFeatureCollection
	} from '@dashboard-builder/emis-contracts/emis-map';
	import type { JsonValue } from '@dashboard-builder/platform-core';
	import { cn } from '@dashboard-builder/platform-ui';
	import DiagnosticsHud from './DiagnosticsHud.svelte';
	import {
		EMPTY_FEATURE_COLLECTION,
		EMPTY_LINE_FEATURE_COLLECTION,
		ensureEmisOverlayLayers,
		setEmisOverlayData,
		setEmisRouteData,
		setEmisOverlaySelection,
		setEmisRouteSelection
	} from './layer-config';
	import {
		type EmisLayerMode,
		type FlyToTarget,
		type OverlayFeatureData,
		fetchFeatureCollection,
		buildOverlayUrls,
		buildOverlayKey,
		resolveVisibleLayers
	} from './overlay-fetch';
	import { acquirePmtilesProtocol, releasePmtilesProtocol } from './pmtiles-protocol';
	import { buildPmtilesStyle } from './pmtiles-style';
	import { createEmisMapInteractions } from './map-interactions';
	import {
		fitVisibleEmisBounds,
		maybeFitRouteBounds as updateRouteFocusBounds
	} from './map-bounds';

	import type { BasemapSource } from './overlay-fetch';

	const AUTO_FALLBACK_TIMEOUT_MS = 7000;

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
		onBoundsChange?: (bbox: string) => void;
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
		onBoundsChange,
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
	const interactions = createEmisMapInteractions({
		getOnFeatureSelect: () => onFeatureSelect,
		getOnRouteFeatureSelect: () => onRouteFeatureSelect
	});
	let latestObjectsFC: GeoJSON.FeatureCollection | null = null;
	let latestNewsFC: GeoJSON.FeatureCollection | null = null;
	let latestVesselsFC: GeoJSON.FeatureCollection | null = null;
	let activeOverlayRequestId = 0;
	let activeOverlayAbortController: AbortController | null = null;
	let startupTimer: ReturnType<typeof setTimeout> | null = null;
	let protocolAttached = false;
	let resolvedRouteFocusKey: string | number | null = null;

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

	function destroyMapRuntime() {
		clearStartupTimer();
		activeOverlayAbortController?.abort();
		activeOverlayAbortController = null;
		interactions.destroy();
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

	function syncRouteOverlays() {
		if (!map || !mapLoaded) return;

		setEmisRouteData(map, routePointsData, routeSegmentsData);
		routePointsCount = routePointsData.features.length;
		routeSegmentsCount = routeSegmentsData.features.length;
	}

	function maybeFitRouteBounds() {
		if (!map || !mapLoaded) return;
		resolvedRouteFocusKey = updateRouteFocusBounds({
			map,
			routePointsData,
			routeSegmentsData,
			routeFocusKey,
			resolvedRouteFocusKey
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

	async function refreshOverlays(reason: 'load' | 'moveend' | 'filters') {
		if (!map || !mapLoaded) return;

		const bbox = buildBboxParam(map);
		const urls = buildOverlayUrls(bbox, objectsQuery, newsQuery, vesselsQuery);
		const overlayKey = buildOverlayKey(layer, bbox, urls);

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
			const { showObjects, showNews, showVessels } = resolveVisibleLayers(layer);

			const objectsPromise = showObjects
				? fetchFeatureCollection<EmisMapObjectFeatureCollection>(
						`${urls.objectsUrl.pathname}?${urls.objectsUrl.searchParams.toString()}`,
						controller.signal
					)
				: Promise.resolve(EMPTY_FEATURE_COLLECTION as EmisMapObjectFeatureCollection);
			const newsPromise = showNews
				? fetchFeatureCollection<EmisMapNewsFeatureCollection>(
						`${urls.newsUrl.pathname}?${urls.newsUrl.searchParams.toString()}`,
						controller.signal
					)
				: Promise.resolve(EMPTY_FEATURE_COLLECTION as EmisMapNewsFeatureCollection);
			const vesselsPromise = showVessels
				? fetchFeatureCollection<EmisMapVesselFeatureCollection>(
						`${urls.vesselsUrl.pathname}?${urls.vesselsUrl.searchParams.toString()}`,
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
			onBoundsChange?.(bbox);

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
			interactions.bindOverlayInteractions(map);
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
			onclick={() => {
				if (!map) return;
				fitVisibleEmisBounds({
					map,
					layer,
					latestObjectsFC,
					latestNewsFC,
					latestVesselsFC,
					routePointsData,
					routeSegmentsData
				});
			}}
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
		<DiagnosticsHud
			{mapConfig}
			{activeBasemapSource}
			{fallbackActivated}
			{runtimeNote}
			{overlaysLoading}
			{objectsCount}
			{newsCount}
			{vesselsCount}
			{routePointsCount}
			{routeSegmentsCount}
			{resolvedBbox}
		/>
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
