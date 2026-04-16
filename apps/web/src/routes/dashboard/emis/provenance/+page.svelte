<script lang="ts">
	import { onMount } from 'svelte';
	import type { EChartsOption } from 'echarts';

	import { fetchDataset } from '$lib/api/fetchDataset';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { Button } from '@dashboard-builder/platform-ui';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '@dashboard-builder/platform-ui';
	import { Chart } from '@dashboard-builder/platform-ui';
	import { ChartCard } from '@dashboard-builder/platform-ui';
	import { StatCard } from '@dashboard-builder/platform-ui';
	import {
		formatDate,
		formatNumber,
		formatPercent,
		truncate
	} from '@dashboard-builder/platform-core';
	import type { DatasetResponse, JsonValue } from '@dashboard-builder/platform-datasets';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';

	import { emisProvenanceFilters } from './filters';

	const DATASET_IDS = {
		news: 'emis.news_flat',
		facts: 'emis.object_news_facts',
		objects: 'emis.objects_dim'
	} as const;

	type DatasetRow = Record<string, JsonValue>;
	type ProvenanceLoadResult = {
		news: DatasetResponse;
		facts: DatasetResponse;
		objects: DatasetResponse;
	};

	type QualityNewsRow = {
		id: string;
		title: string;
		publishedAt: string | null;
		sourceName: string;
		issues: string[];
		relatedObjectsCount: number;
	};

	type QualityObjectRow = {
		id: string;
		name: string;
		objectTypeName: string;
		status: string;
		issues: string[];
		updatedAt: string | null;
	};

	const filterRuntime = useFilterWorkspace({
		workspaceId: 'dashboard-emis',
		ownerId: 'provenance',
		specs: emisProvenanceFilters
	});

	let error = $state<string | null>(null);
	let newsData = $state<DatasetResponse | null>(null);
	let factsData = $state<DatasetResponse | null>(null);
	let objectsData = $state<DatasetResponse | null>(null);

	let effectiveFilters = $derived(filterRuntime.effective);
	let newsRows = $derived.by(() => (newsData?.rows ?? []) as DatasetRow[]);
	let factRows = $derived.by(() => (factsData?.rows ?? []) as DatasetRow[]);
	let objectRows = $derived.by(() => (objectsData?.rows ?? []) as DatasetRow[]);

	function asString(value: JsonValue | undefined): string | null {
		return typeof value === 'string' && value.trim() ? value : null;
	}

	function asNumber(value: JsonValue | undefined): number | null {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
			return Number(value);
		}
		return null;
	}

	function asBoolean(value: JsonValue | undefined): boolean | null {
		if (typeof value === 'boolean') return value;
		if (value === 'true') return true;
		if (value === 'false') return false;
		return null;
	}

	function groupCounts(rows: DatasetRow[], key: string, fallback: string) {
		const counts = new Map<string, number>();
		for (const row of rows) {
			const label = asString(row[key]) ?? fallback;
			counts.set(label, (counts.get(label) ?? 0) + 1);
		}
		return Array.from(counts.entries())
			.map(([label, count]) => ({ label, count }))
			.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
	}

	let newsWithGeometry = $derived.by(
		() => newsRows.filter((row) => asBoolean(row.has_geometry) === true).length
	);
	let linkedNewsCount = $derived.by(
		() => newsRows.filter((row) => (asNumber(row.related_objects_count) ?? 0) > 0).length
	);
	let manualNewsCount = $derived.by(
		() => newsRows.filter((row) => asBoolean(row.is_manual) === true).length
	);
	let objectsWithGeometry = $derived.by(
		() => objectRows.filter((row) => asString(row.geometry_type) !== null).length
	);
	let objectsWithExternalId = $derived.by(
		() => objectRows.filter((row) => asString(row.external_id) !== null).length
	);
	let primaryLinksCount = $derived.by(
		() => factRows.filter((row) => asBoolean(row.is_primary) === true).length
	);

	let newsProvenanceBreakdown = $derived.by(() =>
		groupCounts(newsRows, 'source_origin', 'unknown').slice(0, 8)
	);
	let objectProvenanceBreakdown = $derived.by(() =>
		groupCounts(objectRows, 'source_origin', 'unknown').slice(0, 8)
	);
	let provenancePairs = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const row of factRows) {
			const newsOrigin = asString(row.news_source_origin) ?? 'unknown';
			const objectOrigin = asString(row.object_source_origin) ?? 'unknown';
			const key = `${newsOrigin} -> ${objectOrigin}`;
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		return Array.from(counts.entries())
			.map(([label, count]) => ({ label, count }))
			.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
			.slice(0, 8);
	});

	let newsQualityMix = $derived.by(() => [
		{ label: 'manual', count: manualNewsCount },
		{ label: 'with geometry', count: newsWithGeometry },
		{ label: 'linked', count: linkedNewsCount }
	]);

	let newsQualityWatchlist = $derived.by((): QualityNewsRow[] => {
		const rowsWithIssues: QualityNewsRow[] = [];
		for (const row of newsRows) {
			const issues: string[] = [];
			if (asBoolean(row.has_geometry) !== true) issues.push('no geometry');
			if ((asNumber(row.related_objects_count) ?? 0) === 0) issues.push('no linked objects');

			if (issues.length === 0) continue;
			const id = asString(row.id);
			if (!id) continue;

			rowsWithIssues.push({
				id,
				title: asString(row.title) ?? 'Untitled news',
				publishedAt: asString(row.published_at),
				sourceName: asString(row.source_name) ?? 'Unknown source',
				issues,
				relatedObjectsCount: asNumber(row.related_objects_count) ?? 0
			});
		}

		return rowsWithIssues
			.sort(
				(a, b) =>
					b.issues.length - a.issues.length ||
					(b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
			)
			.slice(0, 10);
	});

	let objectQualityWatchlist = $derived.by((): QualityObjectRow[] => {
		const rowsWithIssues: QualityObjectRow[] = [];
		for (const row of objectRows) {
			const issues: string[] = [];
			if (asString(row.geometry_type) === null) issues.push('no geometry');
			if (asString(row.external_id) === null) issues.push('no external id');

			if (issues.length === 0) continue;
			const id = asString(row.id);
			if (!id) continue;

			rowsWithIssues.push({
				id,
				name: asString(row.name) ?? 'Unnamed object',
				objectTypeName: asString(row.object_type_name) ?? 'Unknown type',
				status: asString(row.status) ?? 'unknown',
				issues,
				updatedAt: asString(row.updated_at)
			});
		}

		return rowsWithIssues
			.sort(
				(a, b) =>
					b.issues.length - a.issues.length || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
			)
			.slice(0, 10);
	});

	let latestExecutedAt = $derived.by(() => {
		const executedAt = [
			newsData?.meta?.executedAt,
			factsData?.meta?.executedAt,
			objectsData?.meta?.executedAt
		]
			.filter((value): value is string => typeof value === 'string' && value.length > 0)
			.sort()
			.at(-1);

		return executedAt
			? formatDate(executedAt, { day: '2-digit', month: 'short', year: 'numeric' })
			: null;
	});

	let provenanceChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			legend: { data: ['News', 'Objects'] },
			xAxis: {
				type: 'category',
				data: Array.from(
					new Set([
						...newsProvenanceBreakdown.map((item) => item.label),
						...objectProvenanceBreakdown.map((item) => item.label)
					])
				)
			},
			yAxis: {
				type: 'value',
				minInterval: 1
			},
			series: [
				{
					name: 'News',
					type: 'bar',
					data: Array.from(
						new Set([
							...newsProvenanceBreakdown.map((item) => item.label),
							...objectProvenanceBreakdown.map((item) => item.label)
						])
					).map((label) => newsProvenanceBreakdown.find((item) => item.label === label)?.count ?? 0)
				},
				{
					name: 'Objects',
					type: 'bar',
					data: Array.from(
						new Set([
							...newsProvenanceBreakdown.map((item) => item.label),
							...objectProvenanceBreakdown.map((item) => item.label)
						])
					).map(
						(label) => objectProvenanceBreakdown.find((item) => item.label === label)?.count ?? 0
					)
				}
			]
		})
	);

	let qualityMixChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			xAxis: {
				type: 'category',
				data: newsQualityMix.map((item) => item.label)
			},
			yAxis: {
				type: 'value',
				minInterval: 1
			},
			series: [
				{
					name: 'News items',
					type: 'bar',
					data: newsQualityMix.map((item) => item.count),
					barWidth: '54%'
				}
			]
		})
	);

	let provenancePairChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			xAxis: { type: 'value', minInterval: 1 },
			yAxis: {
				type: 'category',
				data: [...provenancePairs].reverse().map((item) => truncate(item.label, 24))
			},
			series: [
				{
					name: 'Links',
					type: 'bar',
					data: [...provenancePairs].reverse().map((item) => item.count),
					barWidth: '58%'
				}
			]
		})
	);

	const loader = useDebouncedLoader({
		watch: () => $effectiveFilters,
		delayMs: 250,
		load: async (): Promise<ProvenanceLoadResult> => {
			error = null;
			const filterContext = {
				snapshot: filterRuntime.getSnapshot(),
				workspaceId: filterRuntime.workspaceId,
				ownerId: filterRuntime.ownerId
			};

			const [news, facts, objects] = await Promise.all([
				fetchDataset({
					id: DATASET_IDS.news,
					params: { limit: 10000 },
					cache: { ttlMs: 60_000 },
					filterContext
				}),
				fetchDataset({
					id: DATASET_IDS.facts,
					params: { limit: 10000 },
					cache: { ttlMs: 60_000 },
					filterContext
				}),
				fetchDataset({
					id: DATASET_IDS.objects,
					params: { limit: 10000 },
					cache: { ttlMs: 60_000 },
					filterContext
				})
			]);

			return { news, facts, objects };
		},
		onData: (result) => {
			newsData = result.news;
			factsData = result.facts;
			objectsData = result.objects;
		},
		onError: (e) => {
			error = e instanceof Error ? e.message : 'Failed to load provenance marts';
			newsData = null;
			factsData = null;
			objectsData = null;
		}
	});

	onMount(loader.reload);
</script>

<svelte:head>
	<title>EMIS Provenance & Quality</title>
	<meta
		name="description"
		content="BI drill-down for EMIS provenance and quality signals built on mart.emis_news_flat, mart.emis_object_news_facts, and mart.emis_objects_dim."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS BI</div>
				<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
					<a class="underline underline-offset-4" href="/dashboard/emis">Overview</a>
					<a class="underline underline-offset-4" href="/dashboard/emis/ship-routes"
						>Ship Routes BI</a
					>
					<a class="underline underline-offset-4" href="/dashboard/emis/vessel-positions"
						>Vessel Positions</a
					>
					<a class="underline underline-offset-4" href="/emis">Workspace</a>
				</div>
			</div>
			<div class="space-y-2">
				<h1 class="type-page-title">Provenance & Quality</h1>
				<p class="type-body-sm max-w-4xl text-muted-foreground">
					Drill-down экран для контроля provenance и data quality: как сочетаются
					`manual/import/seed` пути, какая доля данных имеет geometry и links, и какие news/objects
					сейчас выглядят самыми слабыми по BI read-model сигналам.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>Quality Filters</CardTitle>
				<CardDescription>
					Фильтры режут те же стабильные `mart.emis_*` contracts, чтобы quality-check оставался
					dataset-backed и воспроизводимым.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<FilterPanel runtime={filterRuntime} scope="all" direction="horizontal" />

				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="type-caption text-muted-foreground">
						{#if latestExecutedAt}
							Последний dataset snapshot: {latestExecutedAt}
						{:else}
							Снимок появится после первой загрузки
						{/if}
					</div>
					<Button onclick={loader.reload} disabled={loader.loading} variant="outline">
						{loader.loading ? 'Обновление…' : 'Обновить quality slice'}
					</Button>
				</div>

				{#if error}
					<div class="rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error">
						{error}
					</div>
				{/if}
			</CardContent>
		</Card>

		<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
			<StatCard
				label="News geometry coverage"
				value={newsRows.length ? formatPercent((newsWithGeometry / newsRows.length) * 100) : '—'}
				trend={undefined}
			/>
			<StatCard
				label="News link coverage"
				value={newsRows.length ? formatPercent((linkedNewsCount / newsRows.length) * 100) : '—'}
				trend={undefined}
			/>
			<StatCard
				label="Manual news share"
				value={newsRows.length ? formatPercent((manualNewsCount / newsRows.length) * 100) : '—'}
				trend={undefined}
			/>
			<StatCard
				label="Object geometry coverage"
				value={objectRows.length
					? formatPercent((objectsWithGeometry / objectRows.length) * 100)
					: '—'}
				trend={undefined}
			/>
			<StatCard
				label="External ID coverage"
				value={objectRows.length
					? formatPercent((objectsWithExternalId / objectRows.length) * 100)
					: '—'}
				trend={undefined}
			/>
			<StatCard
				label="Primary link share"
				value={factRows.length ? formatPercent((primaryLinksCount / factRows.length) * 100) : '—'}
				trend={undefined}
			/>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<ChartCard
				title="Provenance Split"
				subtitle="Сравнение provenance-профиля между news и objects"
				loading={loader.loading && !newsData}
			>
				<Chart options={provenanceChartOptions} />
			</ChartCard>

			<ChartCard
				title="News Quality Mix"
				subtitle="Сколько новостей одновременно manual / linked / geo-ready"
				loading={loader.loading && !newsData}
			>
				<Chart options={qualityMixChartOptions} />
			</ChartCard>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
			<ChartCard
				title="Provenance Pairs in Facts"
				subtitle="Какие news/object provenance combinations чаще всего встречаются в link facts"
				loading={loader.loading && !factsData}
			>
				<Chart options={provenancePairChartOptions} />
			</ChartCard>

			<Card>
				<CardHeader>
					<CardTitle>Quality Summary</CardTitle>
					<CardDescription
						>Короткие aggregated сигналы, которые удобно использовать как smoke checklist.</CardDescription
					>
				</CardHeader>
				<CardContent class="space-y-4">
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">News without geometry</span>
						<span class="font-medium">{formatNumber(newsRows.length - newsWithGeometry)}</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">News without links</span>
						<span class="font-medium">{formatNumber(newsRows.length - linkedNewsCount)}</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Objects without geometry</span>
						<span class="font-medium">{formatNumber(objectRows.length - objectsWithGeometry)}</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Objects without external ID</span>
						<span class="font-medium"
							>{formatNumber(objectRows.length - objectsWithExternalId)}</span
						>
					</div>
					<p class="type-caption text-muted-foreground">
						Эти цифры специально держатся простыми: они помогают быстро понять, куда идти дальше в
						operational `/emis`, если quality regressions станут заметны.
					</p>
				</CardContent>
			</Card>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>News Quality Watchlist</CardTitle>
					<CardDescription
						>Новости с самыми очевидными quality issues: missing geometry и missing links.</CardDescription
					>
				</CardHeader>
				<CardContent>
					{#if newsQualityWatchlist.length === 0}
						<div class="type-body-sm text-muted-foreground">
							Под текущие фильтры quality issues не найдены.
						</div>
					{:else}
						<div class="space-y-3">
							{#each newsQualityWatchlist as row}
								<a
									class="block rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
									href={`/emis/news/${row.id}`}
								>
									<div class="space-y-2">
										<div class="flex items-start justify-between gap-3">
											<div class="font-medium text-foreground">{truncate(row.title, 84)}</div>
											<div class="type-caption text-muted-foreground">
												{row.relatedObjectsCount}
											</div>
										</div>
										<div class="type-caption text-muted-foreground">
											{row.sourceName}
											{#if row.publishedAt}
												<span class="mx-1 text-border">·</span>
												{formatDate(row.publishedAt)}
											{/if}
										</div>
										<div class="flex flex-wrap gap-2">
											{#each row.issues as issue}
												<span
													class="type-caption rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
													>{issue}</span
												>
											{/each}
										</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Object Quality Watchlist</CardTitle>
					<CardDescription
						>Объекты, которым не хватает geometry или external reference для более надёжного
						BI/read-side.</CardDescription
					>
				</CardHeader>
				<CardContent>
					{#if objectQualityWatchlist.length === 0}
						<div class="type-body-sm text-muted-foreground">
							Под текущие фильтры quality issues не найдены.
						</div>
					{:else}
						<div class="space-y-3">
							{#each objectQualityWatchlist as row}
								<a
									class="block rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
									href={`/emis/objects/${row.id}`}
								>
									<div class="space-y-2">
										<div class="flex items-start justify-between gap-3">
											<div class="font-medium text-foreground">{truncate(row.name, 72)}</div>
											<div class="type-caption text-muted-foreground">{row.status}</div>
										</div>
										<div class="type-caption text-muted-foreground">
											{row.objectTypeName}
											{#if row.updatedAt}
												<span class="mx-1 text-border">·</span>
												{formatDate(row.updatedAt)}
											{/if}
										</div>
										<div class="flex flex-wrap gap-2">
											{#each row.issues as issue}
												<span
													class="type-caption rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
													>{issue}</span
												>
											{/each}
										</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</section>
	</div>
</div>
