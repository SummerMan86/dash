<script lang="ts">
	import { onMount } from 'svelte';

	import { fetchDataset } from '$shared/api/fetchDataset';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';
	import { Input } from '$shared/ui/input';
	import type { DatasetResponse, JsonValue } from '$entities/dataset';

	const datasetId = 'wildberries.fact_product_office_day';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let data = $state<DatasetResponse | null>(null);

	// Filters/params (kept local for MVP; later can be wired to global/IndexedDB state).
	let dateFrom = $state<string>('');
	let dateTo = $state<string>('');
	let nmId = $state<string>('');
	let officeId = $state<string>('');
	let chrtId = $state<string>('');
	let regionName = $state<string>('');
	let limit = $state<string>('500');

	function formatCell(value: JsonValue): string {
		if (value === null || typeof value === 'undefined') return '—';
		if (typeof value === 'number') return new Intl.NumberFormat('ru-RU').format(value);
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		if (typeof value === 'string') return value;
		// arrays/objects: keep readable for MVP
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const filters: Record<string, JsonValue> = {};
			if (dateFrom) filters.dateFrom = dateFrom;
			if (dateTo) filters.dateTo = dateTo;

			const params: Record<string, JsonValue> = {};
			if (nmId) params.nmId = nmId;
			if (officeId) params.officeId = officeId;
			if (chrtId) params.chrtId = chrtId;
			if (regionName) params.regionName = regionName;
			if (limit) params.limit = limit;

			data = await fetchDataset({
				id: datasetId,
				...(Object.keys(filters).length ? { filters } : {}),
				...(Object.keys(params).length ? { params } : {}),
				cache: { ttlMs: 0 }
			});
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to load dataset';
			data = null;
		} finally {
			loading = false;
		}
	}

	onMount(load);
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
			<div class="grid grid-cols-1 gap-3 md:grid-cols-6">
				<div class="space-y-1 md:col-span-1">
					<div class="text-xs text-muted-foreground">Date from</div>
					<Input type="date" bind:value={dateFrom} />
				</div>
				<div class="space-y-1 md:col-span-1">
					<div class="text-xs text-muted-foreground">Date to</div>
					<Input type="date" bind:value={dateTo} />
				</div>
				<div class="space-y-1 md:col-span-1">
					<div class="text-xs text-muted-foreground">nm_id</div>
					<Input inputmode="numeric" placeholder="e.g. 123" bind:value={nmId} />
				</div>
				<div class="space-y-1 md:col-span-1">
					<div class="text-xs text-muted-foreground">office_id</div>
					<Input inputmode="numeric" placeholder="e.g. 45" bind:value={officeId} />
				</div>
				<div class="space-y-1 md:col-span-1">
					<div class="text-xs text-muted-foreground">chrt_id</div>
					<Input inputmode="numeric" placeholder="e.g. 678" bind:value={chrtId} />
				</div>
				<div class="space-y-1 md:col-span-1">
					<div class="text-xs text-muted-foreground">Limit</div>
					<Input inputmode="numeric" placeholder="500" bind:value={limit} />
				</div>
			</div>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
				<div class="space-y-1 md:col-span-2">
					<div class="text-xs text-muted-foreground">region_name</div>
					<Input placeholder="e.g. Москва" bind:value={regionName} />
				</div>
				<div class="flex items-end gap-2">
					<Button onclick={load} disabled={loading}>
						{loading ? 'Loading…' : 'Reload'}
					</Button>
					{#if data?.meta?.source}
						<span class="text-xs text-muted-foreground">source: {data.meta.source}</span>
					{/if}
				</div>
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

