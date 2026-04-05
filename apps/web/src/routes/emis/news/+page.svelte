<script lang="ts">
	import type { PageData } from './$types';

	import { Button } from '@dashboard-builder/platform-ui';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@dashboard-builder/platform-ui';
	import { Input } from '@dashboard-builder/platform-ui';
	import { Select } from '@dashboard-builder/platform-ui';

	let { data }: { data: PageData } = $props();

	function formatDate(value: string) {
		return new Date(value).toLocaleString('ru-RU');
	}

	function buildCatalogHref(
		updates: Partial<{
			q: string | undefined;
			source: string | undefined;
			country: string | undefined;
			newsType: string | undefined;
			objectId: string | undefined;
			dateFrom: string | undefined;
			dateTo: string | undefined;
			limit: number;
			offset: number;
		}> = {}
	) {
		const params = new URLSearchParams();
		const next = {
			q: updates.q ?? data.filters.q,
			source: updates.source ?? data.filters.source,
			country: updates.country ?? data.filters.country,
			newsType: updates.newsType ?? data.filters.newsType,
			objectId: updates.objectId ?? data.filters.objectId,
			dateFrom: updates.dateFrom ?? data.filters.dateFrom,
			dateTo: updates.dateTo ?? data.filters.dateTo,
			limit: updates.limit ?? data.filters.limit,
			offset: updates.offset ?? data.filters.offset
		};

		if (next.q) params.set('q', next.q);
		if (next.source) params.set('source', next.source);
		if (next.country) params.set('country', next.country);
		if (next.newsType) params.set('newsType', next.newsType);
		if (next.objectId) params.set('objectId', next.objectId);
		if (next.dateFrom) params.set('dateFrom', next.dateFrom);
		if (next.dateTo) params.set('dateTo', next.dateTo);
		params.set('limit', String(next.limit));
		params.set('offset', String(next.offset));

		return `/emis/news?${params.toString()}`;
	}

	let filterSummary = $derived.by(
		() =>
			[
				data.filters.q ? `q=${data.filters.q}` : null,
				data.filters.source ? `source=${data.filters.source}` : null,
				data.filters.country ? `country=${data.filters.country}` : null,
				data.filters.newsType ? `newsType=${data.filters.newsType}` : null,
				data.filters.objectId ? `objectId=${data.filters.objectId}` : null
			].filter(Boolean) as string[]
	);
</script>

<svelte:head>
	<title>EMIS News Catalog</title>
	<meta name="description" content="EMIS news catalog with direct links into news detail cards." />
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/objects">/emis/objects</a>
				<a class="underline underline-offset-4" href="/emis/news/new">new news item</a>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS</div>
				<h1 class="type-page-title">News Catalog</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Отдельный entry point для карточек новостей. Каталог опирается на текущий detail/list
					foundation.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>Catalog Filters</CardTitle>
				<CardDescription>Server-side filters and pagination for news cards</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="GET" action="/emis/news" class="grid gap-4 lg:grid-cols-4">
					<input type="hidden" name="offset" value="0" />

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Search</span>
						<Input name="q" value={data.filters.q ?? ''} placeholder="Заголовок или summary..." />
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Source</span>
						<Select name="source" value={data.filters.source ?? ''}>
							<option value="">All sources</option>
							{#each data.sources as item}
								<option value={item.id}>{item.name}</option>
							{/each}
						</Select>
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Country</span>
						<Select name="country" value={data.filters.country ?? ''}>
							<option value="">All countries</option>
							{#each data.countries as item}
								<option value={item.code}>{item.nameRu}</option>
							{/each}
						</Select>
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Page size</span>
						<Select name="limit" value={String(data.filters.limit)}>
							<option value="25">25</option>
							<option value="50">50</option>
							<option value="100">100</option>
						</Select>
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">News type</span>
						<Input
							name="newsType"
							value={data.filters.newsType ?? ''}
							placeholder="incident, update..."
						/>
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Related object UUID</span>
						<Input name="objectId" value={data.filters.objectId ?? ''} placeholder="UUID объекта" />
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Published from</span>
						<Input
							name="dateFrom"
							type="datetime-local"
							value={data.filters.dateFrom?.slice(0, 16) ?? ''}
						/>
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Published to</span>
						<Input
							name="dateTo"
							type="datetime-local"
							value={data.filters.dateTo?.slice(0, 16) ?? ''}
						/>
					</label>

					<div class="flex flex-wrap items-center gap-3 lg:col-span-4">
						<Button type="submit">Применить</Button>
						<a
							class="type-caption text-muted-foreground underline underline-offset-4"
							href="/emis/news"
						>
							Сбросить фильтры
						</a>
					</div>
				</form>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Catalog State</CardTitle>
				<CardDescription>Текущий server-side slice каталога</CardDescription>
			</CardHeader>
			<CardContent class="type-body-sm space-y-2 text-muted-foreground">
				<p>
					Rows: <span class="font-mono">{data.rows.length}</span>
				</p>
				<p>
					Offset / limit:
					<span class="font-mono">{data.filters.offset}</span>
					/
					<span class="font-mono">{data.filters.limit}</span>
				</p>
				<p>
					Filters:
					{#if filterSummary.length > 0}
						<span class="font-mono">{filterSummary.join(' | ')}</span>
					{:else}
						<span class="text-muted-foreground">none</span>
					{/if}
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>News Items</CardTitle>
				<CardDescription>Открывайте карточку новости напрямую из каталога</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if data.rows.length === 0}
					<div class="type-body-sm text-muted-foreground">По текущим параметрам каталог пуст.</div>
				{:else}
					{#each data.rows as row (row.id)}
						<div class="rounded-xl border border-border/70 bg-muted/10 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="space-y-1">
									<div class="type-body-sm font-medium text-foreground">{row.title}</div>
									<div class="type-caption text-muted-foreground">
										{row.sourceName}
										{#if row.newsType}
											<span class="mx-1">•</span>{row.newsType}
										{/if}
										{#if row.region}
											<span class="mx-1">•</span>{row.region}
										{/if}
									</div>
								</div>
								<div class="type-caption text-muted-foreground">
									related: {row.relatedObjectsCount}
								</div>
							</div>

							<div class="type-caption mt-3 grid gap-1 text-muted-foreground">
								<div>
									UUID: <span class="font-mono">{row.id}</span>
								</div>
								<div>
									Published:
									<span class="font-medium text-foreground">{formatDate(row.publishedAt)}</span>
								</div>
							</div>

							<div class="type-caption mt-4 flex flex-wrap items-center gap-3">
								<a
									class="font-medium text-primary underline underline-offset-4"
									href={`/emis/news/${row.id}`}
								>
									Открыть карточку
								</a>
								<a
									class="text-muted-foreground underline underline-offset-4"
									href={`/emis?target=news&q=${encodeURIComponent(row.title)}`}
								>
									Открыть в workspace
								</a>
							</div>
						</div>
					{/each}
				{/if}
			</CardContent>
			<CardContent class="border-t border-border/60 pt-4">
				<div
					class="type-caption flex flex-wrap items-center justify-between gap-3 text-muted-foreground"
				>
					<div>
						Page: <span class="font-mono">{data.pagination.page}</span>
					</div>
					<div class="flex items-center gap-4">
						{#if data.pagination.hasPrev}
							<a
								class="font-medium text-primary underline underline-offset-4"
								href={buildCatalogHref({ offset: data.pagination.prevOffset })}
							>
								Previous
							</a>
						{:else}
							<span class="opacity-50">Previous</span>
						{/if}

						{#if data.pagination.hasNext}
							<a
								class="font-medium text-primary underline underline-offset-4"
								href={buildCatalogHref({ offset: data.pagination.nextOffset })}
							>
								Next
							</a>
						{:else}
							<span class="opacity-50">Next</span>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
