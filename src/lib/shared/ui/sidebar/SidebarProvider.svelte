<!--
  SidebarProvider
  - Хранит состояние сайдбара для desktop и mobile
  - Даёт toggle/open/close/toggleCollapse через Svelte context
-->

<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import { SIDEBAR_CTX, createSidebarContext, type SidebarContext } from './context';

	interface Props {
		/** По умолчанию: на desktop сайдбар открыт */
		defaultDesktopOpen?: boolean;
		/** По умолчанию: на mobile сайдбар закрыт */
		defaultMobileOpen?: boolean;
		/** По умолчанию: сайдбар развёрнут (не collapsed) */
		defaultCollapsed?: boolean;
		children?: Snippet;
	}

	let { defaultDesktopOpen = true, defaultMobileOpen = false, defaultCollapsed = false, children }: Props = $props();

	const ctx: SidebarContext = createSidebarContext({ defaultDesktopOpen, defaultMobileOpen, defaultCollapsed });
	setContext(SIDEBAR_CTX, ctx);

	onMount(() => {
		// Определяем >= lg, чтобы toggle понимал: "закрыть desktop" или "открыть mobile drawer".
		const mq = window.matchMedia('(min-width: 1024px)');

		ctx.isDesktop.set(mq.matches);

		const onChange = (e: MediaQueryListEvent) => {
			ctx.isDesktop.set(e.matches);
			// При переходе на desktop гарантируем, что mobile drawer закрыт.
			if (e.matches) ctx.openMobile.set(false);
		};

		// Safari fallback: addEventListener может отсутствовать
		if (mq.addEventListener) mq.addEventListener('change', onChange);
		else mq.addListener(onChange);

		return () => {
			if (mq.removeEventListener) mq.removeEventListener('change', onChange);
			else mq.removeListener(onChange);
		};
	});
</script>

{#if children}
	{@render children()}
{/if}


