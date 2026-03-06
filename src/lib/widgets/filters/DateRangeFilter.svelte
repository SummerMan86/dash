<script lang="ts">
	import type { FilterSpec, FilterValue } from '$entities/filter';
	import { Input } from '$shared/ui/input';

	interface Props {
		spec: FilterSpec;
		value: FilterValue;
		onChange: (value: FilterValue) => void;
	}

	let { spec, value, onChange }: Props = $props();

	// Parse value as date range
	let range = $derived.by(() => {
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			return value as { from?: string; to?: string };
		}
		return { from: undefined, to: undefined };
	});

	function handleFromChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onChange({ ...range, from: target.value || undefined });
	}

	function handleToChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onChange({ ...range, to: target.value || undefined });
	}

	function handleClear() {
		onChange(null);
	}
</script>

<div class="space-y-1">
	<label class="text-xs text-muted-foreground">{spec.label}</label>
	<div class="flex items-center gap-2">
		<Input
			type="date"
			class="w-[140px]"
			value={range.from ?? ''}
			onchange={handleFromChange}
			placeholder="От"
		/>
		<span class="text-muted-foreground">—</span>
		<Input
			type="date"
			class="w-[140px]"
			value={range.to ?? ''}
			onchange={handleToChange}
			placeholder="До"
		/>
		{#if range.from || range.to}
			<button
				type="button"
				class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				onclick={handleClear}
				title="Очистить"
			>
				×
			</button>
		{/if}
	</div>
</div>
