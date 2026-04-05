<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import { Button } from '@dashboard-builder/platform-ui';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@dashboard-builder/platform-ui';

	import { STRATEGY_NAV_ITEMS } from './constants';

	function openWorkspace(href: string) {
		if (!browser) return;
		void goto(`${href}${window.location.search}`);
	}
</script>

<svelte:head>
	<title>Стратегические дашборды</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
	<header class="flex flex-col gap-3">
		<p class="type-caption tracking-[0.2em] text-muted-foreground uppercase">
			Стратегическое пространство
		</p>
		<h1 class="type-page-title">Стратегия / BSC-дашборды</h1>
		<p class="type-body-sm max-w-4xl text-muted-foreground">
			Контур поверх `mart_strategy.slobi_*`: обзор объектов реестра, прослеживаемость стратегии,
			карта показателей и результативность KPI. Общие фильтры живут в URL и сохраняются между
			страницами.
		</p>
	</header>

	<section class="grid gap-4 lg:grid-cols-3">
		{#each STRATEGY_NAV_ITEMS as item (item.href)}
			<Card class="flex h-full flex-col">
				<CardHeader>
					<CardTitle>{item.label}</CardTitle>
					<CardDescription>{item.description}</CardDescription>
				</CardHeader>
				<CardContent class="mt-auto flex items-center justify-between gap-3">
					<span class="type-caption text-muted-foreground">{item.href}</span>
					<Button type="button" onclick={() => openWorkspace(item.href)}>Открыть</Button>
				</CardContent>
			</Card>
		{/each}
	</section>
</div>
