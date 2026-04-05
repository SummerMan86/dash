<script lang="ts">
	import { page } from '$app/state';

	import type { EChartsOption } from 'echarts';

	import type { DatasetResponse, JsonValue } from '@dashboard-builder/platform-datasets';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { fetchDataset } from '$shared/api/fetchDataset';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { Badge } from '@dashboard-builder/platform-ui';
	import { Button } from '@dashboard-builder/platform-ui';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dashboard-builder/platform-ui';
	import { Chart } from '@dashboard-builder/platform-ui';
	import { ChartCard } from '@dashboard-builder/platform-ui';
	import { DataTable } from '@dashboard-builder/platform-ui';
	import { StatCard } from '@dashboard-builder/platform-ui';
	import { formatDate, formatNumber, formatPercent, truncate } from '@dashboard-builder/platform-core';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';

	import StrategyNav from '../StrategyNav.svelte';
	import {
		STRATEGY_DATASET_IDS,
		STRATEGY_PERFORMANCE_FILTER_IDS,
		STRATEGY_WORKSPACE_ID
	} from '../constants';
	import { strategyFilters } from '../filters';
	import {
		asBoolean,
		asNumber,
		asString,
		presentStrategyEntity,
		sortRows,
		type SortDir,
		type StrategyRow
	} from '../utils';

	type PerformanceRow = {
		performanceEntityKey: string;
		strategyEntityId: string;
		entityName: string;
		entityDisplayName: string;
		entityDisplayContext: string | null;
		entitySourceName: string | null;
		entitySemantics: string;
		departmentCode: string;
		perspectiveCode: string;
		horizonCode: string;
		statusLabel: string;
		yearNum: number | null;
		periodLabel: string;
		factName: string;
		factClass: string;
		metricCode: string;
		unit: string | null;
		targetValue: number | null;
		actualValue: number | null;
		forecastValue: number | null;
		thresholdValue: number | null;
		achievementPct: number | null;
		deviationAbs: number | null;
		hasTarget: boolean;
		hasActual: boolean;
		factIdCount: number;
		entityLinkCount: number;
		createdAt: string | null;
	};

	const filterRuntime = useFilterWorkspace({
		workspaceId: STRATEGY_WORKSPACE_ID,
		ownerId: 'performance',
		specs: strategyFilters
	});

	let dataset = $state<DatasetResponse | null>(null);
	let error = $state<string | null>(null);
	let sortKey = $state<keyof PerformanceRow>('deviationAbs');
	let sortDir = $state<SortDir>('desc');
	let selectedStrategyEntityId = $derived(
		page.url.searchParams.get('strategyEntityId')?.trim() || null
	);

	let effectiveFilters = $derived(filterRuntime.effective);
	let rows = $derived.by(() => {
		const sourceRows = (dataset?.rows ?? []) as StrategyRow[];
		return sourceRows.map((row): PerformanceRow => {
			const entityName = asString(row.entity_name);
			const entitySemantics = asString(row.entity_semantics);
			const factName = asString(row.fact_name);
			const strategyEntityId = asString(row.strategy_entity_id) ?? '—';
			const entityPresentation = presentStrategyEntity({
				entityName,
				entitySemantics,
				fallbackLabel: strategyEntityId,
				factName
			});

			return {
				performanceEntityKey: asString(row.performance_entity_key) ?? '',
				strategyEntityId,
				entityName: entityName ?? '—',
				entityDisplayName: entityPresentation.primaryLabel,
				entityDisplayContext: entityPresentation.secondaryLabel,
				entitySourceName: entityPresentation.sourceLabel,
				entitySemantics: entitySemantics ?? '—',
				departmentCode: asString(row.department_code) ?? '—',
				perspectiveCode: asString(row.perspective_code) ?? '—',
				horizonCode: asString(row.horizon_code) ?? '—',
				statusLabel: asString(row.status_label) ?? 'Без статуса',
				yearNum: asNumber(row.year_num),
				periodLabel: asString(row.period_label) ?? '—',
				factName: factName ?? '—',
				factClass: asString(row.fact_class) ?? '—',
				metricCode: asString(row.metric_code) ?? '—',
				unit: asString(row.unit),
				targetValue: asNumber(row.target_value),
				actualValue: asNumber(row.actual_value),
				forecastValue: asNumber(row.forecast_value),
				thresholdValue: asNumber(row.threshold_value),
				achievementPct: asNumber(row.achievement_pct),
				deviationAbs: asNumber(row.deviation_abs),
				hasTarget: asBoolean(row.has_target_flag) === true,
				hasActual: asBoolean(row.has_actual_flag) === true,
				factIdCount: asNumber(row.fact_id_count) ?? 0,
				entityLinkCount: asNumber(row.entity_link_count) ?? 0,
				createdAt: asString(row.created_at)
			};
		});
	});

	const loader = useDebouncedLoader({
		watch: () => ({ filters: effectiveFilters, selectedStrategyEntityId }),
		delayMs: 250,
		load: () =>
			fetchDataset({
				id: STRATEGY_DATASET_IDS.performanceDetail,
				params: {
					limit: 10000,
					...(selectedStrategyEntityId ? { strategyEntityId: selectedStrategyEntityId } : {})
				},
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

	let achievedCount = $derived(
		rows.filter((row) => typeof row.achievementPct === 'number' && row.achievementPct >= 100).length
	);
	let avgAchievementPct = $derived.by(() => {
		const values = rows
			.map((row) => row.achievementPct)
			.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
		if (values.length === 0) return null;
		return values.reduce((sum, value) => sum + value, 0) / values.length;
	});
	let missingTargetCount = $derived(rows.filter((row) => !row.hasTarget).length);
	let missingActualCount = $derived(rows.filter((row) => !row.hasActual).length);
	let documentLikeEntityRows = $derived(rows.filter((row) => row.entitySourceName !== null).length);

	let topDeviationRows = $derived.by(() =>
		[...rows]
			.filter((row) => typeof row.deviationAbs === 'number' && Number.isFinite(row.deviationAbs))
			.sort((left, right) => (right.deviationAbs ?? 0) - (left.deviationAbs ?? 0))
			.slice(0, 10)
	);

	let deviationChartOptions = $derived.by(
		(): EChartsOption => ({
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			xAxis: {
				type: 'value'
			},
			yAxis: {
				type: 'category',
				data: [...topDeviationRows]
					.reverse()
					.map((row) => truncate(`${row.entityDisplayName} / ${row.metricCode}`, 28))
			},
			series: [
				{
					type: 'bar',
					name: 'Абсолютное отклонение',
					data: [...topDeviationRows].reverse().map((row) => row.deviationAbs ?? 0),
					barWidth: '58%'
				}
			]
		})
	);

	let multiFactRows = $derived(rows.filter((row) => row.factIdCount > 1).length);
	let multiLinkRows = $derived(rows.filter((row) => row.entityLinkCount > 1).length);
	let selectedEntityLabel = $derived(
		selectedStrategyEntityId ? (rows[0]?.entityDisplayName ?? null) : null
	);

	function handleSort(key: string, dir: SortDir) {
		sortKey = key as keyof PerformanceRow;
		sortDir = dir;
	}

	function statusVariant(statusLabel: string): 'success' | 'warning' | 'error' | 'info' | 'muted' {
		const normalized = statusLabel.trim().toLowerCase();
		if (!normalized) return 'muted';
		if (
			normalized.includes('green') ||
			normalized.includes('ok') ||
			normalized.includes('норма') ||
			normalized.includes('выполн')
		) {
			return 'success';
		}
		if (normalized.includes('red') || normalized.includes('крит') || normalized.includes('проср')) {
			return 'error';
		}
		if (
			normalized.includes('yellow') ||
			normalized.includes('risk') ||
			normalized.includes('рис')
		) {
			return 'warning';
		}
		return 'info';
	}

	function formatMetricValue(value: number | null, unit: string | null): string {
		const formatted = formatNumber(value, { maximumFractionDigits: 2 });
		return unit && formatted !== '—' ? `${formatted} ${unit}` : formatted;
	}
</script>

<svelte:head>
	<title>Стратегия — Результативность</title>
</svelte:head>

{#snippet statusCell(value: unknown)}
	<Badge variant={statusVariant(asString(value as JsonValue | undefined) ?? '')} size="sm">
		{asString(value as JsonValue | undefined) ?? 'Без статуса'}
	</Badge>
{/snippet}

{#snippet metricValueCell(value: unknown, row: PerformanceRow)}
	<span class="font-medium"
		>{formatMetricValue(asNumber(value as JsonValue | undefined), row.unit)}</span
	>
{/snippet}

{#snippet achievementCell(value: unknown)}
	<span class="font-medium"
		>{formatPercent(asNumber(value as JsonValue | undefined), { decimals: 1 })}</span
	>
{/snippet}

{#snippet entityCell(_value: unknown, row: PerformanceRow)}
	<div class="space-y-1">
		<div class="leading-snug font-medium">{row.entityDisplayName}</div>
		{#if row.entityDisplayContext || row.entitySourceName}
			<div class="type-caption leading-snug text-muted-foreground">
				{#if row.entityDisplayContext}
					<div>{row.entityDisplayContext}</div>
				{/if}
				{#if row.entitySourceName}
					<div>Источник: {row.entitySourceName}</div>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet coverageCell(_value: unknown, row: PerformanceRow)}
	<div class="flex flex-wrap gap-1">
		<Badge variant={row.hasTarget ? 'success' : 'warning'} size="sm">
			{row.hasTarget ? 'план' : 'нет плана'}
		</Badge>
		<Badge variant={row.hasActual ? 'success' : 'outline'} size="sm">
			{row.hasActual ? 'факт' : 'нет факта'}
		</Badge>
	</div>
{/snippet}

<div class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
	<header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-2">
			<p class="type-caption tracking-[0.2em] text-muted-foreground uppercase">
				Стратегия / Результативность
			</p>
			<h1 class="type-page-title">Детализация результативности KPI</h1>
			<p class="type-body-sm max-w-4xl text-muted-foreground">
				Сравнение плана и факта по KPI: плановые и фактические значения, процент достижения и
				абсолютное отклонение. Источник: витрина `slobi_performance_detail`.
			</p>
			{#if selectedEntityLabel}
				<div class="pt-1">
					<Badge variant="info" size="sm">Фильтр по объекту: {selectedEntityLabel}</Badge>
				</div>
			{/if}
		</div>

		<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
			{#if latestExecutedAt}
				<span>Снимок: {latestExecutedAt}</span>
			{/if}
			<Button type="button" variant="outline" onclick={loader.reload} disabled={loader.loading}>
				{loader.loading ? 'Обновляем...' : 'Обновить'}
			</Button>
		</div>
	</header>

	<StrategyNav currentPath="/dashboard/strategy/performance" />

	<Card>
		<CardHeader>
			<CardTitle>Фильтры рабочего пространства</CardTitle>
			<CardDescription>
				Общие фильтры стратегии остаются сквозными, а поиск по объекту реестра и статусу работает
				поверх детализации результативности.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<FilterPanel
				runtime={filterRuntime}
				scope="all"
				direction="horizontal"
				filterIds={[...STRATEGY_PERFORMANCE_FILTER_IDS]}
			/>
		</CardContent>
	</Card>

	{#if error}
		<div class="rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error">
			{error}
		</div>
	{/if}

	<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<StatCard
			label="Строк KPI"
			hint="Общее количество KPI-строк после фильтрации. Разрез: объект реестра × метрика × период"
			value={formatNumber(rows.length)}
			loading={loader.loading && rows.length === 0}
		/>
		<StatCard
			label="Достигнуто"
			hint="Количество KPI, где достижение >= 100% (план выполнен или перевыполнен)"
			value={formatNumber(achievedCount)}
		/>
		<StatCard
			label="Среднее достижение"
			hint="Средний процент выполнения по всем KPI, у которых есть и план, и факт"
			value={formatPercent(avgAchievementPct, { decimals: 1 })}
		/>
		<StatCard
			label="Без плана"
			hint="KPI, у которых не задано плановое значение. Без плана невозможно рассчитать процент достижения"
			value={formatNumber(missingTargetCount)}
		/>
		<StatCard
			label="Без факта"
			hint="KPI, у которых не заполнено фактическое значение. Требуется ввод данных"
			value={formatNumber(missingActualCount)}
		/>
	</section>

	<section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
		<ChartCard
			title="Топ абсолютных отклонений"
			subtitle="Топ-10 KPI с наибольшим отклонением факта от плана (|факт − план|)"
			updatedAt={latestExecutedAt ?? undefined}
			loading={loader.loading && topDeviationRows.length === 0}
		>
			<Chart options={deviationChartOptions} />
		</ChartCard>

		<Card>
			<CardHeader>
				<CardTitle>Диагностика</CardTitle>
				<CardDescription>QA-сигналы из опубликованной витрины данных.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4 text-sm">
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">Строки с несколькими фактами</span>
					<span class="font-medium">{formatNumber(multiFactRows)}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">Строки с документо-подобным названием</span>
					<span class="font-medium">{formatNumber(documentLikeEntityRows)}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">Строки, связанные с несколькими объектами</span>
					<span class="font-medium">{formatNumber(multiLinkRows)}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">Строки с порогом</span>
					<span class="font-medium">
						{formatNumber(rows.filter((row) => typeof row.thresholdValue === 'number').length)}
					</span>
				</div>
				<div
					class="type-caption rounded-lg border border-border/60 bg-muted/20 p-4 text-muted-foreground"
				>
					Если позже понадобится полная детализация по фактам, её лучше вынести в отдельный набор
					данных, а не перегружать текущий экран.
				</div>
			</CardContent>
		</Card>
	</section>

	<Card>
		<CardHeader>
			<CardTitle>Строки результативности</CardTitle>
			<CardDescription>
				Операционная таблица KPI: человекочитаемый KPI-label, источник контура, статус, полнота
				план/факт и обзор отклонений.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<DataTable
				columns={[
					{
						key: 'entityDisplayName',
						label: 'Объект / источник',
						sortable: true,
						cell: entityCell,
						minWidth: '280px'
					},
					{ key: 'metricCode', label: 'Метрика', sortable: true, minWidth: '120px' },
					{ key: 'factName', label: 'Факт', sortable: true, minWidth: '220px' },
					{
						key: 'statusLabel',
						label: 'Статус',
						sortable: true,
						cell: statusCell,
						minWidth: '130px'
					},
					{ key: 'periodLabel', label: 'Период', sortable: true, minWidth: '110px' },
					{
						key: 'targetValue',
						label: 'План',
						align: 'right',
						sortable: true,
						cell: metricValueCell
					},
					{
						key: 'actualValue',
						label: 'Факт',
						align: 'right',
						sortable: true,
						cell: metricValueCell
					},
					{
						key: 'achievementPct',
						label: '% Дост.',
						align: 'right',
						sortable: true,
						cell: achievementCell
					},
					{
						key: 'deviationAbs',
						label: 'Отклонение',
						align: 'right',
						sortable: true,
						cell: metricValueCell
					},
					{ key: 'hasActual', label: 'Покрытие', cell: coverageCell, minWidth: '148px' }
				]}
				rows={sortedRows}
				{sortKey}
				{sortDir}
				onSort={handleSort}
				loading={loader.loading && sortedRows.length === 0}
			/>
		</CardContent>
	</Card>
</div>
