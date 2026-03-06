<script lang="ts">
	import type { FilterSpec, FilterScope } from '$entities/filter';
	import { getRegisteredSpecs, getSpecsByScope } from '$entities/filter';
	import { cn } from '$shared/styles/utils';
	import FilterField from './FilterField.svelte';

	interface Props {
		/** Which scope to show filters for */
		scope?: FilterScope | 'all';
		/** Layout direction */
		direction?: 'horizontal' | 'vertical';
		/** Optional filter IDs to show (subset) */
		filterIds?: string[];
		/** Additional CSS classes */
		class?: string;
	}

	let {
		scope = 'all',
		direction = 'horizontal',
		filterIds,
		class: className = ''
	}: Props = $props();

	let specs = $derived.by(() => {
		let all: FilterSpec[] =
			scope === 'all' ? getRegisteredSpecs() : getSpecsByScope(scope as FilterScope);

		if (filterIds && filterIds.length > 0) {
			all = all.filter((s) => filterIds.includes(s.id));
		}

		return all;
	});
</script>

<div
	class={cn(
		'flex flex-wrap gap-4',
		direction === 'horizontal' ? 'flex-row items-end' : 'flex-col items-stretch',
		className
	)}
>
	{#each specs as spec (spec.id)}
		<FilterField {spec} />
	{/each}
</div>
