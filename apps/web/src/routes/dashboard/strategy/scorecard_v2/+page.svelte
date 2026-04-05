<script lang="ts">
	import type { DatasetResponse } from '@dashboard-builder/platform-datasets';
	import type { EChartsOption } from 'echarts';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { fetchDataset } from '$shared/api/fetchDataset';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { cn } from '@dashboard-builder/platform-ui';
	import { Button } from '@dashboard-builder/platform-ui';
	import { Card, CardContent, CardHeader, CardTitle } from '@dashboard-builder/platform-ui';
	import { Chart } from '@dashboard-builder/platform-ui';
	import { DataTable } from '@dashboard-builder/platform-ui';
	import { Badge } from '@dashboard-builder/platform-ui';
	import { ProgressCircle } from '@dashboard-builder/platform-ui';
	import { ProgressBar } from '@dashboard-builder/platform-ui';
	import { formatDate, formatNumber, formatPercent } from '@dashboard-builder/platform-core';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';
	import { barChartPreset, getChartPalette } from '@dashboard-builder/platform-ui';
	import { resolveCssColorVar } from '@dashboard-builder/platform-ui';

	import StrategyNav from '../StrategyNav.svelte';
	import {
		STRATEGY_DATASET_IDS,
		STRATEGY_SCORECARD_FILTER_IDS,
		STRATEGY_WORKSPACE_ID
	} from '../constants';
	import { strategyFilters } from '../filters';
	import {
		asBoolean,
		asNumber,
		asString,
		sortRows,
		type SortDir,
		type StrategyRow
	} from '../utils';

	type ScorecardBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

	type ScorecardRow = {
		departmentCode: string;
		departmentName: string;
		perspectiveCode: string;
		perspectiveName: string;
		horizonCode: string;
		horizonName: string;
		totalKpiCount: number;
		kpiWithTarget: number;
		kpiWithActual: number;
		gapCount: number;
		weightMissingFlag: boolean;
		missingWeightRows: number;
		planCoveragePct: number | null;
		actualCoveragePct: number | null;
		readinessLabel: string;
		readinessVariant: ScorecardBadgeVariant;
		attentionScore: number;
	};

	type DepartmentSummary = {
		departmentCode: string;
		departmentName: string;
		rowsCount: number;
		totalKpiCount: number;
		kpiWithTarget: number;
		kpiWithActual: number;
		gapCount: number;
		rowsWithoutWeights: number;
		planCoveragePct: number | null;
		actualCoveragePct: number | null;
		attentionScore: number;
	};

	type HorizonSummary = {
		horizonCode: string;
		horizonName: string;
		totalKpiCount: number;
		kpiWithTarget: number;
		kpiWithActual: number;
		gapCount: number;
		planCoveragePct: number | null;
		actualCoveragePct: number | null;
	};

	function toCoverage(numerator: number, denominator: number): number | null {
		if (!Number.isFinite(denominator) || denominator <= 0) return null;
		return (numerator / denominator) * 100;
	}

	function getCoverageVariant(value: number | null): ScorecardBadgeVariant {
		if (value === null) return 'muted';
		if (value >= 80) return 'success';
		if (value >= 50) return 'warning';
		return 'error';
	}

	function coverageToProgressVariant(
		value: number | null
	): 'success' | 'warning' | 'error' | 'default' {
		if (value === null) return 'default';
		if (value >= 80) return 'success';
		if (value >= 50) return 'warning';
		return 'error';
	}

	function coverageToCircleVariant(
		value: number | null
	): 'success' | 'warning' | 'error' | 'default' {
		if (value === null) return 'default';
		if (value >= 80) return 'success';
		if (value >= 50) return 'warning';
		return 'error';
	}

	function getCoverageBarClass(value: number | null, emphasize = false): string {
		if (value === null) return 'bg-muted-foreground/20';
		if (value >= 80) return emphasize ? 'bg-emerald-500' : 'bg-emerald-400';
		if (value >= 50) return emphasize ? 'bg-amber-500' : 'bg-amber-400';
		return emphasize ? 'bg-rose-500' : 'bg-rose-400';
	}

	function clampBarWidth(value: number | null): string {
		if (value === null) return '0%';
		return `${Math.max(6, Math.min(100, value))}%`;
	}

	function getReadiness(values: {
		totalKpiCount: number;
		planCoveragePct: number | null;
		actualCoveragePct: number | null;
		gapCount: number;
		weightMissingFlag: boolean;
	}): { label: string; variant: ScorecardBadgeVariant; attentionScore: number } {
		const uncoveredActual = Math.max(
			0,
			values.totalKpiCount -
				Math.round(((values.actualCoveragePct ?? 0) * values.totalKpiCount) / 100)
		);
		const baseAttentionScore =
			(values.weightMissingFlag ? 140 : 0) +
			uncoveredActual * 6 +
			values.gapCount * 10 +
			(values.planCoveragePct === null ? 15 : Math.max(0, 75 - values.planCoveragePct));

		if (values.totalKpiCount === 0) {
			return { label: 'Нет KPI', variant: 'muted', attentionScore: 0 };
		}
		if (values.weightMissingFlag) {
			return {
				label: 'Нужно добрать веса',
				variant: 'warning',
				attentionScore: baseAttentionScore
			};
		}
		if ((values.actualCoveragePct ?? 0) >= 80 && values.gapCount === 0) {
			return { label: 'Можно показывать', variant: 'success', attentionScore: baseAttentionScore };
		}
		if ((values.actualCoveragePct ?? 0) >= 50 && (values.planCoveragePct ?? 0) >= 70) {
			return { label: 'Рабочий прогресс', variant: 'info', attentionScore: baseAttentionScore };
		}
		return { label: 'Зона внимания', variant: 'error', attentionScore: baseAttentionScore };
	}

	const filterRuntime = useFilterWorkspace({
		workspaceId: STRATEGY_WORKSPACE_ID,
		ownerId: 'scorecard',
		specs: strategyFilters
	});

	let dataset = $state<DatasetResponse | null>(null);
	let error = $state<string | null>(null);
	let sortKey = $state<keyof ScorecardRow>('attentionScore');
	let sortDir = $state<SortDir>('desc');

	let effectiveFilters = $derived(filterRuntime.effective);
	let rows = $derived.by(() => {
		const sourceRows = (dataset?.rows ?? []) as StrategyRow[];
		return sourceRows.map((row): ScorecardRow => {
			const totalKpiCount = asNumber(row.total_kpi_count) ?? 0;
			const kpiWithTarget = asNumber(row.kpi_with_target) ?? 0;
			const kpiWithActual = asNumber(row.kpi_with_actual) ?? 0;
			const gapCount = asNumber(row.gap_count) ?? 0;
			const weightMissingFlag = asBoolean(row.weight_missing_flag) === true;
			const planCoveragePct = toCoverage(kpiWithTarget, totalKpiCount);
			const actualCoveragePct = toCoverage(kpiWithActual, totalKpiCount);
			const readiness = getReadiness({
				totalKpiCount,
				planCoveragePct,
				actualCoveragePct,
				gapCount,
				weightMissingFlag
			});

			return {
				departmentCode: asString(row.department_code) ?? '—',
				departmentName: asString(row.department_name) ?? asString(row.department_code) ?? '—',
				perspectiveCode: asString(row.perspective_code) ?? '—',
				perspectiveName: asString(row.perspective_name) ?? asString(row.perspective_code) ?? '—',
				horizonCode: asString(row.horizon_code) ?? '—',
				horizonName: asString(row.horizon_name) ?? asString(row.horizon_code) ?? '—',
				totalKpiCount,
				kpiWithTarget,
				kpiWithActual,
				gapCount,
				weightMissingFlag,
				missingWeightRows: asNumber(row.missing_weight_rows) ?? 0,
				planCoveragePct,
				actualCoveragePct,
				readinessLabel: readiness.label,
				readinessVariant: readiness.variant,
				attentionScore: readiness.attentionScore
			};
		});
	});

	const loader = useDebouncedLoader({
		watch: () => $effectiveFilters,
		delayMs: 250,
		load: () =>
			fetchDataset({
				id: STRATEGY_DATASET_IDS.scorecardOverview,
				params: { limit: 2000 },
				cache: { ttlMs: 30_000 },
				filterContext: {
					snapshot: filterRuntime.getSnapshot(),
					workspaceId: filterRuntime.workspaceId,
					ownerId: filterRuntime.ownerId
				}
			}),
		onData: (data) => {
			dataset = data;
			error = null;
		},
		onError: (err) => {
			error = err instanceof Error ? err.message : String(err);
		}
	});

	let sortedRows = $derived(sortRows(rows, sortKey, sortDir));
	let latestExecutedAt = $derived.by(() =>
		dataset?.meta?.executedAt
			? formatDate(dataset.meta.executedAt, { day: '2-digit', month: 'short', year: 'numeric' })
			: null
	);

	let departmentCount = $derived(new Set(rows.map((r) => r.departmentCode)).size);
	let totalKpiCount = $derived(rows.reduce((sum, r) => sum + r.totalKpiCount, 0));
	let totalKpiWithTarget = $derived(rows.reduce((sum, r) => sum + r.kpiWithTarget, 0));
	let totalKpiWithActual = $derived(rows.reduce((sum, r) => sum + r.kpiWithActual, 0));
	let gapCountTotal = $derived(rows.reduce((sum, r) => sum + r.gapCount, 0));
	let actualCoveragePct = $derived(toCoverage(totalKpiWithActual, totalKpiCount));
	let planCoveragePct = $derived(toCoverage(totalKpiWithTarget, totalKpiCount));

	let uniqueTotals = $derived.by(() => {
		const totals = new Map<string, { missingWeightRows: number }>();
		for (const row of rows) {
			const key = `${row.departmentCode}|${row.horizonCode}`;
			if (!totals.has(key)) totals.set(key, { missingWeightRows: row.missingWeightRows });
		}
		return Array.from(totals.values());
	});

	let missingWeightRowsTotal = $derived(
		uniqueTotals.reduce((sum, r) => sum + r.missingWeightRows, 0)
	);
	let rowsInAttention = $derived(
		rows.filter((r) => r.readinessVariant === 'error' || r.readinessVariant === 'warning').length
	);

	let departmentSummaries = $derived.by(() => {
		const buckets = new Map<string, DepartmentSummary>();
		for (const row of rows) {
			const current = buckets.get(row.departmentCode) ?? {
				departmentCode: row.departmentCode,
				departmentName: row.departmentName,
				rowsCount: 0,
				totalKpiCount: 0,
				kpiWithTarget: 0,
				kpiWithActual: 0,
				gapCount: 0,
				rowsWithoutWeights: 0,
				planCoveragePct: null,
				actualCoveragePct: null,
				attentionScore: 0
			};
			current.rowsCount += 1;
			current.totalKpiCount += row.totalKpiCount;
			current.kpiWithTarget += row.kpiWithTarget;
			current.kpiWithActual += row.kpiWithActual;
			current.gapCount += row.gapCount;
			current.rowsWithoutWeights += row.weightMissingFlag ? 1 : 0;
			buckets.set(row.departmentCode, current);
		}
		return Array.from(buckets.values())
			.map((s) => ({
				...s,
				actualCoveragePct: toCoverage(s.kpiWithActual, s.totalKpiCount),
				planCoveragePct: toCoverage(s.kpiWithTarget, s.totalKpiCount),
				attentionScore:
					s.rowsWithoutWeights * 140 +
					Math.max(0, s.totalKpiCount - s.kpiWithActual) * 6 +
					s.gapCount * 10
			}))
			.sort((a, b) => b.attentionScore - a.attentionScore);
	});

	let topAttentionDepartments = $derived(departmentSummaries.slice(0, 5));

	let horizonSummaries = $derived.by(() => {
		const buckets = new Map<string, HorizonSummary>();
		for (const row of rows) {
			const current = buckets.get(row.horizonCode) ?? {
				horizonCode: row.horizonCode,
				horizonName: row.horizonName,
				totalKpiCount: 0,
				kpiWithTarget: 0,
				kpiWithActual: 0,
				gapCount: 0,
				planCoveragePct: null,
				actualCoveragePct: null
			};
			current.totalKpiCount += row.totalKpiCount;
			current.kpiWithTarget += row.kpiWithTarget;
			current.kpiWithActual += row.kpiWithActual;
			current.gapCount += row.gapCount;
			buckets.set(row.horizonCode, current);
		}
		return Array.from(buckets.values()).map((s) => ({
			...s,
			planCoveragePct: toCoverage(s.kpiWithTarget, s.totalKpiCount),
			actualCoveragePct: toCoverage(s.kpiWithActual, s.totalKpiCount)
		}));
	});

	let headlineStatus = $derived.by(() => {
		if (rows.length === 0) return { label: 'Нет данных', variant: 'muted' as const };
		if (missingWeightRowsTotal > 0)
			return { label: 'Нужна стабилизация', variant: 'warning' as const };
		if ((actualCoveragePct ?? 0) >= 70)
			return { label: 'Можно показывать', variant: 'success' as const };
		if ((actualCoveragePct ?? 0) >= 45) return { label: 'Рабочий срез', variant: 'info' as const };
		return { label: 'Черновой срез', variant: 'error' as const };
	});

	// --- Charts ---

	let deptChartOptions = $derived.by((): EChartsOption => {
		const depts = departmentSummaries.slice(0, 8);
		const names = depts.map((d) => d.departmentName);
		const factData = depts.map((d) => d.actualCoveragePct ?? 0);
		const planData = depts.map((d) => d.planCoveragePct ?? 0);

		return {
			...barChartPreset,
			grid: { top: 10, right: 16, bottom: 24, left: 10, containLabel: true },
			tooltip: {
				...barChartPreset.tooltip,
				trigger: 'axis',
				formatter: (params: unknown) => {
					const items = params as { seriesName: string; value: number; marker: string }[];
					if (!Array.isArray(items) || items.length === 0) return '';
					const name = (params as { name: string }[])[0]?.name ?? '';
					return (
						`<b>${name}</b><br/>` +
						items.map((i) => `${i.marker} ${i.seriesName}: ${i.value.toFixed(0)}%`).join('<br/>')
					);
				}
			},
			xAxis: {
				...barChartPreset.xAxis,
				type: 'value',
				max: 100,
				axisLabel: { formatter: '{value}%' }
			},
			yAxis: {
				...barChartPreset.yAxis,
				type: 'category',
				data: names.reverse(),
				axisLabel: {
					width: 100,
					overflow: 'truncate',
					fontSize: 11,
					color: resolveCssColorVar('--color-muted-foreground')
				}
			},
			series: [
				{
					name: 'Факт',
					type: 'bar',
					data: [...factData].reverse(),
					barMaxWidth: 14,
					barGap: '30%',
					itemStyle: {
						color: resolveCssColorVar('--color-success') ?? '#198038',
						borderRadius: [0, 3, 3, 0]
					}
				},
				{
					name: 'План',
					type: 'bar',
					data: [...planData].reverse(),
					barMaxWidth: 14,
					itemStyle: {
						color: resolveCssColorVar('--color-chart-1') ?? '#009d9a',
						borderRadius: [0, 3, 3, 0],
						opacity: 0.6
					}
				}
			]
		};
	});

	let statusBuckets = $derived.by(() => {
		const counts: Record<string, { label: string; variant: ScorecardBadgeVariant; count: number }> =
			{};
		for (const row of rows) {
			if (!counts[row.readinessLabel]) {
				counts[row.readinessLabel] = {
					label: row.readinessLabel,
					variant: row.readinessVariant,
					count: 0
				};
			}
			counts[row.readinessLabel].count += 1;
		}
		return Object.values(counts).sort((a, b) => b.count - a.count);
	});

	let strongestRows = $derived.by(() =>
		[...rows]
			.filter((r) => r.totalKpiCount > 0)
			.sort((a, b) => {
				const d = (b.actualCoveragePct ?? -1) - (a.actualCoveragePct ?? -1);
				if (d !== 0) return d;
				if (a.weightMissingFlag !== b.weightMissingFlag)
					return Number(a.weightMissingFlag) - Number(b.weightMissingFlag);
				return b.totalKpiCount - a.totalKpiCount;
			})
			.slice(0, 4)
	);

	// --- Active tab for bottom section ---
	let activeTab = $state<'attention' | 'table'>('attention');

	function handleSort(key: string, dir: SortDir) {
		sortKey = key as keyof ScorecardRow;
		sortDir = dir;
	}
</script>

<svelte:head>
	<title>Стратегия — Карта показателей v2</title>
</svelte:head>

{#snippet scopeCell(_value: unknown, row: ScorecardRow)}
	<div class="space-y-0.5">
		<div class="font-medium text-foreground">{row.departmentName}</div>
		<div class="type-caption text-muted-foreground">{row.perspectiveName} · {row.horizonName}</div>
	</div>
{/snippet}

{#snippet countCell(value: unknown)}
	<span class="font-medium tabular-nums"
		>{formatNumber(asNumber(value as StrategyRow[string] | undefined))}</span
	>
{/snippet}

{#snippet coverageCell(value: unknown)}
	{@const coverage = typeof value === 'number' ? value : null}
	<div class="min-w-[100px] space-y-1">
		<span class="font-medium tabular-nums">{formatPercent(coverage, { decimals: 0 })}</span>
		<div class="h-1.5 rounded-full bg-muted/70">
			<div
				class={cn(
					'h-1.5 rounded-full transition-[width] duration-300',
					getCoverageBarClass(coverage)
				)}
				style={`width: ${clampBarWidth(coverage)}`}
			></div>
		</div>
	</div>
{/snippet}

{#snippet gapCell(value: unknown)}
	{@const gapCount = typeof value === 'number' ? value : 0}
	<span class={cn('font-medium tabular-nums', gapCount > 0 && 'text-amber-700')}
		>{formatNumber(gapCount)}</span
	>
{/snippet}

{#snippet statusCell(_value: unknown, row: ScorecardRow)}
	<div class="flex flex-wrap items-center gap-1.5">
		<Badge variant={row.readinessVariant} size="sm">{row.readinessLabel}</Badge>
		{#if row.weightMissingFlag}
			<Badge variant="warning" size="sm">без веса</Badge>
		{/if}
	</div>
{/snippet}

{#snippet emptyState()}
	<div class="mx-auto flex max-w-md flex-col items-center gap-2 py-8 text-center">
		<svg
			class="h-6 w-6 text-muted-foreground"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
		>
			<path
				d="M4 7h16M7 4v3m10-3v3M5 11h14M8 15h3m-3 4h8M6 20h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z"
			/>
		</svg>
		<p class="text-sm text-muted-foreground">
			Нет строк в текущем срезе. Попробуйте расширить фильтры.
		</p>
	</div>
{/snippet}

<div class="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-6 lg:px-8">
	<!-- Header -->
	<header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<h1 class="type-page-title">Карта показателей</h1>
			<Badge variant={headlineStatus.variant}>{headlineStatus.label}</Badge>
		</div>
		<div class="type-caption flex items-center gap-3 text-muted-foreground">
			{#if latestExecutedAt}
				<span>Снимок: {latestExecutedAt}</span>
			{/if}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={loader.reload}
				disabled={loader.loading}
			>
				{loader.loading ? 'Обновляем...' : 'Обновить'}
			</Button>
		</div>
	</header>

	<!-- Nav + Filters row -->
	<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<StrategyNav currentPath="/dashboard/strategy/scorecard_v2" />
		<div class="flex items-center gap-2">
			<FilterPanel
				runtime={filterRuntime}
				scope="all"
				direction="horizontal"
				filterIds={[...STRATEGY_SCORECARD_FILTER_IDS]}
			/>
		</div>
	</div>

	{#if error}
		<div class="rounded-lg border border-error/30 bg-error-muted px-4 py-2.5 text-sm text-error">
			{error}
		</div>
	{/if}

	<!-- KPI Gauges Row -->
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
		<!-- Fact coverage gauge -->
		<Card class="flex flex-col items-center justify-center p-4">
			<ProgressCircle value={actualCoveragePct ?? 0} variant="auto" size="lg" />
			<p class="type-caption mt-2 text-center text-muted-foreground">Покрытие фактом</p>
			<p class="type-caption text-muted-foreground">
				{formatNumber(totalKpiWithActual)} из {formatNumber(totalKpiCount)}
			</p>
		</Card>

		<!-- Plan coverage gauge -->
		<Card class="flex flex-col items-center justify-center p-4">
			<ProgressCircle value={planCoveragePct ?? 0} variant="auto" size="lg" />
			<p class="type-caption mt-2 text-center text-muted-foreground">Покрытие планом</p>
			<p class="type-caption text-muted-foreground">{formatNumber(totalKpiWithTarget)} с планом</p>
		</Card>

		<!-- Departments -->
		<Card class="flex flex-col items-center justify-center p-4">
			<span class="type-kpi-value text-foreground">{formatNumber(departmentCount)}</span>
			<p class="type-caption mt-1 text-center text-muted-foreground">Департаментов</p>
		</Card>

		<!-- Attention rows -->
		<Card class="flex flex-col items-center justify-center p-4">
			<span class={cn('type-kpi-value', rowsInAttention > 0 ? 'text-error' : 'text-foreground')}>
				{formatNumber(rowsInAttention)}
			</span>
			<p class="type-caption mt-1 text-center text-muted-foreground">В зоне внимания</p>
			<p class="type-caption text-muted-foreground">{formatNumber(gapCountTotal)} разрывов</p>
		</Card>

		<!-- Missing weights -->
		<Card class="flex flex-col items-center justify-center p-4">
			<span
				class={cn(
					'type-kpi-value',
					missingWeightRowsTotal > 0 ? 'text-warning-muted-foreground' : 'text-foreground'
				)}
			>
				{formatNumber(missingWeightRowsTotal)}
			</span>
			<p class="type-caption mt-1 text-center text-muted-foreground">Без весов</p>
		</Card>
	</div>

	<!-- Main analytics: Chart + Horizons -->
	<div class="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
		<!-- Department coverage chart -->
		<Card>
			<CardHeader class="pb-2">
				<CardTitle>Покрытие по департаментам</CardTitle>
			</CardHeader>
			<CardContent>
				{#if departmentSummaries.length > 0}
					<div class="h-[280px]">
						<Chart options={deptChartOptions} autoResize />
					</div>
				{:else}
					<p class="py-8 text-center text-sm text-muted-foreground">Нет данных для графика</p>
				{/if}
			</CardContent>
		</Card>

		<!-- Horizon summaries -->
		<Card>
			<CardHeader class="pb-2">
				<CardTitle>По горизонтам</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3">
				{#each horizonSummaries as horizon}
					<div class="rounded-xl border border-border/60 p-3">
						<div class="flex items-center justify-between gap-2">
							<div>
								<p class="text-sm font-medium text-foreground">{horizon.horizonName}</p>
								<p class="type-caption text-muted-foreground">
									{formatNumber(horizon.totalKpiCount)} KPI · {formatNumber(horizon.gapCount)} разрывов
								</p>
							</div>
							<Badge variant={getCoverageVariant(horizon.actualCoveragePct)} size="sm">
								{formatPercent(horizon.actualCoveragePct, { decimals: 0 })}
							</Badge>
						</div>
						<div class="mt-2.5 space-y-1.5">
							<ProgressBar
								value={horizon.planCoveragePct ?? 0}
								variant={coverageToProgressVariant(horizon.planCoveragePct)}
								size="sm"
								label="План"
								showValue
							/>
							<ProgressBar
								value={horizon.actualCoveragePct ?? 0}
								variant={coverageToProgressVariant(horizon.actualCoveragePct)}
								size="sm"
								label="Факт"
								showValue
							/>
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>
	</div>

	<!-- Bottom section: Tabs for Attention / Table -->
	<Card>
		<div class="flex items-center gap-1 border-b border-border px-4 pt-2">
			<button
				type="button"
				class={cn(
					'px-4 py-2.5 text-sm font-medium transition-colors',
					activeTab === 'attention'
						? 'border-b-2 border-primary text-foreground'
						: 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => (activeTab = 'attention')}
			>
				Зоны внимания
			</button>
			<button
				type="button"
				class={cn(
					'px-4 py-2.5 text-sm font-medium transition-colors',
					activeTab === 'table'
						? 'border-b-2 border-primary text-foreground'
						: 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => (activeTab = 'table')}
			>
				Детализация ({formatNumber(rows.length)} строк)
			</button>
		</div>

		<CardContent class="pt-4">
			{#if activeTab === 'attention'}
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<!-- Top attention departments -->
					<div class="space-y-3">
						<p class="text-sm font-medium text-muted-foreground">Где внимание в первую очередь</p>
						{#if topAttentionDepartments.length === 0}
							<p class="text-sm text-muted-foreground">Нет департаментов для ранжирования.</p>
						{:else}
							{#each topAttentionDepartments as dept, idx}
								<div class="flex items-start gap-3 rounded-xl border border-border/60 p-3">
									<span
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
									>
										{idx + 1}
									</span>
									<div class="min-w-0 flex-1">
										<div class="flex items-start justify-between gap-2">
											<div>
												<p class="text-sm font-medium text-foreground">{dept.departmentName}</p>
												<p class="type-caption text-muted-foreground">
													{formatNumber(dept.totalKpiCount)} KPI · {formatNumber(dept.gapCount)} разрывов
													· {formatNumber(dept.rowsCount)} строк
												</p>
											</div>
											<div class="flex shrink-0 flex-wrap gap-1">
												<Badge variant={getCoverageVariant(dept.actualCoveragePct)} size="sm">
													факт {formatPercent(dept.actualCoveragePct, { decimals: 0 })}
												</Badge>
												{#if dept.rowsWithoutWeights > 0}
													<Badge variant="warning" size="sm"
														>без весов: {formatNumber(dept.rowsWithoutWeights)}</Badge
													>
												{/if}
											</div>
										</div>
										<div class="mt-2 space-y-1">
											<ProgressBar
												value={dept.actualCoveragePct ?? 0}
												variant={coverageToProgressVariant(dept.actualCoveragePct)}
												size="sm"
												label="Факт"
												showValue
											/>
											<ProgressBar
												value={dept.planCoveragePct ?? 0}
												variant={coverageToProgressVariant(dept.planCoveragePct)}
												size="sm"
												label="План"
												showValue
											/>
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>

					<!-- Readiness distribution -->
					<div class="space-y-3">
						<p class="text-sm font-medium text-muted-foreground">
							Распределение по статусу готовности
						</p>
						{#each statusBuckets as bucket}
							<div class="flex items-center justify-between rounded-xl border border-border/60 p-3">
								<div class="flex items-center gap-2">
									<Badge variant={bucket.variant} size="sm">{bucket.label}</Badge>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-sm font-semibold text-foreground tabular-nums"
										>{formatNumber(bucket.count)}</span
									>
									<span class="type-caption text-muted-foreground">
										({rows.length > 0 ? ((bucket.count / rows.length) * 100).toFixed(0) : 0}%)
									</span>
								</div>
							</div>
						{/each}

						<p class="mt-4 text-sm font-medium text-muted-foreground">Лучшее покрытие</p>
						{#each strongestRows as row}
							<div class="flex items-center justify-between rounded-xl border border-border/60 p-3">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-foreground">{row.departmentName}</p>
									<p class="type-caption text-muted-foreground">
										{row.perspectiveName} · {row.horizonName}
									</p>
								</div>
								<div class="shrink-0 text-right">
									<span class="text-sm font-semibold text-foreground tabular-nums">
										{formatPercent(row.actualCoveragePct, { decimals: 0 })}
									</span>
									<p class="type-caption text-muted-foreground">
										{formatNumber(row.kpiWithActual)}/{formatNumber(row.totalKpiCount)}
									</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<DataTable
					columns={[
						{
							key: 'departmentName',
							label: 'Разрез',
							sortable: true,
							minWidth: '220px',
							cell: scopeCell
						},
						{ key: 'totalKpiCount', label: 'KPI', align: 'right', sortable: true, cell: countCell },
						{
							key: 'planCoveragePct',
							label: 'План',
							sortable: true,
							cell: coverageCell,
							minWidth: '110px'
						},
						{
							key: 'actualCoveragePct',
							label: 'Факт',
							sortable: true,
							cell: coverageCell,
							minWidth: '110px'
						},
						{ key: 'gapCount', label: 'Разрывы', align: 'right', sortable: true, cell: gapCell },
						{
							key: 'readinessLabel',
							label: 'Статус',
							sortable: true,
							cell: statusCell,
							minWidth: '160px'
						}
					]}
					rows={sortedRows}
					{sortKey}
					{sortDir}
					onSort={handleSort}
					loading={loader.loading && sortedRows.length === 0}
					empty={emptyState}
				/>
			{/if}
		</CardContent>
	</Card>
</div>
