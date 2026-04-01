<script lang="ts">
	import type {
		FilterSpec,
		FilterScope,
		FilterWorkspaceRuntime,
		ResolvedFilterSpec
	} from '$entities/filter';
	import { getRegisteredSpecs, getSpecsByScope, normalizeFilterScope } from '$entities/filter';
	import { cn } from '$shared/styles/utils';
	import FilterField from './FilterField.svelte';

	interface Props {
		/** Which scope to show filters for */
		scope?: FilterScope | 'all';
		runtime?: FilterWorkspaceRuntime;
		/** Layout direction */
		direction?: 'horizontal' | 'vertical';
		/** Optional filter IDs to show (subset) */
		filterIds?: string[];
		/** Additional CSS classes */
		class?: string;
	}

	let {
		scope = 'all',
		runtime,
		direction = 'horizontal',
		filterIds,
		class: className = ''
	}: Props = $props();

	let specs = $derived.by(() => {
		let all: Array<FilterSpec | ResolvedFilterSpec>;

		if (runtime) {
			all =
				scope === 'all'
					? runtime.resolvedSpecs
					: runtime.resolvedSpecs.filter(
							(spec) => spec.scope === normalizeFilterScope(scope as FilterScope)
						);
		} else {
			const legacyScope: 'global' | 'page' = scope === 'owner' ? 'page' : 'global';
			all = scope === 'all' ? getRegisteredSpecs() : getSpecsByScope(legacyScope);
		}

		if (filterIds && filterIds.length > 0) {
			all = all.filter((s) => filterIds.includes('filterId' in s ? s.filterId : s.id));
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
	{#each specs as spec ('registrationKey' in spec ? spec.registrationKey : spec.id)}
		<FilterField {spec} {runtime} />
	{/each}
</div>
