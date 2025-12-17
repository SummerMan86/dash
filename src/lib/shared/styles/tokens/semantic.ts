/**
 * TypeScript Design Tokens
 *
 * Architecture:
 * - primitives: Internal hex lookup (MUST SYNC with tokens.css Level 1!)
 * - semanticVars: CSS var() strings for inline styles
 * - semantic: Raw hex values for Canvas/Charts (via primitives)
 *
 * WARNING: For UI components use Tailwind classes, NOT these tokens!
 */

// ========================================
// PRIMITIVES — SYNC WITH tokens.css!
// ========================================
// These values MUST match Level 1 in tokens.css
// Used ONLY within this file to build semantic values

const primitives = {
  blue: {
    10: '#edf5ff',
    20: '#d0e2ff',
    50: '#4589ff',
    60: '#0f62fe',
    70: '#0043ce',
    80: '#002d9c',
  },
  gray: {
    10: '#f4f4f4',
    20: '#e0e0e0',
    30: '#c6c6c6',
    40: '#a8a8a8',
    50: '#8d8d8d',
    60: '#6f6f6f',
    70: '#525252',
    80: '#393939',
    90: '#262626',
    100: '#161616',
  },
  red: {
    10: '#fff1f1',
    60: '#da1e28',
    70: '#a2191f',
    80: '#750e13',
  },
  green: {
    10: '#defbe6',
    40: '#42be65',
    50: '#24a148',
    60: '#198038',
    70: '#0e6027',
    80: '#044317',
  },
  yellow: {
    10: '#fcf4d6',
    30: '#f1c21b',
    40: '#d2a106',
    70: '#684e00',
  },
  teal: {
    10: '#d9fbfb',
    50: '#009d9a',
    60: '#007d79',
    70: '#005d5d',
  },
  white: '#ffffff',
  transparent: 'transparent',
} as const;

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
// RAW COLOR VALUES
// ========================================
// For Canvas/WebGL/Chart libraries where CSS vars don't work
// All values come from primitives!

export const semantic = {
  primary: {
    DEFAULT: primitives.blue[60],
    hover: primitives.blue[70],
    active: primitives.blue[80],
    disabled: primitives.gray[40],
    foreground: primitives.white,
  },
  secondary: {
    DEFAULT: primitives.gray[80],
    hover: primitives.gray[90],
    active: primitives.gray[100],
    disabled: primitives.gray[30],
    foreground: primitives.white,
  },
  accent: {
    DEFAULT: primitives.teal[50],
    hover: primitives.teal[60],
    active: primitives.teal[70],
    foreground: primitives.white,
  },
  destructive: {
    DEFAULT: primitives.red[60],
    hover: primitives.red[70],
    active: primitives.red[80],
    foreground: primitives.white,
  },
  outline: {
    DEFAULT: primitives.transparent,
    hover: primitives.blue[10],
    active: primitives.blue[20],
    border: primitives.blue[60],
    foreground: primitives.blue[60],
  },
  ghost: {
    DEFAULT: primitives.transparent,
    hover: primitives.gray[10],
    active: primitives.gray[20],
    foreground: primitives.gray[100],
  },
  link: {
    DEFAULT: primitives.transparent,
    hover: primitives.transparent,
    foreground: primitives.blue[60],
    hoverForeground: primitives.blue[70],
  },
  muted: {
    DEFAULT: primitives.gray[10],
    hover: primitives.gray[20],
    foreground: primitives.gray[70],
  },
  success: {
    DEFAULT: primitives.green[60],
    hover: primitives.green[70],
    foreground: primitives.white,
    muted: primitives.green[10],
    mutedForeground: primitives.green[80],
  },
  warning: {
    DEFAULT: primitives.yellow[30],
    hover: primitives.yellow[40],
    foreground: primitives.gray[100],
    muted: primitives.yellow[10],
    mutedForeground: primitives.yellow[70],
  },
  error: {
    DEFAULT: primitives.red[60],
    hover: primitives.red[70],
    foreground: primitives.white,
    muted: primitives.red[10],
    mutedForeground: primitives.red[80],
  },
  info: {
    DEFAULT: primitives.blue[50],
    hover: primitives.blue[60],
    foreground: primitives.white,
    muted: primitives.blue[10],
    mutedForeground: primitives.blue[80],
  },
  border: {
    DEFAULT: primitives.gray[30],
    hover: primitives.gray[40],
    focus: primitives.blue[60],
  },
  trend: {
    up: primitives.green[50],      // Carbon green-50 for consistency
    down: primitives.red[60],
    neutral: primitives.gray[50],
  },
  tooltip: {
    DEFAULT: primitives.gray[90],
    foreground: primitives.white,
  },
  background: {
    DEFAULT: primitives.white,
    foreground: primitives.gray[100],
  },
  chart: {
    1: primitives.teal[50],
    2: primitives.teal[70],
    3: primitives.green[50],       // Carbon green-50 (unified)
    4: primitives.yellow[30],
    5: primitives.gray[60],
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
 * Get chart color by index
 */
export function getChartColor(index: ChartColorIndex): string {
  return semantic.chart[index];
}

/**
 * Get all chart colors as array
 */
export function getChartPalette(): string[] {
  return [
    semantic.chart[1],
    semantic.chart[2],
    semantic.chart[3],
    semantic.chart[4],
    semantic.chart[5],
  ];
}

/**
 * Get trend color by direction
 */
export function getTrendColor(direction: TrendDirection): string {
  return semantic.trend[direction];
}

/**
 * Generate area gradient color stops for ECharts
 */
export function getAreaGradient(colorIndex: ChartColorIndex = 1) {
  const color = semantic.chart[colorIndex];
  const { startOpacity, endOpacity } = chartConfig.gradient;

  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: hexToRgba(color, startOpacity) },
      { offset: 1, color: hexToRgba(color, endOpacity) },
    ],
  };
}

/**
 * Convert hex to rgba string
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
