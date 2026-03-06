<script lang="ts">
	import type { FilterSpec, FilterValue } from '$entities/filter';
	import { Select } from '$shared/ui/select';

	interface Props {
		spec: FilterSpec;
		value: FilterValue;
		onChange: (value: FilterValue) => void;
	}

	let { spec, value, onChange }: Props = $props();

	// Get options from spec
	let options = $derived(spec.options ?? []);

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
</script>

<div class="space-y-1">
	<label class="text-xs text-muted-foreground">{spec.label}</label>
	<Select class="min-w-[150px]" value={currentValue} onchange={handleChange}>
		<option value="">{spec.placeholder ?? 'Выберите...'}</option>
		{#each options as option (option.value)}
			<option value={option.value} disabled={option.disabled}>{option.label}</option>
		{/each}
	</Select>
</div>
