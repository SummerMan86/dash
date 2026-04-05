<script lang="ts">
	import { fetchDataset } from '$shared/api/fetchDataset';
	import { useDebouncedLoader } from '@dashboard-builder/platform-core';
	import { Button } from '@dashboard-builder/platform-ui';
	import { Input } from '@dashboard-builder/platform-ui';
	import { formatNumber } from '@dashboard-builder/platform-core';
	import type { DatasetResponse, JsonValue } from '@dashboard-builder/platform-datasets';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';
	import { officeDayFilters } from './filters';

	const datasetId = 'wildberries.fact_product_office_day';
	const filterRuntime = useFilterWorkspace({
		workspaceId: 'dashboard-wildberries',
		ownerId: 'office-day',
		specs: officeDayFilters
	});

	let error = $state<string | null>(null);
	let data = $state<DatasetResponse | null>(null);

	// Dataset-specific params (kept local - not global filters)
	let nmId = $state<string>('');
	let officeId = $state<string>('');
	let chrtId = $state<string>('');
	let regionName = $state<string>('');
	let limit = $state<string>('500');

	// Subscribe to filter changes
	let effectiveFilters = $derived(filterRuntime.effective);

	function formatCell(value: JsonValue): string {
		if (value === null || typeof value === 'undefined') return '\u2014';
		if (typeof value === 'number') return formatNumber(value);
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		if (typeof value === 'string') return value;
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	const loader = useDebouncedLoader({
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
				cache: { ttlMs: 0 },
				filterContext: {
					snapshot: filterRuntime.getSnapshot(),
					workspaceId: filterRuntime.workspaceId,
					ownerId: filterRuntime.ownerId
				}
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

<div class="space-y-6 p-6 pb-12">
	<!-- Header -->
	<div>
		<h1 class="type-page-title text-foreground">Офисы / день</h1>
		<p class="type-body-sm mt-1 text-muted-foreground">
			Данные из <span class="font-mono text-foreground/70">mart.fact_product_office_day</span>
			{#if data?.meta?.source}
				<span class="mx-1.5 text-border">&middot;</span>
				Источник: {data.meta.source}
			{/if}
		</p>
	</div>

	<!-- Filters -->
	<div class="space-y-4 rounded-lg border border-card-border bg-card p-5 shadow-sm">
		<h2 class="type-overline text-muted-foreground">Фильтры</h2>

		<FilterPanel runtime={filterRuntime} scope="shared" />

		<div class="grid grid-cols-1 gap-3 md:grid-cols-5">
			<div class="space-y-1">
				<label class="type-caption text-muted-foreground" for="od-nm">nm_id</label>
				<Input id="od-nm" inputmode="numeric" placeholder="123" bind:value={nmId} />
			</div>
			<div class="space-y-1">
				<label class="type-caption text-muted-foreground" for="od-office">office_id</label>
				<Input id="od-office" inputmode="numeric" placeholder="45" bind:value={officeId} />
			</div>
			<div class="space-y-1">
				<label class="type-caption text-muted-foreground" for="od-chrt">chrt_id</label>
				<Input id="od-chrt" inputmode="numeric" placeholder="678" bind:value={chrtId} />
			</div>
			<div class="space-y-1">
				<label class="type-caption text-muted-foreground" for="od-region">Регион</label>
				<Input id="od-region" placeholder="Москва" bind:value={regionName} />
			</div>
			<div class="space-y-1">
				<label class="type-caption text-muted-foreground" for="od-limit">Лимит</label>
				<Input id="od-limit" inputmode="numeric" placeholder="500" bind:value={limit} />
			</div>
		</div>

		<Button onclick={loader.reload} disabled={loader.loading} variant="outline" size="sm">
			{loader.loading ? 'Загрузка\u2026' : 'Обновить'}
		</Button>
	</div>

	{#if error}
		<div
			class="flex items-center gap-3 rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error"
		>
			<svg class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
					clip-rule="evenodd"
				/>
			</svg>
			{error}
		</div>
	{/if}

	<!-- Data Table -->
	<div class="overflow-hidden rounded-lg border border-card-border bg-card shadow-sm">
		{#if loader.loading && !data}
			<div class="type-body-sm p-6 text-muted-foreground">Загрузка\u2026</div>
		{:else if !data}
			<div class="px-4 py-16 text-center text-muted-foreground">
				<div class="flex flex-col items-center gap-2">
					<svg
						class="h-8 w-8 text-muted-foreground/50"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<path
							d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
						/>
					</svg>
					<span>Нажмите «Обновить» для загрузки данных</span>
				</div>
			</div>
		{:else}
			<div class="type-caption px-4 pt-4 text-muted-foreground">
				Строк: {data.rows.length}
				{#if data.meta?.executedAt}
					<span class="mx-1.5 text-border">&middot;</span>
					{data.meta.executedAt}
				{/if}
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-muted/30">
							{#each data.fields as f}
								<th
									class="type-overline px-4 py-3 text-left whitespace-nowrap text-muted-foreground"
								>
									{f.name}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50">
						{#each data.rows as row, i (i)}
							<tr class="transition-colors hover:bg-muted/40">
								{#each data.fields as f}
									<td class="px-4 py-3 whitespace-nowrap tabular-nums">
										{formatCell(row[f.name] as JsonValue)}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
