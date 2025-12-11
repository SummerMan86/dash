<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';
	import { Chart } from '$shared/ui/chart';
	import type { EChartsOption } from 'echarts';
	import {
		kpiSummary,
		timeseriesDaily,
		topClients,
		mccSummary,
		type TimeseriesDaily
	} from './mockData';

	// ============================================================================
	// KPI Data Processing
	// ============================================================================
	const kpiData = kpiSummary[0];

	// Format numbers for display
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('ru-RU', {
			style: 'currency',
			currency: 'RUB',
			maximumFractionDigits: 0
		}).format(value);
	}

	function formatNumber(value: number): string {
		return new Intl.NumberFormat('ru-RU').format(value);
	}

	function formatPercent(value: number): string {
		return `${value.toFixed(2)}%`;
	}

	function formatTime(value: number): string {
		return `${value.toFixed(1)} сек`;
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
			text: 'Динамика платежей',
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
			data: ['Успешные', 'Отклонённые'],
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
				name: 'Успешные',
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
				name: 'Отклонённые',
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
			text: 'Топ клиентов по сумме',
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
				return `<strong>${param.name}</strong><br/>${param.marker} Сумма: ${value}`;
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
				name: 'Сумма операций',
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
			text: 'Обороты по MCC',
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
				return `<strong>${item.mcc_name}</strong><br/>MCC: ${item.mcc}<br/>Сумма: ${value}`;
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
				name: 'Сумма операций',
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
	<title>Мониторинг платежей</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-6">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-semibold text-foreground">Мониторинг платежей</h1>
		<p class="text-muted-foreground mt-2">Аналитика операций по FCT_PAYMENTS</p>
	</div>

	<!-- KPI Cards Row -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
		<!-- KPI 1: Total Amount -->
		<Card>
			<CardHeader class="pb-4">
				<CardTitle class="text-sm font-medium text-muted-foreground">Сумма операций</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatCurrency(kpiData.total_amount)}</div>
				<p class="text-xs text-muted-foreground mt-1">
					За период {new Date(kpiData.date_from).toLocaleDateString('ru-RU')}
				</p>
			</CardContent>
		</Card>

		<!-- KPI 2: Total Count -->
		<Card>
			<CardHeader class="pb-4">
				<CardTitle class="text-sm font-medium text-muted-foreground"
					>Количество операций</CardTitle
				>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatNumber(kpiData.total_count)}</div>
				<p class="text-xs text-muted-foreground mt-1">
					Средний чек: {formatCurrency(kpiData.avg_ticket)}
				</p>
			</CardContent>
		</Card>

		<!-- KPI 3: Rejected Share -->
		<Card>
			<CardHeader class="pb-4">
				<CardTitle class="text-sm font-medium text-muted-foreground">Доля отказов</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatPercent(kpiData.rejected_share_pct)}</div>
				<p class="text-xs text-muted-foreground mt-1">
					{formatNumber(kpiData.rejected_count)} операций
				</p>
			</CardContent>
		</Card>

		<!-- KPI 4: Active Clients -->
		<Card>
			<CardHeader class="pb-4">
				<CardTitle class="text-sm font-medium text-muted-foreground">Активные клиенты</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatNumber(kpiData.active_clients_count)}</div>
				<p class="text-xs text-muted-foreground mt-1">Уникальные клиенты</p>
			</CardContent>
		</Card>

		<!-- KPI 5: Avg Processing Time -->
		<Card>
			<CardHeader class="pb-4">
				<CardTitle class="text-sm font-medium text-muted-foreground"
					>Среднее время обработки</CardTitle
				>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatTime(kpiData.avg_proc_time_sec)}</div>
				<p class="text-xs text-muted-foreground mt-1">На одну операцию</p>
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
