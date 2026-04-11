<script lang="ts">
	import { Sparkline } from '@dashboard-builder/platform-ui';
	import { Badge } from '@dashboard-builder/platform-ui';
	import {
		formatNumber,
		formatCurrency,
		formatPercent,
		formatRating,
		truncate
	} from '@dashboard-builder/platform-core';
	import type { ProductSummary } from './types';
	import type { Recommendation, Severity } from './recommendations';
	import { getWorstSeverity } from './recommendations';

	// --- Props ---
	let {
		products,
		selectedProductId,
		sortColumn,
		sortDir,
		recommendationsMap,
		loading = false,
		onSelectProduct,
		onToggleSort
	}: {
		products: ProductSummary[];
		selectedProductId: number | null;
		sortColumn: string;
		sortDir: 'asc' | 'desc';
		recommendationsMap: Map<number, Recommendation[]>;
		loading?: boolean;
		onSelectProduct: (nmId: number) => void;
		onToggleSort: (col: string) => void;
	} = $props();

	// --- Helpers ---
	function sortIcon(col: string): string {
		if (sortColumn !== col) return '';
		return sortDir === 'asc' ? ' \u2191' : ' \u2193';
	}

	type SeverityVariant = 'success' | 'warning' | 'error' | 'info';
	function severityToVariant(severity: Severity): SeverityVariant {
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

	const columns = [
		{ col: 'order_sum', label: 'Заказы' },
		{ col: 'buyout_sum', label: 'Выкупы' },
		{ col: 'buyout_percent', label: '% выкупа' },
		{ col: 'stock_count', label: 'Остаток' },
		{ col: 'lost_orders_sum', label: 'Потери' },
		{ col: 'product_rating', label: 'Рейтинг' }
	];
</script>

<div class="overflow-hidden rounded-lg border border-card-border bg-card shadow-sm">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-border bg-muted/30">
					<th class="type-overline px-4 py-3 text-left text-muted-foreground"> Товар </th>
					{#each columns as { col, label }}
						<th
							class="type-overline cursor-pointer px-4 py-3 text-right text-muted-foreground transition-colors duration-[var(--transition-fast)] hover:text-foreground"
							onclick={() => onToggleSort(col)}
						>
							{label}{sortIcon(col)}
						</th>
					{/each}
					<th class="type-overline px-4 py-3 text-center text-muted-foreground"> Тренд </th>
					<th class="type-overline px-4 py-3 text-center text-muted-foreground"> Статус </th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/50">
				{#each products as product (product.nm_id)}
					{@const recs = recommendationsMap.get(product.nm_id) ?? []}
					{@const worst = getWorstSeverity(recs)}
					{@const actionCount = recs.filter(
						(r) => r.severity === 'critical' || r.severity === 'warning'
					).length}
					<tr
						class="cursor-pointer transition-colors duration-[var(--transition-fast)] hover:bg-muted/40 {selectedProductId ===
						product.nm_id
							? 'bg-primary/5 hover:bg-primary/8'
							: ''}"
						onclick={() => onSelectProduct(product.nm_id)}
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
										&#x2014;
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
								<span class="text-muted-foreground">&#x2014;</span>
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
								<Badge variant="success" size="sm">&#x2713;</Badge>
							{/if}
						</td>
					</tr>
				{/each}
				{#if !products.length && !loading}
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
