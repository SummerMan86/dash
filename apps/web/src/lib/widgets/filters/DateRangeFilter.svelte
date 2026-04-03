<script lang="ts">
	import type { FilterSpec, FilterValue } from '$entities/filter';
	import { Button } from '$shared/ui/button';
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

	const fromId = $derived(`${spec.id}-from`);
	const toId = $derived(`${spec.id}-to`);
</script>

<fieldset class="space-y-1">
	<legend class="type-caption text-muted-foreground">{spec.label}</legend>
	<div class="flex items-center gap-2">
		<Input
			id={fromId}
			type="date"
			class="w-[140px]"
			value={range.from ?? ''}
			onchange={handleFromChange}
			placeholder="От"
		/>
		<span class="text-muted-foreground">—</span>
		<Input
			id={toId}
			type="date"
			class="w-[140px]"
			value={range.to ?? ''}
			onchange={handleToChange}
			placeholder="До"
		/>
		{#if range.from || range.to}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="h-9 w-9 text-muted-foreground"
				onclick={handleClear}
				aria-label="Очистить диапазон дат"
				title="Очистить"
			>
				×
			</Button>
		{/if}
	</div>
</fieldset>
