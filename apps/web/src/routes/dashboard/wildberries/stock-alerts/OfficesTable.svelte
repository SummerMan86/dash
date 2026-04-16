<script lang="ts">
	import { cn } from '@dashboard-builder/platform-ui';
	import { Card, CardContent, CardHeader, CardTitle } from '@dashboard-builder/platform-ui';
	import { formatNumber, formatCompact } from '@dashboard-builder/platform-core';

	import StatusBadge from './StatusBadge.svelte';
	import type { OfficeAggregation } from './types';
	import { getStatusTextColor } from './utils';

	let {
		aggregations,
		selectedOfficeId,
		selectedRegion,
		loading,
		hasData,
		onOfficeClick
	}: {
		aggregations: OfficeAggregation[];
		selectedOfficeId: number | null;
		selectedRegion: string;
		loading: boolean;
		hasData: boolean;
		onOfficeClick: (office: OfficeAggregation) => void;
	} = $props();
</script>

<Card>
	<CardHeader>
		<CardTitle>Склады WB — статус</CardTitle>
	</CardHeader>
	<CardContent>
		{#if loading && !hasData}
			<div class="type-body-sm text-muted-foreground">Загрузка...</div>
		{:else if !aggregations.length}
			<div class="type-body-sm text-muted-foreground">Нет данных</div>
		{:else}
			<div class="type-caption mb-2 text-muted-foreground">
				Складов: {aggregations.length}
				{#if selectedRegion}
					<span class="mx-1">•</span>
					Регион: {selectedRegion}
				{/if}
			</div>

			<div class="overflow-auto rounded-md border border-border/50">
				<table class="w-full text-sm">
					<thead class="bg-muted/30">
						<tr>
							<th class="type-overline px-3 py-2 text-left text-muted-foreground">Склад</th>
							<th class="type-overline px-3 py-2 text-left text-muted-foreground">Регион</th>
							<th class="type-overline px-3 py-2 text-right text-muted-foreground">SKU</th>
							<th class="type-overline px-3 py-2 text-right text-muted-foreground">Дефицит</th>
							<th class="type-overline px-3 py-2 text-right text-muted-foreground">Риск</th>
							<th class="type-overline px-3 py-2 text-right text-muted-foreground">Норма</th>
							<th class="type-overline px-3 py-2 text-right text-muted-foreground">Остаток</th>
							<th class="type-overline px-3 py-2 text-center text-muted-foreground">Статус</th>
						</tr>
					</thead>
					<tbody>
						{#each aggregations as office (office.office_id)}
							<tr
								class={cn(
									'cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/40',
									selectedOfficeId === office.office_id && 'bg-muted/30'
								)}
								onclick={() => onOfficeClick(office)}
							>
								<td class="px-3 py-2 font-medium whitespace-nowrap">
									{office.office_name || `#${office.office_id}`}
								</td>
								<td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
									{office.region_name || '—'}
								</td>
								<td class="px-3 py-2 text-right whitespace-nowrap">
									{formatNumber(office.total_sku)}
								</td>
								<td
									class={cn(
										'px-3 py-2 text-right whitespace-nowrap',
										getStatusTextColor('DEFICIT')
									)}
								>
									{office.deficit_count > 0 ? formatNumber(office.deficit_count) : '—'}
								</td>
								<td
									class={cn('px-3 py-2 text-right whitespace-nowrap', getStatusTextColor('RISK'))}
								>
									{office.risk_count > 0 ? formatNumber(office.risk_count) : '—'}
								</td>
								<td
									class={cn('px-3 py-2 text-right whitespace-nowrap', getStatusTextColor('OK'))}
								>
									{formatNumber(office.ok_count)}
								</td>
								<td class="px-3 py-2 text-right whitespace-nowrap">
									{formatCompact(office.total_stock)}
								</td>
								<td class="px-3 py-2 text-center">
									<StatusBadge status={office.status} size="sm" />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</CardContent>
</Card>
