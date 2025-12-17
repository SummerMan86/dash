/**
 * Number & Currency Formatting Utilities
 * Consistent formatting across dashboard
 */

const DEFAULT_LOCALE = 'en-US';

/**
 * Format number with thousand separators
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
}

/**
 * Format number in compact notation
 * @example formatCompact(1234567) → "1.2M"
 */
export function formatCompact(value: number, decimals = 1): string {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }
  return formatNumber(value);
}

/**
 * Format currency with symbol
 * @example formatCurrency(1234567) → "€1.2M"
 * @example formatCurrency(1234567, { compact: false }) → "€1,234,567.00"
 */
export function formatCurrency(
  value: number,
  options?: {
    currency?: string;
    compact?: boolean;
    decimals?: number;
  }
): string {
  const { currency = 'EUR', compact = true, decimals = 1 } = options ?? {};

  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RUB: '₽',
  };
  const symbol = symbols[currency] ?? currency;

  if (compact) {
    return `${symbol}${formatCompact(value, decimals)}`;
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format percentage with optional sign
 * @example formatPercent(12.4) → "+12.4%"
 * @example formatPercent(-5.2) → "-5.2%"
 */
export function formatPercent(
  value: number,
  options?: {
    showSign?: boolean;
    decimals?: number;
  }
): string {
  const { showSign = true, decimals = 1 } = options ?? {};
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format trend value and determine direction
 * @example formatTrend(12.4) → { label: "+12.4%", direction: "up" }
 */
export function formatTrend(value: number): {
  label: string;
  direction: 'up' | 'down' | 'neutral';
} {
  return {
    label: formatPercent(value),
    direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral',
  };
}

/**
 * Format date for display
 * @example formatDate(new Date()) → "Dec 2024"
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(d);
}
