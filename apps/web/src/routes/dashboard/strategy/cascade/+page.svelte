<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import type { DatasetResponse, JsonValue } from '@dashboard-builder/platform-datasets';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { fetchDataset } from '$lib/api/fetchDataset';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { Badge } from '@dashboard-builder/platform-ui';
	import { Button } from '@dashboard-builder/platform-ui';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@dashboard-builder/platform-ui';
	import { DataTable } from '@dashboard-builder/platform-ui';
	import {
		formatDate,
		formatNumber,
		formatPercent,
		truncate
	} from '@dashboard-builder/platform-core';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';

	import StrategyNav from '../StrategyNav.svelte';
	import {
		STRATEGY_CASCADE_FILTER_IDS,
		STRATEGY_DATASET_IDS,
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

	type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted' | 'outline';

	type SelectedEntityRow = {
		strategyEntityId: string;
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
		totalKpiCount: number;
		kpiWithActual: number;
		hasConfirmedEvidence: boolean;
		hasDerivedOnly: boolean;
		weakEntity: boolean;
	};

	type CascadePathRow = {
		pathId: string;
		strategyEntityId: string;
		entityName: string;
		entityDisplayName: string;
		entitySemantics: string;
		departmentCode: string;
		perspectiveCode: string;
		horizonCode: string;
		cascadeGroupKey: string;
		completenessStatus: string;
		pathStatus: string;
		cycleFlag: boolean;
		orphanFlag: boolean;
		docId: string | null;
		documentFullName: string | null;
		documentType: string | null;
		registryMatchedFlag: boolean;
		rootFactName: string | null;
		taskFactName: string | null;
		kpiFactName: string | null;
		leafFactName: string | null;
		pathDepth: number;
		createdAt: string | null;
	};

	type PerformanceRow = {
		performanceEntityKey: string;
		factName: string;
		metricCode: string;
		statusLabel: string;
		periodLabel: string;
		unit: string | null;
		targetValue: number | null;
		actualValue: number | null;
		achievementPct: number | null;
		hasTarget: boolean;
		hasActual: boolean;
	};

	type ObjectSummaryRow = {
		strategyEntityId: string;
		entityDisplayName: string;
		entitySemantics: string;
		departmentCode: string;
		horizonCode: string;
		pathCount: number;
		documentCount: number;
		withTaskCount: number;
		withKpiCount: number;
		orphanCount: number;
		cycleCount: number;
		deepestPath: number;
		attentionScore: number;
		attentionLabel: string;
		attentionVariant: BadgeVariant;
	};

	type StatusSummary = {
		label: string;
		count: number;
		variant: BadgeVariant;
	};

	type DocumentGroup = {
		documentKey: string;
		documentName: string;
		documentType: string | null;
		registryMatchedCount: number;
		pathCount: number;
		deepestPath: number;
		paths: CascadePathRow[];
	};

	function pathStatusVariant(status: string): BadgeVariant {
		const normalized = status.trim().toLowerCase();
		if (normalized.includes('kpi')) return 'success';
		if (normalized.includes('задач')) return 'warning';
		if (normalized.includes('старт')) return 'error';
		return 'info';
	}

	function completenessVariant(status: string): BadgeVariant {
		const normalized = status.trim().toLowerCase();
		if (normalized.includes('полный')) return 'success';
		if (normalized.includes('непол')) return 'warning';
		return 'muted';
	}

	function attentionVariant(score: number): BadgeVariant {
		if (score >= 120) return 'error';
		if (score >= 50) return 'warning';
		return 'success';
	}

	function attentionLabel(score: number): string {
		if (score >= 120) return 'Нужна доработка';
		if (score >= 50) return 'Неполный путь';
		return 'Можно показывать';
	}

	function formatMetricValue(value: number | null, unit: string | null): string {
		const formatted = formatNumber(value, { maximumFractionDigits: 2 });
		return unit && formatted !== '—' ? `${formatted} ${unit}` : formatted;
	}

	function statusVariant(statusLabel: string): BadgeVariant {
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

	function buildAttentionScore(row: ObjectSummaryRow): number {
		return (
			(row.pathCount - row.withTaskCount) * 8 +
			(row.pathCount - row.withKpiCount) * 10 +
			row.orphanCount * 18 +
			row.cycleCount * 22 +
			Math.max(0, 2 - row.deepestPath) * 15
		);
	}

	const filterRuntime = useFilterWorkspace({
		workspaceId: STRATEGY_WORKSPACE_ID,
		ownerId: 'cascade',
		specs: strategyFilters
	});

	let selectedEntityDataset = $state<DatasetResponse | null>(null);
	let cascadeDataset = $state<DatasetResponse | null>(null);
	let performanceDataset = $state<DatasetResponse | null>(null);
	let error = $state<string | null>(null);
	let objectSortKey = $state<keyof ObjectSummaryRow>('attentionScore');
	let objectSortDir = $state<SortDir>('desc');
	let kpiSortKey = $state<keyof PerformanceRow>('achievementPct');
	let kpiSortDir = $state<SortDir>('desc');

	let selectedEntityId = $derived(page.url.searchParams.get('strategyEntityId')?.trim() || null);
	let effectiveFilters = $derived(filterRuntime.effective);

	const loader = useDebouncedLoader({
		watch: () => ({ filters: effectiveFilters, selectedEntityId }),
		delayMs: 250,
		load: async () => {
			const filterContext = {
				snapshot: filterRuntime.getSnapshot(),
				workspaceId: filterRuntime.workspaceId,
				ownerId: filterRuntime.ownerId
			};

			const cascadePromise = fetchDataset({
				id: STRATEGY_DATASET_IDS.cascadeDetail,
				params: {
					limit: selectedEntityId ? 5000 : 2000,
					...(selectedEntityId ? { strategyEntityId: selectedEntityId } : {})
				},
				cache: { ttlMs: 30_000 },
				filterContext
			});

			const selectedEntityPromise = selectedEntityId
				? fetchDataset({
						id: STRATEGY_DATASET_IDS.entityOverview,
						params: { limit: 1, strategyEntityId: selectedEntityId },
						cache: { ttlMs: 30_000 },
						filterContext
					})
				: Promise.resolve(null);

			const performancePromise = selectedEntityId
				? fetchDataset({
						id: STRATEGY_DATASET_IDS.performanceDetail,
						params: { limit: 3000, strategyEntityId: selectedEntityId },
						cache: { ttlMs: 30_000 },
						filterContext
					})
				: Promise.resolve(null);

			const [cascade, selectedEntity, performance] = await Promise.all([
				cascadePromise,
				selectedEntityPromise,
				performancePromise
			]);

			return { cascade, selectedEntity, performance };
		},
		onData: (data) => {
			cascadeDataset = data.cascade;
			selectedEntityDataset = data.selectedEntity;
			performanceDataset = data.performance;
			error = null;
		},
		onError: (err) => {
			error = err instanceof Error ? err.message : String(err);
		}
	});

	let selectedEntity = $derived.by(() => {
		const row = (selectedEntityDataset?.rows?.[0] ?? null) as StrategyRow | null;
		if (!row) return null;
		const strategyEntityId = asString(row.strategy_entity_id);
		if (!strategyEntityId) return null;
		const entityPresentation = presentStrategyEntity({
			entityName: asString(row.entity_name),
			entitySemantics: asString(row.entity_semantics),
			fallbackLabel: strategyEntityId
		});

		return {
			strategyEntityId,
			entityDisplayName: entityPresentation.primaryLabel,
			entitySemantics: asString(row.entity_semantics) ?? '—',
			departmentCode: asString(row.department_code) ?? '—',
			perspectiveCode: asString(row.perspective_code) ?? '—',
			horizonCode: asString(row.horizon_code) ?? '—',
			documentCount: asNumber(row.document_count) ?? 0,
			goalCount: asNumber(row.goal_count) ?? 0,
			taskCount: asNumber(row.task_count) ?? 0,
			kpiCount: asNumber(row.kpi_count) ?? 0,
			gapCount: asNumber(row.gap_count) ?? 0,
			totalKpiCount: asNumber(row.total_kpi_count) ?? 0,
			kpiWithActual: asNumber(row.kpi_with_actual) ?? 0,
			hasConfirmedEvidence: asBoolean(row.has_confirmed_evidence_flag) === true,
			hasDerivedOnly: asBoolean(row.has_derived_only_flag) === true,
			weakEntity: asBoolean(row.weak_entity_flag) === true
		} satisfies SelectedEntityRow;
	});

	let cascadeRows = $derived.by(() =>
		((cascadeDataset?.rows ?? []) as StrategyRow[]).map((row): CascadePathRow => {
			const strategyEntityId = asString(row.strategy_entity_id) ?? '—';
			const entityPresentation = presentStrategyEntity({
				entityName: asString(row.entity_name),
				entitySemantics: asString(row.entity_semantics),
				fallbackLabel: strategyEntityId
			});

			return {
				pathId: asString(row.path_id) ?? '',
				strategyEntityId,
				entityName: asString(row.entity_name) ?? strategyEntityId,
				entityDisplayName: entityPresentation.primaryLabel,
				entitySemantics: asString(row.entity_semantics) ?? '—',
				departmentCode: asString(row.department_code) ?? '—',
				perspectiveCode: asString(row.perspective_code) ?? '—',
				horizonCode: asString(row.horizon_code) ?? '—',
				cascadeGroupKey: asString(row.cascade_group_key) ?? '',
				completenessStatus: asString(row.completeness_status) ?? '—',
				pathStatus: asString(row.path_status) ?? '—',
				cycleFlag: asBoolean(row.cycle_flag) === true,
				orphanFlag: asBoolean(row.orphan_flag) === true,
				docId: asString(row.doc_id),
				documentFullName: asString(row.document_full_name),
				documentType: asString(row.document_type),
				registryMatchedFlag: asBoolean(row.registry_matched_flag) === true,
				rootFactName: asString(row.root_fact_name),
				taskFactName: asString(row.task_fact_name),
				kpiFactName: asString(row.kpi_fact_name),
				leafFactName: asString(row.leaf_fact_name),
				pathDepth: asNumber(row.path_depth) ?? 0,
				createdAt: asString(row.created_at)
			};
		})
	);

	let performanceRows = $derived.by(() =>
		((performanceDataset?.rows ?? []) as StrategyRow[]).map(
			(row): PerformanceRow => ({
				performanceEntityKey: asString(row.performance_entity_key) ?? '',
				factName: asString(row.fact_name) ?? '—',
				metricCode: asString(row.metric_code) ?? '—',
				statusLabel: asString(row.status_label) ?? 'Без статуса',
				periodLabel: asString(row.period_label) ?? '—',
				unit: asString(row.unit),
				targetValue: asNumber(row.target_value),
				actualValue: asNumber(row.actual_value),
				achievementPct: asNumber(row.achievement_pct),
				hasTarget: asBoolean(row.has_target_flag) === true,
				hasActual: asBoolean(row.has_actual_flag) === true
			})
		)
	);

	let latestExecutedAt = $derived.by(() => {
		const executedAt =
			cascadeDataset?.meta?.executedAt ??
			selectedEntityDataset?.meta?.executedAt ??
			performanceDataset?.meta?.executedAt;
		return executedAt
			? formatDate(executedAt, { day: '2-digit', month: 'short', year: 'numeric' })
			: null;
	});

	let objectSummaries = $derived.by(() => {
		const buckets = new Map<string, ObjectSummaryRow>();

		for (const row of cascadeRows) {
			const current = buckets.get(row.strategyEntityId) ?? {
				strategyEntityId: row.strategyEntityId,
				entityDisplayName: row.entityDisplayName,
				entitySemantics: row.entitySemantics,
				departmentCode: row.departmentCode,
				horizonCode: row.horizonCode,
				pathCount: 0,
				documentCount: 0,
				withTaskCount: 0,
				withKpiCount: 0,
				orphanCount: 0,
				cycleCount: 0,
				deepestPath: 0,
				attentionScore: 0,
				attentionLabel: 'Можно показывать',
				attentionVariant: 'success' as BadgeVariant
			};

			current.pathCount += 1;
			current.withTaskCount += row.taskFactName ? 1 : 0;
			current.withKpiCount += row.kpiFactName ? 1 : 0;
			current.orphanCount += row.orphanFlag ? 1 : 0;
			current.cycleCount += row.cycleFlag ? 1 : 0;
			current.deepestPath = Math.max(current.deepestPath, row.pathDepth);

			buckets.set(row.strategyEntityId, current);
		}

		const docsByEntity = new Map<string, Set<string>>();
		for (const row of cascadeRows) {
			const key = row.strategyEntityId;
			const docs = docsByEntity.get(key) ?? new Set<string>();
			docs.add(row.documentFullName ?? row.docId ?? `doc:${row.pathId}`);
			docsByEntity.set(key, docs);
		}

		return Array.from(buckets.values())
			.map((row) => {
				const withDocs = docsByEntity.get(row.strategyEntityId);
				const documentCount = withDocs ? withDocs.size : 0;
				const attentionScore = buildAttentionScore({ ...row, documentCount });
				return {
					...row,
					documentCount,
					attentionScore,
					attentionLabel: attentionLabel(attentionScore),
					attentionVariant: attentionVariant(attentionScore)
				};
			})
			.sort((left, right) => right.attentionScore - left.attentionScore);
	});

	let selectedObjectSummary = $derived(
		selectedEntityId
			? (objectSummaries.find((row) => row.strategyEntityId === selectedEntityId) ?? null)
			: null
	);

	let sortedObjectSummaries = $derived(sortRows(objectSummaries, objectSortKey, objectSortDir));
	let sortedPerformanceRows = $derived(sortRows(performanceRows, kpiSortKey, kpiSortDir));

	let totalPaths = $derived(cascadeRows.length);
	let objectCount = $derived(objectSummaries.length);
	let documentCount = $derived(
		new Set(cascadeRows.map((row) => row.documentFullName ?? row.docId ?? row.pathId)).size
	);
	let pathsToTask = $derived(cascadeRows.filter((row) => row.taskFactName !== null).length);
	let pathsToKpi = $derived(cascadeRows.filter((row) => row.kpiFactName !== null).length);
	let orphanCount = $derived(cascadeRows.filter((row) => row.orphanFlag).length);
	let cycleCount = $derived(cascadeRows.filter((row) => row.cycleFlag).length);
	let avgAchievementPct = $derived.by(() => {
		const values = performanceRows
			.map((row) => row.achievementPct)
			.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
		if (values.length === 0) return null;
		return values.reduce((sum, value) => sum + value, 0) / values.length;
	});

	let statusSummaries = $derived.by((): StatusSummary[] => {
		const counts = new Map<string, number>();
		for (const row of cascadeRows) {
			counts.set(row.pathStatus, (counts.get(row.pathStatus) ?? 0) + 1);
		}
		return Array.from(counts.entries())
			.map(([label, count]) => ({
				label,
				count,
				variant: pathStatusVariant(label)
			}))
			.sort((left, right) => right.count - left.count);
	});

	let documentGroups = $derived.by(() => {
		const groups = new Map<string, DocumentGroup>();

		for (const row of cascadeRows) {
			const key = row.documentFullName ?? row.docId ?? `doc:${row.pathId}`;
			const current = groups.get(key) ?? {
				documentKey: key,
				documentName: row.documentFullName ?? 'Документ не указан',
				documentType: row.documentType,
				registryMatchedCount: 0,
				pathCount: 0,
				deepestPath: 0,
				paths: []
			};

			current.registryMatchedCount += row.registryMatchedFlag ? 1 : 0;
			current.pathCount += 1;
			current.deepestPath = Math.max(current.deepestPath, row.pathDepth);
			current.paths.push(row);

			groups.set(key, current);
		}

		return Array.from(groups.values())
			.map((group) => ({
				...group,
				paths: [...group.paths].sort((left, right) => {
					const statusDelta =
						(pathStatusVariant(right.pathStatus) === 'success' ? 1 : 0) -
						(pathStatusVariant(left.pathStatus) === 'success' ? 1 : 0);
					if (statusDelta !== 0) return statusDelta;
					return right.pathDepth - left.pathDepth;
				})
			}))
			.sort((left, right) => right.pathCount - left.pathCount);
	});
	let documentPreviewGroups = $derived(documentGroups.slice(0, 3));
	let topStatusSummaries = $derived(statusSummaries.slice(0, 3));
	let objectsNeedingAttention = $derived(
		objectSummaries.filter((row) => row.attentionVariant !== 'success').length
	);
	let selectedMeasuredKpiShare = $derived.by(() => {
		if (!selectedEntity || selectedEntity.totalKpiCount <= 0) return null;
		return (selectedEntity.kpiWithActual / selectedEntity.totalKpiCount) * 100;
	});

	let selectedHeadline = $derived.by(() => {
		if (selectedEntity) return selectedEntity.entityDisplayName;
		if (selectedObjectSummary) return selectedObjectSummary.entityDisplayName;
		return 'Прослеживаемость стратегии';
	});

	function handleObjectSort(key: string, dir: SortDir) {
		objectSortKey = key as keyof ObjectSummaryRow;
		objectSortDir = dir;
	}

	function handleKpiSort(key: string, dir: SortDir) {
		kpiSortKey = key as keyof PerformanceRow;
		kpiSortDir = dir;
	}

	function navigateWithSearch(pathname: string, mutate?: (params: URLSearchParams) => void) {
		if (!browser) return;
		const url = new URL(window.location.href);
		url.pathname = pathname;
		if (mutate) mutate(url.searchParams);
		void goto(`${url.pathname}?${url.searchParams.toString()}`);
	}

	function selectEntity(strategyEntityId: string) {
		navigateWithSearch('/dashboard/strategy/cascade', (params) => {
			params.set('strategyEntityId', strategyEntityId);
		});
	}

	function clearSelectedEntity() {
		navigateWithSearch('/dashboard/strategy/cascade', (params) => {
			params.delete('strategyEntityId');
		});
	}

	function openOverview() {
		navigateWithSearch('/dashboard/strategy/overview');
	}

	function openPerformance() {
		navigateWithSearch('/dashboard/strategy/performance');
	}
</script>

<svelte:head>
	<title>Стратегия — Прослеживаемость</title>
</svelte:head>

{#snippet objectCell(_value: unknown, row: ObjectSummaryRow)}
	<div class="space-y-1">
		<div class="font-medium text-foreground">{row.entityDisplayName}</div>
		<div class="type-caption text-muted-foreground">
			{row.entitySemantics} • {row.departmentCode} • {row.horizonCode}
		</div>
	</div>
{/snippet}

{#snippet attentionCell(_value: unknown, row: ObjectSummaryRow)}
	<Badge variant={row.attentionVariant} size="sm">{row.attentionLabel}</Badge>
{/snippet}

{#snippet countCell(value: unknown)}
	<span class="font-medium">{formatNumber(typeof value === 'number' ? value : null)}</span>
{/snippet}

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
	<span class="font-medium">
		{formatPercent(asNumber(value as JsonValue | undefined), { decimals: 0 })}
	</span>
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
					d="M4 5h16M7 3v4m10-4v4M5 10h14M8 14h8M8 18h5M6 21h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
				/>
			</svg>
		</div>
		<div class="space-y-1">
			<p class="font-medium text-foreground">Связи для анализа не найдены</p>
			<p class="text-sm text-muted-foreground">
				Расширьте фильтры или выберите другой объект реестра на странице обзора.
			</p>
		</div>
	</div>
{/snippet}

<div class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
	<header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-2">
			<p class="type-caption tracking-[0.2em] text-muted-foreground uppercase">
				Стратегия / Прослеживаемость
			</p>
			<h1 class="type-page-title">
				{selectedEntityId ? 'Прослеживаемость объекта реестра' : 'Прослеживаемость стратегии'}
			</h1>
			<p class="type-body-sm max-w-4xl text-muted-foreground">
				Путь от объекта реестра к документам, целям, задачам и KPI. Экран собран на
				`slobi_cascade_detail` и помогает быстро увидеть, насколько стратегия доведена до измеримого
				уровня.
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

	<StrategyNav currentPath="/dashboard/strategy/cascade" />

	<Card
		class="overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-info-muted/20"
	>
		<CardContent class="p-0">
			<div class="grid gap-0 lg:grid-cols-[1.45fr_0.95fr]">
				<div class="space-y-5 p-6 lg:p-8">
					<div class="flex flex-wrap items-center gap-2">
						{#if selectedEntityId}
							<Badge variant="info">Выбран объект</Badge>
						{:else}
							<Badge variant="outline">Общий срез прослеживаемости</Badge>
						{/if}
						{#if selectedEntity}
							<Badge variant="outline">{selectedEntity.entitySemantics}</Badge>
							<Badge variant="outline">{selectedEntity.departmentCode}</Badge>
							<Badge variant="outline">{selectedEntity.horizonCode}</Badge>
						{/if}
					</div>

					<div class="space-y-3">
						<h2 class="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
							{selectedHeadline}
						</h2>
						<p class="max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">
							{#if selectedEntityId}
								Экран показывает, есть ли у выбранного объекта опора в документах, доведен ли он до
								целей, задач и KPI и где именно возникают разрывы.
							{:else}
								Сначала выбирается объект реестра, а затем открывается его путь до целей, задач и
								KPI. Главный фокус экрана - не все связи подряд, а места, где прослеживаемость
								прерывается.
							{/if}
						</p>
					</div>

					<div class="grid gap-3 sm:grid-cols-3">
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">
								{selectedEntityId ? 'Документальная опора' : 'Объекты в срезе'}
							</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(
									selectedEntityId ? (selectedEntity?.documentCount ?? documentCount) : objectCount
								)}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{selectedEntityId
									? 'документов поддерживают выбранный объект'
									: 'можно открыть для анализа'}
							</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">
								{selectedEntityId ? 'Доведено до KPI' : 'Доведено до KPI'}
							</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{selectedEntityId
									? `${formatNumber(selectedEntity?.kpiCount ?? pathsToKpi)}`
									: formatNumber(pathsToKpi)}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{selectedEntityId
									? 'KPI опубликованы по выбранному объекту'
									: 'путей дошли до измеримого уровня'}
							</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur">
							<p class="type-overline text-muted-foreground">
								{selectedEntityId ? 'Требуют внимания' : 'Требуют внимания'}
							</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(
									selectedEntityId ? (selectedEntity?.gapCount ?? 0) : objectsNeedingAttention
								)}
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{selectedEntityId
									? 'разрывов по целям, задачам или KPI'
									: 'объектов с неполной прослеживаемостью'}
							</p>
						</div>
					</div>
				</div>

				<div
					class="border-t border-border/60 bg-background/65 p-6 lg:border-t-0 lg:border-l lg:p-8"
				>
					<div class="space-y-4">
						{#if selectedEntityId}
							<div>
								<p class="type-overline text-muted-foreground">Ключевой вывод</p>
								<p class="mt-2 text-sm leading-6 text-muted-foreground">
									{#if (selectedEntity?.kpiCount ?? 0) > 0}
										Объект уже доведен до KPI-уровня, но качество управленческой логики зависит от
										полноты фактов и разрывов в нижележащих связях.
									{:else if (selectedEntity?.taskCount ?? 0) > 0}
										Связь доходит до задач, но пока не замыкается на KPI. Это главный разрыв для
										управленческого контроля.
									{:else}
										Объект пока подтвержден документально, но не доведен до задач и KPI. Его стоит
										рассматривать как незавершенную управленческую логику.
									{/if}
								</p>
							</div>

							<div class="space-y-3">
								<div
									class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
								>
									<span class="text-sm text-muted-foreground">Цели / задачи / KPI</span>
									<span class="text-base font-semibold text-foreground">
										{selectedEntity
											? `${formatNumber(selectedEntity.goalCount)} целей / ${formatNumber(selectedEntity.taskCount)} задач / ${formatNumber(selectedEntity.kpiCount)} KPI`
											: '—'}
									</span>
								</div>
								<div
									class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
								>
									<span class="text-sm text-muted-foreground">KPI с фактом</span>
									<span class="text-base font-semibold text-foreground">
										{selectedEntity
											? `${formatNumber(selectedEntity.kpiWithActual)} из ${formatNumber(selectedEntity.totalKpiCount)}`
											: '—'}
									</span>
								</div>
								<div
									class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
								>
									<span class="text-sm text-muted-foreground">Измеряемость KPI</span>
									<span class="text-base font-semibold text-foreground">
										{formatPercent(selectedMeasuredKpiShare, { decimals: 0 })}
									</span>
								</div>
							</div>

							<div class="flex flex-wrap gap-2">
								<Button type="button" onclick={openPerformance}>Открыть KPI-детализацию</Button>
								<Button type="button" variant="outline" onclick={clearSelectedEntity}
									>Снять выбор</Button
								>
							</div>
						{:else}
							<div>
								<p class="type-overline text-muted-foreground">Как читать экран</p>
								<p class="mt-2 text-sm leading-6 text-muted-foreground">
									Сначала выбирается объект реестра. После выбора экран покажет, есть ли у него
									цели, задачи и KPI, а также где прослеживаемость обрывается.
								</p>
							</div>

							<div class="space-y-3">
								<div
									class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
								>
									<span class="text-sm text-muted-foreground">Дошли до задачи</span>
									<span class="text-base font-semibold text-foreground"
										>{formatNumber(pathsToTask)} путей</span
									>
								</div>
								<div
									class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
								>
									<span class="text-sm text-muted-foreground">Дошли до KPI</span>
									<span class="text-base font-semibold text-foreground"
										>{formatNumber(pathsToKpi)} путей</span
									>
								</div>
								<div
									class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
								>
									<span class="text-sm text-muted-foreground">Нуждаются в доработке</span>
									<span class="text-base font-semibold text-foreground">
										{formatNumber(objectsNeedingAttention)} объектов
									</span>
								</div>
							</div>

							<div class="flex flex-wrap gap-2">
								<Button type="button" onclick={openOverview}>Открыть обзор объектов</Button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Фильтры рабочего пространства</CardTitle>
			<CardDescription>
				Фильтры позволяют быстро перейти к нужному департаменту, горизонту и объекту реестра.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<FilterPanel
				runtime={filterRuntime}
				scope="all"
				direction="horizontal"
				filterIds={[...STRATEGY_CASCADE_FILTER_IDS]}
			/>
			<div class="type-caption text-muted-foreground">
				Выбранный объект: <span class="font-mono">{selectedEntityId ?? 'не выбран'}</span>
			</div>
		</CardContent>
	</Card>

	{#if error}
		<div class="rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error">
			{error}
		</div>
	{/if}

	<section class="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
		<Card>
			<CardHeader>
				<CardTitle
					>{selectedEntityId
						? 'Где обрывается прослеживаемость'
						: 'Общая картина прослеживаемости'}</CardTitle
				>
				<CardDescription>
					{selectedEntityId
						? 'Блок помогает быстро понять, до какого уровня доведен выбранный объект: только документ, задача или KPI.'
						: 'Блок показывает, какая часть опубликованных связей уже дошла до задач и KPI.'}
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if topStatusSummaries.length === 0}
					<p class="text-sm text-muted-foreground">
						После фильтрации нет путей для анализа статусов.
					</p>
				{:else}
					{#each topStatusSummaries as item}
						<div class="rounded-2xl border border-border/60 bg-card p-4">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="font-medium text-foreground">{item.label}</p>
									<p class="mt-1 text-sm text-muted-foreground">
										{formatNumber(item.count)} путей в текущем срезе
									</p>
								</div>
								<Badge variant={item.variant} size="sm">
									{formatPercent(totalPaths > 0 ? (item.count / totalPaths) * 100 : null, {
										decimals: 0
									})}
								</Badge>
							</div>
						</div>
					{/each}
				{/if}
			</CardContent>
		</Card>

		{#if selectedEntityId}
			<Card>
				<CardHeader>
					<CardTitle>Что уже измеряется</CardTitle>
					<CardDescription>
						Здесь показаны KPI выбранного объекта, по которым уже можно увидеть план, факт и статус.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={[
							{ key: 'factName', label: 'Показатель', sortable: true, minWidth: '220px' },
							{ key: 'metricCode', label: 'Код', sortable: true, minWidth: '120px' },
							{ key: 'periodLabel', label: 'Период', sortable: true, minWidth: '120px' },
							{
								key: 'targetValue',
								label: 'План',
								sortable: true,
								align: 'right',
								cell: metricValueCell
							},
							{
								key: 'actualValue',
								label: 'Факт',
								sortable: true,
								align: 'right',
								cell: metricValueCell
							},
							{
								key: 'achievementPct',
								label: 'Достижение',
								sortable: true,
								align: 'right',
								cell: achievementCell
							},
							{
								key: 'statusLabel',
								label: 'Статус',
								sortable: true,
								minWidth: '140px',
								cell: statusCell
							}
						]}
						rows={sortedPerformanceRows}
						sortKey={kpiSortKey}
						sortDir={kpiSortDir}
						onSort={handleKpiSort}
						loading={loader.loading &&
							selectedEntityId !== null &&
							sortedPerformanceRows.length === 0}
						empty={emptyState}
					/>
				</CardContent>
			</Card>
		{:else}
			<Card>
				<CardHeader>
					<CardTitle>С чего начать анализ</CardTitle>
					<CardDescription>
						Выберите объект реестра с неполной прослеживаемостью или высокой зоной внимания, чтобы
						открыть его карточку.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={[
							{
								key: 'entityDisplayName',
								label: 'Объект реестра',
								sortable: true,
								minWidth: '260px',
								cell: objectCell
							},
							{ key: 'pathCount', label: 'Пути', sortable: true, align: 'right', cell: countCell },
							{
								key: 'documentCount',
								label: 'Док.',
								sortable: true,
								align: 'right',
								cell: countCell
							},
							{
								key: 'withTaskCount',
								label: 'До задачи',
								sortable: true,
								align: 'right',
								cell: countCell
							},
							{
								key: 'withKpiCount',
								label: 'До KPI',
								sortable: true,
								align: 'right',
								cell: countCell
							},
							{
								key: 'attentionLabel',
								label: 'Статус',
								sortable: true,
								minWidth: '160px',
								cell: attentionCell
							}
						]}
						rows={sortedObjectSummaries}
						sortKey={objectSortKey}
						sortDir={objectSortDir}
						onSort={handleObjectSort}
						onRowClick={(row) => selectEntity(row.strategyEntityId)}
						loading={loader.loading && sortedObjectSummaries.length === 0}
						empty={emptyState}
					/>
				</CardContent>
			</Card>
		{/if}
	</section>

	{#if selectedEntityId}
		<section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
			<Card>
				<CardHeader>
					<CardTitle>Управленческий профиль объекта</CardTitle>
					<CardDescription>
						Короткий профиль показывает, насколько объект доведен от документов до измеримых KPI.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="rounded-2xl border border-border/60 bg-card p-4">
							<p class="type-overline text-muted-foreground">Документы</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(selectedEntity?.documentCount ?? null)}
							</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-card p-4">
							<p class="type-overline text-muted-foreground">Разрывы</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(selectedEntity?.gapCount ?? null)}
							</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-card p-4">
							<p class="type-overline text-muted-foreground">Задачи</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{formatNumber(selectedEntity?.taskCount ?? null)}
							</p>
						</div>
						<div class="rounded-2xl border border-border/60 bg-card p-4">
							<p class="type-overline text-muted-foreground">KPI с фактом</p>
							<p class="mt-2 text-3xl font-semibold text-foreground">
								{selectedEntity
									? `${formatNumber(selectedEntity.kpiWithActual)} / ${formatNumber(selectedEntity.totalKpiCount)}`
									: '—'}
							</p>
						</div>
					</div>

					<div class="flex flex-wrap gap-2">
						{#if selectedEntity?.hasConfirmedEvidence}
							<Badge variant="success" size="sm">есть подтверждение</Badge>
						{/if}
						{#if selectedEntity?.hasDerivedOnly}
							<Badge variant="warning" size="sm">только косвенная база</Badge>
						{/if}
						{#if selectedEntity?.weakEntity}
							<Badge variant="error" size="sm">слабый объект</Badge>
						{/if}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Документальная опора и примеры путей</CardTitle>
					<CardDescription>
						Ниже показаны основные документы и примеры того, как из них выстраивается путь до целей,
						задач и KPI.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if documentPreviewGroups.length === 0}
						<p class="text-sm text-muted-foreground">
							Для выбранного объекта пока не опубликованы пути.
						</p>
					{:else}
						{#each documentPreviewGroups as group}
							<div class="rounded-2xl border border-border/60 bg-muted/15 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div class="space-y-1">
										<div class="font-medium text-foreground">{group.documentName}</div>
										<div class="type-caption text-muted-foreground">
											{group.documentType ?? 'Тип документа не указан'} • {formatNumber(
												group.pathCount
											)} путей
										</div>
									</div>
									<div class="flex flex-wrap items-center gap-2">
										<Badge
											variant={group.registryMatchedCount > 0 ? 'success' : 'warning'}
											size="sm"
										>
											{group.registryMatchedCount > 0
												? 'есть привязка к реестру'
												: 'нет привязки к реестру'}
										</Badge>
										<Badge variant="outline" size="sm"
											>глубина: {formatNumber(group.deepestPath)}</Badge
										>
									</div>
								</div>

								<div class="mt-4 space-y-3">
									{#each group.paths.slice(0, 3) as path}
										<div class="rounded-xl border border-border/60 bg-card p-4">
											<div class="flex flex-wrap items-center gap-2">
												<Badge variant={pathStatusVariant(path.pathStatus)} size="sm"
													>{path.pathStatus}</Badge
												>
												<Badge variant={completenessVariant(path.completenessStatus)} size="sm">
													{path.completenessStatus}
												</Badge>
												{#if path.orphanFlag}
													<Badge variant="warning" size="sm">без связки</Badge>
												{/if}
												{#if path.cycleFlag}
													<Badge variant="error" size="sm">цикл</Badge>
												{/if}
											</div>

											<div class="mt-3 grid gap-3 lg:grid-cols-3">
												<div class="rounded-lg border border-border/60 bg-muted/20 p-3">
													<p class="type-overline text-muted-foreground">Цель</p>
													<p class="mt-2 text-sm leading-6 text-foreground">
														{path.rootFactName ?? '—'}
													</p>
												</div>
												<div class="rounded-lg border border-border/60 bg-muted/20 p-3">
													<p class="type-overline text-muted-foreground">Задача</p>
													<p class="mt-2 text-sm leading-6 text-foreground">
														{path.taskFactName ?? '—'}
													</p>
												</div>
												<div class="rounded-lg border border-border/60 bg-muted/20 p-3">
													<p class="type-overline text-muted-foreground">KPI</p>
													<p class="mt-2 text-sm leading-6 text-foreground">
														{path.kpiFactName ?? path.leafFactName ?? '—'}
													</p>
												</div>
											</div>
										</div>
									{/each}

									{#if group.paths.length > 3}
										<div
											class="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground"
										>
											Показаны первые 3 пути из {formatNumber(group.paths.length)}.
										</div>
									{/if}
								</div>
							</div>
						{/each}
						{#if documentGroups.length > documentPreviewGroups.length}
							<div
								class="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground"
							>
								Показаны ключевые документы. Всего документов в этом срезе:
								{formatNumber(documentGroups.length)}.
							</div>
						{/if}
					{/if}
				</CardContent>
			</Card>
		</section>
	{/if}
</div>
