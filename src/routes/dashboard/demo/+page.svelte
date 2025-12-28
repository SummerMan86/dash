<!--
  Demo Dashboard
  Showcases the new design system with StatCard, ChartCard, and chart presets
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { StatCard } from '$shared/ui/stat-card';
  import { ChartCard } from '$shared/ui/chart-card';
  import { Chart } from '$shared/ui/chart';
  import { Sidebar, SidebarInset, SidebarItem, SidebarNav, SidebarProvider, SidebarTrigger } from '$shared/ui/sidebar';
  import { fetchDataset } from '$shared/api/fetchDataset';
  import { formatCurrency, formatCompact, formatPercent, formatDate } from '$shared/utils';
  import {
    lineChartPreset,
    barChartPreset,
    pieChartPreset,
    getLineSeries,
    getBarSeries,
    getPieSeries
  } from '$entities/charts';
  import { resolveCssColorVar } from '$shared/styles/tokens';
  import type { EChartsOption } from 'echarts';
  import type { KpiSummary, TimeseriesDaily, TopClient, MccSummary } from '$shared/fixtures/paymentAnalytics';

  // ============================================================================
  // Data loading (UI -> fetchDataset -> BFF -> compile -> provider -> response)
  // ============================================================================
  // Svelte 5 reactivity note:
  // - `$state(...)` = "реактивное состояние" (при изменении автоматически обновит UI)
  // - `$derived(...)` = "вычисляемое значение" (пересчитывается, когда меняются зависимости)
  let loading = $state(true);
  let kpi = $state<KpiSummary | null>(null);
  let timeseriesDaily = $state<TimeseriesDaily[]>([]);
  let topClients = $state<TopClient[]>([]);
  let mccSummary = $state<MccSummary[]>([]);

  onMount(async () => {
    // This demo loads 4 datasets in parallel.
    // In production you'd typically add error handling + empty states.
    loading = true;
    try {
      const [kpiRes, tsRes, clientsRes, mccRes] = await Promise.all([
        fetchDataset({ id: 'payment.kpi', cache: { ttlMs: 10_000 } }),
        fetchDataset({ id: 'payment.timeseriesDaily', cache: { ttlMs: 10_000 } }),
        fetchDataset({ id: 'payment.topClients', cache: { ttlMs: 10_000 } }),
        fetchDataset({ id: 'payment.mccSummary', cache: { ttlMs: 10_000 } })
      ]);

      // For MVP the response is generic rows/fields, so we cast into our known fixture types.
      // Later this can be made safer with a per-dataset typed registry.
      kpi = (kpiRes.rows?.[0] as unknown as KpiSummary) ?? null;
      timeseriesDaily = (tsRes.rows as unknown as TimeseriesDaily[]) ?? [];
      topClients = (clientsRes.rows as unknown as TopClient[]) ?? [];
      mccSummary = (mccRes.rows as unknown as MccSummary[]) ?? [];
    } finally {
      loading = false;
    }
  });

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
    // This converts raw rows into chart-friendly arrays.
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

  const preparedTimeseries = $derived(prepareTimeseriesData());
  // `$derived` здесь нужен, чтобы графики автоматически обновлялись при загрузке данных.
  const dates = $derived(preparedTimeseries.dates);
  const successData = $derived(preparedTimeseries.successData);
  const rejectedData = $derived(preparedTimeseries.rejectedData);
  const countData = $derived(preparedTimeseries.countData);

  // Top clients (debtors)
  // Important: do not mutate state arrays in-place.
  // `filter()` creates a new array; sorting that copy is safe.
  const topDebtors = $derived(
    topClients
      .filter((c) => c.role === 'DEBTOR')
      .sort((a, b) => b.trx_amount - a.trx_amount)
      .slice(0, 5)
  );

  // MCC data
  const topMcc = $derived(mccSummary.slice().sort((a, b) => b.trx_amount - a.trx_amount).slice(0, 6));

  // ============================================================================
  // Chart Configurations (using new presets!)
  // ============================================================================

  // Line Chart: Transaction Volume Trend
  const volumeChartOptions = $derived<EChartsOption>({
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
  });

  // Dual Line Chart: Success vs Rejected
  const comparisonChartOptions = $derived<EChartsOption>({
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
  });

  // Bar Chart: Top Clients
  const clientsChartOptions = $derived<EChartsOption>({
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
  });

  // Horizontal Bar Chart: MCC Categories
  const mccChartOptions = $derived<EChartsOption>({
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
      data: topMcc.map(m => m.mcc_name).slice().reverse(),
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
        data: topMcc.map(m => m.trx_amount).slice().reverse(),
        itemStyle: {
          color: resolveCssColorVar('--color-chart-2'),
          borderRadius: [0, 4, 4, 0]
        }
      }
    ]
  });

  // Pie Chart: MCC Distribution
  const mccPieOptions = $derived<EChartsOption>({
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
  });

  // Current date for display
  const currentDate = formatDate(new Date(), { month: 'long', year: 'numeric', day: 'numeric' });
</script>

<svelte:head>
  <title>Dashboard Demo | Design System</title>
</svelte:head>

<SidebarProvider>
  <!-- Desktop: делаем 2 колонки (sidebar + content). Mobile: sidebar — выезжающий drawer. -->
  <div class="min-h-screen lg:flex">
    <Sidebar>
      <div class="px-3 pt-4">
        <div class="mb-3 px-3 text-xs font-semibold tracking-wide text-sidebar-muted">
          NAVIGATION
        </div>
      </div>
      <SidebarNav label="Navigation" ariaLabel="Dashboard navigation">
        <SidebarItem href="/dashboard/demo" active label="Demo Dashboard">
          {#snippet icon()}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          {/snippet}
          Demo Dashboard
        </SidebarItem>
        <SidebarItem href="/dashboard" label="Builder">
          {#snippet icon()}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
          {/snippet}
          Builder
        </SidebarItem>
        <SidebarItem href="/dashboard" label="Datasets">
          {#snippet icon()}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" />
            </svg>
          {/snippet}
          Datasets
        </SidebarItem>
        <SidebarItem href="/dashboard" label="Settings">
          {#snippet icon()}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
            </svg>
          {/snippet}
          Settings
        </SidebarItem>
      </SidebarNav>
    </Sidebar>

    <SidebarInset>
      <!--
        Layout note (Tailwind):
        - классы вроде `mb-8`, `gap-6`, `lg:grid-cols-2` — это "говорящие" утилиты: отступы/сетки/брейкпоинты
        - `mb-8` = вертикальный отступ снизу между секциями (ритм страницы)
        - `lg:*` применяется только на больших экранах (desktop)
      -->
      <div class="min-h-screen bg-background p-6 lg:p-8">
        <!-- Page container: min-h-screen = во всю высоту экрана; p-* = внутренние отступы страницы -->
        <!-- Header -->
        <!-- Header отделяем `mb-8`, чтобы визуально отделить от KPI-блока ниже -->
        <header class="mb-8">
          <!-- Адаптивная шапка: на мобиле элементы идут колонкой, на `sm` — в одну строку -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-start gap-3">
              <!-- Кнопка toggle:
                   - mobile: открывает/закрывает drawer
                   - desktop: показывает/скрывает левую колонку -->
              <SidebarTrigger class="mt-1" label="Toggle navigation" />
              <div>
                <h1 class="text-2xl font-semibold tracking-tight">Payment Analytics</h1>
                <p class="text-sm text-muted-foreground">
                  Real-time transaction monitoring and insights
                </p>
              </div>
            </div>
            <!-- Справа: статус и дата. `gap-3` = расстояние между элементами -->
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
        <!-- Секция KPI: отдельный "ряд" в макете. `mb-8` = отступ до следующего ряда графиков -->
        <section class="mb-8">
          <!-- Адаптивная сетка карточек:
              - mobile: 1 колонка
              - `sm`: 2 колонки
              - `lg`: 5 колонок -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Total Volume"
              value={kpi ? formatCurrency(kpi.total_amount, { currency: 'USD' }) : ''}
              trend={trends.amount}
              trendLabel="vs last week"
              loading={loading}
            />
            <StatCard
              label="Transactions"
              value={kpi ? formatCompact(kpi.total_count) : ''}
              trend={trends.count}
              trendLabel="vs last week"
              loading={loading}
            />
            <StatCard
              label="Avg Ticket"
              value={kpi ? formatCurrency(kpi.avg_ticket, { currency: 'USD', compact: false }) : ''}
              trend={trends.avgTicket}
              trendLabel="vs last week"
              loading={loading}
            />
            <StatCard
              label="Rejection Rate"
              value={kpi ? formatPercent(kpi.rejected_share_pct, { showSign: false }) : ''}
              trend={trends.rejection}
              trendLabel="vs last week"
              loading={loading}
            />
            <StatCard
              label="Active Clients"
              value={kpi ? formatCompact(kpi.active_clients_count) : ''}
              trend={trends.clients}
              trendLabel="vs last week"
              loading={loading}
            />
          </div>
        </section>

        <!-- Main Charts Row -->
        <!-- Основной ряд графиков. `gap-6` = расстояние между "карточками" в сетке -->
        <section class="mb-8">
          <!-- Сетка: 1 колонка на мобиле, 3 колонки на desktop (`lg`) -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Volume Trend (2/3 width) -->
            <!-- `lg:col-span-2` = на desktop этот блок занимает 2 колонки из 3 -->
            <div class="lg:col-span-2">
              <ChartCard
                title="Transaction Volume"
                subtitle="Daily successful transactions"
                updatedAt="Today"
                loading={loading}
              >
                <Chart options={volumeChartOptions} />
              </ChartCard>
            </div>

            <!-- Category Distribution (1/3 width) -->
            <!-- Второй блок занимает оставшуюся 1/3 ширины на desktop -->
            <div>
              <ChartCard
                title="Category Split"
                subtitle="By MCC code"
                loading={loading}
              >
                <Chart options={mccPieOptions} />
              </ChartCard>
            </div>
          </div>
        </section>

        <!-- Secondary Charts Row -->
        <!-- Вторичный ряд графиков: две колонки на desktop, одна колонка на мобиле -->
        <section class="mb-8">
          <!-- `grid-cols-1` + `lg:grid-cols-2` = адаптивность без медиа-запросов вручную -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Top Clients -->
            <ChartCard
              title="Top Clients"
              subtitle="By transaction volume"
              updatedAt="Today"
              loading={loading}
            >
              <Chart options={clientsChartOptions} />
            </ChartCard>

            <!-- MCC Breakdown -->
            <ChartCard
              title="Merchant Categories"
              subtitle="Transaction amount by MCC"
              updatedAt="Today"
              loading={loading}
            >
              <Chart options={mccChartOptions} />
            </ChartCard>
          </div>
        </section>

        <!-- Comparison Chart (Full Width) -->
        <!-- Полная ширина: без grid-обёртки, просто одна ChartCard на всю строку -->
        <section>
          <ChartCard
            title="Success vs Rejection Trend"
            subtitle="7-day comparison (rejected scaled 50x for visibility)"
            updatedAt="Today"
            loading={loading}
          >
            <Chart options={comparisonChartOptions} />
          </ChartCard>
        </section>

        <!-- Footer -->
        <!-- Footer отделяем сверху: `mt-12` (большой отступ), затем линия `border-t` -->
        <footer class="mt-12 border-t border-border/50 pt-6">
          <div class="flex items-center justify-center text-xs text-muted-foreground">
            <p>CMA BI Demo Dashboard</p>
          </div>
        </footer>
      </div>
    </SidebarInset>
  </div>
</SidebarProvider>
