<script lang="ts">
	import { Button } from '@dashboard-builder/platform-ui';
	import { Badge } from '@dashboard-builder/platform-ui';
	import {
		formatNumber,
		formatPercent,
		formatCurrency,
		formatRating
	} from '@dashboard-builder/platform-core';
	import type { ProductSummary } from './types';
	import {
		getRecommendationIcon,
		getSeverityColor,
		getSeverityBgColor,
		getSeverityLabel,
		type Recommendation,
		type Severity
	} from './recommendations';
	import PriceEditor from './PriceEditor.svelte';

	// --- Props ---
	let {
		product,
		recommendations,
		onClose
	}: {
		product: ProductSummary;
		recommendations: Recommendation[];
		onClose: () => void;
	} = $props();

	// --- Helpers ---
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

	const metricsGrid = $derived([
		{
			label: 'Просмотры',
			value: formatNumber(product.open_count),
			sub: '',
			alert: false
		},
		{
			label: 'В корзину',
			value: formatNumber(product.cart_count),
			sub: formatPercent(product.add_to_cart_percent),
			alert: false
		},
		{
			label: 'Заказы',
			value: formatNumber(product.order_count),
			sub: formatCurrency(product.order_sum),
			alert: false
		},
		{
			label: 'Выкупы',
			value: formatNumber(product.buyout_count),
			sub: formatPercent(product.buyout_percent),
			alert: false
		},
		{
			label: 'Остаток',
			value: formatNumber(product.stock_count),
			sub: `WB: ${formatNumber(product.stocks_wb)}, MP: ${formatNumber(product.stocks_mp)}`,
			alert: product.stock_count <= 0
		},
		{
			label: 'Рейтинг',
			value: formatRating(product.product_rating),
			sub: `Отзывы: ${formatRating(product.feedback_rating)}`,
			alert: false
		}
	]);
</script>

<div
	class="overflow-hidden rounded-lg border border-card-border bg-card shadow-sm"
	id="product-detail"
>
	<!-- Product Header -->
	<div class="flex items-start gap-4 border-b border-border p-6">
		{#if product.main_photo}
			<img
				src={product.main_photo}
				alt=""
				class="h-20 w-20 rounded-xl object-cover ring-1 ring-border/50"
			/>
		{/if}
		<div class="min-w-0 flex-1">
			<h2 class="type-section-title text-foreground">
				{product.title || `Товар ${product.nm_id}`}
			</h2>
			<div class="mt-1.5 flex flex-wrap items-center gap-2">
				<Badge variant="outline">{product.vendor_code || `NM ${product.nm_id}`}</Badge>
				{#if product.brand_name}
					<Badge variant="muted">{product.brand_name}</Badge>
				{/if}
				{#if product.subject_name}
					<Badge variant="muted">{product.subject_name}</Badge>
				{/if}
			</div>
			{#if product.price_min || product.price_max}
				<p class="type-control mt-2 text-foreground">
					{formatNumber(product.price_min)}&#x2013;{formatNumber(product.price_max)} &#x20BD;
				</p>
			{/if}
		</div>
		<Button
			variant="ghost"
			size="icon"
			class="h-8 w-8 text-muted-foreground"
			onclick={onClose}
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

	<!-- Price Editor -->
	<PriceEditor {product} />

	<!-- Metrics Grid -->
	<div
		class="grid grid-cols-2 gap-px border-b border-border bg-border/50 sm:grid-cols-3 lg:grid-cols-6"
	>
		{#each metricsGrid as m}
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
				{recommendations.length}
			</Badge>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each recommendations as rec}
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
