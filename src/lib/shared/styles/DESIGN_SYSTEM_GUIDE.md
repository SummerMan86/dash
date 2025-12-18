# Design System AI Guide

> Quick reference for AI code generation. Carbon Design System + Tailwind 4 + shadcn/ui patterns.

---

## Architecture (2 Levels)

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 1: Primitives (tokens.css)                            │
│ Raw hex values — single source of truth                     │
│ Example: --color-teal-50: #009d9a                          │
├─────────────────────────────────────────────────────────────┤
│ LEVEL 2: Semantic CSS (tokens.css)                          │
│ CSS var() references to primitives                          │
│ Example: --color-chart-1: var(--color-teal-50)             │
└─────────────────────────────────────────────────────────────┘
```

### Usage Rules

| Context                | Source                                       | Example                                                                   |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Svelte templates       | Tailwind classes                             | `class="bg-primary text-muted-foreground"`                                |
| Chart configs (JS/TS)  | `getChartPalette()` / `resolveCssColorVar()` | `color: getChartPalette()[0]`                                             |
| Inline styles (rare)   | `semanticVars.*`                             | `style="color: {semanticVars.trend.up}"`                                  |
| Canvas/WebGL / ECharts | `resolveCssColorVar()`                       | `ctx.fillStyle = resolveCssColorVar('--color-primary') ?? 'currentColor'` |

**FORBIDDEN:** Hardcoded hex in components/configs

---

## Project Structure

```
src/
├── app.css                          ← Entry: @import tokens.css
├── lib/
│   ├── shared/
│   │   ├── styles/
│   │   │   ├── tokens/
│   │   │   │   ├── tokens.css       ← Tailwind 4 @theme (primitives + semantic)
│   │   │   │   ├── semantic.ts      ← TS thin wrapper (semanticVars + resolve*)
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       ├── cn.ts            ← clsx + tailwind-merge
│   │   │       └── index.ts
│   │   ├── ui/                      ← UI Components
│   │   │   ├── button/
│   │   │   ├── card/
│   │   │   ├── chart/
│   │   │   ├── stat-card/           ← KPI card with trends
│   │   │   ├── chart-card/          ← Chart container
│   │   │   ├── skeleton/            ← Loading placeholder
│   │   │   └── ...
│   │   └── utils/
│   │       ├── format.ts            ← Number/currency formatting
│   │       └── index.ts
│   └── entities/
│       └── charts/
│           ├── presets.ts           ← Compat re-export (real presets live in shared)
│           └── index.ts
```

---

## Import Paths

```typescript
// CSS tokens (in app.css - already configured)
@import './lib/shared/styles/tokens/tokens.css';

// TypeScript tokens (for Canvas/Charts only)
import { semanticVars, getChartPalette, resolveCssColorVar } from '$shared/styles/tokens';
import type { TrendDirection, ChartColorIndex } from '$shared/styles/tokens';

// UI Components
import { StatCard } from '$shared/ui/stat-card';
import { ChartCard } from '$shared/ui/chart-card';
import { Skeleton } from '$shared/ui/skeleton';

// Utilities
import { formatCurrency, formatCompact, formatPercent } from '$shared/utils';

// Chart presets
import { lineChartPreset, getLineSeries, getBarSeries } from '$entities/charts';
```

---

## Color Reference

### Action Colors (Tailwind)

```svelte
<!-- Primary = Carbon blue-60 -->
bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground

<!-- Secondary = Carbon gray-80 -->
bg-secondary hover:bg-secondary-hover text-secondary-foreground

<!-- Accent = Teal-50 -->
bg-accent hover:bg-accent-hover text-accent-foreground

<!-- Destructive = Carbon red-60 -->
bg-destructive hover:bg-destructive-hover text-destructive-foreground

<!-- Muted -->
bg-muted hover:bg-muted-hover text-muted-foreground
```

### Button Variants

```svelte
<!-- Default (Primary) -->
bg-primary hover:bg-primary-hover text-primary-foreground

<!-- Secondary -->
bg-secondary hover:bg-secondary-hover text-secondary-foreground

<!-- Destructive -->
bg-destructive hover:bg-destructive-hover text-destructive-foreground

<!-- Outline — transparent bg, primary border (filters, secondary actions) -->
bg-outline hover:bg-outline-hover border-outline-border text-outline-foreground

<!-- Ghost — transparent, subtle hover (toolbars, icon buttons) -->
bg-ghost hover:bg-ghost-hover text-ghost-foreground

<!-- Link — text link style (navigation, inline links) -->
bg-link text-link-foreground hover:text-link-hover-foreground underline-offset-4 hover:underline
```

### Status Colors

```svelte
<!-- Success/Warning/Error/Info -->
bg-success text-success-foreground bg-warning text-warning-foreground bg-error text-error-foreground
bg-info text-info-foreground

<!-- Muted variants (backgrounds) -->
bg-success-muted text-success-muted-foreground bg-warning-muted text-warning-muted-foreground bg-error-muted
text-error-muted-foreground bg-info-muted text-info-muted-foreground
```

### Trend Indicators

```svelte
<!-- For KPI trends -->
text-trend-up <!-- #24a148 (Carbon green-50) - positive -->
text-trend-down <!-- #da1e28 (Carbon red-60) - negative -->
text-trend-neutral <!-- #8d8d8d (Carbon gray-50) - no change -->
```

### Chart Colors (Teal Palette)

```svelte
<!-- Use in Tailwind -->
bg-chart-1 <!-- #009d9a (teal-50, primary) -->
bg-chart-2 <!-- #005d5d (teal-70, dark) -->
bg-chart-3 <!-- #24a148 (Carbon green-50) -->
bg-chart-4 <!-- #f1c21b (yellow-30) -->
bg-chart-5 <!-- #6f6f6f (gray-60) -->

<!-- Use in JS for ECharts -->
import {getChartPalette} from '$shared/styles/tokens'; const colors = getChartPalette(); // computed
colors from CSS (e.g. ['rgb(...)', ...])
```

### Surfaces

```svelte
bg-background text-foreground bg-card hover:bg-card-hover text-card-foreground border-card-border
bg-popover text-popover-foreground border-popover-border bg-sidebar hover:bg-sidebar-hover
text-sidebar-foreground bg-tooltip text-tooltip-foreground
```

### Borders

```svelte
border-border hover:border-border-hover focus:border-border-focus border-input
hover:border-input-hover focus:border-input-focus focus:ring-2 focus:ring-ring
```

---

## Components

### StatCard

KPI card with value and trend indicator.

```svelte
<script lang="ts">
	import { StatCard } from '$shared/ui/stat-card';
	import { formatCurrency, formatCompact } from '$shared/utils';
</script>

<StatCard
	label="Total Revenue"
	value={formatCurrency(448200000)}
	trend={12.4}
	trendLabel="vs last month"
/>

<StatCard label="Transactions" value={formatCompact(687421)} trend={-2.1} />

<!-- Loading state -->
<StatCard label="Loading..." value="" loading />
```

### ChartCard

Container for charts with header and metadata.

```svelte
<script lang="ts">
	import { ChartCard } from '$shared/ui/chart-card';
	import { Chart } from '$shared/ui/chart';
</script>

<ChartCard title="Transaction Volume" subtitle="Monthly trend analysis" updatedAt="Dec 2024">
	<Chart options={chartOptions} />
</ChartCard>

<!-- Loading state -->
<ChartCard title="Loading..." loading />
```

### Skeleton

Loading placeholder with pulse animation.

```svelte
<script lang="ts">
	import { Skeleton } from '$shared/ui/skeleton';
</script>

<Skeleton class="h-8 w-32" />
<Skeleton class="h-4 w-full" />
<Skeleton class="h-72 w-full" />
<!-- Chart placeholder -->
```

---

## Format Utilities

```typescript
import {
	formatNumber,
	formatCompact,
	formatCurrency,
	formatPercent,
	formatTrend,
	formatDate
} from '$shared/utils';

// Numbers
formatNumber(1234567); // "1,234,567"
formatCompact(1234567); // "1.2M"
formatCompact(1234567, 2); // "1.23M"

// Currency
formatCurrency(448200000); // "€448.2M" (default EUR, compact)
formatCurrency(1234, { currency: 'USD' }); // "$1.2K"
formatCurrency(1234, { compact: false }); // "€1,234.00"

// Percent
formatPercent(12.4); // "+12.4%"
formatPercent(-5.2); // "-5.2%"
formatPercent(12.4, { showSign: false }); // "12.4%"

// Trend (returns direction for styling)
formatTrend(12.4); // { label: "+12.4%", direction: "up" }
formatTrend(-5.2); // { label: "-5.2%", direction: "down" }

// Date
formatDate(new Date()); // "Dec 2024"
formatDate(new Date(), { day: 'numeric' }); // "Dec 16, 2024"
```

---

## Chart Presets

### Basic Usage

```typescript
import {
	lineChartPreset,
	barChartPreset,
	pieChartPreset,
	getLineSeries,
	getBarSeries,
	getPieSeries
} from '$entities/charts';

// Line/Area Chart
const lineOptions = {
	...lineChartPreset,
	xAxis: { ...lineChartPreset.xAxis, data: ['Jan', 'Feb', 'Mar'] },
	series: [
		{ ...getLineSeries(1), data: [100, 200, 150] } // teal with gradient
	]
};

// Bar Chart
const barOptions = {
	...barChartPreset,
	xAxis: { ...barChartPreset.xAxis, data: ['A', 'B', 'C'] },
	series: [{ ...getBarSeries(1), data: [100, 200, 150] }]
};

// Pie/Donut Chart
const pieOptions = {
	...pieChartPreset,
	series: [
		{
			...getPieSeries({ innerRadius: '50%' }), // donut
			data: [
				{ name: 'A', value: 100 },
				{ name: 'B', value: 200 }
			]
		}
	]
};
```

### Series Functions

```typescript
// Line with area gradient (default)
getLineSeries(1); // Chart color 1, with area
getLineSeries(2, { showArea: false }); // Chart color 2, line only

// Bar
getBarSeries(1); // Chart color 1, rounded top corners

// Pie
getPieSeries(); // Standard pie
getPieSeries({ innerRadius: '50%' }); // Donut
```

### Color Helpers

```typescript
import { getChartColor, getChartPalette, getAreaGradient } from '$entities/charts';

getChartColor(1); // '#009d9a' (teal)
getChartPalette(); // ['#009d9a', '#005d5d', '#24a148', '#f1c21b', '#6f6f6f']
getAreaGradient(1); // ECharts gradient config for area fill
```

---

## TypeScript Types

```typescript
import type {
	ButtonVariant, // 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
	ButtonSize, // 'default' | 'sm' | 'lg' | 'icon'
	StatusVariant, // 'success' | 'warning' | 'error' | 'info'
	TrendDirection, // 'up' | 'down' | 'neutral'
	ChartColorIndex // 1 | 2 | 3 | 4 | 5
} from '$shared/styles/tokens';
```

---

## cn() Utility (Critical!)

Always use for class composition in components:

```typescript
import { cn } from '$shared/styles/utils';

// Resolves Tailwind conflicts
cn('px-2', 'px-4')  // => 'px-4' (last wins)

// Conditional classes
cn('base', { 'active': isActive, 'disabled': !isActive })

// In components
<button class={cn('px-4 py-2 bg-primary', className)}>
```

---

## DO / DON'T

### DO

```svelte
<!-- Use semantic tokens -->
<button class="bg-primary text-primary-foreground">OK</button>

<!-- Use trend colors -->
<span class="text-trend-up">+12.4%</span>

<!-- Use chart presets -->
const options = { ...lineChartPreset, series: [getLineSeries(1)] };

<!-- Use format utilities -->
<span>{formatCurrency(1234567)}</span>

<!-- Use components -->
<StatCard label="Revenue" value={formatCurrency(100000)} trend={5.2} />

<!-- Use button variants -->
<Button variant="outline">Filter</Button>
<Button variant="ghost"><Icon /></Button>
<Button variant="link">Learn more</Button>
```

### DON'T

```svelte
<!-- Hardcoded colors -->
<button class="bg-[#0f62fe]">Wrong</button>
<button style="background: #0f62fe">Wrong</button>

<!-- Manual trend styling -->
<span class="text-green-500">Wrong</span>
<!-- Use text-trend-up -->

<!-- Manual chart config -->
color: '#009d9a' <!-- Use getChartPalette()[0] (resolved from CSS vars) -->

<!-- Manual number formatting -->
{(value / 1000000).toFixed(1)}M <!-- Use formatCompact(value) -->
```

---

## Dashboard Page Pattern

```svelte
<script lang="ts">
	import { StatCard } from '$shared/ui/stat-card';
	import { ChartCard } from '$shared/ui/chart-card';
	import { Chart } from '$shared/ui/chart';
	import { formatCurrency, formatCompact } from '$shared/utils';
	import { lineChartPreset, getLineSeries } from '$entities/charts';
</script>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<!-- Header -->
	<header class="mb-8">
		<h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
		<p class="text-sm text-muted-foreground">Analytics overview</p>
	</header>

	<!-- KPI Cards -->
	<section class="mb-8">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard label="Revenue" value={formatCurrency(100000)} trend={8.4} />
			<StatCard label="Users" value={formatCompact(12500)} trend={-2.1} />
		</div>
	</section>

	<!-- Charts -->
	<section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<ChartCard title="Trend" subtitle="Last 7 days">
			<Chart options={chartOptions} />
		</ChartCard>
	</section>
</div>
```

---

## AI Checklist

Before generating code:

- [ ] Semantic tokens used (not hardcoded colors)
- [ ] Teal palette for charts (`--color-chart-1..5` in CSS, resolved via `getChartPalette()`)
- [ ] Trend colors for KPIs (`text-trend-up/down/neutral`)
- [ ] Format utilities for numbers (`formatCurrency`, `formatCompact`)
- [ ] Chart presets used (`lineChartPreset`, `getLineSeries`)
- [ ] StatCard for KPIs, ChartCard for charts
- [ ] Interactive states (hover/active/disabled)
- [ ] Button variants match use case (outline for filters, ghost for icons, link for navigation)
- [ ] `cn()` for class composition
- [ ] TypeScript types for variants

---

**Last updated**: December 2025
**Tech stack**: SvelteKit 2 + Svelte 5 + Tailwind 4 + Carbon Design System
