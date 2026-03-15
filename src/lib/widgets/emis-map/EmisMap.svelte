<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import type {
		EmisMapConfig,
		EmisMapNewsFeatureCollection,
		EmisMapObjectFeatureCollection
	} from '$entities/emis-map';
	import { cn } from '$shared/styles/utils';
	import {
		EMPTY_FEATURE_COLLECTION,
		ensureEmisOverlayLayers,
		setEmisOverlayData
	} from './layer-config';
	import { acquirePmtilesProtocol, releasePmtilesProtocol } from './pmtiles-protocol';
	import { buildPmtilesStyle } from './pmtiles-style';

	const AUTO_FALLBACK_TIMEOUT_MS = 7000;

	type BasemapSource = 'online' | 'offline' | 'unavailable';

	interface Props {
		mapConfig: EmisMapConfig;
		class?: string;
	}

	let { mapConfig, class: className }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let mapLoaded = $state(false);
	let clientError = $state<string | null>(null);
	let overlayError = $state<string | null>(null);
	let overlaysLoading = $state(false);
	let objectsCount = $state(0);
	let newsCount = $state(0);
	let resolvedBbox = $state<string | null>(null);
	let activeBasemapSource = $state<BasemapSource>('unavailable');
	let runtimeNote = $state<string | null>(null);
	let fallbackActivated = $state(false);

	let map: maplibregl.Map | null = null;
	let activeOverlayRequestId = 0;
	let activeOverlayAbortController: AbortController | null = null;
	let startupTimer: ReturnType<typeof setTimeout> | null = null;
	let protocolAttached = false;

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
		}

		objectsCount = 0;
		newsCount = 0;
		resolvedBbox = null;
	}

	function destroyMapRuntime() {
		clearStartupTimer();
		activeOverlayAbortController?.abort();
		activeOverlayAbortController = null;
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

	async function refreshOverlays(reason: 'load' | 'moveend') {
		if (!map || !mapLoaded) return;

		const bbox = buildBboxParam(map);
		if (reason !== 'load' && bbox === resolvedBbox && !overlayError) {
			return;
		}

		overlayError = null;
		overlaysLoading = true;

		const requestId = ++activeOverlayRequestId;
		activeOverlayAbortController?.abort();

		const controller = new AbortController();
		activeOverlayAbortController = controller;

		try {
			const [objects, news] = await Promise.all([
				fetchFeatureCollection<EmisMapObjectFeatureCollection>(
					`/api/emis/map/objects?bbox=${encodeURIComponent(bbox)}`,
					controller.signal
				),
				fetchFeatureCollection<EmisMapNewsFeatureCollection>(
					`/api/emis/map/news?bbox=${encodeURIComponent(bbox)}`,
					controller.signal
				)
			]);

			if (!map || controller.signal.aborted || requestId !== activeOverlayRequestId) {
				return;
			}

			setEmisOverlayData(map, 'objects', objects);
			setEmisOverlayData(map, 'news', news);
			objectsCount = objects.features.length;
			newsCount = news.features.length;
			resolvedBbox = bbox;
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
			mapLoaded = true;
			void refreshOverlays('load');
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
