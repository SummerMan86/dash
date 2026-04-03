<script lang="ts">
	import { onMount } from 'svelte';

	import { fetchDataset } from '$shared/api/fetchDataset';
	import { useDebouncedLoader } from '$shared/lib/useDebouncedLoader.svelte';
	import { cn } from '$shared/styles/utils';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';
	import { StatCard } from '$shared/ui/stat-card';
	import { Select } from '$shared/ui/select';
	import type { DatasetResponse, JsonValue } from '$entities/dataset';
	import { useFilterWorkspace } from '$entities/filter';
	import { FilterPanel } from '$widgets/filters';
	import { StatusBadge, ScenarioParams } from '$widgets/stock-alerts';

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
	import { formatNumber, formatCompact, formatDate } from '$shared/utils';
	import { getStatusTextColor } from './utils';

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
			// Load data with higher limit for aggregation
			return await fetchDataset({
				id: datasetId,
				params: { limit: 50000 },
				cache: { ttlMs: 60_000 }, // Cache for 1 minute
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
	<Card>
		<CardHeader>
			<CardTitle>Склады WB — статус</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loader.loading && !data}
				<div class="type-body-sm text-muted-foreground">Загрузка...</div>
			{:else if !officeAggregations.length}
				<div class="type-body-sm text-muted-foreground">Нет данных</div>
			{:else}
				<div class="type-caption mb-2 text-muted-foreground">
					Складов: {officeAggregations.length}
					{#if selectedRegion}
						<span class="mx-1">•</span>
						Регион: {selectedRegion}
					{/if}
				</div>

				<div class="overflow-auto rounded-md border border-border/50">
					<table class="w-full text-sm">
						<thead class="bg-muted/30">
							<tr>
								<th class="type-overline px-3 py-2 text-left text-muted-foreground">Склад</th>
								<th class="type-overline px-3 py-2 text-left text-muted-foreground">Регион</th>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground">SKU</th>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground">Дефицит</th>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground">Риск</th>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground">Норма</th>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground">Остаток</th>
								<th class="type-overline px-3 py-2 text-center text-muted-foreground">Статус</th>
							</tr>
						</thead>
						<tbody>
							{#each officeAggregations as office (office.office_id)}
								<tr
									class={cn(
										'cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/40',
										selectedOfficeId === office.office_id && 'bg-muted/30'
									)}
									onclick={() => handleOfficeClick(office)}
								>
									<td class="px-3 py-2 font-medium whitespace-nowrap">
										{office.office_name || `#${office.office_id}`}
									</td>
									<td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
										{office.region_name || '—'}
									</td>
									<td class="px-3 py-2 text-right whitespace-nowrap">
										{formatNumber(office.total_sku)}
									</td>
									<td
										class={cn(
											'px-3 py-2 text-right whitespace-nowrap',
											getStatusTextColor('DEFICIT')
										)}
									>
										{office.deficit_count > 0 ? formatNumber(office.deficit_count) : '—'}
									</td>
									<td
										class={cn('px-3 py-2 text-right whitespace-nowrap', getStatusTextColor('RISK'))}
									>
										{office.risk_count > 0 ? formatNumber(office.risk_count) : '—'}
									</td>
									<td
										class={cn('px-3 py-2 text-right whitespace-nowrap', getStatusTextColor('OK'))}
									>
										{formatNumber(office.ok_count)}
									</td>
									<td class="px-3 py-2 text-right whitespace-nowrap">
										{formatCompact(office.total_stock)}
									</td>
									<td class="px-3 py-2 text-center">
										<StatusBadge status={office.status} size="sm" />
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- SKU Drill-down Panel -->
	{#if selectedOffice && selectedOfficeSku.length > 0}
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<CardTitle>
						SKU — {selectedOffice.office_name || `Склад #${selectedOffice.office_id}`}
					</CardTitle>
					<Button variant="ghost" size="sm" onclick={() => (selectedOfficeId = null)}>
						Закрыть
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div class="type-caption mb-2 text-muted-foreground">
					Всего SKU: {selectedOfficeSku.length}
				</div>

				<div class="max-h-96 overflow-auto rounded-md border border-border/50">
					<table class="w-full text-sm">
						<thead class="sticky top-0 bg-muted/30">
							<tr>
								<th class="type-overline px-3 py-2 text-left text-muted-foreground">nm_id</th>
								<th class="type-overline px-3 py-2 text-left text-muted-foreground">Размер</th>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground">Остаток</th>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground"
									>Покрытие (дн)</th
								>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground">К клиентам</th>
								<th class="type-overline px-3 py-2 text-right text-muted-foreground">От клиентов</th
								>
								<th class="type-overline px-3 py-2 text-center text-muted-foreground">Статус</th>
							</tr>
						</thead>
						<tbody>
							{#each selectedOfficeSku.slice(0, 100) as sku (sku.nm_id + '-' + sku.chrt_id)}
								<tr class="border-b border-border/50">
									<td class="px-3 py-2 font-mono text-xs whitespace-nowrap">
										{sku.nm_id}
									</td>
									<td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
										{sku.size_name || '—'}
									</td>
									<td class="px-3 py-2 text-right whitespace-nowrap">
										{formatNumber(sku.stock_count)}
									</td>
									<td class="px-3 py-2 text-right whitespace-nowrap">
										{sku.coverage_days !== null ? formatNumber(Math.round(sku.coverage_days)) : '—'}
									</td>
									<td class="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
										{sku.to_client_count !== null ? formatNumber(sku.to_client_count) : '—'}
									</td>
									<td class="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
										{sku.from_client_count !== null ? formatNumber(sku.from_client_count) : '—'}
									</td>
									<td class="px-3 py-2 text-center">
										<StatusBadge status={sku.status} size="sm" />
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if selectedOfficeSku.length > 100}
					<div class="type-caption mt-2 text-muted-foreground">
						Показаны первые 100 из {selectedOfficeSku.length} SKU
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
