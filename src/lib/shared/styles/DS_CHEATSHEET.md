# Dashboard Builder — Design System Cheatsheet

## Core Rules

1. **Carbon Design System colors** (not Radix, not shadcn defaults)
2. **shadcn/ui naming** (primary, secondary, destructive, muted, accent)
3. **Tailwind 4** (@theme in CSS)
4. **99% = Tailwind classes**, TypeScript tokens only for Canvas/Charts
5. **Teal palette** for charts (enterprise dashboard style)

---

## Quick Imports

```typescript
// UI Components
import { StatCard } from '$shared/ui/stat-card';
import { ChartCard } from '$shared/ui/chart-card';
import { Skeleton } from '$shared/ui/skeleton';

// Utilities
import { formatCurrency, formatCompact, formatPercent } from '$shared/utils';

// Chart presets
import { lineChartPreset, getLineSeries, getBarSeries } from '$entities/charts';

// Tokens (Canvas/Charts only)
import { getChartPalette } from '$shared/styles/tokens';
```

---

## Color Tokens

### Actions
```svelte
bg-primary hover:bg-primary-hover text-primary-foreground   <!-- Blue -->
bg-secondary hover:bg-secondary-hover text-secondary-foreground <!-- Gray -->
bg-accent hover:bg-accent-hover text-accent-foreground     <!-- Teal -->
bg-destructive text-destructive-foreground                  <!-- Red -->
bg-muted text-muted-foreground
```

### Button Variants
```svelte
<!-- Outline — transparent bg, primary border (filters, secondary actions) -->
bg-outline hover:bg-outline-hover border-outline-border text-outline-foreground

<!-- Ghost — transparent, subtle hover (toolbars, icon buttons) -->
bg-ghost hover:bg-ghost-hover text-ghost-foreground

<!-- Link — text link style (navigation, inline links) -->
bg-link text-link-foreground hover:text-link-hover-foreground
```

### Trends
```svelte
text-trend-up      <!-- Carbon green-50 #24a148 -->
text-trend-down    <!-- Carbon red-60 #da1e28 -->
text-trend-neutral <!-- Carbon gray-50 #8d8d8d -->
```

### Charts (Teal Palette)
```svelte
bg-chart-1  <!-- #009d9a teal-50 -->
bg-chart-2  <!-- #005d5d teal-70 -->
bg-chart-3  <!-- #24a148 green-50 -->
bg-chart-4  <!-- #f1c21b yellow-30 -->
bg-chart-5  <!-- #6f6f6f gray-60 -->
```

### Status
```svelte
bg-success / bg-success-muted text-success-muted-foreground
bg-warning / bg-warning-muted text-warning-muted-foreground
bg-error / bg-error-muted text-error-muted-foreground
bg-info / bg-info-muted text-info-muted-foreground
```

---

## Components

### StatCard (KPI with trend)
```svelte
<StatCard
  label="Revenue"
  value={formatCurrency(448200000)}
  trend={12.4}
  trendLabel="vs last month"
/>
```

### ChartCard (chart container)
```svelte
<ChartCard title="Volume" subtitle="Daily trend" updatedAt="Today">
  <Chart options={chartOptions} />
</ChartCard>
```

### Skeleton (loading)
```svelte
<Skeleton class="h-8 w-32" />
```

---

## Format Utilities

```typescript
formatNumber(1234567)        // "1,234,567"
formatCompact(1234567)       // "1.2M"
formatCurrency(448200000)    // "€448.2M"
formatPercent(12.4)          // "+12.4%"
formatTrend(12.4)            // { label: "+12.4%", direction: "up" }
```

---

## Chart Presets

```typescript
// Line chart
const options = {
  ...lineChartPreset,
  xAxis: { ...lineChartPreset.xAxis, data: ['Jan', 'Feb'] },
  series: [{ ...getLineSeries(1), data: [100, 200] }]
};

// Bar chart
const options = {
  ...barChartPreset,
  series: [{ ...getBarSeries(1), data: [100, 200] }]
};

// Colors
getChartPalette()  // ['#009d9a', '#005d5d', '#24a148', '#f1c21b', '#6f6f6f']
```

---

## TypeScript Types

```typescript
type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
type TrendDirection = 'up' | 'down' | 'neutral';
type ChartColorIndex = 1 | 2 | 3 | 4 | 5;
type StatusVariant = 'success' | 'warning' | 'error' | 'info';
```

---

## cn() Utility

```typescript
import { cn } from '$shared/styles/utils';
cn('px-2', 'px-4')  // => 'px-4'
cn('base', { 'active': isActive })
```

---

## DO / DON'T

```svelte
<!-- DO -->
<StatCard label="Revenue" value={formatCurrency(100000)} trend={5.2} />
<span class="text-trend-up">+12.4%</span>
<Button variant="outline">Filter</Button>
<Button variant="ghost"><Icon /></Button>
series: [{ ...getLineSeries(1), data }]

<!-- DON'T -->
<span class="text-green-500">+12.4%</span>  <!-- Use text-trend-up -->
color: '#009d9a'                             <!-- Use getChartPalette()[0] (resolved from CSS vars) -->
{(value / 1000000).toFixed(1)}M              <!-- Use formatCompact() -->
```

---

**Updated**: Dec 2025 | **Stack**: SvelteKit 2 + Svelte 5 + Tailwind 4 + Carbon DS
