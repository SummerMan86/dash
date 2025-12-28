<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';
	import { Chart } from '$shared/ui/chart';
	import { Sparkline } from '$shared/ui/sparkline';
	import type { EChartsOption } from 'echarts';
	import {
		kpiSummary,
		timeseriesDaily,
		topClients,
		mccSummary,
		type TimeseriesDaily
	} from '../mockData';

	// ============================================================================
	// KPI Data Processing
	// ============================================================================
	const kpiData = kpiSummary[0];

	// Extract trend data for sparklines (7-day trends)
	const amountTrend = timeseriesDaily
		.filter((d) => d.status === 'SUCCESS')
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((d) => d.trx_amount);

	const countTrend = timeseriesDaily
		.filter((d) => d.status === 'SUCCESS')
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((d) => d.trx_count);

	const rejectionTrend = timeseriesDaily
		.filter((d) => d.status === 'REJECTED')
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((d) => d.trx_amount);

	// Format numbers for display
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(value);
	}

	function formatNumber(value: number): string {
		return new Intl.NumberFormat('en-US').format(value);
	}

	function formatPercent(value: number): string {
		return `${value.toFixed(2)}%`;
	}

	function formatTime(value: number): string {
		return `${value.toFixed(1)}s`;
	}

	// ============================================================================
	// Chart 1: Timeseries Line Chart (Daily Payment Trends)
	// ============================================================================
	function prepareTimeseriesData() {
		// Group by date
		const dateMap = new Map<string, { success: number; rejected: number }>();

		timeseriesDaily.forEach((item) => {
			if (!dateMap.has(item.date)) {
				dateMap.set(item.date, { success: 0, rejected: 0 });
			}
			const entry = dateMap.get(item.date)!;
			if (item.status === 'SUCCESS') {
				entry.success = item.trx_amount;
			} else {
				entry.rejected = item.trx_amount;
			}
		});

		const dates = Array.from(dateMap.keys()).sort();
		const successData = dates.map((date) => dateMap.get(date)!.success);
		const rejectedData = dates.map((date) => dateMap.get(date)!.rejected);

		return { dates, successData, rejectedData };
	}

	const { dates, successData, rejectedData } = prepareTimeseriesData();

	const timeseriesChartOptions: EChartsOption = {
		title: {
			text: 'Payment Trends',
			left: 'center',
			textStyle: {
				fontSize: 16,
				fontWeight: 'normal'
			}
		},
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				let result = `<strong>${params[0].axisValue}</strong><br/>`;
				params.forEach((param: any) => {
					const value = formatCurrency(param.value);
					result += `${param.marker} ${param.seriesName}: ${value}<br/>`;
				});
				return result;
			}
		},
		legend: {
			data: ['Successful', 'Rejected'],
			bottom: 0
		},
		xAxis: {
			type: 'category',
			data: dates,
			axisLabel: {
				formatter: (value: string) => {
					// Format date as DD.MM
					const date = new Date(value);
					return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
				}
			}
		},
		yAxis: {
			type: 'value',
			axisLabel: {
				formatter: (value: number) => {
					// Format as millions
					return `${(value / 1000000).toFixed(1)}M`;
				}
			}
		},
		series: [
			{
				name: 'Successful',
				type: 'line',
				data: successData,
				smooth: true,
				symbol: 'circle',
				symbolSize: 6,
				lineStyle: {
					width: 3
				}
			},
			{
				name: 'Rejected',
				type: 'line',
				data: rejectedData,
				smooth: true,
				symbol: 'circle',
				symbolSize: 6,
				lineStyle: {
					width: 3
				}
			}
		]
	};

	// ============================================================================
	// Chart 2: Top Clients Horizontal Bar Chart
	// ============================================================================
	// Filter only debtors and sort by amount
	const topDebtors = topClients
		.filter((c) => c.role === 'DEBTOR')
		.sort((a, b) => b.trx_amount - a.trx_amount)
		.slice(0, 10);

	const topClientsChartOptions: EChartsOption = {
		title: {
			text: 'Top Clients by Amount',
			left: 'center',
			textStyle: {
				fontSize: 16,
				fontWeight: 'normal'
			}
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow'
			},
			formatter: (params: any) => {
				const param = params[0];
				const value = formatCurrency(param.value);
				return `<strong>${param.name}</strong><br/>${param.marker} Amount: ${value}`;
			}
		},
		xAxis: {
			type: 'value',
			axisLabel: {
				formatter: (value: number) => {
					return `${(value / 1000).toFixed(0)}K`;
				}
			}
		},
		yAxis: {
			type: 'category',
			data: topDebtors.map((c) => {
				// Shorten long names
				const name = c.client_name.replace(/ООО "|"/g, '');
				return name.length > 20 ? name.substring(0, 20) + '...' : name;
			}),
			axisLabel: {
				fontSize: 11
			}
		},
		series: [
			{
				name: 'Transaction Amount',
				type: 'bar',
				data: topDebtors.map((c) => c.trx_amount),
				barWidth: '60%',
				label: {
					show: false
				}
			}
		]
	};

	// ============================================================================
	// Chart 3: MCC Vertical Bar Chart
	// ============================================================================
	const topMcc = mccSummary.sort((a, b) => b.trx_amount - a.trx_amount).slice(0, 8);

	const mccChartOptions: EChartsOption = {
		title: {
			text: 'Turnover by MCC',
			left: 'center',
			textStyle: {
				fontSize: 16,
				fontWeight: 'normal'
			}
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow'
			},
			formatter: (params: any) => {
				const param = params[0];
				const item = topMcc[param.dataIndex];
				const value = formatCurrency(param.value);
				return `<strong>${item.mcc_name}</strong><br/>MCC: ${item.mcc}<br/>Amount: ${value}`;
			}
		},
		xAxis: {
			type: 'category',
			data: topMcc.map((m) => m.mcc),
			axisLabel: {
				fontSize: 11,
				rotate: 0
			}
		},
		yAxis: {
			type: 'value',
			axisLabel: {
				formatter: (value: number) => {
					return `${(value / 1000).toFixed(0)}K`;
				}
			}
		},
		series: [
			{
				name: 'Transaction Amount',
				type: 'bar',
				data: topMcc.map((m) => m.trx_amount),
				barWidth: '50%',
				label: {
					show: false
				}
			}
		]
	};
</script>

<svelte:head>
	<title>Payment Monitoring</title>
</svelte:head>

<div class="p-6 space-y-6">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-semibold text-foreground">Payment Monitoring</h1>
		<p class="text-muted-foreground mt-2">Analytics Dashboard for FCT_PAYMENTS</p>
	</div>

	<!-- KPI Cards Row -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
		<!-- KPI 1: Total Amount -->
		<Card class="hover:bg-card-hover transition-colors">
			<CardContent class="p-4">
				<div class="flex items-center gap-2 mb-2">
					<div class="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
						<svg class="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<p class="text-xs text-muted-foreground">Total Amount</p>
				</div>
				<div class="flex items-end justify-between">
					<div class="text-xl font-semibold">{formatCurrency(kpiData.total_amount)}</div>
					<Sparkline data={amountTrend} color="primary" />
				</div>
				<p class="text-xs text-muted-foreground mt-1">Period: {new Date(kpiData.date_from).toLocaleDateString('en-US')}</p>
			</CardContent>
		</Card>

		<!-- KPI 2: Transaction Count -->
		<Card class="hover:bg-card-hover transition-colors">
			<CardContent class="p-4">
				<div class="flex items-center gap-2 mb-2">
					<div class="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
						<svg class="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
						</svg>
					</div>
					<p class="text-xs text-muted-foreground">Transactions</p>
				</div>
				<div class="flex items-end justify-between">
					<div class="text-xl font-semibold">{formatNumber(kpiData.total_count)}</div>
					<Sparkline data={countTrend} color="primary" />
				</div>
				<p class="text-xs text-muted-foreground mt-1">Avg: {formatCurrency(kpiData.avg_ticket)}</p>
			</CardContent>
		</Card>

		<!-- KPI 3: Rejection Rate -->
		<Card class="hover:bg-card-hover transition-colors">
			<CardContent class="p-4">
				<div class="flex items-center gap-2 mb-2">
					<div class="w-5 h-5 rounded bg-error/10 flex items-center justify-center">
						<svg class="w-3 h-3 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<p class="text-xs text-muted-foreground">Rejection Rate</p>
				</div>
				<div class="flex items-end justify-between">
					<div class="text-xl font-semibold">{formatPercent(kpiData.rejected_share_pct)}</div>
					<Sparkline data={rejectionTrend} color="error" />
				</div>
				<p class="text-xs text-muted-foreground mt-1">{formatNumber(kpiData.rejected_count)} rejected</p>
			</CardContent>
		</Card>

		<!-- KPI 4: Active Clients -->
		<Card class="hover:bg-card-hover transition-colors">
			<CardContent class="p-4">
				<div class="flex items-center gap-2 mb-2">
					<div class="w-5 h-5 rounded bg-success/10 flex items-center justify-center">
						<svg class="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					</div>
					<p class="text-xs text-muted-foreground">Active Clients</p>
				</div>
				<div class="text-xl font-semibold">{formatNumber(kpiData.active_clients_count)}</div>
				<p class="text-xs text-muted-foreground mt-1">Unique customers</p>
			</CardContent>
		</Card>

		<!-- KPI 5: Processing Time -->
		<Card class="hover:bg-card-hover transition-colors">
			<CardContent class="p-4">
				<div class="flex items-center gap-2 mb-2">
					<div class="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
						<svg class="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<p class="text-xs text-muted-foreground">Processing Time</p>
				</div>
				<div class="text-xl font-semibold">{formatTime(kpiData.avg_proc_time_sec)}</div>
				<p class="text-xs text-muted-foreground mt-1">Avg per transaction</p>
			</CardContent>
		</Card>
	</div>

	<!-- Main Charts Row -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left Column: Timeseries Chart (60% width = 2 columns) -->
		<div class="lg:col-span-2">
			<Card>
				<CardContent class="pt-6">
					<Chart options={timeseriesChartOptions} class="h-[400px]" />
				</CardContent>
			</Card>
		</div>

		<!-- Right Column: Two stacked charts (40% width = 1 column) -->
		<div class="space-y-6">
			<!-- Top Clients Chart -->
			<Card>
				<CardContent class="pt-6">
					<Chart options={topClientsChartOptions} class="h-[400px]" />
				</CardContent>
			</Card>
		</div>
	</div>

	<!-- MCC Chart - Full Width -->
	<div class="grid grid-cols-1">
		<Card>
			<CardContent class="pt-6">
				<Chart options={mccChartOptions} class="h-[400px]" />
			</CardContent>
		</Card>
	</div>
</div>
