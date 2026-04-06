<script lang="ts">
	import type { ActionData, PageData } from './$types';

	import ObjectEditorForm from '$lib/features/emis-manual-entry/ObjectEditorForm.svelte';
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
	<title>Edit {data.object.name} - EMIS Object</title>
	<meta name="description" content="Manual edit entry point for an EMIS object." />
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/objects">/emis/objects</a>
				<a class="underline underline-offset-4" href={`/emis/objects/${data.object.id}`}
					>detail card</a
				>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">
					EMIS Object
				</div>
				<h1 class="type-page-title">Edit {data.object.name}</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Минимальный manual edit entry point для объекта. После сохранения откроется detail card.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>Object Form</CardTitle>
				<CardDescription>Редактирование базовых атрибутов и geometry</CardDescription>
			</CardHeader>
			<CardContent>
				<ObjectEditorForm
					values={formValues}
					objectTypes={data.objectTypes}
					countries={data.countries}
					submitLabel="Сохранить объект"
					pendingLabel="Saving..."
					cancelHref={`/emis/objects/${data.object.id}`}
					fieldErrors={form?.fieldErrors ?? {}}
					formError={form?.formError ?? null}
					geometryEditable={data.geometryEditable}
				/>
			</CardContent>
		</Card>
	</div>
</div>
