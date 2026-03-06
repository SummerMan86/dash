<script lang="ts">
	import { fetchDataset } from '$shared/api';
	import { useDebouncedLoader } from '$shared/lib/useDebouncedLoader.svelte';
	import { registerFilters, getEffectiveFilters } from '$entities/filter';
	import { FilterPanel } from '$widgets/filters';
	import { StatCard } from '$shared/ui/stat-card';
	import { ChartCard } from '$shared/ui/chart-card';
	import { Chart } from '$shared/ui/chart';
	import { Sparkline } from '$shared/ui/sparkline';
	import { lineChartPreset, getLineSeries } from '$shared/ui/chart/presets';
	import type { JsonValue } from '$entities/dataset';

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
	import {
		analyzeProduct,
		getRecommendationIcon,
		getSeverityColor,
		getSeverityBgColor,
		getWorstSeverity,
		getSeverityLabel,
		type Recommendation
	} from './recommendations';
	import {
		formatNumber,
		formatCompact,
		formatPercent,
		formatCurrency,
		formatDate,
		formatRating,
		truncate
	} from './utils';

	// --- Filters ---
	registerFilters(productAnalyticsFilters);

	// --- Data ---
	let rows = $state<Record<string, JsonValue>[]>([]);
	let error = $state<string | null>(null);

	const { loading } = useDebouncedLoader({
		watch: () => getEffectiveFilters(),
		delayMs: 300,
		load: () =>
			fetchDataset({
				id: 'wildberries.fact_product_period',
				params: { limit: 5000 },
				cache: { ttlMs: 60_000 }
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
			? products.find((p) => p.nm_id === selectedProductId) ?? null
			: null
	);

	let recommendations = $derived<Recommendation[]>(
		selectedProduct ? analyzeProduct(selectedProduct) : []
	);

	// --- Charts ---
	let salesChartOptions = $derived.by(() => {
		if (!dailyTotals.length) return null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const preset = lineChartPreset as any;
		return {
			...preset,
			legend: { data: ['Заказы (\u20BD)', 'Выкупы (\u20BD)'], top: 0, textStyle: { fontSize: 11 } },
			xAxis: {
				...preset.xAxis,
				data: dailyTotals.map((d) => d.date.slice(5))
			},
			series: [
				{
					...(getLineSeries as Function)(0, { showArea: true }),
					name: 'Заказы (\u20BD)',
					data: dailyTotals.map((d) => d.order_sum)
				},
				{
					...(getLineSeries as Function)(1, { showArea: false }),
					name: 'Выкупы (\u20BD)',
					data: dailyTotals.map((d) => d.buyout_sum)
				}
			]
		};
	});

	let funnelChartOptions = $derived.by(() => {
		if (!funnelData.views && !funnelData.orders) return null;
		const maxVal = Math.max(funnelData.views, 1);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return {
			grid: { top: 10, right: 80, bottom: 10, left: 100, containLabel: false },
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			xAxis: { type: 'value', show: false, max: maxVal },
			yAxis: {
				type: 'category',
				data: ['Просмотры', 'В корзину', 'Заказы', 'Выкупы'],
				inverse: true,
				axisLine: { show: false },
				axisTick: { show: false }
			},
			series: [
				{
					type: 'bar',
					data: [
						{ value: funnelData.views, itemStyle: { color: '#009d9a' } },
						{ value: funnelData.cart, itemStyle: { color: '#005d5d' } },
						{ value: funnelData.orders, itemStyle: { color: '#24a148' } },
						{ value: funnelData.buyouts, itemStyle: { color: '#198038' } }
					],
					barWidth: '55%',
					label: {
						show: true,
						position: 'right',
						formatter: (params: { value: number }) => formatCompact(params.value)
					},
					itemStyle: { borderRadius: [0, 4, 4, 0] }
				}
			]
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;
	});

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

	function sortIcon(col: string): string {
		if (sortColumn !== col) return '';
		return sortDir === 'asc' ? ' \u2191' : ' \u2193';
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-foreground">Аналитика товаров</h1>
			<p class="text-sm text-muted-foreground">
				{#if dataDate}Данные на {formatDate(dataDate)}{:else}Загрузка данных\u2026{/if}
				{#if products.length}&nbsp;&middot;&nbsp;{products.length} товаров{/if}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<FilterPanel scope="global" direction="horizontal" />
			{#if brands.length > 1}
				<select
					class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
					bind:value={selectedBrand}
				>
					<option value="">Все бренды</option>
					{#each brands as brand}
						<option value={brand}>{brand}</option>
					{/each}
				</select>
			{/if}
			{#if subjects.length > 1}
				<select
					class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
					bind:value={selectedSubject}
				>
					<option value="">Все категории</option>
					{#each subjects as subject}
						<option value={subject}>{subject}</option>
					{/each}
				</select>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="rounded-lg border border-error bg-error-muted p-4 text-sm text-error">
			{error}
		</div>
	{/if}

	<!-- KPI Grid -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
		<StatCard label="Выручка" value={formatCurrency(kpi.totalRevenue)} loading={loading} />
		<StatCard label="Заказы" value={formatCompact(kpi.totalOrders)} loading={loading} />
		<StatCard label="Выкупы" value={formatCompact(kpi.totalBuyouts)} loading={loading} />
		<StatCard label="% выкупа" value={formatPercent(kpi.avgBuyoutPercent)} loading={loading} />
		<StatCard label="Потери" value={formatCurrency(kpi.totalLostSales)} loading={loading} />
		<StatCard label="Ср. рейтинг" value={formatRating(kpi.avgRating)} loading={loading} />
	</div>

	<!-- Charts -->
	{#if dailyTotals.length > 1}
		<div class="grid gap-4 lg:grid-cols-2">
			{#if salesChartOptions}
				<ChartCard title="Динамика продаж" loading={loading}>
					<Chart options={salesChartOptions} autoResize />
				</ChartCard>
			{/if}
			{#if funnelChartOptions}
				<ChartCard title="Воронка конверсий" loading={loading}>
					<Chart options={funnelChartOptions} autoResize />
				</ChartCard>
			{/if}
		</div>
	{/if}

	<!-- Products Table -->
	<div class="overflow-x-auto rounded-lg border border-border bg-card">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-border text-left text-xs text-muted-foreground">
					<th class="px-3 py-3 font-medium">Товар</th>
					<th
						class="cursor-pointer px-3 py-3 text-right font-medium hover:text-foreground"
						onclick={() => toggleSort('order_sum')}
					>
						Заказы{sortIcon('order_sum')}
					</th>
					<th
						class="cursor-pointer px-3 py-3 text-right font-medium hover:text-foreground"
						onclick={() => toggleSort('buyout_sum')}
					>
						Выкупы{sortIcon('buyout_sum')}
					</th>
					<th
						class="cursor-pointer px-3 py-3 text-right font-medium hover:text-foreground"
						onclick={() => toggleSort('buyout_percent')}
					>
						% выкупа{sortIcon('buyout_percent')}
					</th>
					<th
						class="cursor-pointer px-3 py-3 text-right font-medium hover:text-foreground"
						onclick={() => toggleSort('stock_count')}
					>
						Остаток{sortIcon('stock_count')}
					</th>
					<th
						class="cursor-pointer px-3 py-3 text-right font-medium hover:text-foreground"
						onclick={() => toggleSort('lost_orders_sum')}
					>
						Потери{sortIcon('lost_orders_sum')}
					</th>
					<th
						class="cursor-pointer px-3 py-3 text-right font-medium hover:text-foreground"
						onclick={() => toggleSort('product_rating')}
					>
						Рейтинг{sortIcon('product_rating')}
					</th>
					<th class="px-3 py-3 text-center font-medium">Тренд</th>
					<th class="px-3 py-3 text-center font-medium">Действия</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedProducts as product (product.nm_id)}
					{@const recs = analyzeProduct(product)}
					{@const worst = getWorstSeverity(recs)}
					{@const actionCount = recs.filter(
						(r) => r.severity === 'critical' || r.severity === 'warning'
					).length}
					<tr
						class="cursor-pointer border-b border-border transition-colors hover:bg-muted/50 {selectedProductId === product.nm_id ? 'bg-accent/60' : ''}"
						onclick={() => selectProduct(product.nm_id)}
					>
						<td class="px-3 py-2.5">
							<div class="flex items-center gap-3">
								{#if product.main_photo}
									<img
										src={product.main_photo}
										alt=""
										class="h-10 w-10 rounded-md object-cover"
										loading="lazy"
									/>
								{:else}
									<div
										class="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground"
									>
										\u2014
									</div>
								{/if}
								<div class="min-w-0">
									<div class="truncate font-medium text-foreground" title={product.title}>
										{truncate(product.title, 35)}
									</div>
									<div class="text-xs text-muted-foreground">
										{product.vendor_code || product.nm_id}
									</div>
								</div>
							</div>
						</td>
						<td class="px-3 py-2.5 text-right font-medium">
							{formatCurrency(product.order_sum)}
						</td>
						<td class="px-3 py-2.5 text-right">
							{formatCurrency(product.buyout_sum)}
						</td>
						<td class="px-3 py-2.5 text-right">
							<span
								class={product.buyout_percent > 60
									? 'text-success'
									: product.buyout_percent < 30
										? 'text-error'
										: ''}
							>
								{formatPercent(product.buyout_percent)}
							</span>
						</td>
						<td class="px-3 py-2.5 text-right">
							<span class={product.stock_count <= 0 ? 'font-medium text-error' : ''}>
								{formatNumber(product.stock_count)}
							</span>
						</td>
						<td class="px-3 py-2.5 text-right">
							{#if product.lost_orders_sum > 0}
								<span class="text-error">{formatCurrency(product.lost_orders_sum)}</span>
							{:else}
								<span class="text-muted-foreground">\u2014</span>
							{/if}
						</td>
						<td class="px-3 py-2.5 text-right">
							{formatRating(product.product_rating)}
						</td>
						<td class="px-3 py-2.5 text-center">
							{#if product.daily_orders.length > 1}
								<Sparkline
									data={product.daily_orders}
									color={product.order_count > 0 ? 'primary' : 'error'}
								/>
							{/if}
						</td>
						<td class="px-3 py-2.5 text-center">
							{#if actionCount > 0}
								<span
									class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {getSeverityBgColor(
										worst
									)} {getSeverityColor(worst)}"
								>
									{actionCount}
								</span>
							{:else}
								<span class="text-success">\u2713</span>
							{/if}
						</td>
					</tr>
				{/each}
				{#if !sortedProducts.length && !loading}
					<tr>
						<td colspan="9" class="px-3 py-12 text-center text-muted-foreground">
							Нет данных. Проверьте подключение к БД или измените фильтры.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Product Detail Panel -->
	{#if selectedProduct}
		{@const recs = recommendations}
		<div class="rounded-lg border border-border bg-card" id="product-detail">
			<!-- Product Header -->
			<div class="flex items-start gap-4 border-b border-border p-6">
				{#if selectedProduct.main_photo}
					<img
						src={selectedProduct.main_photo}
						alt=""
						class="h-20 w-20 rounded-lg object-cover"
					/>
				{/if}
				<div class="min-w-0 flex-1">
					<h2 class="text-lg font-semibold text-foreground">
						{selectedProduct.title || `Товар ${selectedProduct.nm_id}`}
					</h2>
					<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
						<span>Артикул: {selectedProduct.vendor_code || '\u2014'}</span>
						<span>Бренд: {selectedProduct.brand_name || '\u2014'}</span>
						<span>Категория: {selectedProduct.subject_name || '\u2014'}</span>
						<span>НМ: {selectedProduct.nm_id}</span>
					</div>
					{#if selectedProduct.price_min || selectedProduct.price_max}
						<div class="mt-1 text-sm font-medium text-foreground">
							Цена: {formatNumber(selectedProduct.price_min)}\u2013{formatNumber(
								selectedProduct.price_max
							)} \u20BD
						</div>
					{/if}
				</div>
				<button
					class="text-muted-foreground hover:text-foreground"
					onclick={() => (selectedProductId = null)}
				>
					\u2715
				</button>
			</div>

			<!-- Metrics Grid -->
			<div class="grid grid-cols-2 gap-4 border-b border-border p-6 sm:grid-cols-3 lg:grid-cols-6">
				<div>
					<div class="text-xs text-muted-foreground">Просмотры</div>
					<div class="text-lg font-semibold">{formatNumber(selectedProduct.open_count)}</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">В корзину</div>
					<div class="text-lg font-semibold">{formatNumber(selectedProduct.cart_count)}</div>
					<div class="text-xs text-muted-foreground">
						{formatPercent(selectedProduct.add_to_cart_percent)}
					</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Заказы</div>
					<div class="text-lg font-semibold">{formatNumber(selectedProduct.order_count)}</div>
					<div class="text-xs text-muted-foreground">
						{formatCurrency(selectedProduct.order_sum)}
					</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Выкупы</div>
					<div class="text-lg font-semibold">{formatNumber(selectedProduct.buyout_count)}</div>
					<div class="text-xs text-muted-foreground">
						{formatPercent(selectedProduct.buyout_percent)}
					</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Остаток</div>
					<div
						class="text-lg font-semibold {selectedProduct.stock_count <= 0
							? 'text-error'
							: ''}"
					>
						{formatNumber(selectedProduct.stock_count)}
					</div>
					<div class="text-xs text-muted-foreground">
						WB: {formatNumber(selectedProduct.stocks_wb)}, MP: {formatNumber(
							selectedProduct.stocks_mp
						)}
					</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Рейтинг</div>
					<div class="text-lg font-semibold">
						{formatRating(selectedProduct.product_rating)}
					</div>
					<div class="text-xs text-muted-foreground">
						Отзывы: {formatRating(selectedProduct.feedback_rating)}
					</div>
				</div>
			</div>

			<!-- Recommendations -->
			<div class="p-6">
				<h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
					Рекомендации к действию
					<span class="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground">
						{recs.length}
						{recs.length === 1 ? 'рекомендация' : recs.length < 5 ? 'рекомендации' : 'рекомендаций'}
					</span>
				</h3>
				<div class="space-y-3">
					{#each recs as rec}
						<div
							class="flex items-start gap-3 rounded-lg border border-border p-4 {getSeverityBgColor(
								rec.severity
							)}"
						>
							<span class="mt-0.5 text-xl leading-none"
								>{getRecommendationIcon(rec.type)}</span
							>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium {getSeverityColor(rec.severity)}"
										>{rec.title}</span
									>
									<span
										class="rounded-full px-2 py-0.5 text-xs {getSeverityBgColor(
											rec.severity
										)} {getSeverityColor(rec.severity)}"
									>
										{getSeverityLabel(rec.severity)}
									</span>
								</div>
								<p class="mt-1 text-sm text-muted-foreground">{rec.description}</p>
								{#if rec.metric}
									<p class="mt-1 text-xs text-muted-foreground">{rec.metric}</p>
								{/if}
								{#if rec.impact}
									<p class="mt-1 text-xs font-medium {getSeverityColor(rec.severity)}">
										{rec.impact}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
