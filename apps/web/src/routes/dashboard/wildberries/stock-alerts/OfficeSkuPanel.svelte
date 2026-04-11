<script lang="ts">
	import { Button } from '@dashboard-builder/platform-ui';
	import { Card, CardContent, CardHeader, CardTitle } from '@dashboard-builder/platform-ui';
	import { StatusBadge } from '$widgets/stock-alerts';
	import { formatNumber } from '@dashboard-builder/platform-core';

	import type { OfficeAggregation, SkuDetail } from './types';

	let {
		office,
		skuList,
		onClose
	}: {
		office: OfficeAggregation;
		skuList: SkuDetail[];
		onClose: () => void;
	} = $props();
</script>

<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<CardTitle>
				SKU — {office.office_name || `Склад #${office.office_id}`}
			</CardTitle>
			<Button variant="ghost" size="sm" onclick={onClose}>
				Закрыть
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		<div class="type-caption mb-2 text-muted-foreground">
			Всего SKU: {skuList.length}
		</div>

		<div class="max-h-96 overflow-auto rounded-md border border-border/50">
			<table class="w-full text-sm">
				<thead class="sticky top-0 bg-muted/30">
					<tr>
						<th class="type-overline px-3 py-2 text-left text-muted-foreground">nm_id</th>
						<th class="type-overline px-3 py-2 text-left text-muted-foreground">Размер</th>
						<th class="type-overline px-3 py-2 text-right text-muted-foreground">Остаток</th>
						<th class="type-overline px-3 py-2 text-right text-muted-foreground"
							>Покрытие (дн)</th
						>
						<th class="type-overline px-3 py-2 text-right text-muted-foreground">К клиентам</th>
						<th class="type-overline px-3 py-2 text-right text-muted-foreground">От клиентов</th
						>
						<th class="type-overline px-3 py-2 text-center text-muted-foreground">Статус</th>
					</tr>
				</thead>
				<tbody>
					{#each skuList.slice(0, 100) as sku (sku.nm_id + '-' + sku.chrt_id)}
						<tr class="border-b border-border/50">
							<td class="px-3 py-2 font-mono text-xs whitespace-nowrap">
								{sku.nm_id}
							</td>
							<td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
								{sku.size_name || '—'}
							</td>
							<td class="px-3 py-2 text-right whitespace-nowrap">
								{formatNumber(sku.stock_count)}
							</td>
							<td class="px-3 py-2 text-right whitespace-nowrap">
								{sku.coverage_days !== null ? formatNumber(Math.round(sku.coverage_days)) : '—'}
							</td>
							<td class="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
								{sku.to_client_count !== null ? formatNumber(sku.to_client_count) : '—'}
							</td>
							<td class="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
								{sku.from_client_count !== null ? formatNumber(sku.from_client_count) : '—'}
							</td>
							<td class="px-3 py-2 text-center">
								<StatusBadge status={sku.status} size="sm" />
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if skuList.length > 100}
			<div class="type-caption mt-2 text-muted-foreground">
				Показаны первые 100 из {skuList.length} SKU
			</div>
		{/if}
	</CardContent>
</Card>
