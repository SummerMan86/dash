<script lang="ts">
	import { onMount } from 'svelte';

	import type { FilterSpec, FilterValue } from '$entities/filter';
	import { cn } from '$shared/styles/utils';
	import { Button } from '$shared/ui/button';

	interface Props {
		spec: FilterSpec;
		value: FilterValue;
		onChange: (value: FilterValue) => void;
	}

	let { spec, value, onChange }: Props = $props();

	// Get options from spec
	let remoteOptions = $state(spec.options ?? []);
	let options = $derived(remoteOptions);

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

	function handleTriggerKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isOpen = false;
			return;
		}

		if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			isOpen = true;
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

	const controlId = $derived(`filter-${spec.id}`);
	const listboxId = $derived(`${controlId}-listbox`);

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

<svelte:window onclick={handleClickOutside} />

<div class="multi-select-filter space-y-1">
	<label class="type-caption text-muted-foreground" for={controlId}>{spec.label}</label>
	<div class="relative min-w-[150px]">
		<button
			id={controlId}
			type="button"
			role="combobox"
			aria-controls={listboxId}
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			class={cn(
				'type-control box-border flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5',
				'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
				'transition-colors',
				selectedValues.length > 0 && 'border-input-focus',
				isOpen && 'ring-2 ring-ring ring-offset-2'
			)}
			onclick={() => (isOpen = !isOpen)}
			onkeydown={handleTriggerKeydown}
		>
			<span class="min-w-0 flex-1 truncate text-left">{displayText}</span>
			<svg
				class={cn(
					'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
					isOpen && 'rotate-180'
				)}
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
				id={listboxId}
				class="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-auto rounded-md border border-popover-border bg-popover text-popover-foreground shadow-md"
				role="listbox"
				aria-multiselectable="true"
			>
				<div class="py-1">
					{#each options as option (option.value)}
						<label
							class={cn(
								'type-control flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted',
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
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="type-caption w-full justify-start rounded-none border-t border-popover-border px-3 text-muted-foreground"
						onclick={handleClear}
					>
						Очистить всё
					</Button>
				{/if}
			</div>
		{/if}
	</div>
</div>
