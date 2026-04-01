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

	// Current value as string
	let currentValue = $derived.by(() => {
		if (value === null || value === undefined) return '';
		if (typeof value === 'string') return value;
		if (typeof value === 'number') return String(value);
		return '';
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		onChange(target.value || null);
	}

	function handleClear() {
		onChange(null);
	}

	const controlId = $derived(`filter-${spec.id}`);
</script>

<div class="space-y-1">
	<label class="type-caption text-muted-foreground" for={controlId}>{spec.label}</label>
	<div class="relative min-w-[150px]">
		<Input
			id={controlId}
			type="text"
			class="pr-10"
			value={currentValue}
			oninput={handleInput}
			placeholder={spec.placeholder ?? 'Введите...'}
		/>
		{#if currentValue}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-muted-foreground"
				onclick={handleClear}
				aria-label="Очистить текстовый фильтр"
				title="Очистить"
			>
				×
			</Button>
		{/if}
	</div>
</div>
