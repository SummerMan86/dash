<script lang="ts">
	import { fetchDataset } from '$shared/api';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';
	import { Select } from '@dashboard-builder/platform-ui';
	import { StatCard } from '@dashboard-builder/platform-ui';
	import { ChartCard } from '@dashboard-builder/platform-ui';
	import { Chart } from '@dashboard-builder/platform-ui';
	import type { JsonValue } from '@dashboard-builder/platform-datasets';
	import {
		formatCompact,
		formatPercent,
		formatCurrency,
		formatDate,
		formatRating
	} from '@dashboard-builder/platform-core';

	import { productAnalyticsFilters } from './filters';
	import type { ProductSummary } from './types';
	import {
		aggregateProducts,
		calculateKpi,
		getMaxDate,
		getDailyTotals,
		buildFunnelData,
		getUniqueBrands,
		getUniqueSubjects
	} from './aggregation';
	import { analyzeProduct, type Recommendation } from './recommendations';
	import { buildSalesChartOptions, buildFunnelChartOptions } from './view-model';

	import ProductTable from './ProductTable.svelte';
	import ProductDetail from './ProductDetail.svelte';

	// --- Filters ---
	const filterRuntime = useFilterWorkspace({
		workspaceId: 'dashboard-wildberries',
		ownerId: 'product-analytics',
		specs: productAnalyticsFilters
	});
	let effectiveFilters = $derived(filterRuntime.effective);

	// --- Data ---
	let rows = $state<Record<string, JsonValue>[]>([]);
	let error = $state<string | null>(null);

	const loader = useDebouncedLoader({
		watch: () => $effectiveFilters,
		delayMs: 300,
		load: () =>
			fetchDataset({
				id: 'wildberries.fact_product_period',
				params: { limit: 5000 },
				cache: { ttlMs: 60_000 },
				filterContext: {
					snapshot: filterRuntime.getSnapshot(),
					workspaceId: filterRuntime.workspaceId,
					ownerId: filterRuntime.ownerId
				}
			}),
		onData: (data) => {
			rows = data.rows;
			error = null;
		},
		onError: (err) => {
			error = err instanceof Error ? err.message : String(err);
		}
	});

	// --- UI State ---
	let selectedProductId = $state<number | null>(null);
	let sortColumn = $state<string>('order_sum');
	let sortDir = $state<'asc' | 'desc'>('desc');
	let selectedBrand = $state<string>('');
	let selectedSubject = $state<string>('');

	// --- Derived ---
	let brands = $derived(getUniqueBrands(rows));
	let subjects = $derived(getUniqueSubjects(rows));
	let dataDate = $derived(getMaxDate(rows));

	let filteredRows = $derived.by(() => {
		let filtered = rows;
		if (selectedBrand) {
			filtered = filtered.filter((r) => r.brand_name === selectedBrand);
		}
		if (selectedSubject) {
			filtered = filtered.filter((r) => r.subject_name === selectedSubject);
		}
		return filtered;
	});

	let products = $derived(aggregateProducts(filteredRows));
	let kpi = $derived(calculateKpi(products));
	let dailyTotals = $derived(getDailyTotals(filteredRows));
	let funnelData = $derived(buildFunnelData(products));

	let sortedProducts = $derived.by(() => {
		const sorted = [...products];
		sorted.sort((a, b) => {
			const av = (a as Record<string, unknown>)[sortColumn];
			const bv = (b as Record<string, unknown>)[sortColumn];
			const na = typeof av === 'number' ? av : 0;
			const nb = typeof bv === 'number' ? bv : 0;
			return sortDir === 'asc' ? na - nb : nb - na;
		});
		return sorted;
	});

	let selectedProduct = $derived<ProductSummary | null>(
		selectedProductId !== null
			? (products.find((p) => p.nm_id === selectedProductId) ?? null)
			: null
	);

	// Pre-compute recommendations Map (keyed by nm_id) — avoids per-row calls in template
	let recommendationsMap = $derived.by(() => {
		const map = new Map<number, Recommendation[]>();
		for (const p of products) {
			map.set(p.nm_id, analyzeProduct(p));
		}
		return map;
	});

	let selectedRecommendations = $derived<Recommendation[]>(
		selectedProduct ? (recommendationsMap.get(selectedProduct.nm_id) ?? []) : []
	);

	// --- Charts ---
	let salesChartOptions = $derived(buildSalesChartOptions(dailyTotals));
	let funnelChartOptions = $derived(buildFunnelChartOptions(funnelData));

	// --- Handlers ---
	function toggleSort(col: string) {
		if (sortColumn === col) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col;
			sortDir = 'desc';
		}
	}

	function selectProduct(nmId: number) {
		selectedProductId = selectedProductId === nmId ? null : nmId;
	}
</script>

<div class="space-y-6 p-6 pb-12">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="type-page-title text-foreground">Аналитика товаров</h1>
			<p class="type-body-sm mt-1 text-muted-foreground">
				{#if dataDate}Данные на {formatDate(dataDate)}{:else}Загрузка данных&#x2026;{/if}
				{#if products.length}
					<span class="mx-1.5 text-border">&#x00B7;</span>
					<span>{products.length} товаров</span>
				{/if}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<FilterPanel runtime={filterRuntime} scope="shared" direction="horizontal" />
			{#if brands.length > 1}
				<Select class="min-w-[160px]" bind:value={selectedBrand}>
					<option value="">Все бренды</option>
					{#each brands as brand}
						<option value={brand}>{brand}</option>
					{/each}
				</Select>
			{/if}
			{#if subjects.length > 1}
				<Select class="min-w-[160px]" bind:value={selectedSubject}>
					<option value="">Все категории</option>
					{#each subjects as subject}
						<option value={subject}>{subject}</option>
					{/each}
				</Select>
			{/if}
		</div>
	</div>

	{#if error}
		<div
			class="flex items-center gap-3 rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error"
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

	<!-- KPI Grid -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
		<StatCard label="Выручка" value={formatCurrency(kpi.totalRevenue)} loading={loader.loading} />
		<StatCard label="Заказы" value={formatCompact(kpi.totalOrders)} loading={loader.loading} />
		<StatCard label="Выкупы" value={formatCompact(kpi.totalBuyouts)} loading={loader.loading} />
		<StatCard
			label="% выкупа"
			value={formatPercent(kpi.avgBuyoutPercent)}
			loading={loader.loading}
		/>
		<StatCard label="Потери" value={formatCurrency(kpi.totalLostSales)} loading={loader.loading} />
		<StatCard label="Ср. рейтинг" value={formatRating(kpi.avgRating)} loading={loader.loading} />
	</div>

	<!-- Charts -->
	{#if dailyTotals.length > 1}
		<div class="grid gap-4 lg:grid-cols-2">
			{#if salesChartOptions}
				<ChartCard
					title="Динамика продаж"
					subtitle="Заказы и выкупы по дням"
					loading={loader.loading}
				>
					<Chart options={salesChartOptions} autoResize />
				</ChartCard>
			{/if}
			{#if funnelChartOptions}
				<ChartCard
					title="Воронка конверсий"
					subtitle="Суммарные показатели по товарам"
					loading={loader.loading}
				>
					<Chart options={funnelChartOptions} autoResize />
				</ChartCard>
			{/if}
		</div>
	{/if}

	<!-- Products Table -->
	<ProductTable
		products={sortedProducts}
		{selectedProductId}
		{sortColumn}
		{sortDir}
		{recommendationsMap}
		loading={loader.loading}
		onSelectProduct={selectProduct}
		onToggleSort={toggleSort}
	/>

	<!-- Product Detail Panel -->
	{#if selectedProduct}
		<ProductDetail
			product={selectedProduct}
			recommendations={selectedRecommendations}
			onClose={() => (selectedProductId = null)}
		/>
	{/if}
</div>
