<script lang="ts">
	import type { PageData } from './$types';

	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
	import { EmisPmtilesSpikeMap } from '$widgets/emis-map';

	let { data }: { data: PageData } = $props();

	const localAssetChecklist = [
		{
			key: 'pmtiles',
			label: '.pmtiles archive',
			ready: Boolean(data.pmtilesSpike.selectedPmtilesUrl)
		},
		{ key: 'sprites', label: 'sprites', ready: data.pmtilesSpike.spritesReady },
		{ key: 'fonts', label: 'fonts', ready: data.pmtilesSpike.fontsReady },
		{ key: 'manifest', label: 'manifest.json', ready: data.pmtilesSpike.manifestReady }
	];

	const validationGates = [
		{
			key: 'range',
			label: 'Gate 1: Node-serving path + Range probe',
			ready: Boolean(data.rangeProbeUrl)
		},
		{
			key: 'runtime',
			label: 'Gate 2: Browser PMTiles smoke on separate route',
			ready: Boolean(data.pmtilesSpike.selectedPmtilesUrl)
		},
		{
			key: 'offline',
			label: 'Gate 3: Local-only offline candidate',
			ready: data.pmtilesSpike.offlineCandidateReady
		},
		{
			key: 'contract',
			label: 'Gate 4: Main map contract unchanged until validation passes',
			ready: true
		}
	];

	function toneClass(ready: boolean) {
		return ready
			? 'border-success/30 bg-success-muted/50 text-success-muted-foreground'
			: 'border-warning/30 bg-warning-muted/40 text-warning-muted-foreground';
	}
</script>

<svelte:head>
	<title>EMIS PMTiles Spike</title>
	<meta
		name="description"
		content="Validation wave for PMTiles in EMIS without replacing the current offline bundle contract."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="space-y-3">
			<div class="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
				EMIS / PMTiles Spike
			</div>
			<div class="space-y-2">
				<h1 class="text-3xl font-semibold tracking-tight">PMTiles Validation Wave</h1>
				<p class="max-w-4xl text-sm text-muted-foreground">
					Этот маршрут нужен только для проверки PMTiles на реальном Node-serving path. Основной
					EMIS runtime в <span class="font-mono">/emis</span> не переключается на PMTiles, пока не пройдены
					Range-check, browser smoke и local-only offline gates.
				</p>
			</div>
		</header>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
			<Card class="overflow-hidden">
				<CardHeader class="border-b border-border/60 bg-muted/10">
					<CardTitle>Browser Smoke</CardTitle>
					<CardDescription>
						Отдельный PMTiles runtime path поверх MapLibre и текущих overlay endpoints
					</CardDescription>
				</CardHeader>
				<CardContent class="p-4">
					{#if data.pmtilesSpike.selectedPmtilesUrl}
						<EmisPmtilesSpikeMap
							pmtilesUrl={data.pmtilesSpike.selectedPmtilesUrl}
							glyphsUrl={data.pmtilesSpike.selectedGlyphsUrl}
							spriteUrl={data.pmtilesSpike.selectedSpriteUrl}
						/>
					{:else}
						<div
							class="flex h-[460px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground"
						>
							<div class="max-w-xl space-y-2">
								<p class="font-medium text-foreground">Локальный `.pmtiles` архив ещё не найден</p>
								<p>
									Для spike положите реальный PMTiles-файл напрямую в
									<span class="font-mono">static/emis-map/offline</span>. Это не меняет основной
									offline bundle contract и нужно только для validation wave.
								</p>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			<div class="flex flex-col gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Current Contract</CardTitle>
						<CardDescription
							>Главный `/emis` runtime пока остаётся без архитектурного pivot</CardDescription
						>
					</CardHeader>
					<CardContent class="space-y-2 text-sm text-muted-foreground">
						<p>
							<span class="font-medium text-foreground">Requested mode:</span>
							<span class="font-mono"> {data.mapConfig.requestedMode}</span>
						</p>
						<p>
							<span class="font-medium text-foreground">Effective mode:</span>
							<span class="font-mono"> {data.mapConfig.effectiveMode}</span>
						</p>
						<p>
							<span class="font-medium text-foreground">Runtime status:</span>
							<span class="font-mono"> {data.mapConfig.runtimeStatus}</span>
						</p>
						<p>
							Обычный runtime по-прежнему использует текущий
							<span class="font-mono">pre-extracted static bundle</span> contract.
						</p>
						<p>
							<a class="underline underline-offset-4" href="/emis"
								>Открыть основной `/emis` workspace</a
							>
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Local Probe</CardTitle>
						<CardDescription>Что уже есть для PMTiles validation wave</CardDescription>
					</CardHeader>
					<CardContent class="space-y-2 text-sm">
						{#each localAssetChecklist as item}
							<div
								class={`flex items-center justify-between rounded-xl border px-3 py-2 ${toneClass(item.ready)}`}
							>
								<span>{item.label}</span>
								<span class="font-mono text-[11px] uppercase"
									>{item.ready ? 'ready' : 'missing'}</span
								>
							</div>
						{/each}

						{#if data.pmtilesSpike.localPmtilesFiles.length}
							<div class="rounded-xl border border-border/60 bg-muted/20 p-3 text-muted-foreground">
								<div class="text-xs font-medium tracking-[0.18em] uppercase">Local archives</div>
								<div class="mt-2 space-y-1">
									{#each data.pmtilesSpike.localPmtilesFiles as file}
										<p class="break-all">
											<span class="font-medium text-foreground">{file.name}</span>
											<span class="text-muted-foreground">
												({Math.round(file.sizeBytes / (1024 * 1024))} MB)
											</span>
										</p>
									{/each}
								</div>
							</div>
						{/if}

						{#if data.pmtilesSpike.warnings.length}
							<div
								class="rounded-xl border border-warning/30 bg-warning-muted/30 p-3 text-muted-foreground"
							>
								<div class="text-xs font-medium tracking-[0.18em] uppercase">Warnings</div>
								<div class="mt-2 space-y-1">
									{#each data.pmtilesSpike.warnings as warning}
										<p>{warning}</p>
									{/each}
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			<Card>
				<CardHeader>
					<CardTitle>Range Probe</CardTitle>
					<CardDescription>Повторяемая проверка Node-serving path и byte-serving</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					{#if data.rangeProbeUrl}
						<p>
							<span class="font-medium text-foreground">Candidate URL:</span>
							<span class="font-mono break-all"> {data.rangeProbeUrl}</span>
						</p>
						<p>
							<span class="font-mono">{data.rangeCurlCommand}</span>
						</p>
						<p>
							<span class="font-mono">{data.rangeProbeCommand}</span>
						</p>
					{:else}
						<p>
							Команда появится автоматически, когда в `static/emis-map/offline` появится `.pmtiles`.
						</p>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Validation Gates</CardTitle>
					<CardDescription>Что должно пройти до смены архитектурного default</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm">
					{#each validationGates as gate}
						<div class={`rounded-xl border px-3 py-2 ${toneClass(gate.ready)}`}>
							{gate.label}
						</div>
					{/each}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Manual Checks</CardTitle>
					<CardDescription>Что ещё фиксируем руками после browser smoke</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p>1. В DevTools нет скачивания всего PMTiles-файла целиком.</p>
					<p>2. Нет style/glyph/sprite parsing errors в console.</p>
					<p>3. Overlay endpoints по-прежнему рисуются поверх basemap.</p>
					<p>4. Remote PMTiles URL не трактуется как offline-ready contract.</p>
					<p>
						5. После прохождения gates обновляем source-of-truth docs и только потом меняем runtime.
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
