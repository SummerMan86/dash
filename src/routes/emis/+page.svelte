<script lang="ts">
	import type { PageData } from './$types';

	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
	import { EmisMap } from '$widgets/emis-map';

	let { data }: { data: PageData } = $props();

	const assetChecklist = [
		{ key: 'pmtiles', label: '.pmtiles archive', ready: data.mapConfig.offlineAssets.pmtiles },
		{ key: 'sprites', label: 'sprites', ready: data.mapConfig.offlineAssets.sprites },
		{ key: 'fonts', label: 'fonts', ready: data.mapConfig.offlineAssets.fonts },
		{ key: 'manifest', label: 'manifest.json', ready: data.mapConfig.offlineAssets.manifest }
	];

	function toneClass(ready: boolean) {
		return ready
			? 'border-success/30 bg-success-muted/50 text-success-muted-foreground'
			: 'border-warning/30 bg-warning-muted/40 text-warning-muted-foreground';
	}
</script>

<svelte:head>
	<title>EMIS Workspace</title>
	<meta
		name="description"
		content="EMIS workspace with MapTiler online basemap, local PMTiles offline bundle, and controlled auto fallback."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="space-y-3">
			<div class="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">EMIS</div>
			<div class="space-y-2">
				<h1 class="text-3xl font-semibold tracking-tight">Workspace + PMTiles Runtime</h1>
				<p class="max-w-4xl text-sm text-muted-foreground">
					EMIS теперь использует basemap contract вида
					<span class="font-mono">online (MapTiler or custom style)</span> +
					<span class="font-mono"> offline (local PMTiles)</span> +
					<span class="font-mono"> auto</span>. В auto-режиме карта стартует online и один раз
					переключается на локальный PMTiles bundle, если online basemap не поднялся при запуске.
				</p>
			</div>
		</header>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
			<Card class="overflow-hidden">
				<CardHeader class="border-b border-border/60 bg-muted/10">
					<CardTitle>EMIS Map Runtime</CardTitle>
					<CardDescription>
						MapLibre widget читает server-side config, работает с online style и локальным PMTiles
						bundle, сохраняя overlay endpoints поверх basemap.
					</CardDescription>
				</CardHeader>
				<CardContent class="p-4">
					<EmisMap mapConfig={data.mapConfig} />
				</CardContent>
			</Card>

			<div class="flex flex-col gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Map Config</CardTitle>
						<CardDescription>Текущий server-resolved runtime profile</CardDescription>
					</CardHeader>
					<CardContent class="space-y-3 text-sm text-muted-foreground">
						<div class="grid gap-2">
							<div>
								<span class="font-medium text-foreground">Requested mode:</span>
								<span class="font-mono"> {data.mapConfig.requestedMode}</span>
							</div>
							<div>
								<span class="font-medium text-foreground">Effective mode:</span>
								<span class="font-mono"> {data.mapConfig.effectiveMode}</span>
							</div>
							<div>
								<span class="font-medium text-foreground">Runtime status:</span>
								<span class="font-mono"> {data.mapConfig.runtimeStatus}</span>
							</div>
							<div>
								<span class="font-medium text-foreground">Source:</span>
								<span class="font-mono"> {data.mapConfig.source}</span>
							</div>
							<div>
								<span class="font-medium text-foreground">Online provider:</span>
								<span class="font-mono"> {data.mapConfig.onlineProvider}</span>
							</div>
							<div>
								<span class="font-medium text-foreground">Online style:</span>
								<span class="font-mono break-all">
									{data.mapConfig.onlineStyleUrl ?? 'not configured'}</span
								>
							</div>
							<div>
								<span class="font-medium text-foreground">Offline PMTiles:</span>
								<span class="font-mono break-all">
									{data.mapConfig.offlinePmtilesUrl ?? 'not configured'}</span
								>
							</div>
							<div>
								<span class="font-medium text-foreground">Offline sources:</span>
								<span class="font-mono"> {data.mapConfig.offlinePmtilesSources.length}</span>
							</div>
							<div>
								<span class="font-medium text-foreground">Auto fallback:</span>
								<span class="font-mono">
									{data.mapConfig.autoFallbackEnabled ? 'enabled' : 'disabled'}
								</span>
							</div>
						</div>

						<div class="rounded-xl border border-border/60 bg-muted/20 p-3">
							<div class="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
								API
							</div>
							<p class="mt-2 text-sm">
								Raw config endpoint:
								<a class="underline underline-offset-4" href="/api/emis/map-config"
									>/api/emis/map-config</a
								>
							</p>
							<p class="mt-2 text-sm">
								Objects overlay:
								<a
									class="underline underline-offset-4"
									href="/api/emis/map/objects?bbox=20,30,50,60">/api/emis/map/objects</a
								>
							</p>
							<p class="mt-2 text-sm">
								News overlay:
								<a class="underline underline-offset-4" href="/api/emis/map/news?bbox=20,30,50,60"
									>/api/emis/map/news</a
								>
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Offline Bundle Status</CardTitle>
						<CardDescription>Что уже лежит в локальном PMTiles bundle</CardDescription>
					</CardHeader>
					<CardContent class="grid gap-2 text-sm">
						{#each assetChecklist as item}
							<div
								class={`flex items-center justify-between rounded-xl border px-3 py-2 ${toneClass(item.ready)}`}
							>
								<span>{item.label}</span>
								<span class="font-mono text-[11px] uppercase"
									>{item.ready ? 'ready' : 'missing'}</span
								>
							</div>
						{/each}

						{#if data.mapConfig.offlineManifest}
							<div class="rounded-xl border border-border/60 bg-muted/20 p-3 text-muted-foreground">
								<div class="text-xs font-medium tracking-[0.18em] uppercase">Manifest</div>
								<div class="mt-2 grid gap-1 text-xs">
									<div>
										<span class="font-medium text-foreground">Source:</span>
										{data.mapConfig.offlineManifest.source ?? 'n/a'}
									</div>
									<div>
										<span class="font-medium text-foreground">Max zoom:</span>
										{data.mapConfig.offlineManifest.maxzoom ?? 'n/a'}
									</div>
									<div>
										<span class="font-medium text-foreground">BBox:</span>
										{data.mapConfig.offlineManifest.bbox?.join(', ') ?? 'n/a'}
									</div>
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Ops Commands</CardTitle>
						<CardDescription>Как проверить и обновить PMTiles basemap на сервере</CardDescription>
					</CardHeader>
					<CardContent class="space-y-2 text-sm text-muted-foreground">
						<p>
							<span class="font-mono">pnpm map:assets:status</span> - проверить готовность локального
							PMTiles bundle
						</p>
						<p>
							<span class="font-mono">pnpm map:pmtiles:setup</span> - скачать/собрать локальный
							PMTiles bundle прямо в <span class="font-mono">static/emis-map/offline</span>
						</p>
						<p>
							<span class="font-mono"
								>pnpm map:assets:install -- --source /abs/path/to/offline-bundle</span
							>
							- скопировать подготовленный PMTiles bundle в локальную статику проекта
						</p>
						<p>
							<span class="font-mono">EMIS_MAP_MODE=auto</span> - online first, controlled offline fallback
							на старте карты
						</p>
						<p>
							<a class="underline underline-offset-4" href="/emis/pmtiles-spike"
								>/emis/pmtiles-spike</a
							>
							- отдельный validation/observability route для PMTiles runtime
						</p>
					</CardContent>
				</Card>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			<Card>
				<CardHeader>
					<CardTitle>What Changed</CardTitle>
					<CardDescription>Новый basemap contract для EMIS</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p>Server-side map config теперь резолвит `online`, `offline` и `auto`.</p>
					<p>Offline basemap теперь опирается на локальный PMTiles archive + sprites + glyphs.</p>
					<p>
						Auto-режим один раз переключается на local PMTiles при startup failure online basemap.
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Current Limitation</CardTitle>
					<CardDescription>Что ещё не закрыто поверх этого слоя</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p>
						Viewport filters и overlay layers уже идут через <span class="font-mono"
							>/api/emis/map/*</span
						>.
					</p>
					<p>Поиск, geocoding и routing специально не входят в этот этап.</p>
					<p>География offline bundle ограничена тем покрытием, которое лежит в PMTiles archive.</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Next Wave</CardTitle>
					<CardDescription>Что логично делать после switch-а</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p>1. Добавить popup/select flow поверх уже работающих map overlay endpoints.</p>
					<p>2. Довести search endpoints и синхронизацию filters между list/map workspace.</p>
					<p>
						3. Расширить offline coverage и зафиксировать production MapTiler credentials/ops
						runbook.
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
