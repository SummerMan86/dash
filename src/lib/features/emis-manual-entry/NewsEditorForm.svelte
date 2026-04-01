<script lang="ts">
	import { enhance } from '$app/forms';
	import type { EmisCountry, EmisSource } from '$entities/emis-dictionary';

	import { Button } from '$shared/ui/button';
	import { Input } from '$shared/ui/input';
	import { Select } from '$shared/ui/select';

	type FieldErrors = Record<string, string>;

	export type NewsEditorFormValues = {
		sourceId: string;
		sourceItemId: string;
		url: string;
		title: string;
		summary: string;
		body: string;
		language: string;
		publishedAt: string;
		countryCode: string;
		region: string;
		newsType: string;
		importance: string;
		latitude: string;
		longitude: string;
		isManual: boolean;
		metaJson: string;
	};

	interface Props {
		values: NewsEditorFormValues;
		sources: EmisSource[];
		countries: EmisCountry[];
		submitLabel: string;
		pendingLabel?: string;
		cancelHref: string;
		fieldErrors?: FieldErrors;
		formError?: string | null;
	}

	let {
		values,
		sources,
		countries,
		submitLabel,
		pendingLabel = 'Saving...',
		cancelHref,
		fieldErrors = {},
		formError = null
	}: Props = $props();

	let submitting = $state(false);

	function err(field: string): string | undefined {
		return fieldErrors[field];
	}

	function fieldClass(field: string): string {
		return fieldErrors[field] ? 'border-error' : '';
	}

	function textareaClass(field: string, base: string): string {
		return fieldErrors[field] ? `${base} border-error` : base;
	}
</script>

<form
	method="POST"
	class="space-y-6"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update();
		};
	}}
>
	{#if formError}
		<div class="type-body-sm rounded-xl border border-error/30 bg-error-muted/30 p-3 text-error">
			{formError}
		</div>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<label class="grid gap-1 md:col-span-2">
			<span class="type-caption text-muted-foreground">Title</span>
			<Input name="title" value={values.title} required class={fieldClass('title')} />
			{#if err('title')}<span class="type-caption text-error">{err('title')}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Source</span>
			<Select name="sourceId" value={values.sourceId} required class={fieldClass('sourceId')}>
				<option value="">Select source...</option>
				{#each sources as item}
					<option value={item.id}>{item.name}</option>
				{/each}
			</Select>
			{#if err('sourceId')}<span class="type-caption text-error">{err('sourceId')}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Published at</span>
			<Input
				name="publishedAt"
				type="datetime-local"
				value={values.publishedAt}
				required
				class={fieldClass('publishedAt')}
			/>
			{#if err('publishedAt')}<span class="type-caption text-error">{err('publishedAt')}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Source item ID</span>
			<Input name="sourceItemId" value={values.sourceItemId} />
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Source URL</span>
			<Input name="url" type="url" value={values.url} />
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Country</span>
			<Select name="countryCode" value={values.countryCode}>
				<option value="">No country</option>
				{#each countries as item}
					<option value={item.code}>{item.nameRu}</option>
				{/each}
			</Select>
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Region</span>
			<Input name="region" value={values.region} />
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">News type</span>
			<Input name="newsType" value={values.newsType} />
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Importance</span>
			<Select name="importance" value={values.importance} class={fieldClass('importance')}>
				<option value="">No importance</option>
				<option value="1">1</option>
				<option value="2">2</option>
				<option value="3">3</option>
				<option value="4">4</option>
				<option value="5">5</option>
			</Select>
			{#if err('importance')}<span class="type-caption text-error">{err('importance')}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Language</span>
			<Input name="language" value={values.language} maxlength={2} />
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Latitude</span>
			<Input
				name="latitude"
				type="number"
				step="any"
				value={values.latitude}
				class={fieldClass('latitude')}
			/>
			{#if err('latitude')}<span class="type-caption text-error">{err('latitude')}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Longitude</span>
			<Input
				name="longitude"
				type="number"
				step="any"
				value={values.longitude}
				class={fieldClass('longitude')}
			/>
			{#if err('longitude')}<span class="type-caption text-error">{err('longitude')}</span>{/if}
		</label>
	</div>

	<label class="grid gap-1">
		<span class="type-caption text-muted-foreground">Summary</span>
		<textarea
			name="summary"
			rows="4"
			class="type-control focus-glow min-h-24 rounded-md border border-input bg-background px-3 py-2"
			>{values.summary}</textarea
		>
	</label>

	<label class="grid gap-1">
		<span class="type-caption text-muted-foreground">Body</span>
		<textarea
			name="body"
			rows="8"
			class="type-control focus-glow min-h-40 rounded-md border border-input bg-background px-3 py-2"
			>{values.body}</textarea
		>
	</label>

	<label class="type-body-sm flex items-center gap-2 text-foreground">
		<input
			type="checkbox"
			name="isManual"
			value="true"
			checked={values.isManual}
			class="h-4 w-4 rounded border border-input"
		/>
		<span>Manual item</span>
	</label>

	<label class="grid gap-1">
		<span class="type-caption text-muted-foreground">Meta JSON</span>
		<textarea
			name="metaJson"
			rows="8"
			class={textareaClass(
				'metaJson',
				'focus-glow min-h-40 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs'
			)}>{values.metaJson}</textarea
		>
		{#if err('metaJson')}<span class="type-caption text-error">{err('metaJson')}</span>{/if}
	</label>

	<div class="flex flex-wrap items-center gap-3">
		<Button type="submit" loading={submitting} disabled={submitting}>
			{submitting ? pendingLabel : submitLabel}
		</Button>
		<a class="type-caption text-muted-foreground underline underline-offset-4" href={cancelHref}>
			Отмена
		</a>
	</div>
</form>
