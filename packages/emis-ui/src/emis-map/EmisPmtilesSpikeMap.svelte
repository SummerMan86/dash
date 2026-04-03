<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import { cn } from '@dashboard-builder/platform-ui';
	import {
		EMPTY_FEATURE_COLLECTION,
		ensureEmisOverlayLayers,
		setEmisOverlayData
	} from './layer-config';
	import { acquirePmtilesProtocol, releasePmtilesProtocol } from './pmtiles-protocol';
	import { buildPmtilesStyle, type PmtilesSourceDef } from './pmtiles-style';

	interface Props {
		sources: PmtilesSourceDef[];
		glyphsUrl: string;
		spriteUrl: string;
		class?: string;
	}

	let { sources, glyphsUrl, spriteUrl, class: className }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let mapLoaded = $state(false);
	let clientError = $state<string | null>(null);
	let overlayError = $state<string | null>(null);
	let overlaysLoading = $state(false);
	let objectsCount = $state(0);
	let newsCount = $state(0);
	let resolvedBbox = $state<string | null>(null);

	let map: maplibregl.Map | null = null;
	let activeOverlayRequestId = 0;
	let activeOverlayAbortController: AbortController | null = null;

	function buildBboxParam(targetMap: maplibregl.Map) {
		const bounds = targetMap.getBounds();
		return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
			.map((value) => value.toFixed(6))
			.join(',');
	}

	async function fetchFeatureCollection<T extends GeoJSON.FeatureCollection>(
		url: string,
		signal: AbortSignal
	): Promise<T> {
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

	function resetOverlaySources() {
		if (!map) return;

		setEmisOverlayData(map, 'objects', EMPTY_FEATURE_COLLECTION);
		setEmisOverlayData(map, 'news', EMPTY_FEATURE_COLLECTION);
		objectsCount = 0;
		newsCount = 0;
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
				fetchFeatureCollection<GeoJSON.FeatureCollection>(
					`/api/emis/map/objects?bbox=${encodeURIComponent(bbox)}`,
					controller.signal
				),
				fetchFeatureCollection<GeoJSON.FeatureCollection>(
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

	onMount(() => {
		if (!container) {
			return;
		}

		acquirePmtilesProtocol();

		map = new maplibregl.Map({
			container,
			style: buildPmtilesStyle({
				sources,
				glyphsUrl,
				spriteUrl
			}),
			center: [30, 35],
			zoom: 2.2,
			attributionControl: { compact: true }
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }));
		map.on('load', () => {
			if (!map) return;
			ensureEmisOverlayLayers(map);
			mapLoaded = true;
			void refreshOverlays('load');
		});
		map.on('error', (event) => {
			const nextError =
				event.error instanceof Error ? event.error.message : 'Unknown PMTiles map runtime error';
			clientError = nextError;
		});
		map.on('moveend', () => {
			void refreshOverlays('moveend');
		});

		return () => {
			activeOverlayAbortController?.abort();
			map?.remove();
			map = null;
			releasePmtilesProtocol();
		};
	});
</script>

<div class={cn('relative overflow-hidden rounded-2xl border border-border bg-muted/10', className)}>
	<div
		bind:this={container}
		class="h-[460px] w-full bg-background/80"
		aria-label="EMIS PMTiles spike canvas"
	></div>

	{#if !mapLoaded && !clientError}
		<div
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]"
		>
			<div
				class="rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs text-muted-foreground"
			>
				Загружаем PMTiles spike...
			</div>
		</div>
	{/if}

	<div class="pointer-events-none absolute top-3 left-3 max-w-[min(92%,28rem)] space-y-2">
		<div
			class="rounded-xl border border-border/70 bg-background/92 px-3 py-2 text-xs text-muted-foreground shadow-sm"
		>
			<div class="flex flex-wrap items-center gap-2">
				<span class="font-semibold tracking-[0.18em] text-foreground uppercase">PMTiles Spike</span>
				<span class="rounded-full border border-border/60 px-2 py-0.5 uppercase">
					{overlaysLoading ? 'loading' : 'live'}
				</span>
			</div>
			<div class="mt-2 grid gap-1">
				{#each sources as src}
					<div>
						<span class="font-medium text-foreground">Archive:</span>
						{src.url}{src.maxzoom != null ? ` (z≤${src.maxzoom})` : ''}
					</div>
				{/each}
				<div>
					<span class="font-medium text-foreground">Glyphs:</span>
					{glyphsUrl}
				</div>
				<div>
					<span class="font-medium text-foreground">Sprite:</span>
					{spriteUrl}
				</div>
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
			<div class="font-medium">PMTiles runtime error</div>
			<p class="mt-1 text-xs text-muted-foreground">{clientError}</p>
		</div>
	{:else if overlayError}
		<div
			class="absolute inset-x-3 bottom-3 rounded-xl border border-warning/30 bg-background/95 p-3 text-sm text-muted-foreground"
		>
			<div class="font-medium text-foreground">Overlay endpoints недоступны</div>
			<p class="mt-1 text-xs leading-relaxed">{overlayError}</p>
		</div>
	{/if}
</div>
