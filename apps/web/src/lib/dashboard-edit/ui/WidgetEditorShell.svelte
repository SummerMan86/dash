<script lang="ts">
	import { cn } from '@dashboard-builder/platform-ui';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<div class={cn('grid items-start gap-6 lg:grid-cols-[260px_1fr_320px]', className)}>
	{#if children}
		{@render children()}
	{/if}
</div>
