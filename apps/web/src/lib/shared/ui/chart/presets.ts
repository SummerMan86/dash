/**
 * ECharts Presets (shared)
 * Pre-configured chart options following the CSS-first design system.
 *
 * Colors are resolved from CSS vars at runtime on the client.
 * On SSR, resolvers return undefined and ECharts defaults are used.
 */

import type { ChartColorIndex } from '$shared/styles/tokens';
import {
	chartConfig,
	getAreaGradient,
	getChartPalette,
	resolveCssColorVar
} from '$shared/styles/tokens';

// ========================================
// BASE STYLES
// ========================================

/** Axis styling — uses resolved CSS tokens */
const axisStyle = {
	axisLine: {
		show: true,
		lineStyle: {
			color: resolveCssColorVar('--color-border')
		}
	},
	axisLabel: {
		fontSize: chartConfig.axisFontSize,
		color: resolveCssColorVar('--color-muted-foreground')
	},
	axisTick: {
		show: false
	},
	splitLine: {
		show: true,
		lineStyle: {
			type: chartConfig.gridDash,
			color: resolveCssColorVar('--color-border')
		}
	}
};

/** Tooltip styling — uses resolved CSS tokens */
const tooltipStyle = {
	backgroundColor: resolveCssColorVar('--color-tooltip'),
	borderColor: 'transparent',
	borderWidth: 0,
	textStyle: {
		color: resolveCssColorVar('--color-tooltip-foreground'),
		fontSize: 13
	},
	padding: [8, 12],
	borderRadius: 8
};

/** Grid padding */
const gridStyle = {
	top: 10,
	right: 10,
	bottom: 30,
	left: 50,
	containLabel: true
};

// ========================================
// CHART PRESETS
// ========================================

/** Line/Area chart preset */
export const lineChartPreset = {
	grid: gridStyle,
	tooltip: {
		trigger: 'axis' as const,
		...tooltipStyle
	},
	xAxis: {
		type: 'category' as const,
		boundaryGap: false,
		...axisStyle
	},
	yAxis: {
		type: 'value' as const,
		...axisStyle
	}
};

/** Bar chart preset */
export const barChartPreset = {
	grid: gridStyle,
	tooltip: {
		trigger: 'item' as const,
		...tooltipStyle
	},
	xAxis: {
		type: 'category' as const,
		...axisStyle
	},
	yAxis: {
		type: 'value' as const,
		...axisStyle
	}
};

/** Pie/Donut chart preset */
export const pieChartPreset = {
	tooltip: {
		trigger: 'item' as const,
		...tooltipStyle
	},
	color: getChartPalette()
};

// ========================================
// SERIES GENERATORS
// ========================================

/**
 * Get line series config with optional area fill
 */
export function getLineSeries(colorIndex: ChartColorIndex = 1, options?: { showArea?: boolean }) {
	const { showArea = true } = options ?? {};
	const color = resolveCssColorVar(`--color-chart-${colorIndex}`);

	return {
		type: 'line' as const,
		smooth: true,
		symbol: 'none',
		lineStyle: {
			width: 2,
			color
		},
		itemStyle: {
			color
		},
		...(showArea && {
			areaStyle: {
				color: getAreaGradient(colorIndex)
			}
		})
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
			color: resolveCssColorVar(`--color-chart-${colorIndex}`),
			borderRadius: [4, 4, 0, 0]
		}
	};
}

/**
 * Get pie series config
 */
export function getPieSeries(options?: { innerRadius?: string; outerRadius?: string }) {
	const { innerRadius = '0%', outerRadius = '70%' } = options ?? {};

	return {
		type: 'pie' as const,
		radius: [innerRadius, outerRadius],
		itemStyle: {
			borderColor: resolveCssColorVar('--color-background'),
			borderWidth: 2
		},
		label: {
			show: true,
			fontSize: 12,
			color: resolveCssColorVar('--color-muted-foreground')
		}
	};
}

// ========================================
// STRATEGY / ANALYTICS PRESETS
// ========================================

/** Radar / spider chart preset */
export const radarChartPreset = {
	tooltip: {
		...tooltipStyle
	},
	color: getChartPalette(),
	radar: {
		indicator: [] as { name: string; max?: number }[],
		shape: 'polygon' as const,
		splitNumber: 4,
		axisName: {
			color: resolveCssColorVar('--color-muted-foreground'),
			fontSize: chartConfig.axisFontSize
		},
		splitLine: {
			lineStyle: {
				color: resolveCssColorVar('--color-border'),
				type: chartConfig.gridDash
			}
		},
		splitArea: {
			show: false
		},
		axisLine: {
			lineStyle: {
				color: resolveCssColorVar('--color-border')
			}
		}
	}
};

/**
 * Get radar series config
 */
export function getRadarSeries(colorIndex: ChartColorIndex = 1) {
	const color = resolveCssColorVar(`--color-chart-${colorIndex}`);
	return {
		type: 'radar' as const,
		symbol: 'circle',
		symbolSize: 6,
		lineStyle: {
			width: 2,
			color
		},
		itemStyle: {
			color
		},
		areaStyle: {
			color,
			opacity: 0.15
		}
	};
}

/** ECharts gauge preset (single value dial) */
export function getGaugePreset(options?: { min?: number; max?: number; splitNumber?: number }) {
	const { min = 0, max = 100, splitNumber = 5 } = options ?? {};
	const palette = getChartPalette();

	return {
		tooltip: tooltipStyle,
		series: [
			{
				type: 'gauge' as const,
				min,
				max,
				splitNumber,
				progress: {
					show: true,
					width: 14,
					roundCap: true,
					itemStyle: {
						color: palette[0]
					}
				},
				axisLine: {
					lineStyle: {
						width: 14,
						color: [[1, resolveCssColorVar('--color-muted') ?? '#f4f4f4']]
					},
					roundCap: true
				},
				axisTick: { show: false },
				splitLine: {
					length: 8,
					lineStyle: {
						width: 2,
						color: resolveCssColorVar('--color-border')
					}
				},
				axisLabel: {
					distance: 20,
					fontSize: chartConfig.axisFontSize,
					color: resolveCssColorVar('--color-muted-foreground')
				},
				pointer: { show: false },
				title: {
					fontSize: 12,
					color: resolveCssColorVar('--color-muted-foreground'),
					offsetCenter: [0, '70%']
				},
				detail: {
					fontSize: 24,
					fontWeight: 600,
					color: resolveCssColorVar('--color-foreground'),
					offsetCenter: [0, '40%'],
					formatter: '{value}%'
				}
			}
		]
	};
}

/** Heatmap chart preset */
export const heatmapChartPreset = {
	grid: { ...gridStyle, right: 80 },
	tooltip: {
		...tooltipStyle,
		position: 'top' as const
	},
	xAxis: {
		type: 'category' as const,
		...axisStyle,
		splitArea: { show: true }
	},
	yAxis: {
		type: 'category' as const,
		...axisStyle,
		splitArea: { show: true }
	},
	visualMap: {
		min: 0,
		max: 100,
		calculable: true,
		orient: 'vertical' as const,
		right: 0,
		top: 'center',
		inRange: {
			color: [
				resolveCssColorVar('--color-teal-10') ?? '#d9fbfb',
				resolveCssColorVar('--color-teal-30') ?? '#3ddbd9',
				resolveCssColorVar('--color-teal-50') ?? '#009d9a',
				resolveCssColorVar('--color-teal-70') ?? '#005d5d'
			]
		},
		textStyle: {
			color: resolveCssColorVar('--color-muted-foreground'),
			fontSize: chartConfig.axisFontSize
		}
	}
};

/**
 * Get waterfall series config (positive/negative/total stacked bars)
 *
 * Usage:
 *   const { transparent, positive, negative } = getWaterfallSeries(data);
 *   options.series = [transparent, positive, negative];
 *
 * data: Array<{ name: string; value: number; isTotal?: boolean }>
 */
export function getWaterfallSeries(data: { name: string; value: number; isTotal?: boolean }[]) {
	const positiveColor = resolveCssColorVar('--color-success') ?? '#198038';
	const negativeColor = resolveCssColorVar('--color-error') ?? '#da1e28';
	const totalColor = resolveCssColorVar('--color-chart-1') ?? '#009d9a';

	const transparentData: number[] = [];
	const positiveData: (number | '-')[] = [];
	const negativeData: (number | '-')[] = [];

	let running = 0;
	for (const item of data) {
		if (item.isTotal) {
			transparentData.push(0);
			positiveData.push(running);
			negativeData.push('-');
		} else if (item.value >= 0) {
			transparentData.push(running);
			positiveData.push(item.value);
			negativeData.push('-');
			running += item.value;
		} else {
			running += item.value;
			transparentData.push(running);
			positiveData.push('-');
			negativeData.push(Math.abs(item.value));
		}
	}

	return {
		categories: data.map((d) => d.name),
		transparent: {
			type: 'bar' as const,
			stack: 'waterfall',
			itemStyle: { color: 'transparent' },
			emphasis: { itemStyle: { color: 'transparent' } },
			data: transparentData
		},
		positive: {
			type: 'bar' as const,
			stack: 'waterfall',
			name: 'Рост',
			itemStyle: {
				color: positiveColor,
				borderRadius: [4, 4, 0, 0]
			},
			data: positiveData.map((v, i) => ({
				value: v,
				itemStyle: data[i].isTotal ? { color: totalColor } : undefined
			}))
		},
		negative: {
			type: 'bar' as const,
			stack: 'waterfall',
			name: 'Снижение',
			itemStyle: {
				color: negativeColor,
				borderRadius: [4, 4, 0, 0]
			},
			data: negativeData
		}
	};
}

// ========================================
// RE-EXPORTS
// ========================================

export { getChartPalette, getAreaGradient } from '$shared/styles/tokens';
