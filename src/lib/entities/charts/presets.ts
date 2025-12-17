/**
 * ECharts Presets
 * Pre-configured chart options following design system
 *
 * ⚠️ Все цвета берутся из semantic токенов!
 *
 * Usage:
 *   import { lineChartPreset, getLineSeries } from '$entities/charts';
 *
 *   const options = {
 *     ...lineChartPreset,
 *     xAxis: { ...lineChartPreset.xAxis, data: months },
 *     series: [{ ...getLineSeries(1), data: values }],
 *   };
 */

import { semantic, chartConfig, getAreaGradient, getChartPalette } from '$shared/styles/tokens';
import type { ChartColorIndex } from '$shared/styles/tokens';

// ========================================
// BASE STYLES
// ========================================

/** Axis styling — uses semantic tokens */
const axisStyle = {
  axisLine: {
    show: true,
    lineStyle: {
      color: semantic.border.DEFAULT,
    },
  },
  axisLabel: {
    fontSize: chartConfig.axisFontSize,
    color: semantic.muted.foreground,
  },
  axisTick: {
    show: false,
  },
  splitLine: {
    show: true,
    lineStyle: {
      type: chartConfig.gridDash,
      color: semantic.border.DEFAULT,
    },
  },
};

/** Tooltip styling — uses semantic tokens */
const tooltipStyle = {
  backgroundColor: semantic.tooltip.DEFAULT,
  borderColor: 'transparent',
  borderWidth: 0,
  textStyle: {
    color: semantic.tooltip.foreground,
    fontSize: 13,
  },
  padding: [8, 12],
  borderRadius: 8,
};

/** Grid padding */
const gridStyle = {
  top: 10,
  right: 10,
  bottom: 30,
  left: 50,
  containLabel: true,
};

// ========================================
// CHART PRESETS
// ========================================

/** Line/Area chart preset */
export const lineChartPreset = {
  grid: gridStyle,
  tooltip: {
    trigger: 'axis' as const,
    ...tooltipStyle,
  },
  xAxis: {
    type: 'category' as const,
    boundaryGap: false,
    ...axisStyle,
  },
  yAxis: {
    type: 'value' as const,
    ...axisStyle,
  },
};

/** Bar chart preset */
export const barChartPreset = {
  grid: gridStyle,
  tooltip: {
    trigger: 'item' as const,
    ...tooltipStyle,
  },
  xAxis: {
    type: 'category' as const,
    ...axisStyle,
  },
  yAxis: {
    type: 'value' as const,
    ...axisStyle,
  },
};

/** Pie/Donut chart preset */
export const pieChartPreset = {
  tooltip: {
    trigger: 'item' as const,
    ...tooltipStyle,
  },
  color: getChartPalette(),
};

// ========================================
// SERIES GENERATORS
// ========================================

/**
 * Get line series config with optional area fill
 */
export function getLineSeries(
  colorIndex: ChartColorIndex = 1,
  options?: { showArea?: boolean }
) {
  const { showArea = true } = options ?? {};
  const color = semantic.chart[colorIndex];

  return {
    type: 'line' as const,
    smooth: true,
    symbol: 'none',
    lineStyle: {
      width: 2,
      color,
    },
    itemStyle: {
      color,
    },
    ...(showArea && {
      areaStyle: {
        color: getAreaGradient(colorIndex),
      },
    }),
  };
}

/**
 * Get bar series config
 */
export function getBarSeries(colorIndex: ChartColorIndex = 1) {
  return {
    type: 'bar' as const,
    barMaxWidth: 40,
    itemStyle: {
      color: semantic.chart[colorIndex],
      borderRadius: [4, 4, 0, 0],
    },
  };
}

/**
 * Get pie series config
 */
export function getPieSeries(options?: {
  innerRadius?: string;
  outerRadius?: string;
}) {
  const { innerRadius = '0%', outerRadius = '70%' } = options ?? {};

  return {
    type: 'pie' as const,
    radius: [innerRadius, outerRadius],
    itemStyle: {
      borderColor: semantic.background.DEFAULT,  // white separator between slices
      borderWidth: 2,
    },
    label: {
      show: true,
      fontSize: 12,
      color: semantic.muted.foreground,
    },
  };
}

// ========================================
// RE-EXPORTS
// ========================================

export { getChartPalette, getAreaGradient } from '$shared/styles/tokens';
