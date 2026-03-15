<script lang="ts">
	import type { PageData } from './$types';

	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
	import { EmisMap } from '$widgets/emis-map';

	let { data }: { data: PageData } = $props();

	const assetChecklist = [
		{ key: 'style', label: 'style.json', ready: data.mapConfig.offlineAssets.style },
		{ key: 'tiles', label: 'tiles bundle', ready: data.mapConfig.offlineAssets.tiles },
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
		content="EMIS workspace foundation with map runtime configuration and offline basemap delivery."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="space-y-3">
			<div class="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">EMIS</div>
			<div class="space-y-2">
				<h1 class="text-3xl font-semibold tracking-tight">Workspace + Offline Map Runtime</h1>
				<p class="max-w-4xl text-sm text-muted-foreground">
					EMIS теперь умеет читать runtime-конфигурацию карты, переключаться между
					<span class="font-mono">online</span> и <span class="font-mono">offline</span> режимами, раздавать
					локальный basemap bundle со статики и предсказуемо деградировать, если assets ещё не установлены
					на сервер.
				</p>
			</div>
		</header>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
			<Card class="overflow-hidden">
				<CardHeader class="border-b border-border/60 bg-muted/10">
					<CardTitle>EMIS Map Runtime</CardTitle>
					<CardDescription>
						MapLibre widget уже читает server-side map config и умеет работать с локальным
						<span class="font-mono">style.json</span>.
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
								<span class="font-medium text-foreground">Style URL:</span>
								<span class="font-mono break-all">
									{data.mapConfig.styleUrl ?? 'not configured'}</span
								>
							</div>
							<div>
								<span class="font-medium text-foreground">Tiles URL:</span>
								<span class="font-mono break-all"> {data.mapConfig.tilesUrl ?? 'n/a'}</span>
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
						<CardDescription>Что уже лежит в локальном basemap bundle</CardDescription>
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
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Ops Commands</CardTitle>
						<CardDescription>Как проверить и установить offline assets на сервер</CardDescription>
					</CardHeader>
					<CardContent class="space-y-2 text-sm text-muted-foreground">
						<p>
							<span class="font-mono">pnpm map:assets:status</span> - проверить наличие offline bundle
						</p>
						<p>
							<span class="font-mono">pnpm map:assets:install -- --source /abs/path/to/bundle</span>
							- скопировать подготовленный basemap bundle в локальную статику проекта
						</p>
						<p>
							<span class="font-mono">EMIS_MAP_MODE=offline</span> - переключить runtime в локальный
							basemap mode
						</p>
						<p>
							<a class="underline underline-offset-4" href="/emis/pmtiles-spike"
								>/emis/pmtiles-spike</a
							>
							- отдельный validation route для PMTiles без смены основного contract
						</p>
					</CardContent>
				</Card>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			<Card>
				<CardHeader>
					<CardTitle>What Changed</CardTitle>
					<CardDescription>Вертикальный срез offline map layer</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p>Server-side map config resolved через EMIS infra.</p>
					<p>Map widget умеет запускаться в online/offline и показывать controlled fallback.</p>
					<p>Offline assets отдаются из <span class="font-mono">static/emis-map/offline</span>.</p>
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
					<p>Offline bundle сейчас ожидается как уже подготовленная локальная папка с assets.</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Next Wave</CardTitle>
					<CardDescription>Что логично делать после этого каркаса</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p>1. Добавить popup/select flow поверх уже работающих map overlay endpoints.</p>
					<p>2. Довести search endpoints и синхронизацию filters между list/map workspace.</p>
					<p>3. Прогнать PMTiles validation wave, не ломая текущий offline bundle contract.</p>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
