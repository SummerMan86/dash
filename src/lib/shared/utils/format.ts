/**
 * Number, Currency & Date Formatting Utilities
 * Single source of truth — all pages import from here.
 *
 * Locale: ru-RU, default currency: RUB
 * All functions are null-safe (return '—' for null/undefined/NaN).
 */

const LOCALE = 'ru-RU';
const DASH = '\u2014'; // —

const numberFmt = new Intl.NumberFormat(LOCALE);
const compactFmt = new Intl.NumberFormat(LOCALE, {
	notation: 'compact',
	maximumFractionDigits: 1
});

// ---- helpers ----

function isValid(v: unknown): v is number {
	return typeof v === 'number' && Number.isFinite(v);
}

// ---- public API ----

/**
 * Format number with thousand separators
 * @example formatNumber(1234567) → "1 234 567"
 */
export function formatNumber(
	value: number | null | undefined,
	options?: Intl.NumberFormatOptions
): string {
	if (!isValid(value)) return DASH;
	if (options) return new Intl.NumberFormat(LOCALE, options).format(value);
	return numberFmt.format(value);
}

/**
 * Format number in compact notation (Intl)
 * @example formatCompact(1234567) → "1,2 млн"
 */
export function formatCompact(value: number | null | undefined, decimals?: number): string {
	if (!isValid(value)) return DASH;
	if (decimals !== undefined) {
		return new Intl.NumberFormat(LOCALE, {
			notation: 'compact',
			maximumFractionDigits: decimals
		}).format(value);
	}
	return compactFmt.format(value);
}

/**
 * Format currency with symbol (compact by default)
 * @example formatCurrency(448200000) → "448,2 млн ₽"
 * @example formatCurrency(1234, { compact: false }) → "1 234 ₽"
 */
export function formatCurrency(
	value: number | null | undefined,
	options?: {
		currency?: string;
		compact?: boolean;
		decimals?: number;
	}
): string {
	if (!isValid(value)) return DASH;
	const { currency = 'RUB', compact = true, decimals = 1 } = options ?? {};

	if (compact) {
		const formatted = new Intl.NumberFormat(LOCALE, {
			notation: 'compact',
			maximumFractionDigits: decimals
		}).format(value);
		const symbols: Record<string, string> = {
			RUB: '\u20BD',
			EUR: '\u20AC',
			USD: '$',
			GBP: '\u00A3'
		};
		return `${formatted} ${symbols[currency] ?? currency}`;
	}

	return new Intl.NumberFormat(LOCALE, {
		style: 'currency',
		currency,
		maximumFractionDigits: 0
	}).format(value);
}

/**
 * Format percentage
 * @example formatPercent(12.4) → "+12.4%"
 * @example formatPercent(-5.2) → "-5.2%"
 * @example formatPercent(64.2, { showSign: false }) → "64.2%"
 */
export function formatPercent(
	value: number | null | undefined,
	options?: { showSign?: boolean; decimals?: number }
): string {
	if (!isValid(value)) return DASH;
	const { showSign = false, decimals = 1 } = options ?? {};
	const sign = showSign && value > 0 ? '+' : '';
	return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format trend value and determine direction
 * @example formatTrend(12.4) → { label: "+12.4%", direction: "up" }
 */
export function formatTrend(value: number | null | undefined): {
	label: string;
	direction: 'up' | 'down' | 'neutral';
} {
	if (!isValid(value)) return { label: DASH, direction: 'neutral' };
	return {
		label: formatPercent(value, { showSign: true }),
		direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral'
	};
}

/**
 * Format date for display
 * @example formatDate('2026-03-15') → "15 мар. 2026"
 * @example formatDate(new Date(), { month: 'long' }) → "15 марта 2026"
 */
export function formatDate(
	date: Date | string | null | undefined,
	options?: Intl.DateTimeFormatOptions
): string {
	if (!date) return DASH;
	const d = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(d.getTime())) return DASH;
	return new Intl.DateTimeFormat(LOCALE, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		...options
	}).format(d);
}

/**
 * Format rating value
 * @example formatRating(4.7) → "4.7"
 */
export function formatRating(value: number | null | undefined): string {
	if (!isValid(value) || value === 0) return DASH;
	return value.toFixed(1);
}

/**
 * Truncate text with ellipsis
 * @example truncate("Very long product name here", 20) → "Very long product na…"
 */
export function truncate(text: string | null | undefined, maxLen: number): string {
	if (!text) return DASH;
	return text.length > maxLen ? text.slice(0, maxLen) + '\u2026' : text;
}
