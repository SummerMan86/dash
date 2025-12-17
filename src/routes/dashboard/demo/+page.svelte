<!--
  Demo Dashboard
  Showcases the new design system with StatCard, ChartCard, and chart presets
-->

<script lang="ts">
  import { StatCard } from '$shared/ui/stat-card';
  import { ChartCard } from '$shared/ui/chart-card';
  import { Chart } from '$shared/ui/chart';
  import { formatCurrency, formatCompact, formatPercent, formatDate } from '$shared/utils';
  import {
    lineChartPreset,
    barChartPreset,
    pieChartPreset,
    getLineSeries,
    getBarSeries,
    getPieSeries,
    getChartPalette
  } from '$entities/charts';
  import { resolveCssColorVar } from '$shared/styles/tokens';
  import type { EChartsOption } from 'echarts';
  import {
    kpiSummary,
    timeseriesDaily,
    topClients,
    mccSummary
  } from '../mockData';

  // ============================================================================
  // Data Processing
  // ============================================================================
  const kpi = kpiSummary[0];

  // Calculate trends (mock: comparing to "previous period")
  const trends = {
    amount: 8.4,      // +8.4% vs last period
    count: 5.2,       // +5.2%
    rejection: -0.3,  // -0.3% (improvement)
    clients: 12.1,    // +12.1%
    avgTicket: 2.8    // +2.8%
  };

  // Prepare timeseries data
  function prepareTimeseriesData() {
    const dateMap = new Map<string, { success: number; rejected: number; successCount: number }>();

    timeseriesDaily.forEach((item) => {
      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, { success: 0, rejected: 0, successCount: 0 });
      }
      const entry = dateMap.get(item.date)!;
      if (item.status === 'SUCCESS') {
        entry.success = item.trx_amount;
        entry.successCount = item.trx_count;
      } else {
        entry.rejected = item.trx_amount;
      }
    });

    const dates = Array.from(dateMap.keys()).sort();
    return {
      dates: dates.map(d => {
        const date = new Date(d);
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }),
      successData: dates.map((date) => dateMap.get(date)!.success),
      rejectedData: dates.map((date) => dateMap.get(date)!.rejected),
      countData: dates.map((date) => dateMap.get(date)!.successCount)
    };
  }

  const { dates, successData, rejectedData, countData } = prepareTimeseriesData();

  // Top clients (debtors)
  const topDebtors = topClients
    .filter((c) => c.role === 'DEBTOR')
    .sort((a, b) => b.trx_amount - a.trx_amount)
    .slice(0, 5);

  // MCC data
  const topMcc = mccSummary.sort((a, b) => b.trx_amount - a.trx_amount).slice(0, 6);

  // ============================================================================
  // Chart Configurations (using new presets!)
  // ============================================================================

  // Line Chart: Transaction Volume Trend
  const volumeChartOptions: EChartsOption = {
    ...lineChartPreset,
    xAxis: {
      ...lineChartPreset.xAxis,
      data: dates
    },
    yAxis: {
      ...lineChartPreset.yAxis,
      axisLabel: {
        ...lineChartPreset.yAxis.axisLabel,
        formatter: (value: number) => `${(value / 1000000).toFixed(1)}M`
      }
    },
    series: [
      {
        ...getLineSeries(1),
        name: 'Successful',
        data: successData
      }
    ]
  };

  // Dual Line Chart: Success vs Rejected
  const comparisonChartOptions: EChartsOption = {
    ...lineChartPreset,
    legend: {
      data: ['Successful', 'Rejected'],
      bottom: 0,
      textStyle: { color: resolveCssColorVar('--color-muted-foreground') }
    },
    xAxis: {
      ...lineChartPreset.xAxis,
      data: dates
    },
    yAxis: {
      ...lineChartPreset.yAxis,
      axisLabel: {
        ...lineChartPreset.yAxis.axisLabel,
        formatter: (value: number) => `${(value / 1000).toFixed(0)}K`
      }
    },
    series: [
      {
        ...getLineSeries(1),
        name: 'Successful',
        data: successData
      },
      {
        ...getLineSeries(3, { showArea: false }),
        name: 'Rejected',
        data: rejectedData.map(v => v * 50) // Scale up for visibility
      }
    ]
  };

  // Bar Chart: Top Clients
  const clientsChartOptions: EChartsOption = {
    ...barChartPreset,
    xAxis: {
      ...barChartPreset.xAxis,
      data: topDebtors.map(c => c.client_name.split(' ').slice(0, 2).join(' ')),
      axisLabel: {
        ...barChartPreset.xAxis.axisLabel,
        rotate: 15
      }
    },
    yAxis: {
      ...barChartPreset.yAxis,
      axisLabel: {
        ...barChartPreset.yAxis.axisLabel,
        formatter: (value: number) => `${(value / 1000).toFixed(0)}K`
      }
    },
    series: [
      {
        ...getBarSeries(1),
        data: topDebtors.map(c => c.trx_amount)
      }
    ]
  };

  // Horizontal Bar Chart: MCC Categories
  const mccChartOptions: EChartsOption = {
    ...barChartPreset,
    grid: {
      ...barChartPreset.grid,
      left: 120
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        ...barChartPreset.yAxis.axisLabel,
        formatter: (value: number) => `${(value / 1000).toFixed(0)}K`
      },
      splitLine: barChartPreset.yAxis.splitLine
    },
    yAxis: {
      type: 'category',
      data: topMcc.map(m => m.mcc_name).reverse(),
      axisLabel: {
        ...barChartPreset.xAxis.axisLabel,
        fontSize: 11
      },
      axisLine: barChartPreset.xAxis.axisLine,
      axisTick: { show: false }
    },
    series: [
      {
        ...getBarSeries(2),
        data: topMcc.map(m => m.trx_amount).reverse(),
        itemStyle: {
          color: resolveCssColorVar('--color-chart-2'),
          borderRadius: [0, 4, 4, 0]
        }
      }
    ]
  };

  // Pie Chart: MCC Distribution
  const mccPieOptions: EChartsOption = {
    ...pieChartPreset,
    series: [
      {
        ...getPieSeries({ innerRadius: '50%', outerRadius: '80%' }),
        data: topMcc.slice(0, 5).map((m, i) => ({
          name: m.mcc_name,
          value: m.trx_amount
        })),
        label: {
          show: true,
          formatter: '{b}: {d}%',
          fontSize: 11,
          color: resolveCssColorVar('--color-muted-foreground')
        }
      }
    ]
  };

  // Current date for display
  const currentDate = formatDate(new Date(), { month: 'long', year: 'numeric', day: 'numeric' });
</script>

<svelte:head>
  <title>Dashboard Demo | Design System</title>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
  <!-- Header -->
  <header class="mb-8">
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Payment Analytics</h1>
        <p class="text-sm text-muted-foreground">
          Real-time transaction monitoring and insights
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="rounded-md bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
          Live
        </span>
        <span class="text-sm text-muted-foreground">
          {currentDate}
        </span>
      </div>
    </div>
  </header>

  <!-- KPI Cards -->
  <section class="mb-8">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Total Volume"
        value={formatCurrency(kpi.total_amount, { currency: 'USD' })}
        trend={trends.amount}
        trendLabel="vs last week"
      />
      <StatCard
        label="Transactions"
        value={formatCompact(kpi.total_count)}
        trend={trends.count}
        trendLabel="vs last week"
      />
      <StatCard
        label="Avg Ticket"
        value={formatCurrency(kpi.avg_ticket, { currency: 'USD', compact: false })}
        trend={trends.avgTicket}
        trendLabel="vs last week"
      />
      <StatCard
        label="Rejection Rate"
        value={formatPercent(kpi.rejected_share_pct, { showSign: false })}
        trend={trends.rejection}
        trendLabel="vs last week"
      />
      <StatCard
        label="Active Clients"
        value={formatCompact(kpi.active_clients_count)}
        trend={trends.clients}
        trendLabel="vs last week"
      />
    </div>
  </section>

  <!-- Main Charts Row -->
  <section class="mb-8">
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Volume Trend (2/3 width) -->
      <div class="lg:col-span-2">
        <ChartCard
          title="Transaction Volume"
          subtitle="Daily successful transactions"
          updatedAt="Today"
        >
          <Chart options={volumeChartOptions} />
        </ChartCard>
      </div>

      <!-- Category Distribution (1/3 width) -->
      <div>
        <ChartCard
          title="Category Split"
          subtitle="By MCC code"
        >
          <Chart options={mccPieOptions} />
        </ChartCard>
      </div>
    </div>
  </section>

  <!-- Secondary Charts Row -->
  <section class="mb-8">
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Top Clients -->
      <ChartCard
        title="Top Clients"
        subtitle="By transaction volume"
        updatedAt="Today"
      >
        <Chart options={clientsChartOptions} />
      </ChartCard>

      <!-- MCC Breakdown -->
      <ChartCard
        title="Merchant Categories"
        subtitle="Transaction amount by MCC"
        updatedAt="Today"
      >
        <Chart options={mccChartOptions} />
      </ChartCard>
    </div>
  </section>

  <!-- Comparison Chart (Full Width) -->
  <section>
    <ChartCard
      title="Success vs Rejection Trend"
      subtitle="7-day comparison (rejected scaled 50x for visibility)"
      updatedAt="Today"
    >
      <Chart options={comparisonChartOptions} />
    </ChartCard>
  </section>

  <!-- Footer -->
  <footer class="mt-12 border-t border-border/50 pt-6">
    <div class="flex items-center justify-center text-xs text-muted-foreground">
      <p>CMA BI Demo Dashboard</p>
    </div>
  </footer>
</div>
