<script lang="ts">
	import type {
		FilterSpec,
		FilterValue,
		FilterWorkspaceRuntime,
		ResolvedFilterSpec
	} from '$entities/filter';
	import { filterStoreV2 } from '$entities/filter';
	import DateRangeFilter from './DateRangeFilter.svelte';
	import SelectFilter from './SelectFilter.svelte';
	import MultiSelectFilter from './MultiSelectFilter.svelte';
	import TextFilter from './TextFilter.svelte';

	interface Props {
		spec: FilterSpec | ResolvedFilterSpec;
		runtime?: FilterWorkspaceRuntime;
	}

	let { spec, runtime }: Props = $props();

	function getFilterId(currentSpec: FilterSpec | ResolvedFilterSpec): string {
		return 'filterId' in currentSpec ? currentSpec.filterId : currentSpec.id;
	}

	// Get current value from store
	let effectiveValues = $derived(runtime ? runtime.effective : filterStoreV2.effective);
	let value = $derived($effectiveValues[getFilterId(spec)] ?? spec.defaultValue ?? null);

	function onChange(newValue: FilterValue) {
		if (runtime) {
			runtime.setFilter(getFilterId(spec), newValue);
			return;
		}

		filterStoreV2.setFilter(getFilterId(spec), newValue);
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
