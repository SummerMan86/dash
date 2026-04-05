<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	import NewsEditorForm from '$lib/features/emis-manual-entry/NewsEditorForm.svelte';
	import { Button } from '@dashboard-builder/platform-ui';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dashboard-builder/platform-ui';
	import { Input } from '@dashboard-builder/platform-ui';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let formValues = $derived(
		(form?.values as PageData['initialValues'] | undefined) ?? data.initialValues
	);

	// Discriminate which action produced the error
	let isAttachAction = $derived(form != null && form.action === 'attachLink');
	let isDeleteAction = $derived(form != null && form.action === 'deleteLink');
	let isMainAction = $derived(form != null && !isAttachAction && !isDeleteAction);

	// Main form errors (only when main action failed)
	let mainFieldErrors = $derived(isMainAction ? (form?.fieldErrors ?? {}) : {});
	let mainFormError = $derived(isMainAction ? (form?.formError ?? null) : null);

	// Attach form errors (only when attach action failed)
	let attachFieldErrors = $derived(isAttachAction ? (form?.fieldErrors ?? {}) : {});
	let attachFormError = $derived(isAttachAction ? (form?.formError ?? null) : null);

	// Delete errors (only when delete action failed)
	let deleteFormError = $derived(isDeleteAction ? (form?.formError ?? null) : null);

	// Pending states for attach/detach forms
	let attachSubmitting = $state(false);
	let deletingObjectId = $state<string | null>(null);

	function attachFieldClass(field: string): string {
		return attachFieldErrors[field] ? 'border-error' : '';
	}
</script>

<svelte:head>
	<title>Edit {data.news.title} - EMIS News</title>
	<meta name="description" content="Manual edit entry point for an EMIS news item." />
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
				<a class="underline underline-offset-4" href="/emis">/emis workspace</a>
				<a class="underline underline-offset-4" href="/emis/news">/emis/news</a>
				<a class="underline underline-offset-4" href={`/emis/news/${data.news.id}`}>detail card</a>
			</div>
			<div class="space-y-2">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS News</div>
				<h1 class="type-page-title">Edit News Item</h1>
				<p class="type-body-sm max-w-3xl text-muted-foreground">
					Минимальный manual edit entry point для новости с attach/detach связанных объектов.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>News Form</CardTitle>
				<CardDescription>Редактирование базовых полей новости</CardDescription>
			</CardHeader>
			<CardContent>
				<NewsEditorForm
					values={formValues}
					sources={data.sources}
					countries={data.countries}
					submitLabel="Сохранить новость"
					pendingLabel="Saving..."
					cancelHref={`/emis/news/${data.news.id}`}
					fieldErrors={mainFieldErrors}
					formError={mainFormError}
				/>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Attach Object</CardTitle>
				<CardDescription>Минимальный manual flow для news-object links</CardDescription>
			</CardHeader>
			<CardContent>
				{#if attachFormError}
					<div
						class="type-body-sm mb-4 rounded-xl border border-error/30 bg-error-muted/30 p-3 text-error"
					>
						{attachFormError}
					</div>
				{/if}
				<form
					method="POST"
					action="?/attachLink"
					class="grid gap-4 md:grid-cols-2"
					use:enhance={() => {
						attachSubmitting = true;
						return async ({ update }) => {
							attachSubmitting = false;
							await update();
						};
					}}
				>
					<label class="grid gap-1 md:col-span-2">
						<span class="type-caption text-muted-foreground">Object UUID</span>
						<Input
							name="objectId"
							placeholder="UUID объекта"
							class={attachFieldClass('objectId')}
						/>
						{#if attachFieldErrors.objectId}<span class="type-caption text-error"
								>{attachFieldErrors.objectId}</span
							>{/if}
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Link type</span>
						<Input name="linkType" value="mentioned" class={attachFieldClass('linkType')} />
						{#if attachFieldErrors.linkType}<span class="type-caption text-error"
								>{attachFieldErrors.linkType}</span
							>{/if}
					</label>

					<label class="grid gap-1">
						<span class="type-caption text-muted-foreground">Confidence</span>
						<Input
							name="confidence"
							type="number"
							step="0.01"
							min="0"
							max="1"
							class={attachFieldClass('confidence')}
						/>
						{#if attachFieldErrors.confidence}<span class="type-caption text-error"
								>{attachFieldErrors.confidence}</span
							>{/if}
					</label>

					<label class="grid gap-1 md:col-span-2">
						<span class="type-caption text-muted-foreground">Comment</span>
						<Input name="comment" />
					</label>

					<label class="type-body-sm flex items-center gap-2 text-foreground md:col-span-2">
						<input
							type="checkbox"
							name="isPrimary"
							value="true"
							class="h-4 w-4 rounded border border-input"
						/>
						<span>Primary link</span>
					</label>

					<div class="md:col-span-2">
						<Button type="submit" loading={attachSubmitting} disabled={attachSubmitting}>
							{attachSubmitting ? 'Attaching...' : 'Привязать объект'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Current Links</CardTitle>
				<CardDescription>Уже связанные объекты для этой новости</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#if deleteFormError}
					<div
						class="type-body-sm rounded-xl border border-error/30 bg-error-muted/30 p-3 text-error"
					>
						{deleteFormError}
					</div>
				{/if}
				{#if data.news.relatedObjects.length === 0}
					<div class="type-body-sm text-muted-foreground">Связанных объектов пока нет.</div>
				{:else}
					{#each data.news.relatedObjects as item (item.id)}
						<div class="rounded-xl border border-border/70 bg-muted/10 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="space-y-1">
									<div class="type-body-sm font-medium text-foreground">{item.name}</div>
									<div class="type-caption text-muted-foreground">
										{item.objectTypeName}
										<span class="mx-1">•</span>{item.linkType}
										{#if item.countryCode}
											<span class="mx-1">•</span>{item.countryCode}
										{/if}
									</div>
								</div>
								<form
									method="POST"
									action="?/deleteLink"
									use:enhance={() => {
										deletingObjectId = item.id;
										return async ({ update }) => {
											deletingObjectId = null;
											await update();
										};
									}}
								>
									<input type="hidden" name="objectId" value={item.id} />
									<Button
										type="submit"
										variant="outline"
										size="sm"
										loading={deletingObjectId === item.id}
										disabled={deletingObjectId === item.id}
									>
										{deletingObjectId === item.id ? 'Detaching...' : 'Detach'}
									</Button>
								</form>
							</div>
						</div>
					{/each}
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
