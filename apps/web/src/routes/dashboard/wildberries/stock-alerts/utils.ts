import type { StockStatus, ScenarioParams } from './types';

/**
 * Вычисляет статус SKU на основе остатка и покрытия
 *
 * - DEFICIT: stock_count = 0
 * - RISK: coverage_days <= (L + S)
 * - OK: иначе
 */
export function calculateStatus(
	stockCount: number,
	coverageDays: number | null,
	params: ScenarioParams
): StockStatus {
	if (!Number.isFinite(stockCount) || stockCount <= 0) return 'DEFICIT';

	const threshold = params.L + params.S;
	const d =
		typeof coverageDays === 'number' && Number.isFinite(coverageDays) && coverageDays >= 0
			? coverageDays
			: null;

	if (d !== null && d <= threshold) {
		return 'RISK';
	}

	return 'OK';
}

/**
 * Возвращает CSS классы для статуса (цвет текста + фон)
 */
export function getStatusColor(status: StockStatus): string {
	switch (status) {
		case 'DEFICIT':
			return 'text-error bg-error-muted border border-error/20';
		case 'RISK':
			return 'text-warning bg-warning-muted border border-warning/20';
		case 'OK':
			return 'text-success bg-success-muted border border-success/20';
	}
}

/**
 * Возвращает CSS класс только для цвета текста
 */
export function getStatusTextColor(status: StockStatus): string {
	switch (status) {
		case 'DEFICIT':
			return 'text-error';
		case 'RISK':
			return 'text-warning';
		case 'OK':
			return 'text-success';
	}
}

/**
 * Возвращает локализованную метку статуса
 */
export function getStatusLabel(status: StockStatus): string {
	switch (status) {
		case 'DEFICIT':
			return 'Дефицит';
		case 'RISK':
			return 'Риск';
		case 'OK':
			return 'Норма';
	}
}
