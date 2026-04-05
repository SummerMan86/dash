<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import type { DatasetResponse } from '@dashboard-builder/platform-datasets';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { fetchDataset } from '$shared/api/fetchDataset';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
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
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';
	import { Badge } from '@dashboard-builder/platform-ui';
	import { StatCard } from '@dashboard-builder/platform-ui';
	import {
		formatDate,
		formatNumber,
		formatPercent,
		truncate
	} from '@dashboard-builder/platform-core';

	import StrategyNav from '../StrategyNav.svelte';
	import {
		STRATEGY_DATASET_IDS,
		STRATEGY_OVERVIEW_FILTER_IDS,
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

	type OverviewBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

	type OverviewEntityRow = {
		strategyEntityId: string;
		entityName: string;
		entityDisplayName: string;
		entitySemantics: string;
		departmentCode: string;
		perspectiveCode: string;
		horizonCode: string;
		documentCount: number;
		goalCount: number;
		taskCount: number;
		kpiCount: number;
		gapCount: number;
		coverageItemsTotal: number;
		totalKpiCount: number;
		kpiWithTarget: number;
		kpiWithActual: number;
		avgAchievementPct: number | null;
		hasConfirmedEvidence: boolean;
		hasDerivedOnly: boolean;
		weakEntity: boolean;
		scoreBand: string;
		planCoveragePct: number | null;
		actualCoveragePct: number | null;
		cascadeDepth: number;
		cascadeLabel: string;
		cascadeVariant: OverviewBadgeVariant;
		evidenceLabel: string;
		evidenceVariant: OverviewBadgeVariant;
		attentionScore: number;
	};

	type StageSummary = {
		label: string;
		description: string;
		count: number;
		pct: number | null;
		variant: OverviewBadgeVariant;
	};

	type SemanticsSummary = {
		semantics: string;
		count: number;
		pct: number | null;
		variant: OverviewBadgeVariant;
	};

	function toCoverage(numerator: number, denominator: number): number | null {
		if (!Number.isFinite(denominator) || denominator <= 0) return null;
		return (numerator / denominator) * 100;
	}

	function getCoverageVariant(value: number | null): OverviewBadgeVariant {
		if (value === null) return 'muted';
		if (value >= 80) return 'success';
		if (value >= 50) return 'warning';
		return 'error';
	}

	function getSemanticsVariant(semantics: string): OverviewBadgeVariant {
		if (semantics === 'Стратегия') return 'success';
		if (semantics === 'План') return 'info';
		if (semantics === 'Программа') return 'warning';
		return 'muted';
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

	function getCascadeStatus(
		goalCount: number,
		taskCount: number,
		kpiCount: number
	): {
		label: string;
		variant: OverviewBadgeVariant;
		cascadeDepth: number;
	} {
		const cascadeDepth = [goalCount > 0, taskCount > 0, kpiCount > 0].filter(Boolean).length;

		if (goalCount > 0 && taskCount > 0 && kpiCount > 0) {
			return { label: 'Полная прослеживаемость', variant: 'success', cascadeDepth };
		}

		if (goalCount > 0 && taskCount > 0 && kpiCount === 0) {
			return { label: 'Нет KPI', variant: 'warning', cascadeDepth };
		}

		if (goalCount > 0 && taskCount === 0) {
			return { label: 'Нет задач', variant: 'error', cascadeDepth };
		}

		if (taskCount > 0 || kpiCount > 0) {
			return { label: 'Неполная прослеживаемость', variant: 'info', cascadeDepth };
		}

		return { label: 'Связи не найдены', variant: 'muted', cascadeDepth };
	}

	function getEvidenceStatus(values: {
		hasConfirmedEvidence: boolean;
		hasDerivedOnly: boolean;
		weakEntity: boolean;
	}): { label: string; variant: OverviewBadgeVariant } {
		if (values.hasConfirmedEvidence && !values.weakEntity) {
			return { label: 'Подтверждено', variant: 'success' };
		}
		if (values.hasDerivedOnly) {
			return { label: 'Косвенная база', variant: 'warning' };
		}
		if (values.weakEntity) {
			return { label: 'Нужна проверка', variant: 'error' };
		}
		return { label: 'Сигналов нет', variant: 'muted' };
	}

	function buildAttentionScore(values: {
		gapCount: number;
		weakEntity: boolean;
		hasConfirmedEvidence: boolean;
		hasDerivedOnly: boolean;
		kpiCount: number;
		totalKpiCount: number;
		kpiWithActual: number;
		cascadeDepth: number;
	}): number {
		return (
			values.gapCount * 12 +
			(values.weakEntity ? 80 : 0) +
			(!values.hasConfirmedEvidence ? 30 : 0) +
			(values.hasDerivedOnly ? 20 : 0) +
			(values.kpiCount === 0 ? 25 : 0) +
			(values.totalKpiCount > 0 && values.kpiWithActual === 0 ? 20 : 0) +
			Math.max(0, 3 - values.cascadeDepth) * 18
		);
	}

	const filterRuntime = useFilterWorkspace({
		workspaceId: STRATEGY_WORKSPACE_ID,
		ownerId: 'overview',
		specs: strategyFilters
	});

	let dataset = $state<DatasetResponse | null>(null);
	let error = $state<string | null>(null);
	let sortKey = $state<keyof OverviewEntityRow>('gapCount');
	let sortDir = $state<SortDir>('desc');

	let effectiveFilters = $derived(filterRuntime.effective);
	let rawRows = $derived.by(() => (dataset?.rows ?? []) as StrategyRow[]);

	const loader = useDebouncedLoader({
		watch: () => $effectiveFilters,
		delayMs: 250,
		load: () =>
			fetchDataset({
				id: STRATEGY_DATASET_IDS.entityOverview,
				params: { limit: 5000 },
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

	let overviewRows = $derived.by(() =>
		rawRows
			.map((row): OverviewEntityRow | null => {
				const strategyEntityId = asString(row.strategy_entity_id);
				if (!strategyEntityId) return null;

				const entityName = asString(row.entity_name);
				const entitySemantics = asString(row.entity_semantics);
				const entityPresentation = presentStrategyEntity({
					entityName,
					entitySemantics,
					fallbackLabel: strategyEntityId
				});

				const goalCount = asNumber(row.goal_count) ?? 0;
				const taskCount = asNumber(row.task_count) ?? 0;
				const kpiCount = asNumber(row.kpi_count) ?? 0;
				const gapCount = asNumber(row.gap_count) ?? 0;
				const totalKpiCount = asNumber(row.total_kpi_count) ?? 0;
				const kpiWithTarget = asNumber(row.kpi_with_target) ?? 0;
				const kpiWithActual = asNumber(row.kpi_with_actual) ?? 0;
				const hasConfirmedEvidence = asBoolean(row.has_confirmed_evidence_flag) === true;
				const hasDerivedOnly = asBoolean(row.has_derived_only_flag) === true;
				const weakEntity = asBoolean(row.weak_entity_flag) === true;
				const cascadeStatus = getCascadeStatus(goalCount, taskCount, kpiCount);
				const evidenceStatus = getEvidenceStatus({
					hasConfirmedEvidence,
					hasDerivedOnly,
					weakEntity
				});
				const planCoveragePct = toCoverage(kpiWithTarget, totalKpiCount);
				const actualCoveragePct = toCoverage(kpiWithActual, totalKpiCount);
				const attentionScore = buildAttentionScore({
					gapCount,
					weakEntity,
					hasConfirmedEvidence,
					hasDerivedOnly,
					kpiCount,
					totalKpiCount,
					kpiWithActual,
					cascadeDepth: cascadeStatus.cascadeDepth
				});

				return {
					strategyEntityId,
					entityName: entityName ?? strategyEntityId,
					entityDisplayName: entityPresentation.primaryLabel,
					entitySemantics: entitySemantics ?? '—',
					departmentCode: asString(row.department_code) ?? '—',
					perspectiveCode: asString(row.perspective_code) ?? '—',
					horizonCode: asString(row.horizon_code) ?? '—',
					documentCount: asNumber(row.document_count) ?? 0,
					goalCount,
					taskCount,
					kpiCount,
					gapCount,
					coverageItemsTotal: asNumber(row.coverage_items_total) ?? 0,
					totalKpiCount,
					kpiWithTarget,
					kpiWithActual,
					avgAchievementPct: asNumber(row.avg_achievement_pct),
					hasConfirmedEvidence,
					hasDerivedOnly,
					weakEntity,
					scoreBand: asString(row.score_band) ?? 'Нет оценки',
					planCoveragePct,
					actualCoveragePct,
					cascadeDepth: cascadeStatus.cascadeDepth,
					cascadeLabel: cascadeStatus.label,
					cascadeVariant: cascadeStatus.variant,
					evidenceLabel: evidenceStatus.label,
					evidenceVariant: evidenceStatus.variant,
					attentionScore
				};
			})
			.filter((row): row is OverviewEntityRow => row !== null)
	);

	let sortedRows = $derived(sortRows(overviewRows, sortKey, sortDir));
	let latestExecutedAt = $derived.by(() =>
		dataset?.meta?.executedAt
			? formatDate(dataset.meta.executedAt, { day: '2-digit', month: 'short', year: 'numeric' })
			: null
	);
	let selectedEntityId = $derived(page.url.searchParams.get('strategyEntityId')?.trim() || null);

	let totalEntities = $derived(overviewRows.length);
	let departmentCount = $derived(new Set(overviewRows.map((row) => row.departmentCode)).size);
	let perspectiveCount = $derived(new Set(overviewRows.map((row) => row.perspectiveCode)).size);
	let horizonCount = $derived(new Set(overviewRows.map((row) => row.horizonCode)).size);

	let confirmedEvidenceCount = $derived(
		overviewRows.filter((row) => row.hasConfirmedEvidence).length
	);
	let derivedOnlyCount = $derived(overviewRows.filter((row) => row.hasDerivedOnly).length);
	let weakEntityCount = $derived(overviewRows.filter((row) => row.weakEntity).length);
	let entitiesWithActualCount = $derived(
		overviewRows.filter((row) => row.kpiWithActual > 0).length
	);
	let entitiesWithGapCount = $derived(overviewRows.filter((row) => row.gapCount > 0).length);
	let fullCascadeCount = $derived(
		overviewRows.filter((row) => row.goalCount > 0 && row.taskCount > 0 && row.kpiCount > 0).length
	);

	let stageSummaries = $derived.by((): StageSummary[] => [
		{
			label: 'Есть документальная опора',
			description: 'Хотя бы один связанный документ по объекту реестра',
			count: overviewRows.filter((row) => row.documentCount > 0).length,
			pct: toCoverage(overviewRows.filter((row) => row.documentCount > 0).length, totalEntities),
			variant: 'info'
		},
		{
			label: 'Связаны с целями',
			description: 'Есть хотя бы одна цель в управленческой цепочке',
			count: overviewRows.filter((row) => row.goalCount > 0).length,
			pct: toCoverage(overviewRows.filter((row) => row.goalCount > 0).length, totalEntities),
			variant: 'success'
		},
		{
			label: 'Связаны с задачами',
			description: 'Есть хотя бы одна задача в управленческой цепочке',
			count: overviewRows.filter((row) => row.taskCount > 0).length,
			pct: toCoverage(overviewRows.filter((row) => row.taskCount > 0).length, totalEntities),
			variant: 'warning'
		},
		{
			label: 'Связаны с KPI',
			description: 'Есть хотя бы один KPI в управленческой цепочке',
			count: overviewRows.filter((row) => row.kpiCount > 0).length,
			pct: toCoverage(overviewRows.filter((row) => row.kpiCount > 0).length, totalEntities),
			variant: 'warning'
		},
		{
			label: 'Есть фактические KPI',
			description: 'Хотя бы один KPI уже имеет факт',
			count: entitiesWithActualCount,
			pct: toCoverage(entitiesWithActualCount, totalEntities),
			variant: getCoverageVariant(toCoverage(entitiesWithActualCount, totalEntities))
		}
	]);

	let semanticsSummaries = $derived.by((): SemanticsSummary[] =>
		Array.from(
			overviewRows.reduce((acc, row) => {
				acc.set(row.entitySemantics, (acc.get(row.entitySemantics) ?? 0) + 1);
				return acc;
			}, new Map<string, number>())
		)
			.map(([semantics, count]) => ({
				semantics,
				count,
				pct: toCoverage(count, totalEntities),
				variant: getSemanticsVariant(semantics)
			}))
			.sort((left, right) => right.count - left.count)
	);

	let topRiskRows = $derived.by(() =>
		[...overviewRows]
			.sort((left, right) => {
				const attentionDelta = right.attentionScore - left.attentionScore;
				if (attentionDelta !== 0) return attentionDelta;
				return right.gapCount - left.gapCount;
			})
			.slice(0, 5)
	);

	let strongestRows = $derived.by(() =>
		[...overviewRows]
			.sort((left, right) => {
				if (left.hasConfirmedEvidence !== right.hasConfirmedEvidence) {
					return Number(right.hasConfirmedEvidence) - Number(left.hasConfirmedEvidence);
				}
				const cascadeDelta = right.cascadeDepth - left.cascadeDepth;
				if (cascadeDelta !== 0) return cascadeDelta;
				const actualDelta = (right.actualCoveragePct ?? -1) - (left.actualCoveragePct ?? -1);
				if (actualDelta !== 0) return actualDelta;
				return right.coverageItemsTotal - left.coverageItemsTotal;
			})
			.slice(0, 5)
	);

	let headlineStatus = $derived.by(() => {
		if (totalEntities === 0) return { label: 'Нет данных', variant: 'muted' as const };
		if (weakEntityCount > totalEntities * 0.55) {
			return { label: 'Есть структурные разрывы', variant: 'warning' as const };
		}
		if (fullCascadeCount >= totalEntities * 0.5) {
			return { label: 'Прослеживаемость читается', variant: 'success' as const };
		}
		return { label: 'Предварительный срез', variant: 'info' as const };
	});

	let executiveSummary = $derived.by(() => {
		if (totalEntities === 0) {
			return 'После фильтрации не осталось объектов реестра. Для общей картины стоит расширить срез по департаменту, перспективе или горизонту.';
		}

		return `В опубликованном срезе ${formatNumber(totalEntities)} объектов реестра. Полная прослеживаемость от цели к задаче и KPI читается у ${formatNumber(fullCascadeCount)} объектов, разрывы найдены у ${formatNumber(entitiesWithGapCount)}, а факт KPI есть у ${formatNumber(entitiesWithActualCount)}.`;
	});

	function handleSort(key: string, dir: SortDir) {
		sortKey = key as keyof OverviewEntityRow;
		sortDir = dir;
	}

	function openCascade(row: OverviewEntityRow) {
		if (!browser) return;
		const url = new URL(window.location.href);
		url.pathname = '/dashboard/strategy/cascade';
		url.searchParams.set('strategyEntityId', row.strategyEntityId);
		void goto(`${url.pathname}?${url.searchParams.toString()}`);
	}
</script>

<svelte:head>
	<title>Стратегия — Обзор</title>
</svelte:head>

{#snippet entityCell(_value: unknown, row: OverviewEntityRow)}
	<div class="space-y-1">
		<div class="flex flex-wrap items-center gap-2">
			<div class="font-medium text-foreground">{row.entityDisplayName}</div>
			<Badge variant="outline" size="sm">{row.entitySemantics}</Badge>
		</div>
		<div class="type-caption text-muted-foreground">
			{row.departmentCode} • {row.horizonCode}
		</div>
	</div>
{/snippet}

{#snippet cascadeCell(_value: unknown, row: OverviewEntityRow)}
	<div class="min-w-[220px] space-y-2">
		<div class="flex flex-wrap items-center gap-2">
			<Badge variant={row.cascadeVariant} size="sm">{row.cascadeLabel}</Badge>
			<Badge variant="outline" size="sm">док: {formatNumber(row.documentCount)}</Badge>
			<Badge variant="outline" size="sm">цели: {formatNumber(row.goalCount)}</Badge>
			<Badge variant="outline" size="sm">задачи: {formatNumber(row.taskCount)}</Badge>
			<Badge variant="outline" size="sm">KPI: {formatNumber(row.kpiCount)}</Badge>
		</div>
		<div class="h-2 rounded-full bg-muted/70">
			<div
				class={cn(
					'h-2 rounded-full',
					row.cascadeDepth === 3
						? 'bg-emerald-500'
						: row.cascadeDepth === 2
							? 'bg-amber-500'
							: row.cascadeDepth === 1
								? 'bg-sky-500'
								: 'bg-muted-foreground/30'
				)}
				style={`width: ${(row.cascadeDepth / 3) * 100}%`}
			></div>
		</div>
	</div>
{/snippet}

{#snippet kpiCell(_value: unknown, row: OverviewEntityRow)}
	<div class="min-w-[120px] space-y-1">
		<div class="flex items-center justify-between gap-2">
			<span class="font-medium">{formatPercent(row.actualCoveragePct, { decimals: 0 })}</span>
			<span class="type-caption text-muted-foreground">
				{formatNumber(row.kpiWithActual)}/{formatNumber(row.totalKpiCount)}
			</span>
		</div>
		<div class="h-2 rounded-full bg-muted/70">
			<div
				class={cn('h-2 rounded-full', getCoverageBarClass(row.actualCoveragePct, true))}
				style={`width: ${clampBarWidth(row.actualCoveragePct)}`}
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

{#snippet evidenceCell(_value: unknown, row: OverviewEntityRow)}
	<div class="flex flex-wrap gap-1">
		<Badge variant={row.evidenceVariant} size="sm">{row.evidenceLabel}</Badge>
		{#if row.weakEntity}
			<Badge variant="error" size="sm">слабая</Badge>
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
					d="M3 5h18M6 3v4m12-4v4M4 10h16M8 14h8M8 18h5M6 21h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
				/>
			</svg>
		</div>
		<div class="space-y-1">
			<p class="font-medium text-foreground">В этом срезе сейчас нет объектов реестра</p>
			<p class="text-sm text-muted-foreground">
				Снимите часть фильтров, чтобы вернуть обзор по стратегическим документам и прослеживаемости
				до KPI.
			</p>
		</div>
	</div>
{/snippet}

<div class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
	<header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-2">
			<p class="type-caption tracking-[0.2em] text-muted-foreground uppercase">Стратегия / Обзор</p>
			<h1 class="type-page-title">Комплексный анализ стратегических документов</h1>
			<p class="type-body-sm max-w-4xl text-muted-foreground">
				Предварительный анализ реестра стратегических документов общества по проекту Сахалин-2:
				прослеживаемость целей, задач и KPI, связь со сбалансированной системой показателей и поиск
				разрывов.
			</p>
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

	<StrategyNav currentPath="/dashboard/strategy/overview" />

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
							Главный экран по связности стратегических документов и KPI.
						</h2>
						<p class="max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">
							{executiveSummary}
						</p>
					</div>

					<div class="grid gap-3 sm:grid-cols-3">
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">Полная прослеживаемость</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(fullCascadeCount)}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">цель → задача → KPI</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">Объекты с разрывами</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(entitiesWithGapCount)}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">нуждаются в проверке связей</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">С фактом KPI</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(entitiesWithActualCount)}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								с опубликованными фактическими значениями
							</p>
						</div>
					</div>
				</div>

				<div
					class="border-t border-border/60 bg-background/65 p-6 lg:border-t-0 lg:border-l lg:p-8"
				>
					<div class="space-y-4">
						<div>
							<p class="type-overline text-muted-foreground">Контекст анализа</p>
							<p class="mt-2 text-sm leading-6 text-muted-foreground">
								Экран собран на основе опубликованного среза по реестру стратегических документов.
								Он помогает быстро увидеть, где путь от стратегии к KPI уже прослеживается, а где
								остаются пустоты в доказательной базе или в результативности.
							</p>
						</div>

						<div class="space-y-3">
							<div
								class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
							>
								<span class="text-sm text-muted-foreground">Подтвержденная база</span>
								<span class="text-base font-semibold text-foreground">
									{formatPercent(toCoverage(confirmedEvidenceCount, totalEntities), {
										decimals: 0
									})}
								</span>
							</div>
							<div
								class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
							>
								<span class="text-sm text-muted-foreground">Только косвенные связи</span>
								<span class="text-base font-semibold text-foreground"
									>{formatNumber(derivedOnlyCount)}</span
								>
							</div>
							<div
								class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
							>
								<span class="text-sm text-muted-foreground">Слабые объекты</span>
								<span class="text-base font-semibold text-foreground"
									>{formatNumber(weakEntityCount)}</span
								>
							</div>
						</div>

						<div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
							<p class="font-medium text-foreground">Назначение экрана</p>
							<p class="mt-2 text-sm leading-6 text-muted-foreground">
								Это входная точка для управленческого разговора: сначала понять общую связность
								стратегии, затем перейти к зонам разрыва и уже потом проваливаться в
								KPI-детализацию.
							</p>
						</div>

						<div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
							<p class="font-medium text-foreground">Что является строкой</p>
							<p class="mt-2 text-sm leading-6 text-muted-foreground">
								Одна строка в этом разделе = объект реестра. По текущему published срезу это один из
								типов: стратегия, план, программа или стратегический документ. Цели, задачи и KPI
								показываются как связанная управленческая цепочка для этого объекта, а не как
								отдельный тип строки.
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
				Фильтры позволяют быстро сузить анализ до конкретного департамента, горизонта, перспективы
				или группы слабых объектов реестра.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<FilterPanel
				runtime={filterRuntime}
				scope="all"
				direction="horizontal"
				filterIds={[...STRATEGY_OVERVIEW_FILTER_IDS]}
			/>
			<div class="type-caption text-muted-foreground">
				Загружено объектов реестра: <span class="font-mono">{formatNumber(totalEntities)}</span>
			</div>
		</CardContent>
	</Card>

	{#if error}
		<div class="rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error">
			{error}
		</div>
	{/if}

	<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<StatCard
			label="Объектов реестра"
			hint="Количество объектов из реестра стратегических документов в текущем опубликованном срезе"
			value={formatNumber(totalEntities)}
			loading={loader.loading && totalEntities === 0}
		/>
		<StatCard
			label="Полная прослеживаемость"
			hint="Объекты реестра, у которых читается цепочка цель → задача → KPI"
			value={formatNumber(fullCascadeCount)}
		/>
		<StatCard
			label="Подтверждённые"
			hint="Объекты реестра с прямой документальной базой"
			value={formatNumber(confirmedEvidenceCount)}
		/>
		<StatCard
			label="С разрывами"
			hint="Объекты реестра, у которых найден хотя бы один разрыв"
			value={formatNumber(entitiesWithGapCount)}
		/>
		<StatCard
			label="С фактом KPI"
			hint="Объекты реестра, где уже есть фактические KPI"
			value={formatNumber(entitiesWithActualCount)}
		/>
	</section>

	<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Типы объектов реестра</CardTitle>
				<CardDescription>
					Показывает, что именно лежит в опубликованном срезе: стратегии, планы, программы и
					документы.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#each semanticsSummaries as item}
					<div class="rounded-2xl border border-border/60 bg-card p-4">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="font-medium text-foreground">{item.semantics}</p>
								<p class="mt-1 text-sm text-muted-foreground">
									{formatNumber(item.count)} из {formatNumber(totalEntities)} объектов
								</p>
							</div>
							<Badge variant={item.variant} size="sm">
								{formatPercent(item.pct, { decimals: 0 })}
							</Badge>
						</div>
						<div class="mt-3 h-2 rounded-full bg-muted/70">
							<div
								class={cn('h-2 rounded-full', getCoverageBarClass(item.pct, true))}
								style={`width: ${clampBarWidth(item.pct)}`}
							></div>
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Прослеживаемость целей, задач и KPI</CardTitle>
				<CardDescription>
					Показывает, насколько глубоко объекты реестра доведены до целей, задач и KPI.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#each stageSummaries as stage}
					<div class="rounded-2xl border border-border/60 bg-card p-4">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<p class="font-medium text-foreground">{stage.label}</p>
								<p class="mt-1 text-sm text-muted-foreground">{stage.description}</p>
							</div>
							<Badge variant={stage.variant} size="sm">
								{formatPercent(stage.pct, { decimals: 0 })}
							</Badge>
						</div>
						<div class="mt-3 flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Объектов</span>
							<span class="font-medium text-foreground">
								{formatNumber(stage.count)} из {formatNumber(totalEntities)}
							</span>
						</div>
						<div class="mt-2 h-2 rounded-full bg-muted/70">
							<div
								class={cn('h-2 rounded-full', getCoverageBarClass(stage.pct, true))}
								style={`width: ${clampBarWidth(stage.pct)}`}
							></div>
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Опорные сигналы качества</CardTitle>
				<CardDescription>
					Быстрые индикаторы, которые помогают понять, насколько надежно выглядит текущий срез.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="rounded-2xl border border-border/60 bg-muted/15 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">С подтверждением</span>
						<span class="text-base font-semibold text-foreground">
							{formatPercent(toCoverage(confirmedEvidenceCount, totalEntities), { decimals: 0 })}
						</span>
					</div>
					<div class="mt-2 h-2 rounded-full bg-muted/70">
						<div
							class={cn(
								'h-2 rounded-full',
								getCoverageBarClass(toCoverage(confirmedEvidenceCount, totalEntities), true)
							)}
							style={`width: ${clampBarWidth(toCoverage(confirmedEvidenceCount, totalEntities))}`}
						></div>
					</div>
				</div>

				<div class="rounded-2xl border border-border/60 bg-muted/15 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Слабые объекты</span>
						<span class="text-base font-semibold text-foreground">
							{formatPercent(toCoverage(weakEntityCount, totalEntities), { decimals: 0 })}
						</span>
					</div>
					<div class="mt-2 h-2 rounded-full bg-muted/70">
						<div
							class={cn(
								'h-2 rounded-full',
								getCoverageBarClass(100 - (toCoverage(weakEntityCount, totalEntities) ?? 100), true)
							)}
							style={`width: ${clampBarWidth(toCoverage(weakEntityCount, totalEntities))}`}
						></div>
					</div>
				</div>

				<div class="rounded-2xl border border-border/60 bg-muted/15 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Есть факт KPI</span>
						<span class="text-base font-semibold text-foreground">
							{formatPercent(toCoverage(entitiesWithActualCount, totalEntities), { decimals: 0 })}
						</span>
					</div>
					<div class="mt-2 h-2 rounded-full bg-muted/70">
						<div
							class={cn(
								'h-2 rounded-full',
								getCoverageBarClass(toCoverage(entitiesWithActualCount, totalEntities), true)
							)}
							style={`width: ${clampBarWidth(toCoverage(entitiesWithActualCount, totalEntities))}`}
						></div>
					</div>
				</div>

				<div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
					<p class="font-medium text-foreground">Что смотреть дальше</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						Если нужно понять, где ломается цепочка от стратегии к измерению, сначала смотрим блок
						разрывов ниже. Если нужно обсуждать исполнение, дальше логично переходить на страницу
						«Результативность».
					</p>
				</div>
			</CardContent>
		</Card>
	</section>

	<section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
		<Card>
			<CardHeader>
				<CardTitle>Где разрывы требуют внимания</CardTitle>
				<CardDescription>
					Объекты реестра с наибольшим риском по сочетанию разрывов, слабой базы и незавершенной
					прослеживаемости.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if topRiskRows.length === 0}
					<p class="text-sm text-muted-foreground">
						После фильтрации нет объектов для ранжирования.
					</p>
				{:else}
					{#each topRiskRows as row}
						<div class="rounded-2xl border border-border/60 bg-muted/15 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="space-y-1">
									<div class="font-medium text-foreground">
										{truncate(row.entityDisplayName, 84)}
									</div>
									<div class="type-caption text-muted-foreground">
										{row.entitySemantics} • {row.departmentCode} • {row.perspectiveCode}
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant="error" size="sm">разрывы: {formatNumber(row.gapCount)}</Badge>
									<Badge variant={row.evidenceVariant} size="sm">{row.evidenceLabel}</Badge>
								</div>
							</div>

							<div class="mt-3 flex flex-wrap gap-2">
								<Badge variant={row.cascadeVariant} size="sm">{row.cascadeLabel}</Badge>
								<Badge variant="outline" size="sm">цели: {formatNumber(row.goalCount)}</Badge>
								<Badge variant="outline" size="sm">задачи: {formatNumber(row.taskCount)}</Badge>
								<Badge variant="outline" size="sm">KPI: {formatNumber(row.kpiCount)}</Badge>
							</div>
						</div>
					{/each}
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Сильные опорные объекты</CardTitle>
				<CardDescription>
					Объекты реестра, где уже есть хорошая прослеживаемость, подтверждение и более зрелая
					KPI-часть.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if strongestRows.length === 0}
					<p class="text-sm text-muted-foreground">После фильтрации нет объектов для сравнения.</p>
				{:else}
					{#each strongestRows as row}
						<div class="rounded-2xl border border-border/60 bg-muted/15 p-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="space-y-1">
									<div class="font-medium text-foreground">
										{truncate(row.entityDisplayName, 84)}
									</div>
									<div class="type-caption text-muted-foreground">
										{row.entitySemantics} • {row.departmentCode} • {row.horizonCode}
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant={row.cascadeVariant} size="sm">{row.cascadeLabel}</Badge>
									<Badge variant={row.evidenceVariant} size="sm">{row.evidenceLabel}</Badge>
								</div>
							</div>

							<div class="mt-3 space-y-2">
								<div class="flex items-center justify-between text-xs text-muted-foreground">
									<span>Факт KPI</span>
									<span>{formatPercent(row.actualCoveragePct, { decimals: 0 })}</span>
								</div>
								<div class="h-2 rounded-full bg-muted/70">
									<div
										class={cn('h-2 rounded-full', getCoverageBarClass(row.actualCoveragePct, true))}
										style={`width: ${clampBarWidth(row.actualCoveragePct)}`}
									></div>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</CardContent>
		</Card>
	</section>

	<Card>
		<CardHeader>
			<CardTitle>Таблица объектов реестра</CardTitle>
			<CardDescription>
				Одна строка показывает, насколько конкретный объект реестра связан с документами, целями,
				задачами, KPI и где по нему уже видны сигналы разрыва.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<DataTable
				columns={[
					{
						key: 'entityDisplayName',
						label: 'Объект реестра',
						sortable: true,
						minWidth: '280px',
						cell: entityCell
					},
					{
						key: 'cascadeLabel',
						label: 'Прослеживаемость',
						sortable: true,
						minWidth: '240px',
						cell: cascadeCell
					},
					{ key: 'coverageItemsTotal', label: 'Связей', align: 'right', sortable: true },
					{
						key: 'actualCoveragePct',
						label: 'Факт KPI',
						sortable: true,
						minWidth: '130px',
						cell: kpiCell
					},
					{ key: 'gapCount', label: 'Разрывы', align: 'right', sortable: true, cell: gapCell },
					{
						key: 'evidenceLabel',
						label: 'Сигналы',
						sortable: true,
						minWidth: '160px',
						cell: evidenceCell
					}
				]}
				rows={sortedRows}
				{sortKey}
				{sortDir}
				onSort={handleSort}
				onRowClick={openCascade}
				activeRowKey="strategyEntityId"
				activeRowValue={selectedEntityId ?? undefined}
				loading={loader.loading && sortedRows.length === 0}
				empty={emptyState}
			/>
		</CardContent>
	</Card>
</div>
