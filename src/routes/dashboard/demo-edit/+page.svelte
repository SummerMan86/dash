<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';

	import { StatCard } from '$shared/ui/stat-card';
	import { Chart } from '$shared/ui/chart';
	import { Button } from '$shared/ui/button';
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
	import { kpiSummary, timeseriesDaily, topClients, mccSummary } from '../mockData';

	type Layout = { x: number; y: number; w: number; h: number };
	type Tile = {
		id: string;
		title: string;
		layout: Layout;
		kind: 'stat' | 'chart';
	};

	const STORAGE_KEY = 'dashboard-demo-edit:v1';
	const COLUMNS = 12;
	const ROW_HEIGHT_PX = 56;

	// Data
	const kpi = kpiSummary[0];
	const trends = {
		amount: 8.4,
		count: 5.2,
		rejection: -0.3,
		clients: 12.1,
		avgTicket: 2.8
	};

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
			dates: dates.map((d) => {
				const date = new Date(d);
				return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
			}),
			successData: dates.map((date) => dateMap.get(date)!.success),
			rejectedData: dates.map((date) => dateMap.get(date)!.rejected),
			countData: dates.map((date) => dateMap.get(date)!.successCount)
		};
	}

	const { dates, successData, rejectedData } = prepareTimeseriesData();

	const topDebtors = topClients
		.filter((c) => c.role === 'DEBTOR')
		.sort((a, b) => b.trx_amount - a.trx_amount)
		.slice(0, 5);

	const topMcc = mccSummary.sort((a, b) => b.trx_amount - a.trx_amount).slice(0, 6);

	const volumeChartOptions: EChartsOption = {
		...lineChartPreset,
		xAxis: { ...lineChartPreset.xAxis, data: dates },
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

	const comparisonChartOptions: EChartsOption = {
		...lineChartPreset,
		legend: {
			data: ['Successful', 'Rejected'],
			bottom: 0,
			textStyle: { color: resolveCssColorVar('--color-muted-foreground') }
		},
		xAxis: { ...lineChartPreset.xAxis, data: dates },
		yAxis: {
			...lineChartPreset.yAxis,
			axisLabel: {
				...lineChartPreset.yAxis.axisLabel,
				formatter: (value: number) => `${(value / 1000).toFixed(0)}K`
			}
		},
		series: [
			{ ...getLineSeries(1), name: 'Successful', data: successData },
			{ ...getLineSeries(3, { showArea: false }), name: 'Rejected', data: rejectedData.map((v) => v * 50) }
		]
	};

	const clientsChartOptions: EChartsOption = {
		...barChartPreset,
		xAxis: {
			...barChartPreset.xAxis,
			data: topDebtors.map((c) => c.client_name.split(' ').slice(0, 2).join(' ')),
			axisLabel: { ...barChartPreset.xAxis.axisLabel, rotate: 15 }
		},
		yAxis: {
			...barChartPreset.yAxis,
			axisLabel: {
				...barChartPreset.yAxis.axisLabel,
				formatter: (value: number) => `${(value / 1000).toFixed(0)}K`
			}
		},
		series: [{ ...getBarSeries(1), data: topDebtors.map((c) => c.trx_amount) }]
	};

	const mccChartOptions: EChartsOption = {
		...barChartPreset,
		grid: { ...barChartPreset.grid, left: 120 },
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
			data: topMcc.map((m) => m.mcc_name).reverse(),
			axisLabel: { ...barChartPreset.xAxis.axisLabel, fontSize: 11 },
			axisLine: barChartPreset.xAxis.axisLine,
			axisTick: { show: false }
		},
		series: [
			{
				...getBarSeries(2),
				data: topMcc.map((m) => m.trx_amount).reverse(),
				itemStyle: {
					color: resolveCssColorVar('--color-chart-2'),
					borderRadius: [0, 4, 4, 0]
				}
			}
		]
	};

	const mccPieOptions: EChartsOption = {
		...pieChartPreset,
		series: [
			{
				...getPieSeries({ innerRadius: '50%', outerRadius: '80%' }),
				data: topMcc.slice(0, 5).map((m) => ({ name: m.mcc_name, value: m.trx_amount })),
				label: {
					show: true,
					formatter: '{b}: {d}%',
					fontSize: 11,
					color: resolveCssColorVar('--color-muted-foreground')
				}
			}
		]
	};

	const currentDate = formatDate(new Date(), { month: 'long', year: 'numeric', day: 'numeric' });

	function defaultTiles(): Tile[] {
		// 12-column grid; KPI row uses 5 tiles sized to 2 columns each.
		return [
			{ id: 'kpi-total-volume', title: 'Total Volume', kind: 'stat', layout: { x: 0, y: 0, w: 2, h: 2 } },
			{ id: 'kpi-transactions', title: 'Transactions', kind: 'stat', layout: { x: 2, y: 0, w: 2, h: 2 } },
			{ id: 'kpi-avg-ticket', title: 'Avg Ticket', kind: 'stat', layout: { x: 4, y: 0, w: 2, h: 2 } },
			{ id: 'kpi-rejection-rate', title: 'Rejection Rate', kind: 'stat', layout: { x: 6, y: 0, w: 2, h: 2 } },
			{ id: 'kpi-active-clients', title: 'Active Clients', kind: 'stat', layout: { x: 8, y: 0, w: 2, h: 2 } },

			{ id: 'chart-volume', title: 'Transaction Volume', kind: 'chart', layout: { x: 0, y: 2, w: 8, h: 7 } },
			{ id: 'chart-category-split', title: 'Category Split', kind: 'chart', layout: { x: 8, y: 2, w: 4, h: 7 } },

			{ id: 'chart-top-clients', title: 'Top Clients', kind: 'chart', layout: { x: 0, y: 9, w: 6, h: 7 } },
			{ id: 'chart-mcc', title: 'Merchant Categories', kind: 'chart', layout: { x: 6, y: 9, w: 6, h: 7 } },

			{ id: 'chart-comparison', title: 'Success vs Rejection Trend', kind: 'chart', layout: { x: 0, y: 16, w: 12, h: 8 } }
		];
	}

	function loadSavedLayouts(): Record<string, Layout> | null {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			return JSON.parse(raw) as Record<string, Layout>;
		} catch {
			return null;
		}
	}

	function saveLayouts(next: Tile[]) {
		const payload: Record<string, Layout> = {};
		for (const t of next) payload[t.id] = t.layout;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	}

	let editable = $state(true);
	let tiles = $state<Tile[]>(defaultTiles());

	let gridEl: HTMLDivElement | null = $state(null);
	let grid: any = null;

	const pendingEls = new Set<HTMLElement>();
	let applyingFromGrid = false;
	let applyingFromStore = false;

	type TileActionParams = { id: string; layout: Layout; editable: boolean };

	function tileNode(node: HTMLElement, params: TileActionParams) {
		pendingEls.add(node);

		function apply(p: TileActionParams) {
			if (!grid) return;
			applyingFromStore = true;
			grid.update(node, {
				id: p.id,
				x: p.layout.x,
				y: p.layout.y,
				w: p.layout.w,
				h: p.layout.h,
				noMove: !p.editable,
				noResize: !p.editable
			});
			applyingFromStore = false;
		}

		if (grid) {
			grid.makeWidget(node);
			apply(params);
		}

		return {
			update(next: TileActionParams) {
				apply(next);
			},
			destroy() {
				pendingEls.delete(node);
				if (grid) grid.removeWidget(node, false);
			}
		};
	}

	function handleGridChange(items: any[] | undefined) {
		if (!items || applyingFromStore) return;

		const byId = new Map<string, any>();
		for (const it of items) {
			const id =
				(typeof it.id === 'string' && it.id) ||
				(typeof it.id === 'number' ? String(it.id) : '') ||
				it.el?.getAttribute('data-gs-id') ||
				it.el?.getAttribute('gs-id') ||
				'';
			if (id) byId.set(id, it);
		}

		let changed = false;
		const next = tiles.map((t) => {
			const it = byId.get(t.id);
			if (!it) return t;
			const x = it.x ?? t.layout.x;
			const y = it.y ?? t.layout.y;
			const w = it.w ?? t.layout.w;
			const h = it.h ?? t.layout.h;
			if (x === t.layout.x && y === t.layout.y && w === t.layout.w && h === t.layout.h) return t;
			changed = true;
			return { ...t, layout: { x, y, w, h } };
		});

		if (!changed) return;
		applyingFromGrid = true;
		tiles = next;
		applyingFromGrid = false;
	}

	let persistTimer: ReturnType<typeof setTimeout> | null = null;
	function persistNow() {
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = setTimeout(() => {
			saveLayouts(tiles);
		}, 0);
	}

	function resetLayout() {
		localStorage.removeItem(STORAGE_KEY);
		tiles = defaultTiles();
		persistNow();
	}

	onMount(async () => {
		const saved = loadSavedLayouts();
		if (saved) {
			tiles = defaultTiles().map((t) => (saved[t.id] ? { ...t, layout: saved[t.id] } : t));
		}

		if (!gridEl) return;

		const mod = await import('gridstack');
		const GridStack = mod.GridStack as any;
		grid = GridStack.init(
			{
				column: COLUMNS,
				cellHeight: ROW_HEIGHT_PX,
				margin: 16,
				float: true,
				draggable: { handle: '.demo-drag-handle' },
				disableDrag: !editable,
				disableResize: !editable
			},
			gridEl
		);

		grid.on('change', (_e: any, items: any[]) => handleGridChange(items));
		grid.on('dragstop', async () => {
			await tick();
			persistNow();
		});
		grid.on('resizestop', async () => {
			await tick();
			persistNow();
		});

		for (const el of pendingEls) grid.makeWidget(el);
	});

	onDestroy(() => {
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = null;
		if (grid) grid.destroy(false);
		grid = null;
	});

	$effect(() => {
		if (!grid) return;
		grid.enableMove(!!editable);
		grid.enableResize(!!editable);
	});
</script>

<svelte:head>
	<title>Dashboard Demo (Editable)</title>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<header class="mb-8">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">Payment Analytics (Editable)</h1>
				<p class="text-sm text-muted-foreground">Drag + resize demo tiles. Layout persists locally.</p>
			</div>
			<div class="flex items-center gap-3">
				<span class="rounded-md bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">Live</span>
				<span class="text-sm text-muted-foreground">{currentDate}</span>
			</div>
		</div>

		<div class="mt-4 flex flex-wrap items-center gap-2">
			<Button variant={editable ? 'default' : 'secondary'} onclick={() => (editable = !editable)}>
				{editable ? 'Edit mode' : 'View mode'}
			</Button>
			<Button variant="secondary" onclick={resetLayout}>Reset layout</Button>
		</div>
	</header>

	<div bind:this={gridEl} class="grid-stack">
		{#each tiles as t (t.id)}
			<div
				class="grid-stack-item"
				data-gs-id={t.id}
				data-gs-x={t.layout.x}
				data-gs-y={t.layout.y}
				data-gs-w={t.layout.w}
				data-gs-h={t.layout.h}
				use:tileNode={{ id: t.id, layout: t.layout, editable }}
			>
				<div class="grid-stack-item-content">
					<div class="h-full">
						<!-- Handle bar (drag only from here; keep charts interactive) -->
						<div
							class="demo-drag-handle flex items-center justify-between gap-2 rounded-t-md border border-b-0 border-border/50 bg-muted/20 px-3 py-2"
						>
							<div class="min-w-0">
								<div class="truncate text-xs font-medium text-foreground">{t.title}</div>
								<div class="truncate text-[11px] text-muted-foreground">Drag by handle, resize by edges</div>
							</div>
							<div
								class="select-none rounded border border-border/50 bg-background/50 px-2 py-1 text-xs text-muted-foreground"
								aria-hidden="true"
							>
								≡
							</div>
						</div>

						<div class="h-[calc(100%-44px)] rounded-b-md border border-border/50 bg-card">
							{#if t.id === 'kpi-total-volume'}
								<div class="p-4">
									<StatCard
										label="Total Volume"
										value={formatCurrency(kpi.total_amount, { currency: 'USD' })}
										trend={trends.amount}
										trendLabel="vs last week"
									/>
								</div>
							{:else if t.id === 'kpi-transactions'}
								<div class="p-4">
									<StatCard
										label="Transactions"
										value={formatCompact(kpi.total_count)}
										trend={trends.count}
										trendLabel="vs last week"
									/>
								</div>
							{:else if t.id === 'kpi-avg-ticket'}
								<div class="p-4">
									<StatCard
										label="Avg Ticket"
										value={formatCurrency(kpi.avg_ticket, { currency: 'USD', compact: false })}
										trend={trends.avgTicket}
										trendLabel="vs last week"
									/>
								</div>
							{:else if t.id === 'kpi-rejection-rate'}
								<div class="p-4">
									<StatCard
										label="Rejection Rate"
										value={formatPercent(kpi.rejected_share_pct, { showSign: false })}
										trend={trends.rejection}
										trendLabel="vs last week"
									/>
								</div>
							{:else if t.id === 'kpi-active-clients'}
								<div class="p-4">
									<StatCard
										label="Active Clients"
										value={formatCompact(kpi.active_clients_count)}
										trend={trends.clients}
										trendLabel="vs last week"
									/>
								</div>
							{:else if t.id === 'chart-volume'}
								<div class="flex h-full flex-col rounded-lg border border-border/50 bg-card">
									<div class="flex items-center justify-between p-6 pb-2">
										<div>
											<h3 class="text-base font-semibold">Transaction Volume</h3>
											<p class="text-sm text-muted-foreground">Daily successful transactions</p>
										</div>
										<span class="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
											Updated: Today
										</span>
									</div>
									<div class="flex-1 min-h-0 p-6 pt-0">
										<Chart options={volumeChartOptions} class="min-h-0" />
									</div>
								</div>
							{:else if t.id === 'chart-category-split'}
								<div class="flex h-full flex-col rounded-lg border border-border/50 bg-card">
									<div class="p-6 pb-2">
										<h3 class="text-base font-semibold">Category Split</h3>
										<p class="text-sm text-muted-foreground">By MCC code</p>
									</div>
									<div class="flex-1 min-h-0 p-6 pt-0">
										<Chart options={mccPieOptions} class="min-h-0" />
									</div>
								</div>
							{:else if t.id === 'chart-top-clients'}
								<div class="flex h-full flex-col rounded-lg border border-border/50 bg-card">
									<div class="flex items-center justify-between p-6 pb-2">
										<div>
											<h3 class="text-base font-semibold">Top Clients</h3>
											<p class="text-sm text-muted-foreground">By transaction volume</p>
										</div>
										<span class="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
											Updated: Today
										</span>
									</div>
									<div class="flex-1 min-h-0 p-6 pt-0">
										<Chart options={clientsChartOptions} class="min-h-0" />
									</div>
								</div>
							{:else if t.id === 'chart-mcc'}
								<div class="flex h-full flex-col rounded-lg border border-border/50 bg-card">
									<div class="flex items-center justify-between p-6 pb-2">
										<div>
											<h3 class="text-base font-semibold">Merchant Categories</h3>
											<p class="text-sm text-muted-foreground">Transaction amount by MCC</p>
										</div>
										<span class="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
											Updated: Today
										</span>
									</div>
									<div class="flex-1 min-h-0 p-6 pt-0">
										<Chart options={mccChartOptions} class="min-h-0" />
									</div>
								</div>
							{:else if t.id === 'chart-comparison'}
								<div class="flex h-full flex-col rounded-lg border border-border/50 bg-card">
									<div class="flex items-center justify-between p-6 pb-2">
										<div>
											<h3 class="text-base font-semibold">Success vs Rejection Trend</h3>
											<p class="text-sm text-muted-foreground">
												7-day comparison (rejected scaled 50x for visibility)
											</p>
										</div>
										<span class="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
											Updated: Today
										</span>
									</div>
									<div class="flex-1 min-h-0 p-6 pt-0">
										<Chart options={comparisonChartOptions} class="min-h-0" />
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<footer class="mt-12 border-t border-border/50 pt-6">
		<div class="flex items-center justify-center text-xs text-muted-foreground">
			<p>CMA BI Demo Dashboard</p>
		</div>
	</footer>
</div>
