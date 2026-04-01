<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import { Button } from '$shared/ui/button';

	import { STRATEGY_NAV_ITEMS } from './constants';

	interface Props {
		currentPath: string;
	}

	let { currentPath }: Props = $props();

	function navigate(href: string) {
		if (!browser) return;
		void goto(`${href}${window.location.search}`);
	}

	function isActive(href: string): boolean {
		return currentPath === href;
	}
</script>

<div class="flex flex-wrap gap-2">
	{#each STRATEGY_NAV_ITEMS as item (item.href)}
		<Button
			type="button"
			variant={isActive(item.href) ? 'default' : 'outline'}
			onclick={() => navigate(item.href)}
		>
			{item.label}
		</Button>
	{/each}
</div>
