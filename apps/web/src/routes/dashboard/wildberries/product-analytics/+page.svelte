<script lang="ts">
	import { fetchDataset } from '$shared/api';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';
	import { Button } from '@dashboard-builder/platform-ui';
	import { StatCard } from '@dashboard-builder/platform-ui';
	import { ChartCard } from '@dashboard-builder/platform-ui';
	import { Chart } from '@dashboard-builder/platform-ui';
	import { Sparkline } from '@dashboard-builder/platform-ui';
	import { Badge } from '@dashboard-builder/platform-ui';
	import { Input } from '@dashboard-builder/platform-ui';
	import { Select } from '@dashboard-builder/platform-ui';
	import { lineChartPreset, getLineSeries } from '@dashboard-builder/platform-ui';
	import { getChartPalette, resolveCssColorVar } from '@dashboard-builder/platform-ui';
	import type { JsonValue } from '@dashboard-builder/platform-datasets';

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
	} from '@dashboard-builder/platform-core';

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

	let recommendations = $derived<Recommendation[]>(
		selectedProduct ? analyzeProduct(selectedProduct) : []
	);

	// --- Charts ---
	let salesChartOptions = $derived.by(() => {
		if (!dailyTotals.length) return null;
		const preset = lineChartPreset;
		return {
			...preset,
			legend: {
				data: ['Заказы (\u20BD)', 'Выкупы (\u20BD)'],
				top: 0,
				textStyle: { fontSize: 11, color: resolveCssColorVar('--color-muted-foreground') }
			},
			xAxis: {
				...preset.xAxis,
				data: dailyTotals.map((d) => d.date.slice(5))
			},
			series: [
				{
					...getLineSeries(1, { showArea: true }),
					name: 'Заказы (\u20BD)',
					data: dailyTotals.map((d) => d.order_sum)
				},
				{
					...getLineSeries(2, { showArea: false }),
					name: 'Выкупы (\u20BD)',
					data: dailyTotals.map((d) => d.buyout_sum)
				}
			]
		};
	});

	let funnelChartOptions = $derived.by(() => {
		if (!funnelData.views && !funnelData.orders) return null;
		const maxVal = Math.max(funnelData.views, 1);
		const palette = getChartPalette();
		const buyoutColor = resolveCssColorVar('--color-success');
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
						{ value: funnelData.views, itemStyle: { color: palette[0] } },
						{ value: funnelData.cart, itemStyle: { color: palette[1] } },
						{ value: funnelData.orders, itemStyle: { color: palette[2] } },
						{ value: funnelData.buyouts, itemStyle: { color: buyoutColor } }
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

	type SeverityVariant = 'success' | 'warning' | 'error' | 'info';
	function severityToVariant(severity: string): SeverityVariant {
		switch (severity) {
			case 'critical':
				return 'error';
			case 'warning':
				return 'warning';
			case 'info':
				return 'info';
			default:
				return 'success';
		}
	}

	// --- WB Price Management ---
	type PriceEditState = 'idle' | 'editing' | 'loading' | 'success' | 'error';

	let priceEditState = $state<PriceEditState>('idle');
	let priceInput = $state<string>('');
	let discountInput = $state<string>('');
	let priceEditError = $state<string>('');
	let priceEditMode = $state<'price' | 'discount'>('price');

	function openPriceEdit(mode: 'price' | 'discount') {
		priceEditMode = mode;
		priceEditState = 'editing';
		priceEditError = '';
		if (selectedProduct) {
			if (mode === 'price') {
				priceInput = String(selectedProduct.price_max || '');
			} else {
				discountInput = '';
			}
		}
	}

	function cancelPriceEdit() {
		priceEditState = 'idle';
		priceEditError = '';
	}

	async function applyPriceChange() {
		if (!selectedProduct) return;

		const price = priceEditMode === 'price' ? Number(priceInput) : undefined;
		const discount = priceEditMode === 'discount' ? Number(discountInput) : undefined;

		if (priceEditMode === 'price' && (!price || price <= 0)) {
			priceEditError = 'Введите корректную цену';
			return;
		}
		if (priceEditMode === 'discount' && (discount === undefined || discount < 0 || discount > 95)) {
			priceEditError = 'Скидка должна быть от 0 до 95%';
			return;
		}

		priceEditState = 'loading';
		priceEditError = '';

		try {
			const res = await fetch('/api/wb/prices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nmId: selectedProduct.nm_id, price, discount })
			});
			const data = await res.json();
			if (!res.ok) {
				priceEditState = 'error';
				priceEditError = data.error ?? 'Неизвестная ошибка';
			} else {
				priceEditState = 'success';
				setTimeout(() => {
					priceEditState = 'idle';
				}, 3000);
			}
		} catch {
			priceEditState = 'error';
			priceEditError = 'Ошибка сети';
		}
	}

	// Reset edit state when product changes
	$effect(() => {
		selectedProductId;
		priceEditState = 'idle';
		priceEditError = '';
	});
</script>

<div class="space-y-6 p-6 pb-12">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="type-page-title text-foreground">Аналитика товаров</h1>
			<p class="type-body-sm mt-1 text-muted-foreground">
				{#if dataDate}Данные на {formatDate(dataDate)}{:else}Загрузка данных\u2026{/if}
				{#if products.length}
					<span class="mx-1.5 text-border">\u00B7</span>
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
	<div class="overflow-hidden rounded-lg border border-card-border bg-card shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-border bg-muted/30">
						<th class="type-overline px-4 py-3 text-left text-muted-foreground"> Товар </th>
						{#each [{ col: 'order_sum', label: 'Заказы' }, { col: 'buyout_sum', label: 'Выкупы' }, { col: 'buyout_percent', label: '% выкупа' }, { col: 'stock_count', label: 'Остаток' }, { col: 'lost_orders_sum', label: 'Потери' }, { col: 'product_rating', label: 'Рейтинг' }] as { col, label }}
							<th
								class="type-overline cursor-pointer px-4 py-3 text-right text-muted-foreground transition-colors duration-[var(--transition-fast)] hover:text-foreground"
								onclick={() => toggleSort(col)}
							>
								{label}{sortIcon(col)}
							</th>
						{/each}
						<th class="type-overline px-4 py-3 text-center text-muted-foreground"> Тренд </th>
						<th class="type-overline px-4 py-3 text-center text-muted-foreground"> Статус </th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/50">
					{#each sortedProducts as product (product.nm_id)}
						{@const recs = analyzeProduct(product)}
						{@const worst = getWorstSeverity(recs)}
						{@const actionCount = recs.filter(
							(r) => r.severity === 'critical' || r.severity === 'warning'
						).length}
						<tr
							class="cursor-pointer transition-colors duration-[var(--transition-fast)] hover:bg-muted/40 {selectedProductId ===
							product.nm_id
								? 'bg-primary/5 hover:bg-primary/8'
								: ''}"
							onclick={() => selectProduct(product.nm_id)}
						>
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									{#if product.main_photo}
										<img
											src={product.main_photo}
											alt=""
											class="h-10 w-10 rounded-lg object-cover ring-1 ring-border/50"
											loading="lazy"
										/>
									{:else}
										<div
											class="type-caption flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"
										>
											\u2014
										</div>
									{/if}
									<div class="min-w-0">
										<div class="type-control truncate text-foreground" title={product.title}>
											{truncate(product.title, 35)}
										</div>
										<div class="type-caption text-muted-foreground">
											{product.vendor_code || product.nm_id}
										</div>
									</div>
								</div>
							</td>
							<td class="px-4 py-3 text-right font-medium tabular-nums">
								{formatCurrency(product.order_sum)}
							</td>
							<td class="px-4 py-3 text-right tabular-nums">
								{formatCurrency(product.buyout_sum)}
							</td>
							<td class="px-4 py-3 text-right tabular-nums">
								<span
									class={product.buyout_percent > 60
										? 'font-medium text-success'
										: product.buyout_percent < 30
											? 'font-medium text-error'
											: 'text-muted-foreground'}
								>
									{formatPercent(product.buyout_percent)}
								</span>
							</td>
							<td class="px-4 py-3 text-right tabular-nums">
								{#if product.stock_count <= 0}
									<Badge variant="error" size="sm">0</Badge>
								{:else}
									{formatNumber(product.stock_count)}
								{/if}
							</td>
							<td class="px-4 py-3 text-right tabular-nums">
								{#if product.lost_orders_sum > 0}
									<span class="font-medium text-error"
										>{formatCurrency(product.lost_orders_sum)}</span
									>
								{:else}
									<span class="text-muted-foreground">\u2014</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-right tabular-nums">
								{formatRating(product.product_rating)}
							</td>
							<td class="px-4 py-3 text-center">
								{#if product.daily_orders.length > 1}
									<Sparkline
										data={product.daily_orders}
										color={product.order_count > 0 ? 'primary' : 'error'}
									/>
								{/if}
							</td>
							<td class="px-4 py-3 text-center">
								{#if actionCount > 0}
									<Badge variant={severityToVariant(worst)} size="sm">
										{actionCount}
									</Badge>
								{:else}
									<Badge variant="success" size="sm">\u2713</Badge>
								{/if}
							</td>
						</tr>
					{/each}
					{#if !sortedProducts.length && !loader.loading}
						<tr>
							<td colspan="9" class="px-4 py-16 text-center text-muted-foreground">
								<div class="flex flex-col items-center gap-2">
									<svg
										class="h-8 w-8 text-muted-foreground/50"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
									>
										<path
											d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
										/>
									</svg>
									<span>Нет данных. Проверьте подключение к БД или измените фильтры.</span>
								</div>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Product Detail Panel -->
	{#if selectedProduct}
		{@const recs = recommendations}
		<div
			class="overflow-hidden rounded-lg border border-card-border bg-card shadow-sm"
			id="product-detail"
		>
			<!-- Product Header -->
			<div class="flex items-start gap-4 border-b border-border p-6">
				{#if selectedProduct.main_photo}
					<img
						src={selectedProduct.main_photo}
						alt=""
						class="h-20 w-20 rounded-xl object-cover ring-1 ring-border/50"
					/>
				{/if}
				<div class="min-w-0 flex-1">
					<h2 class="type-section-title text-foreground">
						{selectedProduct.title || `Товар ${selectedProduct.nm_id}`}
					</h2>
					<div class="mt-1.5 flex flex-wrap items-center gap-2">
						<Badge variant="outline"
							>{selectedProduct.vendor_code || `NM ${selectedProduct.nm_id}`}</Badge
						>
						{#if selectedProduct.brand_name}
							<Badge variant="muted">{selectedProduct.brand_name}</Badge>
						{/if}
						{#if selectedProduct.subject_name}
							<Badge variant="muted">{selectedProduct.subject_name}</Badge>
						{/if}
					</div>
					{#if selectedProduct.price_min || selectedProduct.price_max}
						<p class="type-control mt-2 text-foreground">
							{formatNumber(selectedProduct.price_min)}\u2013{formatNumber(
								selectedProduct.price_max
							)} \u20BD
						</p>
					{/if}
				</div>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 text-muted-foreground"
					onclick={() => (selectedProductId = null)}
					aria-label="Закрыть"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</Button>
			</div>

			<!-- Price Management -->
			<div class="border-b border-border px-6 py-4">
				<div class="flex flex-wrap items-center gap-3">
					<div class="flex items-center gap-2 text-sm">
						<span class="text-muted-foreground">Текущая цена:</span>
						<span class="font-semibold tabular-nums">
							{#if selectedProduct.price_min === selectedProduct.price_max}
								{formatNumber(selectedProduct.price_max)} ₽
							{:else}
								{formatNumber(selectedProduct.price_min)}–{formatNumber(selectedProduct.price_max)} ₽
							{/if}
						</span>
					</div>

					{#if priceEditState === 'idle'}
						<Button variant="outline" size="sm" onclick={() => openPriceEdit('price')}>
							<svg
								class="h-3.5 w-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
								<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
							</svg>
							Изменить цену
						</Button>
						<Button variant="outline" size="sm" onclick={() => openPriceEdit('discount')}>
							<svg
								class="h-3.5 w-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"
								/>
								<line x1="7" y1="7" x2="7.01" y2="7" />
							</svg>
							Изменить скидку
						</Button>
					{/if}

					{#if priceEditState === 'success'}
						<span class="type-caption-strong flex items-center gap-1.5 text-success">
							<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
							Отправлено в WB. Изменение появится через 2–5 минут.
						</span>
					{/if}
				</div>

				{#if priceEditState === 'editing' || priceEditState === 'loading' || priceEditState === 'error'}
					<div class="mt-3 flex flex-wrap items-end gap-3">
						{#if priceEditMode === 'price'}
							<div class="flex flex-col gap-1">
								<label class="type-caption-strong text-muted-foreground" for="price-input">
									Новая цена (₽, без скидки)
								</label>
								<Input
									id="price-input"
									type="number"
									min="1"
									step="1"
									class="w-36 tabular-nums"
									bind:value={priceInput}
									disabled={priceEditState === 'loading'}
								/>
							</div>
						{:else}
							<div class="flex flex-col gap-1">
								<label class="type-caption-strong text-muted-foreground" for="discount-input">
									Скидка (0–95%)
								</label>
								<Input
									id="discount-input"
									type="number"
									min="0"
									max="95"
									step="1"
									class="w-28 tabular-nums"
									bind:value={discountInput}
									disabled={priceEditState === 'loading'}
								/>
							</div>
						{/if}

						<div class="flex items-center gap-2">
							<Button
								size="sm"
								loading={priceEditState === 'loading'}
								onclick={applyPriceChange}
								disabled={priceEditState === 'loading'}
							>
								{priceEditState === 'loading' ? 'Отправка…' : 'Применить'}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={cancelPriceEdit}
								disabled={priceEditState === 'loading'}
							>
								Отмена
							</Button>
						</div>

						{#if priceEditError}
							<span class="type-caption text-error">{priceEditError}</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Metrics Grid -->
			<div
				class="grid grid-cols-2 gap-px border-b border-border bg-border/50 sm:grid-cols-3 lg:grid-cols-6"
			>
				{#each [{ label: 'Просмотры', value: formatNumber(selectedProduct.open_count), sub: '', alert: false }, { label: 'В корзину', value: formatNumber(selectedProduct.cart_count), sub: formatPercent(selectedProduct.add_to_cart_percent), alert: false }, { label: 'Заказы', value: formatNumber(selectedProduct.order_count), sub: formatCurrency(selectedProduct.order_sum), alert: false }, { label: 'Выкупы', value: formatNumber(selectedProduct.buyout_count), sub: formatPercent(selectedProduct.buyout_percent), alert: false }, { label: 'Остаток', value: formatNumber(selectedProduct.stock_count), sub: `WB: ${formatNumber(selectedProduct.stocks_wb)}, MP: ${formatNumber(selectedProduct.stocks_mp)}`, alert: selectedProduct.stock_count <= 0 }, { label: 'Рейтинг', value: formatRating(selectedProduct.product_rating), sub: `Отзывы: ${formatRating(selectedProduct.feedback_rating)}`, alert: false }] as m}
					<div class="bg-card p-4">
						<div class="type-caption-strong text-muted-foreground">{m.label}</div>
						<div
							class="type-section-title mt-1 tabular-nums {m.alert
								? 'text-error'
								: 'text-foreground'}"
						>
							{m.value}
						</div>
						{#if m.sub}
							<div class="type-caption mt-0.5 text-muted-foreground tabular-nums">{m.sub}</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Recommendations -->
			<div class="p-6">
				<div class="mb-4 flex items-center gap-3">
					<h3 class="type-overline text-foreground">Рекомендации</h3>
					<Badge variant="muted">
						{recs.length}
					</Badge>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each recs as rec}
						<div
							class="flex items-start gap-3 rounded-lg border border-border/60 p-4 transition-colors duration-[var(--transition-fast)] hover:border-border {getSeverityBgColor(
								rec.severity
							)}"
						>
							<span class="mt-0.5 text-lg leading-none">{getRecommendationIcon(rec.type)}</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="type-control {getSeverityColor(rec.severity)}">
										{rec.title}
									</span>
									<Badge variant={severityToVariant(rec.severity)} size="sm">
										{getSeverityLabel(rec.severity)}
									</Badge>
								</div>
								<p class="type-caption mt-1 leading-relaxed text-muted-foreground">
									{rec.description}
								</p>
								{#if rec.metric}
									<p class="mt-1.5 text-[11px] text-muted-foreground">{rec.metric}</p>
								{/if}
								{#if rec.impact}
									<p class="type-caption-strong mt-1 {getSeverityColor(rec.severity)}">
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
