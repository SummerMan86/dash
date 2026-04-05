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
	<title>{data.object.name} - EMIS Object</title>
	<meta name="description" content="EMIS object detail page." />
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/objects">/emis/objects</a>
				<a class="underline underline-offset-4" href={`/emis/objects/${data.object.id}/edit`}
					>edit</a
				>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">
					EMIS Object
				</div>
				<h1 class="type-page-title">{data.object.name}</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Карточка объекта поверх существующего detail/query foundation. Здесь уже видны базовые
					связи на уровне <span class="font-mono">news &lt;-&gt; object</span>.
				</p>
			</div>
		</header>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
			<Card>
				<CardHeader>
					<CardTitle>Overview</CardTitle>
					<CardDescription>Основные поля объекта</CardDescription>
				</CardHeader>
				<CardContent class="type-body-sm grid gap-3 text-muted-foreground">
					<div>
						Type:
						<span class="font-medium text-foreground">
							{data.object.objectType.name} ({data.object.objectType.code})
						</span>
					</div>
					<div>
						Status: <span class="font-medium text-foreground">{data.object.status}</span>
					</div>
					<div>
						Country / region:
						<span class="font-medium text-foreground">
							{data.object.countryCode ?? 'n/a'} / {data.object.region ?? 'n/a'}
						</span>
					</div>
					<div>
						Operator: <span class="font-medium text-foreground"
							>{data.object.operatorName ?? 'n/a'}</span
						>
					</div>
					<div>
						External ID: <span class="font-mono text-foreground"
							>{data.object.externalId ?? 'n/a'}</span
						>
					</div>
					<div>
						Updated: <span class="font-medium text-foreground"
							>{formatDate(data.object.updatedAt)}</span
						>
					</div>
					<div>
						Created: <span class="font-medium text-foreground"
							>{formatDate(data.object.createdAt)}</span
						>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Geometry</CardTitle>
					<CardDescription>Базовый geo snapshot</CardDescription>
				</CardHeader>
				<CardContent class="type-body-sm space-y-2 text-muted-foreground">
					<div>
						Type: <span class="font-medium text-foreground">{data.object.geometry.type}</span>
					</div>
					<div>
						Coordinates:
						<span class="font-mono break-all text-foreground">
							{JSON.stringify(data.object.geometry.coordinates)}
						</span>
					</div>
				</CardContent>
			</Card>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Description</CardTitle>
				<CardDescription>Текстовые поля и provenance note</CardDescription>
			</CardHeader>
			<CardContent class="type-body-sm space-y-3 text-muted-foreground">
				<p>{data.object.description ?? 'Описание пока не заполнено.'}</p>
				<div>
					Source note: <span class="text-foreground">{data.object.sourceNote ?? 'n/a'}</span>
				</div>
				<div>
					Attributes:
					<pre
						class="mt-2 overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-foreground">{JSON.stringify(
							data.object.attributes,
							null,
							2
						)}</pre>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Related News</CardTitle>
				<CardDescription>Связанные новости уже доступны из detail query</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if data.object.relatedNews.length === 0}
					<div class="type-body-sm text-muted-foreground">Связанные новости пока отсутствуют.</div>
				{:else}
					{#each data.object.relatedNews as item (item.id)}
						<div class="rounded-xl border border-border/70 bg-muted/10 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="space-y-1">
									<div class="type-body-sm font-medium text-foreground">{item.title}</div>
									<div class="type-caption text-muted-foreground">
										{item.sourceName}
										{#if item.newsType}
											<span class="mx-1">•</span>{item.newsType}
										{/if}
										<span class="mx-1">•</span>{item.linkType}
									</div>
								</div>
								<div class="type-caption text-muted-foreground">
									{item.isPrimary ? 'primary' : 'related'}
								</div>
							</div>
							<div
								class="type-caption mt-3 flex flex-wrap items-center gap-3 text-muted-foreground"
							>
								<span>Published: {formatDate(item.publishedAt)}</span>
								<a
									class="font-medium text-primary underline underline-offset-4"
									href={`/emis/news/${item.id}`}
								>
									Открыть карточку новости
								</a>
							</div>
						</div>
					{/each}
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
