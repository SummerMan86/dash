<script lang="ts">
	import type { DatasetResponse, AsyncState } from '@dashboard-builder/platform-datasets';
	import { ok, loading, error as errorState, idle, normalizeDatasetError } from '@dashboard-builder/platform-datasets';
	import { useFilterWorkspace, planFiltersForTarget } from '@dashboard-builder/platform-filters';
	import { fetchDataset, DatasetFetchError } from '$shared/api/fetchDataset';
	import { cn } from '@dashboard-builder/platform-ui';
	import { Button } from '@dashboard-builder/platform-ui';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@dashboard-builder/platform-ui';
	import { DataTable } from '@dashboard-builder/platform-ui';
	import { Badge } from '@dashboard-builder/platform-ui';
	import { StatCard } from '@dashboard-builder/platform-ui';
	import { formatDate, formatNumber, formatPercent } from '@dashboard-builder/platform-core';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';

	import StrategyNav from '../StrategyNav.svelte';
	import {
		STRATEGY_DATASET_IDS,
		STRATEGY_SCORECARD_FILTER_IDS,
		STRATEGY_WORKSPACE_ID
	} from '../constants';
	import { strategyFilters } from '../filters';
	import { asNumber, sortRows, type SortDir, type StrategyRow } from '../utils';
	import {
		type ScorecardRow,
		type DepartmentSummary,
		type HorizonSummary,
		type ScorecardBadgeVariant,
		toCoverage,
		getCoverageVariant,
		getCoverageBarClass,
		clampBarWidth,
		mapToScorecardRows,
	} from './view-model';

	const DATASET_ID = STRATEGY_DATASET_IDS.scorecardOverview;

	const filterRuntime = useFilterWorkspace({
		workspaceId: STRATEGY_WORKSPACE_ID,
		ownerId: 'scorecard',
		specs: strategyFilters,
	});

	// --- Page-local async query state (target pattern) ---
	let queryState = $state<AsyncState<DatasetResponse>>(idle());
	let sortKey = $state<keyof ScorecardRow>('attentionScore');
	let sortDir = $state<SortDir>('desc');
	let fetchVersion = 0; // closure counter for stale-request guard, not reactive

	let effectiveFilters = $derived(filterRuntime.effective);

	// Rows derived from current data (keep-previous-data on refresh)
	let currentData = $derived(
		queryState.status === 'ok' ? queryState.data
		: queryState.status === 'error' && queryState.data ? queryState.data
		: null,
	);
	let rows = $derived(currentData ? mapToScorecardRows(currentData.rows) : []);

	// --- Explicit planner + flat params fetch (no legacy merge) ---
	async function loadDataset() {
		const version = ++fetchVersion;
		const prevData = currentData;

		// Mark as loading/refreshing
		queryState = prevData
			? ok(prevData, true) // keep previous data visible, mark as refreshing
			: loading();

		try {
			// Explicit planner call — server params resolved client-side
			const plan = planFiltersForTarget(
				DATASET_ID,
				filterRuntime.getSnapshot(),
				{ workspaceId: filterRuntime.workspaceId, ownerId: filterRuntime.ownerId },
			);

			// Flat params: planner serverParams + page-local params merged explicitly
			const params = { ...plan.serverParams, limit: 2000 };

			const data = await fetchDataset({
				id: DATASET_ID,
				params,
				cache: { ttlMs: 30_000 },
			});

			// Stale-request guard
			if (version !== fetchVersion) return;
			queryState = ok(data);
		} catch (e) {
			if (version !== fetchVersion) return;
			const clientError = e instanceof DatasetFetchError
				? e.clientError
				: normalizeDatasetError(e);
			queryState = errorState(clientError, prevData ?? undefined);
		}
	}

	// Watch filters and reload with debounce
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		// Touch effectiveFilters to subscribe to changes
		void effectiveFilters;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(loadDataset, 250);
		return () => clearTimeout(debounceTimer);
	});

	let sortedRows = $derived(sortRows(rows, sortKey, sortDir));
	let isLoading = $derived(queryState.status === 'loading');
	let isRefreshing = $derived(queryState.status === 'ok' && queryState.refreshing === true);
	let errorMessage = $derived(queryState.status === 'error' ? queryState.error.message : null);

	let latestExecutedAt = $derived.by(() =>
		currentData?.meta?.executedAt
			? formatDate(currentData.meta.executedAt, { day: '2-digit', month: 'short', year: 'numeric' })
			: null,
	);

	let departmentCount = $derived(new Set(rows.map((row) => row.departmentCode)).size);
	let perspectiveCount = $derived(new Set(rows.map((row) => row.perspectiveCode)).size);
	let horizonCount = $derived(new Set(rows.map((row) => row.horizonCode)).size);

	let totalKpiCount = $derived(rows.reduce((sum, row) => sum + row.totalKpiCount, 0));
	let totalKpiWithTarget = $derived(rows.reduce((sum, row) => sum + row.kpiWithTarget, 0));
	let totalKpiWithActual = $derived(rows.reduce((sum, row) => sum + row.kpiWithActual, 0));
	let gapCountTotal = $derived(rows.reduce((sum, row) => sum + row.gapCount, 0));
	let actualCoveragePct = $derived(toCoverage(totalKpiWithActual, totalKpiCount));
	let planCoveragePct = $derived(toCoverage(totalKpiWithTarget, totalKpiCount));

	let uniqueTotals = $derived.by(() => {
		const totals = new Map<string, { missingWeightRows: number }>();
		for (const row of rows) {
			const key = `${row.departmentCode}|${row.horizonCode}`;
			if (!totals.has(key)) {
				totals.set(key, { missingWeightRows: row.missingWeightRows });
			}
		}
		return Array.from(totals.values());
	});

	let missingWeightRowsTotal = $derived.by(() =>
		uniqueTotals.reduce((sum, row) => sum + row.missingWeightRows, 0)
	);
	let rowsInAttention = $derived(
		rows.filter((row) => row.readinessVariant === 'error' || row.readinessVariant === 'warning')
			.length
	);
	let rowsReady = $derived(rows.filter((row) => row.readinessVariant === 'success').length);

	let departmentSummaries = $derived.by(() => {
		const buckets = new Map<string, DepartmentSummary>();

		for (const row of rows) {
			const key = row.departmentCode;
			const current = buckets.get(key) ?? {
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

			buckets.set(key, current);
		}

		return Array.from(buckets.values())
			.map((summary) => {
				const actualCoverage = toCoverage(summary.kpiWithActual, summary.totalKpiCount);
				const planCoverage = toCoverage(summary.kpiWithTarget, summary.totalKpiCount);
				const attentionScore =
					summary.rowsWithoutWeights * 140 +
					Math.max(0, summary.totalKpiCount - summary.kpiWithActual) * 6 +
					summary.gapCount * 10;

				return {
					...summary,
					actualCoveragePct: actualCoverage,
					planCoveragePct: planCoverage,
					attentionScore
				};
			})
			.sort((left, right) => right.attentionScore - left.attentionScore);
	});

	let topAttentionDepartments = $derived(departmentSummaries.slice(0, 4));

	let horizonSummaries = $derived.by(() => {
		const buckets = new Map<string, HorizonSummary>();

		for (const row of rows) {
			const key = row.horizonCode;
			const current = buckets.get(key) ?? {
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

			buckets.set(key, current);
		}

		return Array.from(buckets.values()).map((summary) => ({
			...summary,
			planCoveragePct: toCoverage(summary.kpiWithTarget, summary.totalKpiCount),
			actualCoveragePct: toCoverage(summary.kpiWithActual, summary.totalKpiCount)
		}));
	});

	let strongestRows = $derived.by(() =>
		[...rows]
			.filter((row) => row.totalKpiCount > 0)
			.sort((left, right) => {
				const coverageDelta = (right.actualCoveragePct ?? -1) - (left.actualCoveragePct ?? -1);
				if (coverageDelta !== 0) return coverageDelta;
				if (left.weightMissingFlag !== right.weightMissingFlag) {
					return Number(left.weightMissingFlag) - Number(right.weightMissingFlag);
				}
				return right.totalKpiCount - left.totalKpiCount;
			})
			.slice(0, 5)
	);

	let headlineStatus = $derived.by(() => {
		if (rows.length === 0) return { label: 'Нет данных', variant: 'muted' as const };
		if (missingWeightRowsTotal > 0)
			return { label: 'Нужна стабилизация', variant: 'warning' as const };
		if ((actualCoveragePct ?? 0) >= 70)
			return { label: 'Можно показывать', variant: 'success' as const };
		if ((actualCoveragePct ?? 0) >= 45) return { label: 'Рабочий срез', variant: 'info' as const };
		return { label: 'Черновой срез', variant: 'error' as const };
	});

	let topAttentionDepartment = $derived(topAttentionDepartments[0] ?? null);
	let executiveSummary = $derived.by(() => {
		if (rows.length === 0) {
			return 'После фильтрации не осталось строк. Для презентации лучше расширить срез или снять часть фильтров.';
		}

		const topDepartmentLabel = topAttentionDepartment?.departmentName ?? 'нескольких департаментах';
		return `Фактическими значениями закрыто ${formatPercent(actualCoveragePct, { decimals: 0 })} KPI, планом покрыто ${formatPercent(planCoveragePct, { decimals: 0 })}. Главная зона внимания сейчас — ${topDepartmentLabel}.`;
	});

	function handleSort(key: string, dir: SortDir) {
		sortKey = key as keyof ScorecardRow;
		sortDir = dir;
	}
</script>

<svelte:head>
	<title>Стратегия — Карта показателей</title>
</svelte:head>

{#snippet scopeCell(_value: unknown, row: ScorecardRow)}
	<div class="space-y-1">
		<div class="font-medium text-foreground">{row.departmentName}</div>
		<div class="type-caption text-muted-foreground">
			{row.perspectiveName} • {row.horizonName}
		</div>
	</div>
{/snippet}

{#snippet countCell(value: unknown)}
	<span class="font-medium">{formatNumber(asNumber(value as StrategyRow[string] | undefined))}</span
	>
{/snippet}

{#snippet coverageCell(value: unknown)}
	{@const coverage = typeof value === 'number' ? value : null}
	<div class="min-w-[108px] space-y-1">
		<div class="flex items-center justify-between gap-2">
			<span class="font-medium">{formatPercent(coverage, { decimals: 0 })}</span>
		</div>
		<div class="h-2 rounded-full bg-muted/70">
			<div
				class={cn(
					'h-2 rounded-full transition-[width] duration-300',
					getCoverageBarClass(coverage)
				)}
				style={`width: ${clampBarWidth(coverage)}`}
			></div>
		</div>
	</div>
{/snippet}

{#snippet gapCell(value: unknown)}
	{@const gapCount = typeof value === 'number' ? value : 0}
	<span class={cn('font-medium', gapCount > 0 && 'text-amber-700')}>
		{formatNumber(gapCount)}
	</span>
{/snippet}

{#snippet statusCell(_value: unknown, row: ScorecardRow)}
	<div class="flex flex-wrap items-center gap-2">
		<Badge variant={row.readinessVariant} size="sm">{row.readinessLabel}</Badge>
		{#if row.weightMissingFlag}
			<Badge variant="warning" size="sm">без веса</Badge>
		{/if}
	</div>
{/snippet}

{#snippet emptyState()}
	<div class="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
		<div class="rounded-full border border-border/60 bg-muted/30 p-3">
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
		</div>
		<div class="space-y-1">
			<p class="font-medium text-foreground">В этом срезе сейчас нет строк</p>
			<p class="text-sm text-muted-foreground">
				Снимите часть фильтров или выберите более широкий горизонт, чтобы вернуть управленческую
				сводку.
			</p>
		</div>
	</div>
{/snippet}

<div class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
	<header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-2">
			<p class="type-caption tracking-[0.2em] text-muted-foreground uppercase">
				Стратегия / Карта показателей
			</p>
			<h1 class="type-page-title">BSC-карта показателей по департаментам</h1>
			<p class="type-body-sm max-w-4xl text-muted-foreground">
				Страница собрана как управленческий readout: где уже есть рабочее покрытие, где нужно
				добрать план/факт и какие департаменты первыми выносить в разговор.
			</p>
		</div>

		<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
			{#if latestExecutedAt}
				<span>Снимок: {latestExecutedAt}</span>
			{/if}
			<Button type="button" variant="outline" onclick={loadDataset} disabled={isLoading || isRefreshing}>
				{isLoading || isRefreshing ? 'Обновляем...' : 'Обновить'}
			</Button>
		</div>
	</header>

	<StrategyNav currentPath="/dashboard/strategy/scorecard" />

	<Card
		class="overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-info-muted/20"
	>
		<CardContent class="p-0">
			<div class="grid gap-0 lg:grid-cols-[1.45fr_0.95fr]">
				<div class="space-y-5 p-6 lg:p-8">
					<div class="flex flex-wrap items-center gap-2">
						<Badge variant={headlineStatus.variant}>{headlineStatus.label}</Badge>
						<Badge variant="outline">{formatNumber(departmentCount)} департаментов</Badge>
						<Badge variant="outline">{formatNumber(perspectiveCount)} перспектив</Badge>
						<Badge variant="outline">{formatNumber(horizonCount)} горизонта</Badge>
					</div>

					<div class="space-y-3">
						<h2 class="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
							Сводка по наполнению KPI, планов и фактов в разрезе департаментов.
						</h2>
						<p class="max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">
							{executiveSummary}
						</p>
					</div>

					<div class="grid gap-3 sm:grid-cols-3">
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">Покрытие фактом</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatPercent(actualCoveragePct, { decimals: 0 })}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{formatNumber(totalKpiWithActual)} из {formatNumber(totalKpiCount)} KPI
							</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">Покрытие планом</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatPercent(planCoveragePct, { decimals: 0 })}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{formatNumber(totalKpiWithTarget)} KPI с планом
							</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">Строк в зоне внимания</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(rowsInAttention)}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{formatNumber(gapCountTotal)} разрывов, {formatNumber(missingWeightRowsTotal)} без весов
							</p>
						</div>
					</div>
				</div>

				<div
					class="border-t border-border/60 bg-background/65 p-6 lg:border-t-0 lg:border-l lg:p-8"
				>
					<div class="space-y-4">
						<div>
							<p class="type-overline text-muted-foreground">Контекст среза</p>
							<p class="mt-2 text-sm leading-6 text-muted-foreground">
								Взвешенный итог временно скрыт. Текущая версия сфокусирована на полноте KPI,
								план/факт и зонах внимания по департаментам.
							</p>
						</div>

						<div class="space-y-3">
							<div
								class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
							>
								<span class="text-sm text-muted-foreground">Сильных строк</span>
								<span class="text-base font-semibold text-foreground"
									>{formatNumber(rowsReady)}</span
								>
							</div>
							<div
								class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
							>
								<span class="text-sm text-muted-foreground">Строк в опубликованном срезе</span>
								<span class="text-base font-semibold text-foreground"
									>{formatNumber(rows.length)}</span
								>
							</div>
							<div
								class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
							>
								<span class="text-sm text-muted-foreground"
									>Уникальных итогов департамент × горизонт</span
								>
								<span class="text-base font-semibold text-foreground"
									>{formatNumber(uniqueTotals.length)}</span
								>
							</div>
						</div>

						<div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
							<p class="font-medium text-foreground">Назначение среза</p>
							<p class="mt-2 text-sm leading-6 text-muted-foreground">
								Срез уже отвечает на три базовых управленческих вопроса: где есть KPI, где есть факт
								и у каких департаментов сейчас максимальный дефицит наполнения.
							</p>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Фильтры рабочего пространства</CardTitle>
			<CardDescription>
				Фильтры здесь работают как сценарий разговора: можно быстро перейти от общей картины к
				конкретному департаменту, горизонту или перспективе.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<FilterPanel
				runtime={filterRuntime}
				scope="all"
				direction="horizontal"
				filterIds={[...STRATEGY_SCORECARD_FILTER_IDS]}
			/>
		</CardContent>
	</Card>

	{#if errorMessage}
		<div class="rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error">
			{errorMessage}
		</div>
	{/if}

	<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<StatCard
			label="Департаментов"
			hint="Количество департаментов в текущем опубликованном срезе"
			value={formatNumber(departmentCount)}
			loading={isLoading && rows.length === 0}
		/>
		<StatCard
			label="KPI в срезе"
			hint="Суммарное число KPI в текущем фильтре"
			value={formatNumber(totalKpiCount)}
		/>
		<StatCard
			label="Покрытие планом"
			hint="Доля KPI, по которым опубликован план"
			value={formatPercent(planCoveragePct, { decimals: 0 })}
		/>
		<StatCard
			label="Покрытие фактом"
			hint="Доля KPI, по которым опубликован факт"
			value={formatPercent(actualCoveragePct, { decimals: 0 })}
		/>
		<StatCard
			label="Без весов"
			hint="Количество итогов департамент × горизонт, где веса требуют внимания"
			value={formatNumber(missingWeightRowsTotal)}
		/>
	</section>

	<section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
		<Card>
			<CardHeader>
				<CardTitle>Где внимание в первую очередь</CardTitle>
				<CardDescription>
					Список собран по сочетанию низкого покрытия фактом, разрывов и проблем с весами.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if topAttentionDepartments.length === 0}
					<p class="text-sm text-muted-foreground">
						После фильтрации нет департаментов для ранжирования.
					</p>
				{:else}
					{#each topAttentionDepartments as department}
						<div class="rounded-2xl border border-border/60 bg-muted/15 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="space-y-1">
									<div class="font-medium text-foreground">{department.departmentName}</div>
									<div class="type-caption text-muted-foreground">
										{formatNumber(department.totalKpiCount)} KPI • {formatNumber(
											department.gapCount
										)} разрывов • {formatNumber(department.rowsCount)} строк
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant={getCoverageVariant(department.actualCoveragePct)} size="sm">
										факт {formatPercent(department.actualCoveragePct, { decimals: 0 })}
									</Badge>
									{#if department.rowsWithoutWeights > 0}
										<Badge variant="warning" size="sm">
											без весов: {formatNumber(department.rowsWithoutWeights)}
										</Badge>
									{/if}
								</div>
							</div>

							<div class="mt-3 space-y-2">
								<div class="flex items-center justify-between text-xs text-muted-foreground">
									<span>Покрытие фактом</span>
									<span>{formatPercent(department.actualCoveragePct, { decimals: 0 })}</span>
								</div>
								<div class="h-2 rounded-full bg-muted/70">
									<div
										class={cn(
											'h-2 rounded-full',
											getCoverageBarClass(department.actualCoveragePct, true)
										)}
										style={`width: ${clampBarWidth(department.actualCoveragePct)}`}
									></div>
								</div>
								<div class="flex items-center justify-between text-xs text-muted-foreground">
									<span>Покрытие планом</span>
									<span>{formatPercent(department.planCoveragePct, { decimals: 0 })}</span>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</CardContent>
		</Card>

		<div class="grid grid-cols-1 gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Срез по горизонтам</CardTitle>
					<CardDescription>
						Удобный разговорный уровень: где лучше опубликован план и где уже есть факт.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#each horizonSummaries as horizon}
						<div class="rounded-2xl border border-border/60 bg-card p-4">
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="font-medium text-foreground">{horizon.horizonName}</p>
									<p class="type-caption text-muted-foreground">
										{formatNumber(horizon.totalKpiCount)} KPI • {formatNumber(horizon.gapCount)} разрывов
									</p>
								</div>
								<Badge variant={getCoverageVariant(horizon.actualCoveragePct)} size="sm">
									{formatPercent(horizon.actualCoveragePct, { decimals: 0 })}
								</Badge>
							</div>

							<div class="mt-4 space-y-3">
								<div class="space-y-1">
									<div class="flex items-center justify-between text-xs text-muted-foreground">
										<span>План</span>
										<span>{formatPercent(horizon.planCoveragePct, { decimals: 0 })}</span>
									</div>
									<div class="h-2 rounded-full bg-muted/70">
										<div
											class={cn('h-2 rounded-full', getCoverageBarClass(horizon.planCoveragePct))}
											style={`width: ${clampBarWidth(horizon.planCoveragePct)}`}
										></div>
									</div>
								</div>

								<div class="space-y-1">
									<div class="flex items-center justify-between text-xs text-muted-foreground">
										<span>Факт</span>
										<span>{formatPercent(horizon.actualCoveragePct, { decimals: 0 })}</span>
									</div>
									<div class="h-2 rounded-full bg-muted/70">
										<div
											class={cn(
												'h-2 rounded-full',
												getCoverageBarClass(horizon.actualCoveragePct, true)
											)}
											style={`width: ${clampBarWidth(horizon.actualCoveragePct)}`}
										></div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Лучшее покрытие в текущем срезе</CardTitle>
					<CardDescription>
						Готовые строки, которые уже выглядят убедительно на показе.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#if strongestRows.length === 0}
						<p class="text-sm text-muted-foreground">
							Пока нет строк с ненулевым KPI после фильтрации.
						</p>
					{:else}
						{#each strongestRows as row}
							<div
								class="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-muted/15 p-4"
							>
								<div class="space-y-1">
									<div class="font-medium text-foreground">{row.departmentName}</div>
									<div class="type-caption text-muted-foreground">
										{row.perspectiveName} • {row.horizonName}
									</div>
								</div>
								<div class="text-right">
									<div class="font-semibold text-foreground">
										{formatPercent(row.actualCoveragePct, { decimals: 0 })}
									</div>
									<div class="type-caption text-muted-foreground">
										{formatNumber(row.kpiWithActual)} из {formatNumber(row.totalKpiCount)} KPI
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</CardContent>
			</Card>
		</div>
	</section>

	<Card>
		<CardHeader>
			<CardTitle>Строки карты показателей</CardTitle>
			<CardDescription>
				Ниже остается рабочая детализация, но уже с более читаемым статусом: какой разрез можно
				показывать, а какой пока требует добора факта или весов.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<DataTable
				columns={[
					{
						key: 'departmentName',
						label: 'Разрез',
						sortable: true,
						minWidth: '240px',
						cell: scopeCell
					},
					{ key: 'totalKpiCount', label: 'KPI', align: 'right', sortable: true, cell: countCell },
					{
						key: 'planCoveragePct',
						label: 'План',
						sortable: true,
						cell: coverageCell,
						minWidth: '130px'
					},
					{
						key: 'actualCoveragePct',
						label: 'Факт',
						sortable: true,
						cell: coverageCell,
						minWidth: '130px'
					},
					{ key: 'gapCount', label: 'Разрывы', align: 'right', sortable: true, cell: gapCell },
					{
						key: 'readinessLabel',
						label: 'Статус',
						sortable: true,
						cell: statusCell,
						minWidth: '180px'
					}
				]}
				rows={sortedRows}
				{sortKey}
				{sortDir}
				onSort={handleSort}
				loading={isLoading && sortedRows.length === 0}
				empty={emptyState}
			/>
		</CardContent>
	</Card>
</div>
