import type { ProductSummary } from './types';
import { formatNumber, formatCurrency, formatPercent } from './utils';

export type RecommendationType =
	| 'restock'
	| 'price_up'
	| 'price_down'
	| 'promote'
	| 'optimize_listing'
	| 'review_quality'
	| 'overstock'
	| 'lost_sales'
	| 'healthy';

export type Severity = 'critical' | 'warning' | 'info' | 'success';

export type Recommendation = {
	type: RecommendationType;
	severity: Severity;
	title: string;
	description: string;
	metric?: string;
	impact?: string;
};

export function analyzeProduct(product: ProductSummary): Recommendation[] {
	const recs: Recommendation[] = [];

	// 1. RESTOCK: no stock
	if (product.stock_count <= 0) {
		recs.push({
			type: 'restock',
			severity: 'critical',
			title: 'Пополните запасы',
			description:
				product.lost_orders_sum > 0
					? `Товара нет в наличии. Потеряно заказов на ${formatCurrency(product.lost_orders_sum)}`
					: 'Товара нет в наличии \u2014 покупатели не могут оформить заказ',
			metric: `Остаток: 0 шт`,
			impact:
				product.lost_orders_sum > 0
					? `Потенциал: ${formatCurrency(product.lost_orders_sum)}`
					: undefined
		});
	}

	// 2. LOST_SALES: significant lost orders even with stock
	if (product.lost_orders_sum > 0 && product.stock_count > 0) {
		recs.push({
			type: 'lost_sales',
			severity: 'warning',
			title: 'Потерянные продажи',
			description: `Потеряно ${formatNumber(product.lost_orders_count)} заказов на ${formatCurrency(product.lost_orders_sum)}`,
			metric: `При остатке ${formatNumber(product.stock_count)} шт`
		});
	}

	// 3. PRICE_UP: high buyout percent + decent volume
	if (product.buyout_percent > 60 && product.order_count >= 5) {
		recs.push({
			type: 'price_up',
			severity: 'info',
			title: 'Повысьте цену',
			description: `Процент выкупа ${formatPercent(product.buyout_percent)} \u2014 спрос превышает ожидания`,
			metric: `Выкуп: ${formatPercent(product.buyout_percent)}, заказов: ${formatNumber(product.order_count)}`
		});
	}

	// 4. PRICE_DOWN: low cart conversion with decent views
	if (product.add_to_cart_percent > 0 && product.add_to_cart_percent < 3 && product.open_count > 50) {
		recs.push({
			type: 'price_down',
			severity: 'warning',
			title: 'Снизьте цену',
			description: `Конверсия в корзину ${formatPercent(product.add_to_cart_percent)} при ${formatNumber(product.open_count)} просмотрах \u2014 цена отпугивает`,
			metric: `Просмотры \u2192 корзина: ${formatPercent(product.add_to_cart_percent)}`
		});
	}

	// 5. OPTIMIZE_LISTING: decent views but moderate cart conversion
	if (
		product.add_to_cart_percent >= 3 &&
		product.add_to_cart_percent < 7 &&
		product.open_count > 30
	) {
		recs.push({
			type: 'optimize_listing',
			severity: 'info',
			title: 'Улучшите карточку',
			description:
				'Конверсия в корзину ниже среднего \u2014 обновите фото, описание или инфографику',
			metric: `В корзину: ${formatPercent(product.add_to_cart_percent)}`
		});
	}

	// 6. REVIEW_QUALITY: low product rating
	if (product.product_rating > 0 && product.product_rating < 4.0) {
		recs.push({
			type: 'review_quality',
			severity: product.product_rating < 3.0 ? 'critical' : 'warning',
			title: 'Проверьте качество',
			description: `Рейтинг ${product.product_rating.toFixed(1)} \u2014 покупатели недовольны`,
			metric: `Рейтинг: ${product.product_rating.toFixed(1)} / 5.0`
		});
	}

	// 7. OVERSTOCK: slow turnover with significant stock
	if (product.avg_stock_turnover_days > 90 && product.stock_count > 20) {
		recs.push({
			type: 'overstock',
			severity: 'warning',
			title: 'Заморожены средства',
			description: `Оборачиваемость ${product.avg_stock_turnover_days.toFixed(0)} дней \u2014 запустите акцию или распродажу`,
			metric: `${formatNumber(product.stock_count)} шт, оборот ${product.avg_stock_turnover_days.toFixed(0)} дн`,
			impact: `Заморожено: ${formatCurrency(product.stock_sum)}`
		});
	}

	// 8. PROMOTE: good product but low visibility
	if (product.product_rating >= 4.5 && product.open_count < 30) {
		recs.push({
			type: 'promote',
			severity: 'info',
			title: 'Продвигайте товар',
			description: `Отличный рейтинг ${product.product_rating.toFixed(1)} при низкой видимости \u2014 увеличьте рекламный бюджет`,
			metric: `Рейтинг: ${product.product_rating.toFixed(1)}, просмотры: ${formatNumber(product.open_count)}`
		});
	}

	// All good
	if (recs.length === 0) {
		recs.push({
			type: 'healthy',
			severity: 'success',
			title: 'Всё в норме',
			description: 'Ключевые показатели в допустимых пределах. Продолжайте мониторинг.'
		});
	}

	const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
	recs.sort((a, b) => order[a.severity] - order[b.severity]);

	return recs;
}

export function getSeverityColor(severity: Severity): string {
	switch (severity) {
		case 'critical':
			return 'text-error';
		case 'warning':
			return 'text-warning';
		case 'info':
			return 'text-info';
		case 'success':
			return 'text-success';
	}
}

export function getSeverityBgColor(severity: Severity): string {
	switch (severity) {
		case 'critical':
			return 'bg-error-muted';
		case 'warning':
			return 'bg-warning-muted';
		case 'info':
			return 'bg-info-muted';
		case 'success':
			return 'bg-success-muted';
	}
}

export function getRecommendationIcon(type: RecommendationType): string {
	switch (type) {
		case 'restock':
			return '\uD83D\uDCE6';
		case 'lost_sales':
			return '\uD83D\uDCB8';
		case 'price_up':
			return '\uD83D\uDCC8';
		case 'price_down':
			return '\uD83D\uDCC9';
		case 'promote':
			return '\uD83D\uDCE2';
		case 'optimize_listing':
			return '\uD83C\uDFA8';
		case 'review_quality':
			return '\u26A0\uFE0F';
		case 'overstock':
			return '\uD83C\uDFEA';
		case 'healthy':
			return '\u2705';
	}
}

export function getWorstSeverity(recs: Recommendation[]): Severity {
	if (recs.some((r) => r.severity === 'critical')) return 'critical';
	if (recs.some((r) => r.severity === 'warning')) return 'warning';
	if (recs.some((r) => r.severity === 'info')) return 'info';
	return 'success';
}

export function getSeverityLabel(severity: Severity): string {
	switch (severity) {
		case 'critical':
			return 'Критично';
		case 'warning':
			return 'Важно';
		case 'info':
			return 'Совет';
		case 'success':
			return 'Норма';
	}
}
