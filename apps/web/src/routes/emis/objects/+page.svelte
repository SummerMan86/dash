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

	const OBJECT_STATUS_OPTIONS = ['active', 'inactive', 'planned', 'archived'] as const;

	function formatDate(value: string) {
		return new Date(value).toLocaleString('ru-RU');
	}

	function buildCatalogHref(
		updates: Partial<{
			q: string | undefined;
			objectType: string | undefined;
			country: string | undefined;
			status: string | undefined;
			limit: number;
			offset: number;
		}> = {}
	) {
		const params = new URLSearchParams();
		const next = {
			q: updates.q ?? data.filters.q,
			objectType: updates.objectType ?? data.filters.objectType,
			country: updates.country ?? data.filters.country,
			status: updates.status ?? data.filters.status,
			limit: updates.limit ?? data.filters.limit,
			offset: updates.offset ?? data.filters.offset
		};

		if (next.q) params.set('q', next.q);
		if (next.objectType) params.set('objectType', next.objectType);
		if (next.country) params.set('country', next.country);
		if (next.status) params.set('status', next.status);
		params.set('limit', String(next.limit));
		params.set('offset', String(next.offset));

		return `/emis/objects?${params.toString()}`;
	}

	let filterSummary = $derived.by(
		() =>
			[
				data.filters.q ? `q=${data.filters.q}` : null,
				data.filters.objectType ? `objectType=${data.filters.objectType}` : null,
				data.filters.country ? `country=${data.filters.country}` : null,
				data.filters.status ? `status=${data.filters.status}` : null
			].filter(Boolean) as string[]
	);
</script>

<svelte:head>
	<title>EMIS Objects Catalog</title>
	<meta
		name="description"
		content="EMIS objects catalog with direct links into object detail cards."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/news">/emis/news</a>
				<a class="underline underline-offset-4" href="/emis/objects/new">new object</a>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS</div>
				<h1 class="type-page-title">Objects Catalog</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Отдельный entry point для карточек объектов. Каталог использует текущий list/query
					foundation без дополнительного BFF-слоя.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>Catalog Filters</CardTitle>
				<CardDescription>Server-side filters and pagination for object cards</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="GET" action="/emis/objects" class="grid gap-4 lg:grid-cols-5">
					<input type="hidden" name="offset" value="0" />

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Search</span>
						<Input name="q" value={data.filters.q ?? ''} placeholder="Название объекта..." />
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Object type</span>
						<Select name="objectType" value={data.filters.objectType ?? ''}>
							<option value="">All types</option>
							{#each data.objectTypes as item}
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
						<span class="type-caption text-muted-foreground">Status</span>
						<Select name="status" value={data.filters.status ?? ''}>
							<option value="">All statuses</option>
							{#each OBJECT_STATUS_OPTIONS as item}
								<option value={item}>{item}</option>
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

					<div class="flex flex-wrap items-center gap-3 lg:col-span-5">
						<Button type="submit">Применить</Button>
						<a
							class="type-caption text-muted-foreground underline underline-offset-4"
							href="/emis/objects"
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
				<CardTitle>Objects</CardTitle>
				<CardDescription>Открывайте карточку объекта напрямую из каталога</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if data.rows.length === 0}
					<div class="type-body-sm text-muted-foreground">По текущим параметрам каталог пуст.</div>
				{:else}
					{#each data.rows as row (row.id)}
						<div class="rounded-xl border border-border/70 bg-muted/10 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="space-y-1">
									<div class="type-body-sm font-medium text-foreground">{row.name}</div>
									<div class="type-caption text-muted-foreground">
										{row.objectTypeName}
										{#if row.region}
											<span class="mx-1">•</span>{row.region}
										{/if}
										{#if row.countryCode}
											<span class="mx-1">•</span>{row.countryCode}
										{/if}
									</div>
								</div>
								<div class="type-caption text-muted-foreground">{row.status}</div>
							</div>

							<div class="type-caption mt-3 grid gap-1 text-muted-foreground">
								<div>
									UUID: <span class="font-mono">{row.id}</span>
								</div>
								<div>
									Updated: <span class="font-medium text-foreground"
										>{formatDate(row.updatedAt)}</span
									>
								</div>
							</div>

							<div class="type-caption mt-4 flex flex-wrap items-center gap-3">
								<a
									class="font-medium text-primary underline underline-offset-4"
									href={`/emis/objects/${row.id}`}
								>
									Открыть карточку
								</a>
								<a
									class="text-muted-foreground underline underline-offset-4"
									href={`/emis?target=objects&q=${encodeURIComponent(row.name)}`}
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
