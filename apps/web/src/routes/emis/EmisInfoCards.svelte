<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@dashboard-builder/platform-ui';
	import { toneClass } from './emisPageHelpers';

	type AssetCheckItem = { key: string; label: string; ready: boolean };

	let {
		mapConfig,
		assetChecklist
	}: {
		mapConfig: {
			requestedMode: string;
			effectiveMode: string;
			onlineStyleUrl: string | null;
			offlinePmtilesUrl: string | null;
		};
		assetChecklist: AssetCheckItem[];
	} = $props();
</script>

<div class="grid gap-4 md:grid-cols-3">
	<Card>
		<CardHeader>
			<CardTitle>Map Config</CardTitle>
			<CardDescription>Текущий server-resolved runtime profile</CardDescription>
		</CardHeader>
		<CardContent class="type-body-sm space-y-2 text-muted-foreground">
			<p>
				Requested mode: <span class="font-mono">{mapConfig.requestedMode}</span>
			</p>
			<p>
				Effective mode: <span class="font-mono">{mapConfig.effectiveMode}</span>
			</p>
			<p>
				Online style:
				<span class="font-mono break-all">{mapConfig.onlineStyleUrl ?? 'not configured'}</span>
			</p>
			<p>
				Offline PMTiles:
				<span class="font-mono break-all">{mapConfig.offlinePmtilesUrl ?? 'not configured'}</span>
			</p>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Offline Bundle Status</CardTitle>
			<CardDescription>Что уже лежит в локальном PMTiles bundle</CardDescription>
		</CardHeader>
		<CardContent class="type-body-sm grid gap-2">
			{#each assetChecklist as item}
				<div
					class={`flex items-center justify-between rounded-xl border px-3 py-2 ${toneClass(item.ready)}`}
				>
					<span>{item.label}</span>
					<span class="font-mono text-[11px] uppercase">{item.ready ? 'ready' : 'missing'}</span>
				</div>
			{/each}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Ops Commands</CardTitle>
			<CardDescription>Как проверять basemap и фильтры локально</CardDescription>
		</CardHeader>
		<CardContent class="type-body-sm space-y-2 text-muted-foreground">
			<p><span class="font-mono">pnpm map:assets:status</span> - проверить bundle</p>
			<p>
				<span class="font-mono">pnpm map:pmtiles:setup</span> - собрать локальный PMTiles bundle
			</p>
			<p>
				<span class="font-mono">pnpm check</span> - проверить типы после изменения filter runtime
			</p>
			<p class="type-caption">
				Текущие workspace endpoints: <span class="font-mono">/api/emis/search/*</span> и
				<span class="font-mono"> /api/emis/map/*</span>
			</p>
		</CardContent>
	</Card>
</div>
