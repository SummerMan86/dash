<script lang="ts">
	import { onMount } from 'svelte';
	import type { EChartsOption } from 'echarts';

	import { fetchDataset } from '$shared/api/fetchDataset';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { Button } from '@dashboard-builder/platform-ui';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@dashboard-builder/platform-ui';
	import { Chart } from '@dashboard-builder/platform-ui';
	import { ChartCard } from '@dashboard-builder/platform-ui';
	import { StatCard } from '@dashboard-builder/platform-ui';
	import { formatCompact, formatDate, formatNumber, formatPercent } from '@dashboard-builder/platform-core';
	import { truncate } from '@dashboard-builder/platform-core';
	import type { DatasetResponse, JsonValue } from '@dashboard-builder/platform-datasets';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';

	import { emisBiFilters } from './filters';

	const DATASET_IDS = {
		news: 'emis.news_flat',
		facts: 'emis.object_news_facts',
		objects: 'emis.objects_dim'
	} as const;

	type DatasetRow = Record<string, JsonValue>;
	type EmisBiLoadResult = {
		news: DatasetResponse;
		facts: DatasetResponse;
		objects: DatasetResponse;
	};

	const filterRuntime = useFilterWorkspace({
		workspaceId: 'dashboard-emis',
		ownerId: 'overview',
		specs: emisBiFilters
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
			const groupKey = asString(row[key]) ?? fallback;
			counts.set(groupKey, (counts.get(groupKey) ?? 0) + 1);
		}
		return Array.from(counts.entries())
			.map(([label, count]) => ({ label, count }))
			.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
	}

	function buildNewsTimeline(rows: DatasetRow[]) {
		const counts = new Map<string, number>();
		for (const row of rows) {
			const raw = asString(row.published_at);
			if (!raw) continue;
			const dayKey = raw.slice(0, 10);
			counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
		}

		return Array.from(counts.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, count]) => ({
				date,
				label: formatDate(date, { day: '2-digit', month: '2-digit' }),
				count
			}));
	}

	let sourceBreakdown = $derived.by(() =>
		groupCounts(newsRows, 'source_name', 'Unknown source').slice(0, 8)
	);
	let objectTypeBreakdown = $derived.by(() =>
		groupCounts(factRows, 'object_type_name', 'Unknown type').slice(0, 8)
	);
	let newsTimeline = $derived.by(() => buildNewsTimeline(newsRows));

	let manualNewsCount = $derived.by(
		() => newsRows.filter((row) => asBoolean(row.is_manual) === true).length
	);
	let objectsWithGeometry = $derived.by(
		() => objectRows.filter((row) => asString(row.geometry_type) !== null).length
	);
	let relatedObjectCount = $derived.by(
		() => new Set(factRows.map((row) => asString(row.object_id)).filter(Boolean)).size
	);
	let linkedNewsCount = $derived.by(
		() => new Set(factRows.map((row) => asString(row.news_id)).filter(Boolean)).size
	);

	let recentNews = $derived.by(() =>
		[...newsRows]
			.sort((a, b) =>
				(asString(b.published_at) ?? '').localeCompare(asString(a.published_at) ?? '')
			)
			.slice(0, 8)
	);

	let topLinkedObjects = $derived.by(() => {
		const byObject = new Map<
			string,
			{
				objectId: string;
				objectName: string;
				objectTypeName: string;
				links: number;
				lastPublishedAt: string | null;
			}
		>();

		for (const row of factRows) {
			const objectId = asString(row.object_id);
			if (!objectId) continue;

			const current = byObject.get(objectId) ?? {
				objectId,
				objectName: asString(row.object_name) ?? 'Unnamed object',
				objectTypeName: asString(row.object_type_name) ?? 'Unknown type',
				links: 0,
				lastPublishedAt: null
			};

			current.links += 1;
			const publishedAt = asString(row.published_at);
			if (publishedAt && (!current.lastPublishedAt || publishedAt > current.lastPublishedAt)) {
				current.lastPublishedAt = publishedAt;
			}
			byObject.set(objectId, current);
		}

		return Array.from(byObject.values())
			.sort(
				(a, b) =>
					b.links - a.links || (b.lastPublishedAt ?? '').localeCompare(a.lastPublishedAt ?? '')
			)
			.slice(0, 8);
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

	let newsChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis' },
			xAxis: {
				type: 'category',
				data: newsTimeline.map((item) => item.label)
			},
			yAxis: {
				type: 'value',
				minInterval: 1
			},
			series: [
				{
					name: 'News items',
					type: 'line',
					smooth: true,
					data: newsTimeline.map((item) => item.count),
					areaStyle: { opacity: 0.08 }
				}
			]
		})
	);

	let sourceChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			xAxis: {
				type: 'value',
				minInterval: 1
			},
			yAxis: {
				type: 'category',
				data: [...sourceBreakdown].reverse().map((item) => truncate(item.label, 20))
			},
			series: [
				{
					name: 'News items',
					type: 'bar',
					data: [...sourceBreakdown].reverse().map((item) => item.count),
					barWidth: '58%'
				}
			]
		})
	);

	let objectTypeChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			xAxis: {
				type: 'category',
				data: objectTypeBreakdown.map((item) => truncate(item.label, 16)),
				axisLabel: { rotate: 20 }
			},
			yAxis: {
				type: 'value',
				minInterval: 1
			},
			series: [
				{
					name: 'Linked news',
					type: 'bar',
					data: objectTypeBreakdown.map((item) => item.count),
					barWidth: '54%'
				}
			]
		})
	);

	const loader = useDebouncedLoader({
		watch: () => $effectiveFilters,
		delayMs: 250,
		load: async (): Promise<EmisBiLoadResult> => {
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
			error = e instanceof Error ? e.message : 'Failed to load EMIS marts';
			newsData = null;
			factsData = null;
			objectsData = null;
		}
	});

	onMount(loader.reload);
</script>

<svelte:head>
	<title>EMIS BI Overview</title>
	<meta
		name="description"
		content="Dataset-backed BI overview for EMIS read-models built on mart.emis_news_flat, mart.emis_object_news_facts, and mart.emis_objects_dim."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS BI</div>
				<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
					<a class="underline underline-offset-4" href="/emis">Workspace</a>
					<a class="underline underline-offset-4" href="/dashboard/emis/provenance">Provenance</a>
					<a class="underline underline-offset-4" href="/dashboard/emis/ship-routes"
						>Ship Routes BI</a
					>
					<a class="underline underline-offset-4" href="/dashboard/emis/vessel-positions"
						>Vessel Positions</a
					>
					<a class="underline underline-offset-4" href="/emis/objects">Каталог объектов</a>
					<a class="underline underline-offset-4" href="/emis/news">Каталог новостей</a>
				</div>
			</div>
			<div class="space-y-2">
				<h1 class="type-page-title">Read-model Overview</h1>
				<p class="type-body-sm max-w-4xl text-muted-foreground">
					Первый BI slice поверх стабильных dataset contracts:
					<span class="font-mono"> mart.emis_news_flat</span>,
					<span class="font-mono"> mart.emis_object_news_facts</span> и
					<span class="font-mono"> mart.emis_objects_dim</span>. Shared
					<span class="font-mono">dateRange</span>
					живёт в общем filter subset, а остальная аналитика остаётся dataset-backed, не смешиваясь с
					operational `/api/emis/*`.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>BI Filters</CardTitle>
				<CardDescription>
					Фильтры применяются к dataset layer через planner bindings и позволяют проверять
					`mart.emis_*` как стабильный read-side contract.
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
						{loader.loading ? 'Обновление…' : 'Обновить BI slice'}
					</Button>
				</div>

				{#if error}
					<div class="rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error">
						{error}
					</div>
				{/if}
			</CardContent>
		</Card>

		<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
			<StatCard
				label="Новости в срезе"
				value={loader.loading && !newsData ? '…' : formatCompact(newsRows.length, 1)}
				trend={undefined}
			/>
			<StatCard
				label="Связи news-object"
				value={loader.loading && !factsData ? '…' : formatCompact(factRows.length, 1)}
				trend={undefined}
			/>
			<StatCard
				label="Уникальные объекты"
				value={loader.loading && !objectsData ? '…' : formatCompact(objectRows.length, 1)}
				trend={undefined}
			/>
			<StatCard
				label="Manual news share"
				value={newsRows.length ? formatPercent((manualNewsCount / newsRows.length) * 100) : '—'}
				trend={undefined}
			/>
			<StatCard
				label="Geo coverage"
				value={objectRows.length
					? `${formatNumber(objectsWithGeometry)} / ${formatNumber(objectRows.length)}`
					: '—'}
				trend={undefined}
			/>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
			<ChartCard
				title="News Timeline"
				subtitle="Количество новостей в read-model срезе по дням публикации"
				loading={loader.loading && !newsData}
			>
				<Chart options={newsChartOptions} />
			</ChartCard>

			<Card>
				<CardHeader>
					<CardTitle>Slice Health</CardTitle>
					<CardDescription>
						Быстрые sanity-metrics для связи между новостями, объектами и графом связей.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Новости со связями</span>
						<span class="font-medium">
							{linkedNewsCount
								? `${formatNumber(linkedNewsCount)} / ${formatNumber(newsRows.length)}`
								: '—'}
						</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Объекты, встречающиеся в фактах</span>
						<span class="font-medium">
							{relatedObjectCount
								? `${formatNumber(relatedObjectCount)} / ${formatNumber(objectRows.length)}`
								: '—'}
						</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Top source</span>
						<span class="font-medium">
							{sourceBreakdown[0]
								? `${sourceBreakdown[0].label} · ${formatNumber(sourceBreakdown[0].count)}`
								: '—'}
						</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Top object type</span>
						<span class="font-medium">
							{objectTypeBreakdown[0]
								? `${objectTypeBreakdown[0].label} · ${formatNumber(objectTypeBreakdown[0].count)}`
								: '—'}
						</span>
					</div>
					<p class="type-caption text-muted-foreground">
						Эти числа идут только из marts и помогают быстро проверить, что BI/read-side не
						расходится с операционным контуром EMIS.
					</p>
				</CardContent>
			</Card>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<ChartCard
				title="Top Sources"
				subtitle="Какие источники дают основной объём новостей в текущем фильтрованном срезе"
				loading={loader.loading && !newsData}
			>
				<Chart options={sourceChartOptions} />
			</ChartCard>

			<ChartCard
				title="Top Object Types"
				subtitle="Какие типы объектов чаще всего участвуют в news-object facts"
				loading={loader.loading && !factsData}
			>
				<Chart options={objectTypeChartOptions} />
			</ChartCard>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Recent News Slice</CardTitle>
					<CardDescription
						>Последние записи из `mart.emis_news_flat` с прямым переходом в operational detail.</CardDescription
					>
				</CardHeader>
				<CardContent>
					{#if recentNews.length === 0}
						<div class="type-body-sm text-muted-foreground">Нет строк под текущие фильтры.</div>
					{:else}
						<div class="space-y-3">
							{#each recentNews as row}
								<a
									class="block rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
									href={`/emis/news/${row.id}`}
								>
									<div class="flex items-start justify-between gap-3">
										<div class="space-y-1">
											<div class="font-medium text-foreground">
												{truncate(asString(row.title) ?? 'Untitled news', 96)}
											</div>
											<div class="type-caption text-muted-foreground">
												{asString(row.source_name) ?? 'Unknown source'}
												<span class="mx-1 text-border">·</span>
												{formatDate(asString(row.published_at) ?? undefined)}
											</div>
										</div>
										<div class="type-caption text-muted-foreground">
											{formatNumber(asNumber(row.related_objects_count) ?? undefined)}
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
					<CardTitle>Most Linked Objects</CardTitle>
					<CardDescription
						>Объекты с наибольшим числом связей в `mart.emis_object_news_facts`.</CardDescription
					>
				</CardHeader>
				<CardContent>
					{#if topLinkedObjects.length === 0}
						<div class="type-body-sm text-muted-foreground">Нет строк под текущие фильтры.</div>
					{:else}
						<div class="space-y-3">
							{#each topLinkedObjects as row}
								<a
									class="block rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
									href={`/emis/objects/${row.objectId}`}
								>
									<div class="flex items-start justify-between gap-3">
										<div class="space-y-1">
											<div class="font-medium text-foreground">{truncate(row.objectName, 72)}</div>
											<div class="type-caption text-muted-foreground">
												{row.objectTypeName}
												{#if row.lastPublishedAt}
													<span class="mx-1 text-border">·</span>
													{formatDate(row.lastPublishedAt)}
												{/if}
											</div>
										</div>
										<div class="text-right">
											<div class="font-medium text-foreground">{formatNumber(row.links)}</div>
											<div class="type-caption text-muted-foreground">links</div>
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
