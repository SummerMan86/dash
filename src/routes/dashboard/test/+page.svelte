<script lang="ts">
	import { Button } from '$shared/ui/button';
	import { StatCard } from '$shared/ui/stat-card';
	import { ChartCard } from '$shared/ui/chart-card';
	import { Chart } from '$shared/ui/chart';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';
	import { lineChartPreset, getLineSeries } from '$entities/charts';
	import { resolveCssColorVar } from '$shared/styles/tokens';

	import {
		useDashboardEditor,
		WidgetCanvas,
		DragOverlay,
		type DashboardConfig
	} from '$lib/features/dashboard-edit';

	// Mock data for charts
	const dates = ['01.12', '02.12', '03.12', '04.12', '05.12', '06.12', '07.12'];
	const values = [120, 150, 180, 140, 200, 190, 220];

	const lineChartOptions = {
		...lineChartPreset,
		xAxis: { ...lineChartPreset.xAxis, data: dates },
		yAxis: {
			...lineChartPreset.yAxis,
			axisLabel: {
				...lineChartPreset.yAxis.axisLabel,
				formatter: (value: number) => `${value}K`
			}
		},
		series: [{ ...getLineSeries(1), name: 'Revenue', data: values }]
	};

	// Initial dashboard config with mixed widget types
	// Heights adjusted for rowHeightPx=24: KPI h=5 (120px), Charts h=10 (240px)
	const initialDashboard: DashboardConfig = {
		id: 'test-dashboard',
		title: 'Test Dashboard',
		widgets: [
			{ id: 'kpi-1', type: 'kpi', title: 'Total Revenue', layout: { x: 0, y: 0, w: 3, h: 5 } },
			{ id: 'kpi-2', type: 'kpi', title: 'Transactions', layout: { x: 3, y: 0, w: 3, h: 5 } },
			{ id: 'kpi-3', type: 'kpi', title: 'Avg Ticket', layout: { x: 6, y: 0, w: 3, h: 5 } },
			{ id: 'kpi-4', type: 'kpi', title: 'Clients', layout: { x: 9, y: 0, w: 3, h: 5 } },
			{ id: 'chart-1', type: 'line', title: 'Revenue Trend', layout: { x: 0, y: 5, w: 6, h: 10 } },
			{ id: 'chart-2', type: 'bar', title: 'Top Categories', layout: { x: 6, y: 5, w: 6, h: 10 } }
		]
	};

	const editor = useDashboardEditor({
		initial: initialDashboard,
		storageKey: 'test-dashboard:v1',
		columns: 12,
		rowHeightPx: 24
	});

	// Mock KPI values
	const kpiData: Record<string, { value: string; trend: number }> = {
		'kpi-1': { value: '$1.2M', trend: 8.4 },
		'kpi-2': { value: '45.2K', trend: 5.2 },
		'kpi-3': { value: '$26.50', trend: 2.8 },
		'kpi-4': { value: '1,234', trend: 12.1 }
	};
</script>

<svelte:head>
	<title>DragOverlay Test</title>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<header class="mb-6">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">DragOverlay Test</h1>
				<p class="text-sm text-muted-foreground">
					Минималистичный drag-and-drop с реальными компонентами
				</p>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant={editor.editable ? 'default' : 'secondary'}
					onclick={() => editor.setEditable(!editor.editable)}
				>
					{editor.editable ? 'Edit mode' : 'View mode'}
				</Button>
				<Button variant="secondary" onclick={() => editor.reset()}>Reset</Button>
			</div>
		</div>
	</header>

	<!-- Info card -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle class="text-sm">Как это работает</CardTitle>
		</CardHeader>
		<CardContent class="text-sm text-muted-foreground space-y-2">
			<p>• Наведите на виджет — появится иконка drag handle в правом верхнем углу</p>
			<p>• Перетащите за иконку для перемещения</p>
			<p>• Resize за углы/края виджета</p>
			<p>• Виджеты полностью интерактивны (клики, hover работают)</p>
		</CardContent>
	</Card>

	<!-- Dashboard canvas with custom widgets -->
	<WidgetCanvas
		widgets={editor.widgets}
		editable={editor.editable}
		columns={editor.columns}
		rowHeightPx={editor.rowHeightPx}
		selectedId={editor.selectedId}
		onSelect={(id) => editor.selectWidget(id)}
		onWidgetsChange={editor.handleWidgetsChange}
		onFinalize={editor.handleFinalize}
	>
		{#snippet widgetSnippet({ widget, editable, selected })}
			<DragOverlay {editable}>
				{#if widget.type === 'kpi'}
					<!-- StatCard - обычный компонент, без изменений -->
					<StatCard
						label={widget.title}
						value={kpiData[widget.id]?.value ?? '—'}
						trend={kpiData[widget.id]?.trend ?? 0}
						trendLabel="vs last week"
					/>
				{:else if widget.type === 'line'}
					<!-- ChartCard с Chart внутри (fluid + autoResize для DnD) -->
					<ChartCard title={widget.title} subtitle="Last 7 days" fluid>
						<Chart options={lineChartOptions} autoResize />
					</ChartCard>
				{:else}
					<!-- Fallback для других типов -->
					<Card class="h-full">
						<CardHeader>
							<CardTitle class="text-sm">{widget.title}</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="flex h-full items-center justify-center text-muted-foreground">
								{widget.type} widget
							</div>
						</CardContent>
					</Card>
				{/if}
			</DragOverlay>
		{/snippet}
	</WidgetCanvas>

	<!-- State info -->
	<Card class="mt-6">
		<CardHeader>
			<CardTitle class="text-sm">State</CardTitle>
		</CardHeader>
		<CardContent class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
			<div>
				<div class="text-muted-foreground">Mode</div>
				<div class="font-medium">{editor.editable ? 'edit' : 'view'}</div>
			</div>
			<div>
				<div class="text-muted-foreground">Widgets</div>
				<div class="font-medium">{editor.widgets.length}</div>
			</div>
			<div>
				<div class="text-muted-foreground">Selected</div>
				<div class="font-medium">{editor.selectedId ?? '—'}</div>
			</div>
			<div>
				<div class="text-muted-foreground">Save</div>
				<div class="font-medium">{editor.saveState}</div>
			</div>
		</CardContent>
	</Card>
</div>
