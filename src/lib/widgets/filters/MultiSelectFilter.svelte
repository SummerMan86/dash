<script lang="ts">
	import type { FilterSpec, FilterValue } from '$entities/filter';
	import { cn } from '$shared/styles/utils';

	interface Props {
		spec: FilterSpec;
		value: FilterValue;
		onChange: (value: FilterValue) => void;
	}

	let { spec, value, onChange }: Props = $props();

	// Get options from spec
	let options = $derived(spec.options ?? []);

	// Current selected values as array
	let selectedValues = $derived.by(() => {
		if (Array.isArray(value)) return value;
		if (typeof value === 'string' && value) return [value];
		return [];
	});

	// Dropdown open state
	let isOpen = $state(false);

	function toggleOption(optionValue: string) {
		const newValues = selectedValues.includes(optionValue)
			? selectedValues.filter((v) => v !== optionValue)
			: [...selectedValues, optionValue];
		onChange(newValues.length > 0 ? newValues : null);
	}

	function handleClear() {
		onChange(null);
		isOpen = false;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.multi-select-filter')) {
			isOpen = false;
		}
	}

	// Display text
	let displayText = $derived.by(() => {
		if (selectedValues.length === 0) return spec.placeholder ?? 'Выберите...';
		if (selectedValues.length === 1) {
			const opt = options.find((o) => o.value === selectedValues[0]);
			return opt?.label ?? selectedValues[0];
		}
		return `Выбрано: ${selectedValues.length}`;
	});
</script>

<svelte:window onclick={handleClickOutside} />

<div class="space-y-1">
	<label class="text-xs text-muted-foreground">{spec.label}</label>
	<div class="relative min-w-[150px]">
		<button
			type="button"
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			class={cn(
				'flex box-border h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
				'transition-colors',
				selectedValues.length > 0 && 'border-input-focus',
				isOpen && 'ring-2 ring-ring ring-offset-2'
			)}
			onclick={() => (isOpen = !isOpen)}
		>
			<span class="min-w-0 flex-1 truncate text-left">{displayText}</span>
			<svg
				class={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</button>

		{#if isOpen}
			<div
				class="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border border-popover-border bg-popover text-popover-foreground shadow-md"
				role="listbox"
			>
				<div class="py-1">
					{#each options as option (option.value)}
						<label
							class={cn(
								'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted',
								option.disabled && 'cursor-not-allowed opacity-50'
							)}
						>
							<input
								type="checkbox"
								class="h-4 w-4 accent-primary"
								checked={selectedValues.includes(option.value)}
								disabled={option.disabled}
								onchange={() => toggleOption(option.value)}
							/>
							<span class="min-w-0 flex-1 truncate">{option.label}</span>
						</label>
					{/each}
				</div>

				{#if selectedValues.length > 0}
					<button
						type="button"
						class="w-full border-t border-popover-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
						onclick={handleClear}
					>
						Очистить всё
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
