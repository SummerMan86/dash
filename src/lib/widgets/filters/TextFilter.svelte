<script lang="ts">
	import type { FilterSpec, FilterValue } from '$entities/filter';
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
</script>

<div class="space-y-1">
	<label class="text-xs text-muted-foreground">{spec.label}</label>
	<div class="relative min-w-[150px]">
		<Input
			type="text"
			class="pr-10"
			value={currentValue}
			oninput={handleInput}
			placeholder={spec.placeholder ?? 'Введите...'}
		/>
		{#if currentValue}
			<button
				type="button"
				class="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				onclick={handleClear}
				title="Очистить"
			>
				×
			</button>
		{/if}
	</div>
</div>
