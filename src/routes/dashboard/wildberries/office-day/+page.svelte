<script lang="ts">
	import { fetchDataset } from '$shared/api/fetchDataset';
	import { useDebouncedLoader } from '$shared/lib/useDebouncedLoader.svelte';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';
	import { Input } from '$shared/ui/input';
	import type { DatasetResponse, JsonValue } from '$entities/dataset';
	import { registerFilters, filterStoreV2 } from '$entities/filter';
	import { FilterPanel } from '$widgets/filters';
	import { officeDayFilters } from './filters';

	const datasetId = 'wildberries.fact_product_office_day';

	// Register filter specs on mount
	registerFilters(officeDayFilters);

	let error = $state<string | null>(null);
	let data = $state<DatasetResponse | null>(null);

	// Dataset-specific params (kept local - not global filters)
	let nmId = $state<string>('');
	let officeId = $state<string>('');
	let chrtId = $state<string>('');
	let regionName = $state<string>('');
	let limit = $state<string>('500');

	// Subscribe to filter changes
	let effectiveFilters = $derived(filterStoreV2.effective);

	const numberFmt = new Intl.NumberFormat('ru-RU');

	function formatCell(value: JsonValue): string {
		if (value === null || typeof value === 'undefined') return '—';
		if (typeof value === 'number') return numberFmt.format(value);
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		if (typeof value === 'string') return value;
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	const { reload: load, loading } = useDebouncedLoader({
		watch: () => $effectiveFilters,
		delayMs: 250,
		load: async () => {
			error = null;

			// Dataset-specific params
			const params: Record<string, JsonValue> = {};
			if (nmId) params.nmId = nmId;
			if (officeId) params.officeId = officeId;
			if (chrtId) params.chrtId = chrtId;
			if (regionName) params.regionName = regionName;
			if (limit) params.limit = limit;

			// Filters come from FilterPanel via the store
			// fetchDataset will automatically use them through planner
			return await fetchDataset({
				id: datasetId,
				...(Object.keys(params).length ? { params } : {}),
				cache: { ttlMs: 0 }
			});
		},
		onData: (result) => {
			data = result;
		},
		onError: (e) => {
			error = e instanceof Error ? e.message : 'Failed to load dataset';
			data = null;
		}
	});
</script>

<svelte:head>
	<title>Wildberries | Office-Day</title>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8 space-y-6">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Wildberries — Office/Day</h1>
		<p class="text-sm text-muted-foreground">
			Dataset: <span class="font-mono">{datasetId}</span> → <span class="font-mono">mart.fact_product_office_day</span>
		</p>
	</header>

	<Card>
		<CardHeader>
			<CardTitle>Filters</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Global filters via FilterPanel -->
			<FilterPanel scope="global" />

			<!-- Dataset-specific params -->
			<div class="grid grid-cols-1 gap-3 md:grid-cols-5">
				<div class="space-y-1">
					<div class="text-xs text-muted-foreground">nm_id</div>
					<Input inputmode="numeric" placeholder="e.g. 123" bind:value={nmId} />
				</div>
				<div class="space-y-1">
					<div class="text-xs text-muted-foreground">office_id</div>
					<Input inputmode="numeric" placeholder="e.g. 45" bind:value={officeId} />
				</div>
				<div class="space-y-1">
					<div class="text-xs text-muted-foreground">chrt_id</div>
					<Input inputmode="numeric" placeholder="e.g. 678" bind:value={chrtId} />
				</div>
				<div class="space-y-1">
					<div class="text-xs text-muted-foreground">region_name</div>
					<Input placeholder="e.g. Москва" bind:value={regionName} />
				</div>
				<div class="space-y-1">
					<div class="text-xs text-muted-foreground">Limit</div>
					<Input inputmode="numeric" placeholder="500" bind:value={limit} />
				</div>
			</div>

			<div class="flex items-center gap-2">
				<Button onclick={load} disabled={loading}>
					{loading ? 'Loading…' : 'Reload'}
				</Button>
				{#if data?.meta?.source}
					<span class="text-xs text-muted-foreground">source: {data.meta.source}</span>
				{/if}
			</div>

			{#if error}
				<div class="rounded-md border border-border/50 bg-muted/20 p-3 text-sm text-error">
					{error}
				</div>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Table</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loading && !data}
				<div class="text-sm text-muted-foreground">Loading…</div>
			{:else if !data}
				<div class="text-sm text-muted-foreground">No data yet.</div>
			{:else}
				<div class="text-xs text-muted-foreground mb-2">
					Rows: {data.rows.length}{#if data.meta?.executedAt} • executedAt: {data.meta.executedAt}{/if}
				</div>

				<div class="overflow-auto rounded-md border border-border/50">
					<table class="w-full text-sm">
						<thead class="bg-muted/30">
							<tr>
								{#each data.fields as f}
									<th class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
										{f.name}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each data.rows as row, i (i)}
								<tr class="border-t border-border/40">
									{#each data.fields as f}
										<td class="px-3 py-2 whitespace-nowrap">
											{formatCell(row[f.name] as JsonValue)}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
