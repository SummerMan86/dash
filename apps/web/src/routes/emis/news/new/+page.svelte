<script lang="ts">
	import type { ActionData, PageData } from './$types';

	import NewsEditorForm from '$lib/features/emis-manual-entry/NewsEditorForm.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@dashboard-builder/platform-ui';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let formValues = $derived(
		(form?.values as PageData['initialValues'] | undefined) ?? data.initialValues
	);
</script>

<svelte:head>
	<title>New EMIS News Item</title>
	<meta name="description" content="Manual create entry point for an EMIS news item." />
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/news">/emis/news</a>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS News</div>
				<h1 class="type-page-title">Create News Item</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Минимальный manual create entry point для Wave D. После создания откроется detail card
					новости.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>News Form</CardTitle>
				<CardDescription>Базовый сценарий ручного создания новости</CardDescription>
			</CardHeader>
			<CardContent>
				<NewsEditorForm
					values={formValues}
					sources={data.sources}
					countries={data.countries}
					submitLabel="Создать новость"
					pendingLabel="Creating..."
					cancelHref="/emis/news"
					fieldErrors={form?.fieldErrors ?? {}}
					formError={form?.formError ?? null}
				/>
			</CardContent>
		</Card>
	</div>
</div>
