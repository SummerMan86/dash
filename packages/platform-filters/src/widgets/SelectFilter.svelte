<script lang="ts">
	import { onMount } from 'svelte';

	import type { FilterSpec, FilterValue } from '../model';
	import { Select } from '@dashboard-builder/platform-ui';

	interface Props {
		spec: FilterSpec;
		value: FilterValue;
		onChange: (value: FilterValue) => void;
	}

	let { spec, value, onChange }: Props = $props();

	// Get options from spec
	let remoteOptions = $state(spec.options ?? []);
	let options = $derived(remoteOptions);

	// Current value as string
	let currentValue = $derived.by(() => {
		if (value === null || value === undefined) return '';
		if (typeof value === 'string') return value;
		if (typeof value === 'number') return String(value);
		return '';
	});

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		onChange(target.value || null);
	}

	const controlId = $derived(`filter-${spec.id}`);

	onMount(() => {
		const optionsSource = spec.optionsSource;
		if (!optionsSource || optionsSource.kind !== 'endpoint') return;

		let cancelled = false;

		void fetch(optionsSource.url)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(`Failed to load filter options: ${response.status}`);
				}

				const payload = (await response.json()) as { rows?: Array<Record<string, unknown>> };
				const rows = payload.rows ?? [];
				if (cancelled) return;

				remoteOptions = rows
					.map((row) => {
						const rawValue = row[optionsSource.valueField];
						if (rawValue === null || rawValue === undefined) return null;

						const rawLabelField = optionsSource.labelField ?? optionsSource.valueField;
						const rawLabel = row[rawLabelField];
						const rawDisabled = optionsSource.disabledField
							? row[optionsSource.disabledField]
							: undefined;

						return {
							value: String(rawValue),
							label:
								rawLabel === null || rawLabel === undefined ? String(rawValue) : String(rawLabel),
							disabled: typeof rawDisabled === 'boolean' ? rawDisabled : undefined
						};
					})
					.filter((option): option is NonNullable<typeof option> => option !== null);
			})
			.catch(() => {
				if (!cancelled) {
					remoteOptions = spec.options ?? [];
				}
			});

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="space-y-1">
	<label class="type-caption text-muted-foreground" for={controlId}>{spec.label}</label>
	<Select id={controlId} class="min-w-[150px]" value={currentValue} onchange={handleChange}>
		<option value="">{spec.placeholder ?? 'Выберите...'}</option>
		{#each options as option (option.value)}
			<option value={option.value} disabled={option.disabled}>{option.label}</option>
		{/each}
	</Select>
</div>
