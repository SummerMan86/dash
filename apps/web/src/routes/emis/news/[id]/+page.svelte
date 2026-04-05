<script lang="ts">
	import type { PageData } from './$types';

	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@dashboard-builder/platform-ui';

	let { data }: { data: PageData } = $props();

	function formatDate(value: string) {
		return new Date(value).toLocaleString('ru-RU');
	}
</script>

<svelte:head>
	<title>{data.news.title} - EMIS News</title>
	<meta name="description" content="EMIS news detail page." />
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/news">/emis/news</a>
				<a class="underline underline-offset-4" href={`/emis/news/${data.news.id}/edit`}>edit</a>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS News</div>
				<h1 class="type-page-title">{data.news.title}</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Карточка новости с базовым provenance и связанными объектами поверх существующего
					detail/query foundation.
				</p>
			</div>
		</header>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
			<Card>
				<CardHeader>
					<CardTitle>Overview</CardTitle>
					<CardDescription>Основные поля новости</CardDescription>
				</CardHeader>
				<CardContent class="type-body-sm grid gap-3 text-muted-foreground">
					<div>
						Source:
						<span class="font-medium text-foreground">
							{data.news.source.name} ({data.news.source.code})
						</span>
					</div>
					<div>
						Published: <span class="font-medium text-foreground"
							>{formatDate(data.news.publishedAt)}</span
						>
					</div>
					<div>
						Collected: <span class="font-medium text-foreground"
							>{formatDate(data.news.collectedAt)}</span
						>
					</div>
					<div>
						Country / region:
						<span class="font-medium text-foreground">
							{data.news.countryCode ?? 'n/a'} / {data.news.region ?? 'n/a'}
						</span>
					</div>
					<div>
						Type / importance:
						<span class="font-medium text-foreground">
							{data.news.newsType ?? 'n/a'} / {data.news.importance ?? 'n/a'}
						</span>
					</div>
					<div>
						URL:
						{#if data.news.url}
							<a
								class="font-medium text-primary underline underline-offset-4"
								href={data.news.url}
								target="_blank"
								rel="noreferrer"
							>
								source link
							</a>
						{:else}
							<span class="font-medium text-foreground">n/a</span>
						{/if}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Meta</CardTitle>
					<CardDescription>Geometry and ingestion flags</CardDescription>
				</CardHeader>
				<CardContent class="type-body-sm space-y-2 text-muted-foreground">
					<div>
						Manual: <span class="font-medium text-foreground"
							>{data.news.isManual ? 'yes' : 'no'}</span
						>
					</div>
					<div>
						Language: <span class="font-medium text-foreground">{data.news.language ?? 'n/a'}</span>
					</div>
					<div>
						Geometry:
						<span class="font-mono break-all text-foreground">
							{data.news.geometry ? JSON.stringify(data.news.geometry.coordinates) : 'n/a'}
						</span>
					</div>
				</CardContent>
			</Card>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Content</CardTitle>
				<CardDescription>Summary and body</CardDescription>
			</CardHeader>
			<CardContent class="type-body-sm space-y-4 text-muted-foreground">
				<p>{data.news.summary ?? 'Summary пока не заполнен.'}</p>
				{#if data.news.body}
					<div
						class="rounded-xl border border-border/60 bg-muted/20 p-4 whitespace-pre-wrap text-foreground"
					>
						{data.news.body}
					</div>
				{/if}
				<div>
					Meta:
					<pre
						class="mt-2 overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-foreground">{JSON.stringify(
							data.news.meta,
							null,
							2
						)}</pre>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Related Objects</CardTitle>
				<CardDescription>Связанные объекты уже доступны из detail query</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if data.news.relatedObjects.length === 0}
					<div class="type-body-sm text-muted-foreground">Связанные объекты пока отсутствуют.</div>
				{:else}
					{#each data.news.relatedObjects as item (item.id)}
						<div class="rounded-xl border border-border/70 bg-muted/10 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="space-y-1">
									<div class="type-body-sm font-medium text-foreground">{item.name}</div>
									<div class="type-caption text-muted-foreground">
										{item.objectTypeName}
										<span class="mx-1">•</span>{item.status}
										{#if item.countryCode}
											<span class="mx-1">•</span>{item.countryCode}
										{/if}
									</div>
								</div>
								<div class="type-caption text-muted-foreground">
									{item.isPrimary ? 'primary' : 'related'}
								</div>
							</div>
							<div
								class="type-caption mt-3 flex flex-wrap items-center gap-3 text-muted-foreground"
							>
								<span>{item.linkType}</span>
								<a
									class="font-medium text-primary underline underline-offset-4"
									href={`/emis/objects/${item.id}`}
								>
									Открыть карточку объекта
								</a>
							</div>
						</div>
					{/each}
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
