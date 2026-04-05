<script lang="ts">
	import type { EmisMapConfig } from '@dashboard-builder/emis-contracts/emis-map';
	import type { BasemapSource } from './overlay-fetch';

	interface Props {
		mapConfig: EmisMapConfig;
		activeBasemapSource: BasemapSource;
		fallbackActivated: boolean;
		runtimeNote: string | null;
		overlaysLoading: boolean;
		objectsCount: number;
		newsCount: number;
		vesselsCount: number;
		routePointsCount: number;
		routeSegmentsCount: number;
		resolvedBbox: string | null;
	}

	let {
		mapConfig,
		activeBasemapSource,
		fallbackActivated,
		runtimeNote,
		overlaysLoading,
		objectsCount,
		newsCount,
		vesselsCount,
		routePointsCount,
		routeSegmentsCount,
		resolvedBbox
	}: Props = $props();

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
</script>

<div class="pointer-events-none absolute top-3 left-3 max-w-[min(92%,30rem)] space-y-2">
	<div class="rounded-xl border px-3 py-2 text-xs shadow-sm backdrop-blur-sm {getStatusTone()}">
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
