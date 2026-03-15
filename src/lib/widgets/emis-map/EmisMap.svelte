<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import type { EmisMapConfig } from '$entities/emis-map';
	import { cn } from '$shared/styles/utils';

	interface Props {
		mapConfig: EmisMapConfig;
		class?: string;
	}

	let { mapConfig, class: className }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let mapLoaded = $state(false);
	let clientError = $state<string | null>(null);

	function getStatusTone() {
		if (mapConfig.runtimeStatus === 'ready')
			return 'border-success/30 bg-success-muted/50 text-success-muted-foreground';
		if (mapConfig.runtimeStatus === 'fallback-online') {
			return 'border-warning/30 bg-warning-muted/50 text-warning-muted-foreground';
		}
		return 'border-error/30 bg-error-muted/50 text-error-muted-foreground';
	}

	onMount(() => {
		if (!container || !mapConfig.styleUrl) {
			return;
		}

		if (
			mapConfig.runtimeStatus === 'missing-assets' ||
			mapConfig.runtimeStatus === 'misconfigured'
		) {
			return;
		}

		const map = new maplibregl.Map({
			container,
			style: mapConfig.styleUrl,
			center: mapConfig.initialCenter,
			zoom: mapConfig.initialZoom,
			attributionControl: { compact: true }
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }));
		map.on('load', () => {
			mapLoaded = true;
		});
		map.on('error', (event) => {
			const nextError =
				event.error instanceof Error ? event.error.message : 'Unknown map runtime error';
			clientError = nextError;
		});

		return () => {
			map.remove();
		};
	});
</script>

<div class={cn('relative overflow-hidden rounded-2xl border border-border bg-muted/10', className)}>
	<div
		bind:this={container}
		class="h-[420px] w-full bg-background/80"
		aria-label="EMIS map canvas"
	></div>

	{#if !mapLoaded && !clientError && mapConfig.styleUrl}
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

	<div class="pointer-events-none absolute top-3 left-3 max-w-[min(92%,28rem)] space-y-2">
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
					status: {mapConfig.runtimeStatus}
				</span>
			</div>
			<p class="mt-2 leading-relaxed">{mapConfig.statusMessage}</p>
		</div>

		<div
			class="rounded-xl border border-border/70 bg-background/92 px-3 py-2 text-xs text-muted-foreground shadow-sm"
		>
			<div class="grid gap-1">
				<div>
					<span class="font-medium text-foreground">Style:</span>
					{mapConfig.styleUrl ?? 'not configured'}
				</div>
				<div>
					<span class="font-medium text-foreground">Tiles:</span>
					{mapConfig.tilesUrl ?? 'defined inside style.json or unavailable'}
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
	</div>

	{#if clientError}
		<div
			class="absolute inset-x-3 bottom-3 rounded-xl border border-error/30 bg-background/95 p-3 text-sm text-error"
		>
			<div class="font-medium">Map runtime error</div>
			<p class="mt-1 text-xs text-muted-foreground">{clientError}</p>
		</div>
	{:else if mapConfig.runtimeStatus === 'missing-assets' || mapConfig.runtimeStatus === 'misconfigured'}
		<div
			class="absolute inset-x-3 bottom-3 rounded-xl border border-warning/30 bg-background/95 p-3 text-sm text-muted-foreground"
		>
			<div class="font-medium text-foreground">Карта ожидает offline bundle</div>
			<p class="mt-1 text-xs leading-relaxed">
				Сейчас map runtime не стартует, потому что не хватает локальных assets или style URL.
				Установите offline bundle через <span class="font-mono"
					>pnpm map:assets:install -- --source /abs/path/to/bundle</span
				>
				или задайте online style для controlled fallback.
			</p>
		</div>
	{/if}
</div>
