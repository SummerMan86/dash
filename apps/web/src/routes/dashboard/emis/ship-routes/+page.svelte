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
	import { formatCompact, formatDate, formatNumber } from '@dashboard-builder/platform-core';
	import type { DatasetResponse, JsonValue } from '@dashboard-builder/platform-datasets';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';

	import { emisShipRouteBiFilters } from './filters';

	type DatasetRow = Record<string, JsonValue>;
	const datasetId = 'emis.ship_route_vessels';

	const filterRuntime = useFilterWorkspace({
		workspaceId: 'dashboard-emis',
		ownerId: 'ship-routes',
		specs: emisShipRouteBiFilters
	});

	let error = $state<string | null>(null);
	let data = $state<DatasetResponse | null>(null);
	let effectiveFilters = $derived(filterRuntime.effective);
	let rows = $derived.by(() => (data?.rows ?? []) as DatasetRow[]);

	function asString(value: JsonValue | undefined): string | null {
		return typeof value === 'string' && value.trim() ? value : null;
	}

	function asNumber(value: JsonValue | undefined): number | null {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
			return Number(value);
		return null;
	}

	function truncateText(text: string | null | undefined, maxLen: number): string {
		if (!text) return '—';
		return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
	}

	function formatOptionalNumber(value: JsonValue | undefined): string {
		const numberValue = asNumber(value);
		return numberValue === null ? '—' : formatNumber(numberValue);
	}

	function formatOptionalDate(value: JsonValue | undefined): string {
		const dateValue = asString(value);
		return dateValue === null ? '—' : formatDate(dateValue);
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

	function buildFreshnessTimeline(rows: DatasetRow[]) {
		const counts = new Map<string, number>();
		for (const row of rows) {
			const raw = asString(row.last_fetched_at);
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

	let totalPoints = $derived.by(() =>
		rows.reduce((sum, row) => sum + (asNumber(row.points_count) ?? 0), 0)
	);
	let totalRouteDays = $derived.by(() =>
		rows.reduce((sum, row) => sum + (asNumber(row.route_days_count) ?? 0), 0)
	);
	let avgPointsPerVessel = $derived.by(() => (rows.length ? totalPoints / rows.length : 0));
	let vesselsWithPosition = $derived.by(
		() =>
			rows.filter(
				(row) => asNumber(row.last_latitude) !== null && asNumber(row.last_longitude) !== null
			).length
	);
	let topFlags = $derived.by(() => groupCounts(rows, 'flag', 'Unknown flag').slice(0, 8));
	let topVesselTypes = $derived.by(() =>
		groupCounts(rows, 'vessel_type', 'Unknown type').slice(0, 8)
	);
	let freshnessTimeline = $derived.by(() => buildFreshnessTimeline(rows));
	let topByPoints = $derived.by(() =>
		[...rows]
			.sort((a, b) => (asNumber(b.points_count) ?? 0) - (asNumber(a.points_count) ?? 0))
			.slice(0, 10)
	);
	let recentVessels = $derived.by(() =>
		[...rows]
			.sort((a, b) =>
				(asString(b.last_fetched_at) ?? '').localeCompare(asString(a.last_fetched_at) ?? '')
			)
			.slice(0, 10)
	);
	let latestExecutedAt = $derived.by(() =>
		data?.meta?.executedAt
			? formatDate(data.meta.executedAt, { day: '2-digit', month: 'short', year: 'numeric' })
			: null
	);

	let freshnessChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis' },
			xAxis: { type: 'category', data: freshnessTimeline.map((item) => item.label) },
			yAxis: { type: 'value', minInterval: 1 },
			series: [
				{
					name: 'Fresh vessels',
					type: 'line',
					smooth: true,
					data: freshnessTimeline.map((item) => item.count),
					areaStyle: { opacity: 0.08 }
				}
			]
		})
	);

	let flagChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			xAxis: { type: 'value', minInterval: 1 },
			yAxis: {
				type: 'category',
				data: [...topFlags].reverse().map((item) => truncateText(item.label, 14))
			},
			series: [
				{
					name: 'Vessels',
					type: 'bar',
					data: [...topFlags].reverse().map((item) => item.count),
					barWidth: '58%'
				}
			]
		})
	);

	let vesselTypeChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			xAxis: {
				type: 'category',
				data: topVesselTypes.map((item) => truncateText(item.label, 16)),
				axisLabel: { rotate: 18 }
			},
			yAxis: { type: 'value', minInterval: 1 },
			series: [
				{
					name: 'Vessels',
					type: 'bar',
					data: topVesselTypes.map((item) => item.count),
					barWidth: '54%'
				}
			]
		})
	);

	const loader = useDebouncedLoader({
		watch: () => $effectiveFilters,
		delayMs: 250,
		load: async () => {
			error = null;
			return await fetchDataset({
				id: datasetId,
				params: { limit: 2000 },
				cache: { ttlMs: 60_000 },
				filterContext: {
					snapshot: filterRuntime.getSnapshot(),
					workspaceId: filterRuntime.workspaceId,
					ownerId: filterRuntime.ownerId
				}
			});
		},
		onData: (result) => {
			data = result;
		},
		onError: (e) => {
			error = e instanceof Error ? e.message : 'Failed to load ship-route vessels mart';
			data = null;
		}
	});

	onMount(loader.reload);
</script>

<svelte:head>
	<title>EMIS Ship Routes BI</title>
	<meta
		name="description"
		content="Dataset-backed BI overview for ship-route vessels built on mart.emis_ship_route_vessels."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS BI</div>
				<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
					<a class="underline underline-offset-4" href="/dashboard/emis">Overview</a>
					<a class="underline underline-offset-4" href="/dashboard/emis/provenance">Provenance</a>
					<a class="underline underline-offset-4" href="/dashboard/emis/vessel-positions"
						>Vessel Positions</a
					>
					<a class="underline underline-offset-4" href="/emis">Workspace</a>
				</div>
			</div>
			<div class="space-y-2">
				<h1 class="type-page-title">Ship Routes Read-model</h1>
				<p class="type-body-sm max-w-4xl text-muted-foreground">
					Второй BI экран поверх <span class="font-mono">mart.emis_ship_route_vessels</span>. Здесь
					мы смотрим не operational route geometry, а устойчивый vessel-level read-model, который
					уже питается живым <span class="font-mono">mart_emis</span>.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>Ship-route Filters</CardTitle>
				<CardDescription>
					`dateRange` режет snapshot по `last_fetched_at`, а `q` остаётся быстрым client-side
					narrowing по названию судна.
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
						{loader.loading ? 'Обновление…' : 'Обновить ship-route slice'}
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
				label="Судов в срезе"
				value={loader.loading && !data ? '…' : formatCompact(rows.length, 1)}
				trend={undefined}
			/>
			<StatCard
				label="Всего route points"
				value={loader.loading && !data ? '…' : formatCompact(totalPoints, 1)}
				trend={undefined}
			/>
			<StatCard
				label="Route days"
				value={loader.loading && !data ? '…' : formatCompact(totalRouteDays, 1)}
				trend={undefined}
			/>
			<StatCard
				label="Среднее points / vessel"
				value={rows.length ? formatNumber(Math.round(avgPointsPerVessel)) : '—'}
				trend={undefined}
			/>
			<StatCard
				label="Last position coverage"
				value={rows.length
					? `${formatNumber(vesselsWithPosition)} / ${formatNumber(rows.length)}`
					: '—'}
				trend={undefined}
			/>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
			<ChartCard
				title="Freshness Timeline"
				subtitle="Сколько судов попало в read-model по датам последнего fetch"
				loading={loader.loading && !data}
			>
				<Chart options={freshnessChartOptions} />
			</ChartCard>

			<Card>
				<CardHeader>
					<CardTitle>Route Slice Health</CardTitle>
					<CardDescription>
						Быстрые sanity-metrics для vessel-level mart перед drill-down назад в operational
						`/emis`.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Top flag</span>
						<span class="font-medium">
							{topFlags[0] ? `${topFlags[0].label} · ${formatNumber(topFlags[0].count)}` : '—'}
						</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Top vessel type</span>
						<span class="font-medium">
							{topVesselTypes[0]
								? `${topVesselTypes[0].label} · ${formatNumber(topVesselTypes[0].count)}`
								: '—'}
						</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
					>
						<span class="type-caption text-muted-foreground">Max points coverage</span>
						<span class="font-medium">
							{topByPoints[0]
								? `${truncateText(asString(topByPoints[0].vessel_name) ?? 'Unnamed vessel', 24)} · ${formatOptionalNumber(topByPoints[0].points_count)}`
								: '—'}
						</span>
					</div>
					<p class="type-caption text-muted-foreground">
						Каждая строка ниже даёт deep-link в operational workspace через `shipHbkId`, чтобы BI и
						маршрутный runtime были связаны end-to-end.
					</p>
				</CardContent>
			</Card>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<ChartCard
				title="Top Flags"
				subtitle="Распределение vessel catalog по флагу"
				loading={loader.loading && !data}
			>
				<Chart options={flagChartOptions} />
			</ChartCard>

			<ChartCard
				title="Top Vessel Types"
				subtitle="Распределение vessel catalog по типу судна"
				loading={loader.loading && !data}
			>
				<Chart options={vesselTypeChartOptions} />
			</ChartCard>
		</section>

		<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Most Covered Vessels</CardTitle>
					<CardDescription>Суда с наибольшим количеством точек в mart slice.</CardDescription>
				</CardHeader>
				<CardContent>
					{#if topByPoints.length === 0}
						<div class="type-body-sm text-muted-foreground">Нет строк под текущие фильтры.</div>
					{:else}
						<div class="space-y-3">
							{#each topByPoints as row}
								<a
									class="block rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
									href={`/emis?shipHbkId=${encodeURIComponent(String(asNumber(row.ship_hbk_id) ?? ''))}`}
								>
									<div class="flex items-start justify-between gap-3">
										<div class="space-y-1">
											<div class="font-medium text-foreground">
												{truncateText(asString(row.vessel_name) ?? 'Unnamed vessel', 72)}
											</div>
											<div class="type-caption text-muted-foreground">
												{asString(row.vessel_type) ?? 'Unknown type'}
												<span class="mx-1 text-border">·</span>
												{asString(row.flag) ?? 'Unknown flag'}
											</div>
										</div>
										<div class="text-right">
											<div class="font-medium text-foreground">
												{formatOptionalNumber(row.points_count)}
											</div>
											<div class="type-caption text-muted-foreground">points</div>
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
					<CardTitle>Most Recent Vessels</CardTitle>
					<CardDescription
						>Свежие записи по `last_fetched_at` с переходом в route workspace.</CardDescription
					>
				</CardHeader>
				<CardContent>
					{#if recentVessels.length === 0}
						<div class="type-body-sm text-muted-foreground">Нет строк под текущие фильтры.</div>
					{:else}
						<div class="space-y-3">
							{#each recentVessels as row}
								<a
									class="block rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
									href={`/emis?shipHbkId=${encodeURIComponent(String(asNumber(row.ship_hbk_id) ?? ''))}`}
								>
									<div class="flex items-start justify-between gap-3">
										<div class="space-y-1">
											<div class="font-medium text-foreground">
												{truncateText(asString(row.vessel_name) ?? 'Unnamed vessel', 72)}
											</div>
											<div class="type-caption text-muted-foreground">
												{formatOptionalDate(row.last_fetched_at)}
												{#if asString(row.last_route_date_utc)}
													<span class="mx-1 text-border">·</span>
													route {formatOptionalDate(row.last_route_date_utc)}
												{/if}
											</div>
										</div>
										<div class="text-right">
											<div class="font-medium text-foreground">
												{formatOptionalNumber(row.route_days_count)}
											</div>
											<div class="type-caption text-muted-foreground">days</div>
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
