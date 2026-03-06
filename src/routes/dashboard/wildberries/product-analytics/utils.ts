const numberFmt = new Intl.NumberFormat('ru-RU');
const compactFmt = new Intl.NumberFormat('ru-RU', {
	notation: 'compact',
	maximumFractionDigits: 1
});
const dateFmt = new Intl.DateTimeFormat('ru-RU', {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

export function formatNumber(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '\u2014';
	return numberFmt.format(value);
}

export function formatCompact(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '\u2014';
	return compactFmt.format(value);
}

export function formatPercent(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '\u2014';
	return `${value.toFixed(1)}%`;
}

export function formatCurrency(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '\u2014';
	return `${compactFmt.format(value)} \u20BD`;
}

export function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return '\u2014';
	const d = new Date(dateStr);
	return dateFmt.format(d);
}

export function formatRating(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value) || value === 0) return '\u2014';
	return value.toFixed(1);
}

export function truncate(text: string | null | undefined, maxLen: number): string {
	if (!text) return '\u2014';
	return text.length > maxLen ? text.slice(0, maxLen) + '\u2026' : text;
}
