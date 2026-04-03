<script lang="ts">
	import { enhance } from '$app/forms';
	import type { EmisCountry, EmisObjectType } from '$entities/emis-dictionary';

	import { Button } from '$shared/ui/button';
	import { Input } from '$shared/ui/input';
	import { Select } from '$shared/ui/select';

	type FieldErrors = Record<string, string>;

	export type ObjectEditorFormValues = {
		externalId: string;
		objectTypeId: string;
		name: string;
		nameEn: string;
		countryCode: string;
		region: string;
		status: string;
		operatorName: string;
		description: string;
		sourceNote: string;
		latitude: string;
		longitude: string;
		attributesJson: string;
	};

	interface Props {
		values: ObjectEditorFormValues;
		objectTypes: EmisObjectType[];
		countries: EmisCountry[];
		submitLabel: string;
		pendingLabel?: string;
		cancelHref: string;
		fieldErrors?: FieldErrors;
		formError?: string | null;
	}

	const OBJECT_STATUS_OPTIONS = ['active', 'inactive', 'planned', 'archived'] as const;

	let {
		values,
		objectTypes,
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
		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Name</span>
			<Input name="name" value={values.name} required class={fieldClass('name')} />
			{#if err('name')}<span class="type-caption text-error">{err('name')}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Object type</span>
			<Select
				name="objectTypeId"
				value={values.objectTypeId}
				required
				class={fieldClass('objectTypeId')}
			>
				<option value="">Select type...</option>
				{#each objectTypes as item}
					<option value={item.id}>{item.name}</option>
				{/each}
			</Select>
			{#if err('objectTypeId')}<span class="type-caption text-error">{err('objectTypeId')}</span
				>{/if}
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">External ID</span>
			<Input name="externalId" value={values.externalId} />
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Name EN</span>
			<Input name="nameEn" value={values.nameEn} />
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
			<span class="type-caption text-muted-foreground">Status</span>
			<Select name="status" value={values.status} required class={fieldClass('status')}>
				{#each OBJECT_STATUS_OPTIONS as item}
					<option value={item}>{item}</option>
				{/each}
			</Select>
			{#if err('status')}<span class="type-caption text-error">{err('status')}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Region</span>
			<Input name="region" value={values.region} />
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Operator</span>
			<Input name="operatorName" value={values.operatorName} />
		</label>

		<label class="grid gap-1">
			<span class="type-caption text-muted-foreground">Latitude</span>
			<Input
				name="latitude"
				type="number"
				step="any"
				value={values.latitude}
				required
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
				required
				class={fieldClass('longitude')}
			/>
			{#if err('longitude')}<span class="type-caption text-error">{err('longitude')}</span>{/if}
		</label>
	</div>

	<label class="grid gap-1">
		<span class="type-caption text-muted-foreground">Description</span>
		<textarea
			name="description"
			rows="5"
			class={textareaClass(
				'description',
				'type-control focus-glow min-h-28 rounded-md border border-input bg-background px-3 py-2'
			)}>{values.description}</textarea
		>
	</label>

	<label class="grid gap-1">
		<span class="type-caption text-muted-foreground">Source note</span>
		<textarea
			name="sourceNote"
			rows="3"
			class="type-control focus-glow min-h-20 rounded-md border border-input bg-background px-3 py-2"
			>{values.sourceNote}</textarea
		>
	</label>

	<label class="grid gap-1">
		<span class="type-caption text-muted-foreground">Attributes JSON</span>
		<textarea
			name="attributesJson"
			rows="8"
			class={textareaClass(
				'attributesJson',
				'focus-glow min-h-40 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs'
			)}>{values.attributesJson}</textarea
		>
		{#if err('attributesJson')}<span class="type-caption text-error">{err('attributesJson')}</span
			>{/if}
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
