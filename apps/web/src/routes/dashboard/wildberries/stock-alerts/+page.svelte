<script lang="ts">
	import { onMount } from 'svelte';

	import { fetchDataset } from '$lib/api/fetchDataset';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { Button } from '@dashboard-builder/platform-ui';
	import { Card, CardContent } from '@dashboard-builder/platform-ui';
	import { StatCard } from '@dashboard-builder/platform-ui';
	import { Select } from '@dashboard-builder/platform-ui';
	import type { DatasetResponse, JsonValue } from '@dashboard-builder/platform-datasets';
	import {
		useFilterWorkspace,
		planFiltersForDataset,
		hasFiltersForTarget
	} from '@dashboard-builder/platform-filters';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';
	import { ScenarioParams } from '$widgets/stock-alerts';

	import { stockAlertFilters, DEFAULT_PRESET, getPresetParams, type PresetName } from './filters';
	import type { OfficeAggregation, StockAlertKpi } from './types';
	import {
		aggregateByOffice,
		calculateKpi,
		getMaxDate,
		filterByRegion,
		getUniqueRegions,
		getSkuForOffice
	} from './aggregation';
	import { formatCompact, formatDate } from '@dashboard-builder/platform-core';

	import OfficesTable from './OfficesTable.svelte';
	import OfficeSkuPanel from './OfficeSkuPanel.svelte';

	const datasetId = 'wildberries.fact_product_office_day';
	const filterRuntime = useFilterWorkspace({
		workspaceId: 'dashboard-wildberries',
		ownerId: 'stock-alerts',
		specs: stockAlertFilters
	});

	// State
	let error = $state<string | null>(null);
	let data = $state<DatasetResponse | null>(null);

	// Local filters
	let selectedRegion = $state<string>('');
	let selectedOfficeId = $state<number | null>(null);

	// Scenario preset (with localStorage persistence)
	const STORAGE_KEY = 'stock-alerts-preset';
	let selectedPreset = $state<PresetName>(loadPreset());

	function loadPreset(): PresetName {
		if (typeof localStorage === 'undefined') return DEFAULT_PRESET;
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === 'balanced' || saved === 'aggressive' || saved === 'conservative') {
			return saved;
		}
		return DEFAULT_PRESET;
	}

	function handlePresetChange(preset: PresetName) {
		selectedPreset = preset;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, preset);
		}
	}

	// Derived: current scenario params
	let scenarioParams = $derived(getPresetParams(selectedPreset));

	// Subscribe to filter changes
	let effectiveFilters = $derived(filterRuntime.effective);

	// Derived: unique regions for filter dropdown
	let regions = $derived.by(() => {
		if (!data) return [];
		return getUniqueRegions(data.rows);
	});

	// Derived: filtered rows by region
	let filteredRows = $derived.by(() => {
		if (!data) return [];
		return filterByRegion(data.rows, selectedRegion || null);
	});

	// Derived: data date
	let dataDate = $derived.by(() => {
		if (!data) return null;
		return getMaxDate(data.rows);
	});

	// Derived: office aggregations
	let officeAggregations = $derived.by(() => {
		if (!filteredRows.length) return [];
		return aggregateByOffice(filteredRows, scenarioParams);
	});

	// Derived: KPI metrics
	let kpi = $derived.by((): StockAlertKpi => {
		if (!officeAggregations.length) {
			return {
				officesAtRisk: 0,
				totalOffices: 0,
				skuDeficit: 0,
				skuRisk: 0,
				skuOk: 0,
				totalStock: 0,
				dataDate: null
			};
		}
		return calculateKpi(officeAggregations, dataDate);
	});

	// Derived: selected office details
	let selectedOffice = $derived.by(() => {
		if (selectedOfficeId === null) return null;
		return officeAggregations.find((o) => o.office_id === selectedOfficeId) ?? null;
	});

	// Derived: SKU for selected office
	let selectedOfficeSku = $derived.by(() => {
		if (selectedOfficeId === null || !data) return [];
		return getSkuForOffice(data.rows, selectedOfficeId, scenarioParams);
	});

	const loader = useDebouncedLoader({
		watch: () => $effectiveFilters,
		delayMs: 250,
		load: async () => {
			error = null;

			// Planner-produced server params from filter runtime
			const runtimeCtx = {
				workspaceId: filterRuntime.workspaceId,
				ownerId: filterRuntime.ownerId
			};
			const plan = hasFiltersForTarget(datasetId, runtimeCtx)
				? planFiltersForDataset(datasetId, filterRuntime.getSnapshot(), runtimeCtx)
				: null;

			return await fetchDataset({
				id: datasetId,
				params: { ...(plan?.serverParams ?? {}), limit: 50000 },

				cache: { ttlMs: 60_000 }
			});
		},
		onData: (result) => {
			data = result;
		},
		onError: (e) => {
			error = e instanceof Error ? e.message : 'Failed to load dataset';
			data = null;
		}
	});

	// Reset selected office when region changes
	$effect(() => {
		const _ = selectedRegion;
		selectedOfficeId = null;
	});

	onMount(loader.reload);

	function handleOfficeClick(office: OfficeAggregation) {
		selectedOfficeId = selectedOfficeId === office.office_id ? null : office.office_id;
	}
</script>

<svelte:head>
	<title>Wildberries | Анализ складов</title>
</svelte:head>

<div class="min-h-screen space-y-6 bg-background p-6 lg:p-8">
	<!-- Header -->
	<header class="space-y-1">
		<h1 class="type-page-title">Оперативный анализ складов</h1>
		<p class="type-body-sm text-muted-foreground">
			{#if dataDate}
				Дата среза: <span class="font-medium">{formatDate(dataDate)}</span>
			{:else}
				Загрузка данных...
			{/if}
			{#if data?.meta?.executedAt}
				<span class="mx-1">•</span>
				Обновлено: {data.meta.executedAt}
			{/if}
		</p>
	</header>

	<!-- Filters -->
	<Card>
		<CardContent class="pt-6">
			<div class="flex flex-wrap items-end gap-4">
				<!-- Global filters via FilterPanel -->
				<FilterPanel runtime={filterRuntime} scope="shared" />

				<!-- Region filter (local) -->
				<div class="space-y-1">
					<label for="region-select" class="type-caption text-muted-foreground">Регион</label>
					<Select
						id="region-select"
						value={selectedRegion}
						onchange={(e) => (selectedRegion = e.currentTarget.value)}
						class="w-48"
					>
						<option value="">Все регионы</option>
						{#each regions as region}
							<option value={region}>{region}</option>
						{/each}
					</Select>
				</div>

				<!-- Reload button -->
				<Button onclick={loader.reload} disabled={loader.loading} variant="outline" class="h-9">
					{loader.loading ? 'Загрузка...' : 'Обновить'}
				</Button>
			</div>

			{#if error}
				<div
					class="mt-4 flex items-center gap-3 rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error"
				>
					<svg class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
							clip-rule="evenodd"
						/>
					</svg>
					{error}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Scenario Parameters -->
	<ScenarioParams {selectedPreset} onPresetChange={handlePresetChange} />

	<!-- KPI Grid -->
	<section>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
			<StatCard
				label="Складов в риске"
				value={kpi.officesAtRisk > 0 ? `${kpi.officesAtRisk} из ${kpi.totalOffices}` : '0'}
				loading={loader.loading && !data}
			/>
			<StatCard
				label="SKU в дефиците"
				value={formatCompact(kpi.skuDeficit)}
				loading={loader.loading && !data}
			/>
			<StatCard
				label="SKU в зоне риска"
				value={formatCompact(kpi.skuRisk)}
				loading={loader.loading && !data}
			/>
			<StatCard
				label="Общий остаток"
				value={formatCompact(kpi.totalStock)}
				loading={loader.loading && !data}
			/>
			<StatCard
				label="SKU в норме"
				value={formatCompact(kpi.skuOk)}
				loading={loader.loading && !data}
			/>
		</div>
	</section>

	<!-- Offices Table -->
	<OfficesTable
		aggregations={officeAggregations}
		{selectedOfficeId}
		{selectedRegion}
		loading={loader.loading}
		hasData={!!data}
		onOfficeClick={handleOfficeClick}
	/>

	<!-- SKU Drill-down Panel -->
	{#if selectedOffice && selectedOfficeSku.length > 0}
		<OfficeSkuPanel
			office={selectedOffice}
			skuList={selectedOfficeSku}
			onClose={() => (selectedOfficeId = null)}
		/>
	{/if}
</div>
