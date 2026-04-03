# Design System Guide

> Carbon Design System + Tailwind 4 + shadcn/ui patterns.
> Single source of truth for UI generation. Locale: `ru-RU`, currency: `RUB`.

---

## Quick Reference

### Imports

```typescript
// UI Components
import { StatCard } from '$shared/ui/stat-card';
import { MetricCard } from '$shared/ui/metric-card';
import { ChartCard } from '$shared/ui/chart-card';
import { DataTable } from '$shared/ui/data-table';
import { ProgressBar } from '$shared/ui/progress-bar';
import { ProgressCircle } from '$shared/ui/progress-circle';
import { Badge } from '$shared/ui/badge';
import { Sparkline } from '$shared/ui/sparkline';
import { Skeleton } from '$shared/ui/skeleton';
import { Button } from '$shared/ui/button';
import { Input } from '$shared/ui/input';
import { Select } from '$shared/ui/select';

// Utilities
import {
	formatCurrency,
	formatCompact,
	formatPercent,
	formatNumber,
	formatTrend,
	formatDate,
	formatRating,
	truncate
} from '$shared/utils';
import { cn } from '$shared/styles/utils';

// Chart presets (basic)
import {
	lineChartPreset,
	barChartPreset,
	pieChartPreset,
	getLineSeries,
	getBarSeries,
	getPieSeries
} from '$entities/charts';

// Chart presets (strategy / analytics)
import {
	radarChartPreset,
	getRadarSeries,
	getGaugePreset,
	heatmapChartPreset,
	getWaterfallSeries
} from '$shared/ui/chart/presets';

// Tokens (Canvas/Charts only)
import {
	semanticVars,
	getChartPalette,
	getChartColor,
	resolveCssColorVar
} from '$shared/styles/tokens';
import type {
	TrendDirection,
	ChartColorIndex,
	ButtonVariant,
	ButtonSize,
	StatusVariant
} from '$shared/styles/tokens';
```

### Color Tokens (Tailwind classes)

```svelte
<!-- Actions -->
bg-primary hover:bg-primary-hover text-primary-foreground <!-- Blue -->
bg-secondary hover:bg-secondary-hover text-secondary-foreground <!-- Gray -->
bg-accent hover:bg-accent-hover text-accent-foreground <!-- Teal -->
bg-destructive hover:bg-destructive-hover text-destructive-foreground <!-- Red -->
bg-muted hover:bg-muted-hover text-muted-foreground

<!-- Button variants -->
bg-outline hover:bg-outline-hover border-outline-border text-outline-foreground <!-- Outline -->
bg-ghost hover:bg-ghost-hover text-ghost-foreground <!-- Ghost -->
bg-link text-link-foreground hover:text-link-hover-foreground <!-- Link -->

<!-- Trends -->
text-trend-up <!-- Carbon green-50 -->
text-trend-down <!-- Carbon red-60 -->
text-trend-neutral <!-- Carbon gray-50 -->

<!-- Charts (Teal Palette) -->
bg-chart-1 bg-chart-2 bg-chart-3 bg-chart-4 bg-chart-5

<!-- Status -->
bg-success / bg-success-muted text-success-muted-foreground bg-warning / bg-warning-muted text-warning-muted-foreground
bg-error / bg-error-muted text-error-muted-foreground bg-info / bg-info-muted text-info-muted-foreground

<!-- Surfaces -->
bg-background text-foreground bg-card hover:bg-card-hover text-card-foreground border-card-border bg-sidebar
text-sidebar-foreground border-sidebar-border
```

### Typography Roles

```svelte
type-page-title <!-- page H1 -->
type-section-title <!-- card / section headings -->
type-card-title <!-- compact chart/card titles -->
type-body-sm <!-- secondary body text -->
type-caption <!-- helper / meta text -->
type-caption-strong <!-- emphasized caption -->
type-overline <!-- uppercase labels, KPI labels -->
type-control <!-- buttons / inputs / selects -->
type-control-lg <!-- large buttons -->
type-badge <!-- badges / pills / meta chips -->
type-nav-item <!-- sidebar items -->
type-kpi-value <!-- KPI numbers -->
```

### DO / DON'T

```svelte
<!-- DO -->
<h1 class="type-page-title text-foreground">Аналитика</h1>
<span class="text-trend-up">+12.4%</span>
<StatCard label="Выручка" value={formatCurrency(100000)} trend={5.2} />
<Button variant="outline">Фильтр</Button>
series: [{ ...getLineSeries(1), data }]

<!-- DON'T -->
<h1 class="text-2xl font-semibold tracking-tight">...</h1>  <!-- Use type-page-title -->
<span class="text-green-500">+12.4%</span>                   <!-- Use text-trend-up -->
color: '#009d9a'                                              <!-- Use getChartPalette()[0] -->
{(value / 1000000).toFixed(1)}M                               <!-- Use formatCompact(value) -->
<button class="bg-[#0f62fe]">...</button>                     <!-- Use bg-primary -->
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 1: Primitives (tokens.css)                            │
│ Raw values for color / spacing / typography                 │
│ Example: --color-teal-50, --font-size-sm, --font-weight-500 │
├─────────────────────────────────────────────────────────────┤
│ LEVEL 2: Semantic tokens (tokens.css)                       │
│ Role-based tokens built on primitives                       │
│ Example: --color-chart-1, --type-card-title-size           │
├─────────────────────────────────────────────────────────────┤
│ LEVEL 3: Usage layer (Tailwind + semantic utility classes)  │
│ Components consume semantic names, not raw primitives       │
│ Example: bg-primary, text-muted-foreground, type-card-title │
└─────────────────────────────────────────────────────────────┘
```

### Usage Rules

| Context                 | Source                                       | Example                                                                   |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Svelte templates        | Tailwind classes                             | `class="bg-primary text-muted-foreground"`                                |
| Chart configs (JS/TS)   | `getChartPalette()` / `resolveCssColorVar()` | `color: getChartPalette()[0]`                                             |
| Inline styles (rare)    | `semanticVars.*`                             | `style="color: {semanticVars.trend.up}"`                                  |
| Canvas/WebGL / ECharts  | `resolveCssColorVar()`                       | `ctx.fillStyle = resolveCssColorVar('--color-primary') ?? 'currentColor'` |
| Typography in templates | semantic classes                             | `class="type-page-title text-foreground"`                                 |

**FORBIDDEN:** Hardcoded hex in components/configs
**FORBIDDEN:** Ad-hoc typography drift in shared primitives when a `type-*` semantic role already exists

### Project Structure

```
src/
├── app.css                          ← Entry: @import tokens.css + type-* classes
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
│   │   │   ├── badge/               ← Status labels
│   │   │   ├── button/
│   │   │   ├── card/
│   │   │   ├── chart/               ← ECharts wrapper + presets
│   │   │   ├── chart-card/          ← Chart container
│   │   │   ├── data-table/          ← Sortable table
│   │   │   ├── input/
│   │   │   ├── metric-card/         ← Plan/fact KPI card
│   │   │   ├── progress-bar/
│   │   │   ├── progress-circle/     ← Radial gauge
│   │   │   ├── select/
│   │   │   ├── sidebar/
│   │   │   ├── skeleton/            ← Loading placeholder
│   │   │   ├── sparkline/           ← SVG trend line
│   │   │   └── stat-card/           ← KPI card with trends
│   │   └── utils/
│   │       ├── format.ts            ← Number/currency formatting
│   │       └── index.ts
│   └── entities/
│       └── charts/
│           ├── presets.ts           ← Compat re-export (real presets in shared/ui/chart)
│           └── index.ts
```

---

## Color Reference

### Action Colors

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

**Rule (badges / pills):** For status labels in tables/cards (e.g. "Дефицит/Риск/Норма"), prefer the `<Badge>` component over manual classes. If inline markup is needed, use semantic muted tokens:

```svelte
class="inline-flex items-center rounded-full border border-error/20 bg-error-muted px-2 py-0.5
text-xs font-medium text-error"
```

Avoid ad-hoc Tailwind palette colors like `text-red-600 bg-red-50 dark:bg-red-950` — they drift from the design system.

### Trend Indicators

```svelte
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
import {getChartPalette} from '$shared/styles/tokens'; const colors = getChartPalette(); // resolved
from CSS vars, e.g. ['rgb(0, 157, 154)', ...]
```

### Surfaces

```svelte
bg-background text-foreground bg-card hover:bg-card-hover text-card-foreground border-card-border
bg-popover text-popover-foreground border-popover-border bg-tooltip text-tooltip-foreground
```

### Sidebar

```svelte
bg-sidebar text-sidebar-foreground border-sidebar-border hover:bg-sidebar-hover bg-sidebar-active
text-sidebar-muted
```

### Borders

```svelte
border-border hover:border-border-hover focus:border-border-focus border-input
hover:border-input-hover focus:border-input-focus focus:ring-2 focus:ring-ring
```

---

## Typography

### Semantic Typography Roles

```svelte
type-page-title <!-- page H1: 24px / 600 / tight -->
type-section-title <!-- card/section headings: 18px / 600 / tight -->
type-card-title <!-- compact chart/card titles: 14px / 600 / tight -->
type-body-sm <!-- secondary body text: 14px / 400 / normal -->
type-caption <!-- helper/meta text: 12px / 400 / normal -->
type-caption-strong <!-- emphasized caption: 12px / 500 / normal -->
type-overline <!-- uppercase labels: 12px / 500 / wider / uppercase -->
type-control <!-- buttons/inputs/selects: 14px / 500 / normal -->
type-control-lg <!-- large buttons: 18px / 500 / normal -->
type-badge <!-- badges/pills: 12px / 500 / normal -->
type-nav-item <!-- sidebar items: 14px / 500 / normal -->
type-kpi-value <!-- KPI numbers: 24px / 600 / tight -->
```

### Typography Rules

- Use `type-*` classes in shared primitives and repeated UI patterns.
- Keep raw `text-sm`, `text-xs`, `font-semibold`, `tracking-tight` for one-off exceptions only.
- If a new typography pattern repeats across more than one primitive/page, promote it to a semantic role.

---

## Components

### Form Controls (Inputs / Filters)

**Rule:** For any user input/filter, prefer `$shared/ui` components over raw HTML:

- Use `<Input />` from `$shared/ui/input`
- Use `<Select />` from `$shared/ui/select`
- Use `<Button />` from `$shared/ui/button`

**Sizing standard (recommended):**

- `Input` / `Select`: **`h-9` (36px)** — default for filters and forms
- `Button`: use `size="sm"` for filter bars / toolbars, `size="default"` for primary actions

**Avoid:** ad-hoc `h-12`/custom paddings on controls in app pages — it breaks visual consistency.

### StatCard

KPI card with value and trend indicator.

```svelte
<StatCard
	label="Выручка"
	value={formatCurrency(448200000)}
	trend={12.4}
	trendLabel="vs прошлый месяц"
/>

<StatCard label="Транзакции" value={formatCompact(687421)} trend={-2.1} />

<!-- Loading state -->
<StatCard label="Loading..." value="" loading />
```

### MetricCard

Extended KPI card with plan/fact comparison and built-in progress bar.

```svelte
<!-- Simple -->
<MetricCard label="Выручка" value={formatCurrency(320_000_000)} trend={12.4} />

<!-- Plan / Fact -->
<MetricCard
	label="Выручка"
	value={formatCurrency(320_000_000)}
	target={formatCurrency(400_000_000)}
	progress={80}
	trend={12.4}
	trendLabel="vs прошлый месяц"
/>
```

**Props:** Same as StatCard, plus:

- `target` — formatted plan/target value shown as "value / target"
- `progress` — 0–100, shows ProgressBar when provided
- `variant`: `default` | `success` | `warning` | `error` | `accent` — colors the progress bar

### ChartCard

Container for charts with header and metadata.

```svelte
<ChartCard title="Объём транзакций" subtitle="Месячный тренд" updatedAt="Март 2026">
	<Chart options={chartOptions} />
</ChartCard>

<!-- Loading state -->
<ChartCard title="Loading..." loading />
```

### DataTable

Reusable sortable table with custom cell rendering via snippets.

```svelte
{#snippet statusCell(value, row)}
	<Badge variant={row.ok ? 'success' : 'error'}>{value}</Badge>
{/snippet}

<DataTable
	columns={[
		{ key: 'name', label: 'Название' },
		{ key: 'revenue', label: 'Выручка', align: 'right', sortable: true },
		{ key: 'status', label: 'Статус', align: 'center', cell: statusCell }
	]}
	rows={data}
	sortKey="revenue"
	sortDir="desc"
	onSort={(key, dir) => {
		sortKey = key;
		sortDir = dir;
	}}
	onRowClick={(row) => selectRow(row)}
	activeRowKey="id"
	activeRowValue={selectedId}
	loading={isLoading}
/>
```

**Props:**

- `columns` — `{ key, label, align?, sortable?, cell?, minWidth?, class? }[]`
- `rows` — data array
- `sortKey` / `sortDir` / `onSort` — controlled sorting
- `onRowClick` — row click handler
- `activeRowKey` / `activeRowValue` — highlight active row
- `loading` / `skeletonRows` — skeleton state
- `empty` — custom empty state Snippet

### Badge

Compact label for status, counts, and categories.

```svelte
<Badge>Default</Badge>
<Badge variant="success">Активен</Badge>
<Badge variant="error" size="sm">3</Badge>
<Badge variant="outline">Категория</Badge>
<Badge variant="muted">Архив</Badge>
```

**Props:**

- `variant`: `default` | `success` | `warning` | `error` | `info` | `outline` | `muted`
- `size`: `sm` | `default`

### ProgressBar

Linear progress indicator with variants and optional label.

```svelte
<ProgressBar value={75} />
<ProgressBar value={75} label="Выполнение плана" showValue />
<ProgressBar value={45} variant="warning" size="lg" />
<ProgressBar value={20} variant="error" size="sm" />
```

**Props:**

- `value` / `max` (default 100) — determines fill percentage
- `variant`: `default` | `success` | `warning` | `error` | `accent`
- `size`: `sm` (4px) | `default` (8px) | `lg` (12px)
- `showValue` — shows percentage text
- `label` — text above the bar

### ProgressCircle

Radial gauge / circular progress indicator with auto-coloring.

```svelte
<ProgressCircle value={75} />
<ProgressCircle value={92} variant="success" label="NPS" size="lg" />
<ProgressCircle value={35} variant="auto" />
<!-- auto: green >= 80%, yellow >= 50%, red < 50% -->
```

**Props:**

- `value` / `max` (default 100) — determines arc fill
- `variant`: `default` | `success` | `warning` | `error` | `accent` | `auto`
- `size`: `sm` (48px) | `default` (72px) | `lg` (96px) | `xl` (128px)
- `showValue` (default true) — shows percentage in center
- `label` — text below the circle
- `center` — custom Snippet for center content

### Sparkline

Lightweight SVG trend visualization for inline use.

```svelte
<Sparkline data={[100, 120, 115, 130, 125]} />
<Sparkline data={[100, 120, 115, 130, 125]} color="success" />
<Sparkline data={[100, 80, 70, 60]} color="error" class="h-6 w-24" />
```

**Props:**

- `data` — number array (min 2 points)
- `color`: `primary` | `success` | `error` (default: `primary`)
- `class` — override size (default: `w-16 h-5`)

### Skeleton

Loading placeholder with pulse animation.

```svelte
<Skeleton class="h-8 w-32" />
<Skeleton class="h-4 w-full" />
<Skeleton class="h-72 w-full" />
<!-- Chart placeholder -->
```

### Sidebar

Responsive sidebar with collapsible mode (desktop: icons-only, mobile: drawer).

```svelte
<script lang="ts">
	import {
		SidebarProvider,
		Sidebar,
		SidebarTrigger,
		SidebarInset,
		SidebarNav,
		SidebarItem
	} from '$shared/ui/sidebar';
</script>

<SidebarProvider>
	<Sidebar>
		<SidebarNav label="Navigation">
			<SidebarItem href="/dashboard" active label="Dashboard">
				{#snippet icon()}<svg>...</svg>{/snippet}
				Dashboard
			</SidebarItem>
		</SidebarNav>
	</Sidebar>
	<SidebarInset>
		<header class="flex items-center gap-2 p-4">
			<SidebarTrigger />
			<h1 class="type-page-title">Page Title</h1>
		</header>
	</SidebarInset>
</SidebarProvider>
```

**Props:**

- `SidebarProvider`: `defaultCollapsed` (default: false) — start collapsed on desktop
- `Sidebar`: `expandedWidth` (256px), `collapsedWidth` (64px)
- `SidebarItem`: `icon` (Snippet), `label` (tooltip in collapsed), `active`, `href`
- `SidebarTrigger`: toggles collapsed/expanded on desktop, drawer on mobile

---

## Format Utilities

```typescript
import {
	formatNumber,
	formatCompact,
	formatCurrency,
	formatPercent,
	formatTrend,
	formatDate,
	formatRating,
	truncate
} from '$shared/utils';

// Numbers (locale: ru-RU)
formatNumber(1234567); // "1 234 567"
formatCompact(1234567); // "1,2 млн"
formatCompact(1234567, 2); // "1,23 млн"

// Currency (default: RUB, compact)
formatCurrency(448200000); // "448,2 млн ₽"
formatCurrency(1234, { currency: 'USD' }); // "1,2 тыс. $"
formatCurrency(1234, { compact: false }); // "1 234 ₽"

// Percent (showSign defaults to false)
formatPercent(12.4); // "12.4%"
formatPercent(12.4, { showSign: true }); // "+12.4%"
formatPercent(-5.2); // "-5.2%"

// Trend (returns direction for styling, always with sign)
formatTrend(12.4); // { label: "+12.4%", direction: "up" }
formatTrend(-5.2); // { label: "-5.2%", direction: "down" }

// Date (locale: ru-RU, default: day + month + year)
formatDate(new Date()); // "25 мар. 2026"
formatDate(new Date(), { month: 'long' }); // "25 марта 2026"

// Rating
formatRating(4.7); // "4.7"
formatRating(0); // "—"

// Truncate
truncate('Very long product name here', 20); // "Very long product na…"
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
	xAxis: { ...lineChartPreset.xAxis, data: ['Янв', 'Фев', 'Мар'] },
	series: [{ ...getLineSeries(1), data: [100, 200, 150] }]
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
getLineSeries(1); // Chart color 1, with area gradient
getLineSeries(2, { showArea: false }); // Chart color 2, line only
getBarSeries(1); // Chart color 1, rounded top corners
getPieSeries(); // Standard pie
getPieSeries({ innerRadius: '50%' }); // Donut
```

### Strategy / Analytics Presets

```typescript
import {
	radarChartPreset,
	getRadarSeries,
	getGaugePreset,
	heatmapChartPreset,
	getWaterfallSeries
} from '$shared/ui/chart/presets';

// Radar
const radarOptions = {
	...radarChartPreset,
	radar: {
		...radarChartPreset.radar,
		indicator: [
			{ name: 'Выручка', max: 100 },
			{ name: 'Маржа', max: 100 },
			{ name: 'Рост', max: 100 }
		]
	},
	series: [{ ...getRadarSeries(1), data: [{ value: [80, 60, 90] }] }]
};

// Gauge
const gaugeOptions = getGaugePreset({ min: 0, max: 100 });
gaugeOptions.series[0].data = [{ value: 75, name: 'KPI' }];

// Waterfall
const wfData = [
	{ name: 'Начало', value: 1000, isTotal: true },
	{ name: 'Продажи', value: 500 },
	{ name: 'Возвраты', value: -120 },
	{ name: 'Итого', value: 1380, isTotal: true }
];
const { categories, transparent, positive, negative } = getWaterfallSeries(wfData);
const waterfallOptions = {
	...barChartPreset,
	xAxis: { ...barChartPreset.xAxis, data: categories },
	series: [transparent, positive, negative]
};

// Heatmap
const heatmapOptions = {
	...heatmapChartPreset,
	xAxis: { ...heatmapChartPreset.xAxis, data: ['Пн', 'Вт', 'Ср'] },
	yAxis: { ...heatmapChartPreset.yAxis, data: ['Утро', 'День'] },
	series: [
		{
			type: 'heatmap',
			data: [
				[0, 0, 50],
				[1, 0, 80],
				[2, 1, 30]
			]
		}
	]
};
```

### Color Helpers

```typescript
import { getChartPalette, getAreaGradient } from '$entities/charts';
import { getChartColor } from '$shared/styles/tokens';

getChartColor(1); // 'rgb(0, 157, 154)' (teal, resolved from CSS var)
getChartPalette(); // ['rgb(0, 157, 154)', 'rgb(0, 93, 93)', ...] (resolved from CSS vars)
getAreaGradient(1); // ECharts linear gradient config for area fill
```

> **Note:** `getChartColor` is only available from `$shared/styles/tokens`, not from `$entities/charts`.

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

## cn() Utility

Always use for class composition in components:

```typescript
import { cn } from '$shared/styles/utils';

cn('px-2', 'px-4')                              // => 'px-4' (last wins)
cn('base', { 'active': isActive })               // conditional classes
<button class={cn('px-4 py-2 bg-primary', className)}>  // in components
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
		<h1 class="type-page-title text-foreground">Аналитика</h1>
		<p class="type-body-sm text-muted-foreground">Обзор показателей</p>
	</header>

	<!-- KPI Cards -->
	<section class="mb-8">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard label="Выручка" value={formatCurrency(100000)} trend={8.4} />
			<StatCard label="Пользователи" value={formatCompact(12500)} trend={-2.1} />
		</div>
	</section>

	<!-- Charts -->
	<section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<ChartCard title="Тренд" subtitle="Последние 7 дней">
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
- [ ] StatCard for KPIs, ChartCard for charts, Badge for status labels
- [ ] Interactive states (hover/active/disabled)
- [ ] Button variants match use case (outline for filters, ghost for icons, link for navigation)
- [ ] `cn()` for class composition
- [ ] `type-*` classes for typography (not raw Tailwind text/font classes)
- [ ] TypeScript types for variants

---

**Last updated**: March 2026
**Tech stack**: SvelteKit 2 + Svelte 5 + Tailwind 4 + Carbon Design System
