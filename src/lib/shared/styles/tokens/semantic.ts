/**
 * TypeScript Design Tokens (thin wrapper)
 *
 * Single source of truth: CSS tokens in `tokens.css` (@theme custom properties).
 *
 * - `semanticVars`: typed `var(--token)` strings for rare inline-style cases
 * - `resolve*`: client-side helpers that resolve CSS vars to real values for Canvas/ECharts
 *
 * NOTE: UI components should use Tailwind classes, not these tokens.
 */

// ========================================
// CSS VARIABLE REFERENCES
// ========================================
// For inline styles and dynamic values

export const semanticVars = {
  primary: {
    DEFAULT: 'var(--color-primary)',
    hover: 'var(--color-primary-hover)',
    active: 'var(--color-primary-active)',
    disabled: 'var(--color-primary-disabled)',
    foreground: 'var(--color-primary-foreground)',
  },
  secondary: {
    DEFAULT: 'var(--color-secondary)',
    hover: 'var(--color-secondary-hover)',
    active: 'var(--color-secondary-active)',
    disabled: 'var(--color-secondary-disabled)',
    foreground: 'var(--color-secondary-foreground)',
  },
  accent: {
    DEFAULT: 'var(--color-accent)',
    hover: 'var(--color-accent-hover)',
    active: 'var(--color-accent-active)',
    foreground: 'var(--color-accent-foreground)',
  },
  destructive: {
    DEFAULT: 'var(--color-destructive)',
    hover: 'var(--color-destructive-hover)',
    active: 'var(--color-destructive-active)',
    foreground: 'var(--color-destructive-foreground)',
  },
  outline: {
    DEFAULT: 'var(--color-outline)',
    hover: 'var(--color-outline-hover)',
    active: 'var(--color-outline-active)',
    border: 'var(--color-outline-border)',
    foreground: 'var(--color-outline-foreground)',
  },
  ghost: {
    DEFAULT: 'var(--color-ghost)',
    hover: 'var(--color-ghost-hover)',
    active: 'var(--color-ghost-active)',
    foreground: 'var(--color-ghost-foreground)',
  },
  link: {
    DEFAULT: 'var(--color-link)',
    hover: 'var(--color-link-hover)',
    foreground: 'var(--color-link-foreground)',
    hoverForeground: 'var(--color-link-hover-foreground)',
  },
  muted: {
    DEFAULT: 'var(--color-muted)',
    hover: 'var(--color-muted-hover)',
    foreground: 'var(--color-muted-foreground)',
  },
  success: {
    DEFAULT: 'var(--color-success)',
    hover: 'var(--color-success-hover)',
    foreground: 'var(--color-success-foreground)',
    muted: 'var(--color-success-muted)',
  },
  warning: {
    DEFAULT: 'var(--color-warning)',
    hover: 'var(--color-warning-hover)',
    foreground: 'var(--color-warning-foreground)',
    muted: 'var(--color-warning-muted)',
  },
  error: {
    DEFAULT: 'var(--color-error)',
    hover: 'var(--color-error-hover)',
    foreground: 'var(--color-error-foreground)',
    muted: 'var(--color-error-muted)',
  },
  info: {
    DEFAULT: 'var(--color-info)',
    hover: 'var(--color-info-hover)',
    foreground: 'var(--color-info-foreground)',
    muted: 'var(--color-info-muted)',
  },
  border: {
    DEFAULT: 'var(--color-border)',
    hover: 'var(--color-border-hover)',
    focus: 'var(--color-border-focus)',
  },
  trend: {
    up: 'var(--color-trend-up)',
    down: 'var(--color-trend-down)',
    neutral: 'var(--color-trend-neutral)',
  },
  tooltip: {
    DEFAULT: 'var(--color-tooltip)',
    foreground: 'var(--color-tooltip-foreground)',
  },
  background: {
    DEFAULT: 'var(--color-background)',
    foreground: 'var(--color-foreground)',
  },
  chart: {
    1: 'var(--color-chart-1)',
    2: 'var(--color-chart-2)',
    3: 'var(--color-chart-3)',
    4: 'var(--color-chart-4)',
    5: 'var(--color-chart-5)',
  },
} as const;

// ========================================
// CHART CONFIGURATION
// ========================================

export const chartConfig = {
  /** Default height for chart containers */
  height: '18rem', // 288px
  /** Tailwind class for height */
  heightClass: 'h-72',
  /** Axis label font size */
  axisFontSize: 11,
  /** Grid line dash pattern */
  gridDash: [3, 3] as [number, number],
  /** Area gradient opacity range */
  gradient: {
    startOpacity: 0.3,
    endOpacity: 0,
  },
} as const;

// ========================================
// TYPE EXPORTS
// ========================================

/** Button style variants (tokens exist for: default, secondary, destructive, outline, ghost, link) */
export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';
export type StatusVariant = 'success' | 'warning' | 'error' | 'info';
export type TrendDirection = 'up' | 'down' | 'neutral';
export type ChartColorIndex = 1 | 2 | 3 | 4 | 5;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Read a CSS custom property value from :root.
 * On the server (SSR), returns empty string.
 */
export function readCssVar(name: `--${string}`): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resolve a CSS color variable to a computed color string (e.g. "rgb(…)" / "rgba(…)" ).
 *
 * Why: some vars are defined as `var(--other-token)` so reading the custom property may
 * return "var(--...)" instead of a real color value.
 *
 * On the server (SSR), returns undefined.
 */
export function resolveCssColorVar(name: `--${string}`): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const el = document.createElement('span');
  el.style.position = 'absolute';
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  el.style.color = `var(${name})`;
  document.body.appendChild(el);

  const color = getComputedStyle(el).color?.trim();
  el.remove();

  return color || undefined;
}

/**
 * Resolve a non-color CSS var to its computed value (e.g. `--font-family`).
 * On the server (SSR), returns undefined.
 */
export function resolveCssVarValue(name: `--${string}`): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const v = readCssVar(name);
  return v || undefined;
}

let cachedChartPalette: string[] | undefined;

export function resolveChartColor(index: ChartColorIndex): string | undefined {
  return resolveCssColorVar(`--color-chart-${index}`);
}

/**
 * Get chart palette as array of computed color strings.
 * Cached after first client-side resolve.
 */
export function resolveChartPalette(): string[] {
  if (cachedChartPalette) return cachedChartPalette;
  const palette = ([1, 2, 3, 4, 5] as const)
    .map((i) => resolveChartColor(i))
    .filter((v): v is string => Boolean(v));
  cachedChartPalette = palette;
  return palette;
}

/**
 * Backwards-compatible name (previously returned hex palette).
 * Now returns computed color strings from CSS.
 */
export function getChartPalette(): string[] {
  return resolveChartPalette();
}

/**
 * Backwards-compatible name (previously returned hex).
 * Now returns computed color string from CSS (or undefined on SSR).
 */
export function getChartColor(index: ChartColorIndex): string | undefined {
  return resolveChartColor(index);
}

/**
 * Backwards-compatible name (previously returned hex).
 * Now returns computed color string from CSS (or undefined on SSR).
 */
export function getTrendColor(direction: TrendDirection): string | undefined {
  return resolveCssColorVar(`--color-trend-${direction}`);
}

/**
 * Generate area gradient color stops for ECharts.
 * Uses resolved chart color and produces rgba() stops.
 */
export function getAreaGradient(colorIndex: ChartColorIndex = 1) {
  const color = resolveChartColor(colorIndex);
  const { startOpacity, endOpacity } = chartConfig.gradient;

  if (!color) {
    return {
      type: 'linear' as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [],
    };
  }

  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: toRgba(color, startOpacity) },
      { offset: 1, color: toRgba(color, endOpacity) },
    ],
  };
}

function toRgba(color: string, alpha: number): string {
  // Already rgba(...)
  const rgbaMatch = color.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // rgb(...)
  const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // hex #rrggbb
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Fallback: don't attempt to parse other formats (e.g. hsl()).
  return color;
}
