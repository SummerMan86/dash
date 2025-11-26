/**
 * TypeScript токены для programmatic использования
 * Для UI компонентов используй Tailwind классы из tokens.css!
 * 
 * Используй ТОЛЬКО когда нужно:
 * - Программно вычислять цвета (charts, canvas)
 * - Inline styles с JS логикой
 * - Type safety для вариантов компонентов
 */

// ===== CSS Variable References =====
// Используй когда нужен runtime доступ через getComputedStyle
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
    destructive: {
      DEFAULT: 'var(--color-destructive)',
      hover: 'var(--color-destructive-hover)',
      active: 'var(--color-destructive-active)',
      foreground: 'var(--color-destructive-foreground)',
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
    chart: {
      1: 'var(--color-chart-1)',
      2: 'var(--color-chart-2)',
      3: 'var(--color-chart-3)',
      4: 'var(--color-chart-4)',
      5: 'var(--color-chart-5)',
    },
  } as const;
  
  // ===== Raw Color Values =====
  // Используй только для Canvas/WebGL где CSS переменные не работают
  export const semantic = {
    primary: {
      DEFAULT: '#0f62fe',
      hover: '#0043ce',
      active: '#002d9c',
      disabled: '#a8a8a8',
      foreground: '#ffffff',
    },
    secondary: {
      DEFAULT: '#393939',
      hover: '#262626',
      active: '#161616',
      disabled: '#c6c6c6',
      foreground: '#ffffff',
    },
    destructive: {
      DEFAULT: '#da1e28',
      hover: '#a2191f',
      active: '#750e13',
      foreground: '#ffffff',
    },
    success: {
      DEFAULT: '#198038',
      hover: '#0e6027',
      foreground: '#ffffff',
      muted: '#defbe6',
    },
    warning: {
      DEFAULT: '#f1c21b',
      hover: '#d2a106',
      foreground: '#161616',
      muted: '#fcf4d6',
    },
    error: {
      DEFAULT: '#da1e28',
      hover: '#a2191f',
      foreground: '#ffffff',
      muted: '#fff1f1',
    },
    info: {
      DEFAULT: '#4589ff',
      hover: '#0f62fe',
      foreground: '#ffffff',
      muted: '#edf5ff',
    },
    chart: {
      1: '#0f62fe',
      2: '#198038',
      3: '#f1c21b',
      4: '#da1e28',
      5: '#525252',
    },
  } as const;
  
  // ===== Type Exports =====
  export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'accent' | 'muted';
  export type StatusVariant = 'success' | 'warning' | 'error' | 'info';
  export type InteractiveState = 'DEFAULT' | 'hover' | 'active' | 'disabled';
  export type ChartColorIndex = 1 | 2 | 3 | 4 | 5;
  
  // ===== Helper Functions =====
  
  /**
   * Получить raw цвет по варианту (для Canvas/Charts)
   */
  export function getSemanticColor(
    variant: ButtonVariant | StatusVariant,
    state: InteractiveState = 'DEFAULT'
  ): string {
    const colorMap = { ...semantic.success, ...semantic.primary, ...semantic.secondary };
    return colorMap[state] || semantic.primary.DEFAULT;
  }
  
  /**
   * Получить CSS переменную по варианту (для inline styles)
   */
  export function getSemanticVar(
    variant: ButtonVariant | StatusVariant,
    state: InteractiveState = 'DEFAULT'
  ): string {
    return `var(--color-${variant}${state !== 'DEFAULT' ? '-' + state.toLowerCase() : ''})`;
  }