<script lang="ts">
	import type { FilterSpec, FilterValue } from '$entities/filter';
	import { filterStoreV2 } from '$entities/filter';
	import DateRangeFilter from './DateRangeFilter.svelte';
	import SelectFilter from './SelectFilter.svelte';
	import MultiSelectFilter from './MultiSelectFilter.svelte';
	import TextFilter from './TextFilter.svelte';

	interface Props {
		spec: FilterSpec;
	}

	let { spec }: Props = $props();

	// Get current value from store
	let effectiveValues = $derived(filterStoreV2.effective);
	let value = $derived($effectiveValues[spec.id] ?? spec.defaultValue ?? null);

	function onChange(newValue: FilterValue) {
		filterStoreV2.setFilter(spec.id, newValue);
	}
</script>

{#if spec.type === 'dateRange'}
	<DateRangeFilter {spec} {value} {onChange} />
{:else if spec.type === 'select'}
	<SelectFilter {spec} {value} {onChange} />
{:else if spec.type === 'multiSelect'}
	<MultiSelectFilter {spec} {value} {onChange} />
{:else if spec.type === 'text'}
	<TextFilter {spec} {value} {onChange} />
{/if}
